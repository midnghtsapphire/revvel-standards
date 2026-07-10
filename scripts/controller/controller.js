#!/usr/bin/env node
'use strict';

/**
 * FLEET CONTROLLER · driver — the grid scheduler's I/O loop.
 *
 * Scans the fleet for orchestrators + triggers (in-progress and queued workflow
 * runs), classifies each via the pure core, and for the stalled / runaway ones
 * does CUT + REASSIGN: cancels the run and re-launches its workflow on the next
 * fallback LLM — up to a cap, after which it ESCALATES to self-healing (writes an
 * ingestion feed the heal loop consumes) instead of looping forever. Never cuts a
 * protected run (the immune system / the controller itself).
 *
 * Credit-free: GITHUB_TOKEN only, via the shared BIOME `gh` helper. Fail-open:
 * ANY error is caught and the process still exits 0, so a broken controller can
 * never wedge the fleet. Preemption is gated behind CONTROLLER_PREEMPT so cutting
 * and reassigning is deliberate, never a side effect of a dry scan.
 *
 * Also usable as a NODE for self-healing ingestion: `require('./controller')
 * .ingest()` runs a read-only scan and returns the ingestion payload (no cancel,
 * no dispatch) so the heal loop can consume the controller's verdict directly.
 */

const fs = require('fs');
const path = require('path');
const core = require('./core');

let repoApi;
try {
  ({ repoApi } = require('../biome/gh')); // reuse the credit-free GitHub helper
} catch (e) {
  // Surface the degradation: a null repoApi makes the fleet *look* empty (zero
  // runs, zero preemptions) when it's really just invisible — don't fail silent.
  console.warn(`[WARN] fleet-controller: BIOME gh helper unavailable (${e.message}) — running degraded (read-only, no scan)`);
  repoApi = null;
}

// List every run of a status, paging past 100 so a large fleet (>100 concurrent
// orchestrators) isn't silently truncated. Bounded (10 pages = 1000/status) so a
// runaway API can't loop forever. `api` is injectable for tests.
async function listRuns(status, api = repoApi) {
  if (!api) return [];
  const all = [];
  for (let page = 1; page <= 10; page += 1) {
    const data = await api(`/actions/runs?status=${status}&per_page=100&page=${page}`, { allowError: true });
    const runs = data && Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
    all.push(...runs);
    if (runs.length < 100) break; // last page
  }
  return all;
}

// Discover orchestrators (in_progress) + triggers (queued); best-effort per list.
async function discoverRuns(api = repoApi) {
  let runs = [];
  for (const status of ['in_progress', 'queued']) {
    try {
      runs = runs.concat(await listRuns(status, api));
    } catch (e) {
      console.error(`controller: listing ${status} runs failed (continuing): ${e.message}`);
    }
  }
  return runs;
}

// How long a workflow's reassignment lineage is remembered after its last cut.
// Long enough that a 15-min cut→relaunch→stall cycle can never outrun the
// ledger; short enough that a workflow that recovers gets a clean slate.
const STATE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Durable scoreboard: reassignment lineage persisted in its own state file so
 * a quiet tick can NEVER wipe it. The original design read history back from
 * the last feed's `preemptions` — but the moment a tick had nothing to preempt
 * (e.g. right after a relaunch, while the fresh run was still young) the feed
 * carried no history, the next tick started the model chain from scratch, and
 * the controller looped cut→relaunch on model #1 forever without ever
 * escalating to self-healing. CUDA framing: the warp scheduler's scoreboard
 * must outlive the current issue cycle, or eviction can't converge.
 *
 * Entries expire after `ttlMs` since their last cut (a recovered workflow gets
 * a clean slate). Falls back to the legacy last-feed read for the first run
 * after this file ships.
 */
function loadControllerState(outDir, nowMs = Date.now(), ttlMs = STATE_TTL_MS) {
  let workflows = null;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(outDir, 'controller-state.json'), 'utf8'));
    if (raw && raw.schema === 'fleet-controller-state/v1' && raw.workflows && typeof raw.workflows === 'object') {
      workflows = raw.workflows;
    }
  } catch {
    // no state file yet — legacy fallback below
  }
  if (!workflows) {
    workflows = {};
    const legacy = loadPriorReassigns(outDir);
    // Stamp migrated entries with the migration time so the TTL applies to
    // them too — a null stamp would survive expiry forever, and a workflow
    // that recovered could skip straight to escalation days later.
    const migratedAt = new Date(nowMs).toISOString();
    for (const [k, v] of Object.entries(legacy)) workflows[k] = { ...v, last_cut_at: migratedAt };
  }
  const live = {};
  for (const [k, v] of Object.entries(workflows)) {
    const t = Date.parse((v && v.last_cut_at) || '');
    if (Number.isFinite(t) && nowMs - t > ttlMs) continue; // recovered — clean slate
    live[k] = { count: (v && v.count) || 0, tried: (v && v.tried) || [], last_cut_at: (v && v.last_cut_at) || null };
  }
  return live;
}

// Write the scoreboard back: every cut that actually happened this tick stamps
// its workflow's lineage; untouched entries are carried forward unchanged (this
// carry-forward is the amnesia fix). Only called on preempting runs — a dry
// scan must never advance scheduling state.
function saveControllerState(outDir, workflows, preemptions, generatedAtIso) {
  const next = { ...workflows };
  for (const p of preemptions || []) {
    if (p.cut !== 'cancelled') continue;
    const key = p.path || String(p.id);
    next[key] = { count: p.reassignCount || 0, tried: p.triedModels || [], last_cut_at: generatedAtIso };
  }
  const payload = { schema: 'fleet-controller-state/v1', updated_at: generatedAtIso, workflows: next };
  fs.writeFileSync(path.join(outDir, 'controller-state.json'), `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

/**
 * Real heartbeat for a "stalled" verdict: a run's `updated_at` does not tick
 * while one long step is executing, so a legitimately slow research step reads
 * as "no progress" and gets cut while healthy. Before evicting, check the
 * run's jobs/steps — the latest started_at/completed_at across them is actual
 * evidence of progress. Returns the epoch-ms of the last observed activity, or
 * null when the jobs API gave us nothing (caller falls back to the original
 * verdict). CUDA framing: check the warp's scoreboard before eviction — an
 * in-flight op that recently issued is not a stall.
 */
async function lastJobActivityMs(runId, api = repoApi) {
  if (!api) return null;
  let last = null;
  const consider = (t) => {
    const ms = Date.parse(t || '');
    if (Number.isFinite(ms)) last = last == null ? ms : Math.max(last, ms);
  };
  // Page past 100 jobs (bounded) — a large matrix run's ACTIVE job can sit
  // beyond page 1, and missing it would spuriously cut a healthy run.
  // Partial data can only miss a spare, never create a false one.
  for (let page = 1; page <= 5; page += 1) {
    // allowError absorbs non-2xx responses, but a network-level rejection
    // (DNS, timeout) still throws — and an uncaught throw here would abort
    // the whole preemption loop before feeds are written. This check is
    // best-effort: swallow the error and fall back to whatever we saw.
    let data;
    try {
      data = await api(`/actions/runs/${runId}/jobs?per_page=100&page=${page}`, { allowError: true });
    } catch {
      break;
    }
    const jobs = data && Array.isArray(data.jobs) ? data.jobs : null;
    if (!jobs) break;
    for (const j of jobs) {
      consider(j.started_at);
      consider(j.completed_at);
      for (const s of j.steps || []) {
        consider(s.started_at);
        consider(s.completed_at);
      }
    }
    if (jobs.length < 100) break; // last page
  }
  return last;
}

// Read the previous feed so reassignment counts/tried-models survive across the
// stateless cron ticks (key: workflow path or run id).
function loadPriorReassigns(outDir) {
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'controller-status.json'), 'utf8'));
    // Only a real (preempting) run reflects cuts/reassigns that actually happened.
    // A dry-scan feed must NOT advance scheduling state, or a manual dry run would
    // push workflows toward premature escalation on the next scheduled tick.
    if (!prev.preempt_enabled) return {};
    const map = {};
    for (const p of prev.preemptions || []) {
      // Persist BOTH reassigned AND escalated entries: an escalated workflow must
      // STAY escalated next tick, not forget its history and loop back to the
      // first fallback model.
      if (p.planned !== 'reassign' && p.planned !== 'escalate') continue;
      const key = p.path || String(p.id);
      map[key] = { count: p.reassign_count || 0, tried: p.tried_models || [] };
    }
    return map;
  } catch {
    return {}; // no prior feed yet
  }
}

// Re-launch a cut orchestrator's workflow on its next fallback model. Best-effort:
// dispatch with the model input, retry without it if the workflow has no such
// input. Returns the outcome string for the feed.
async function reassignWorkflow(p, api = repoApi) {
  const wf = p.path ? p.path.split('/').pop() : null;
  if (!wf) return 'reassign-skipped(no-workflow)';
  const ref = p.ref || 'main';
  try {
    await api(`/actions/workflows/${wf}/dispatches`, { method: 'POST', body: { ref, inputs: { model: p.nextModel } } });
    return 'reassigned';
  } catch (e1) {
    // Only retry WITHOUT the model input when the failure was the workflow not
    // declaring that input (HTTP 422 / "Unexpected inputs"). Any other failure
    // (rate limit, perms, 5xx) must NOT silently relaunch on the default model —
    // report it so the feed shows a real failure, not a false "reassigned".
    if (!/422|unexpected input|inputs/i.test(e1.message || '')) {
      return `reassign-failed: ${e1.message}`;
    }
    try {
      await api(`/actions/workflows/${wf}/dispatches`, { method: 'POST', body: { ref } });
      return 'reassigned(no-model-input)';
    } catch (e2) {
      return `reassign-failed: ${e2.message}`;
    }
  }
}

async function main() {
  const now = Date.now();
  const preemptEnabled = process.env.CONTROLLER_PREEMPT === '1' || process.env.CONTROLLER_PREEMPT === 'true';
  const outDir = process.env.CONTROLLER_OUT_DIR || path.join(process.cwd(), 'docs', 'controller');

  const runs = await discoverRuns();
  const priorReassigns = loadControllerState(outDir, now);
  const generatedAtIso = new Date(now).toISOString();
  const { classified, preemptions } = core.evaluate(runs, now, { preemptEnabled, priorReassigns, generatedAtIso });

  for (const p of preemptions) {
    if (!preemptEnabled) {
      p.cut = 'would-cancel'; // dry scan: report the cut + reassign we *would* do
      continue;
    }
    // 0) a "stalled" verdict is only a proxy (run.updated_at doesn't tick during
    //    a long step) — verify against the jobs API before evicting, so a slow
    //    but healthy research step isn't killed every 15 minutes. Runaways skip
    //    this: past the wall-clock budget they're cut regardless of activity.
    if (p.health === 'stalled') {
      const activity = await lastJobActivityMs(p.id);
      if (activity != null && now - activity < core.DEFAULTS.stallMs) {
        p.cut = 'spared(step-progress)';
        console.error(`controller: spared run ${p.id} (${p.name || '?'}) — step activity ${Math.round((now - activity) / 60000)}m ago`);
        continue;
      }
    }
    // 1) cut the stalled/runaway run. No allowError: a failed cancel must NOT be
    //    recorded as 'cancelled', or we'd relaunch a duplicate while the original
    //    is still running.
    try {
      await repoApi(`/actions/runs/${p.id}/cancel`, { method: 'POST' });
      p.cut = 'cancelled';
      console.error(`controller: cut ${p.health} run ${p.id} (${p.name || '?'}) — ${p.reason}`);
    } catch (e) {
      p.cut = 'cancel-failed';
      p.error = e.message;
      continue; // couldn't cut the original — do NOT reassign/relaunch (avoid duplicate)
    }
    // 2) reassign to a fresh LLM and relaunch (unless the chain/cap is exhausted)
    if (p.action === 'reassign') {
      try {
        p.reassignOutcome = await reassignWorkflow(p);
        console.error(`controller: reassigned run ${p.id} -> ${p.nextModel} (${p.reassignOutcome})`);
      } catch (e) {
        p.reassignOutcome = `reassign-failed: ${e.message}`;
      }
    }
    // 3) action === 'escalate' falls through to the ingestion feed (self-healing).
  }

  const feed = core.buildControllerFeed({ classified, preemptions, preemptEnabled, generatedAtIso });
  // Spared runs stay visible in the status feed (cut: 'spared(step-progress)')
  // but must NOT reach the stop signal or the self-healing ingestion — they
  // were judged healthy after all.
  const acted = preemptions.filter((p) => p.cut !== 'spared(step-progress)');
  const stop = core.buildStopSignal(acted, generatedAtIso);
  const ingestion = core.buildIngestion(acted, generatedAtIso);

  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'controller-status.json'), `${JSON.stringify(feed, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'controller-stop.json'), `${JSON.stringify(stop, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'controller-ingestion.json'), `${JSON.stringify(ingestion, null, 2)}\n`);
    if (preemptEnabled) saveControllerState(outDir, priorReassigns, preemptions, generatedAtIso);
  } catch (e) {
    console.error(`controller: writing feeds failed (continuing): ${e.message}`);
  }

  const c = feed.counts;
  const reassigned = preemptions.filter((p) => p.action === 'reassign').length;
  const escalated = ingestion.needs_healing.length;
  console.log(
    `fleet-controller: ${c.running} running (${c.healthy} healthy, ${c.stalled} stalled, ${c.runaway} runaway), ` +
      `${c.queued} queued, ${c.protected} protected · ${reassigned} reassign / ${escalated} escalate ` +
      `${preemptEnabled ? 'applied' : '(dry-run)'}`
  );
  return { feed, stop, ingestion };
}

/**
 * Read-only scan for the self-healing loop to ingest — discovers runs and returns
 * the ingestion payload (orchestrators that exhausted reassignment and need
 * healing). Performs NO cancel/dispatch and writes nothing.
 */
async function ingest() {
  const now = Date.now();
  const runs = await discoverRuns();
  const outDir = process.env.CONTROLLER_OUT_DIR || path.join(process.cwd(), 'docs', 'controller');
  const priorReassigns = loadControllerState(outDir, now);
  return core.evaluate(runs, now, { preemptEnabled: false, priorReassigns }).ingestion;
}

if (require.main === module) {
  // Fail open: never let the scheduler take the fleet down with it.
  main().catch((e) => {
    console.error(`fleet-controller error (non-fatal, failing open): ${e.message}`);
    process.exit(0);
  });
}

module.exports = {
  main,
  ingest,
  listRuns,
  discoverRuns,
  reassignWorkflow,
  loadPriorReassigns,
  loadControllerState,
  saveControllerState,
  lastJobActivityMs,
  STATE_TTL_MS,
};

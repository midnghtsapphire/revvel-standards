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

// Read the previous feed so reassignment counts/tried-models survive across the
// stateless cron ticks (key: workflow path or run id).
function loadPriorReassigns(outDir) {
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'controller-status.json'), 'utf8'));
    const map = {};
    for (const p of prev.preemptions || []) {
      if (p.planned !== 'reassign') continue;
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
    // The workflow may not declare a `model` input — retry without it. If THAT
    // also fails, report the failure (never a false "reassigned").
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
  const priorReassigns = loadPriorReassigns(outDir);
  const generatedAtIso = new Date(now).toISOString();
  const { classified, preemptions } = core.evaluate(runs, now, { preemptEnabled, priorReassigns, generatedAtIso });

  for (const p of preemptions) {
    if (!preemptEnabled) {
      p.cut = 'would-cancel'; // dry scan: report the cut + reassign we *would* do
      continue;
    }
    // 1) cut the stalled/runaway run
    try {
      await repoApi(`/actions/runs/${p.id}/cancel`, { method: 'POST', allowError: true });
      p.cut = 'cancelled';
      console.error(`controller: cut ${p.health} run ${p.id} (${p.name || '?'}) — ${p.reason}`);
    } catch (e) {
      p.cut = 'cancel-failed';
      p.error = e.message;
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
  const stop = core.buildStopSignal(preemptions, generatedAtIso);
  const ingestion = core.buildIngestion(preemptions, generatedAtIso);

  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'controller-status.json'), `${JSON.stringify(feed, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'controller-stop.json'), `${JSON.stringify(stop, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'controller-ingestion.json'), `${JSON.stringify(ingestion, null, 2)}\n`);
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
  const priorReassigns = loadPriorReassigns(outDir);
  return core.evaluate(runs, now, { preemptEnabled: false, priorReassigns }).ingestion;
}

if (require.main === module) {
  // Fail open: never let the scheduler take the fleet down with it.
  main().catch((e) => {
    console.error(`fleet-controller error (non-fatal, failing open): ${e.message}`);
    process.exit(0);
  });
}

module.exports = { main, ingest, listRuns, discoverRuns, reassignWorkflow, loadPriorReassigns };

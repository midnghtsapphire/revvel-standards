#!/usr/bin/env node
'use strict';

/**
 * FLEET CONTROLLER · core — the grid-level scheduler over every orchestrator.
 *
 * Borrowing the CUDA execution model (people.maths.ox.ac.uk/gilesm/cuda lec3):
 * a device has many SMs running many blocks of warps; a scheduler watches
 * occupancy and evicts warps that stall so others make progress. Here the
 * **orchestrators** (the research orchestrator, twin/triplet runs, and every
 * other fleet workflow) are the blocks; the controller is the grid scheduler
 * that scans them, watches their heartbeats/occupancy, and **preempts** (cuts
 * off) the ones that have stalled or run away — freeing the slot.
 *
 * This module is the PURE, runtime-agnostic core: classification + scheduling
 * decisions + feed/stop-signal shapes, fully unit-tested with no I/O. The driver
 * (`controller.js`) and the cron workflow wire it to the GitHub API. It is
 * credit-free by construction — it reasons over data the caller fetches with the
 * free GITHUB_TOKEN, never a paid key — so it keeps scheduling even when Doppler
 * wipes the AI-lane secrets.
 */

const DEFAULTS = Object.freeze({
  stallMs: 15 * 60 * 1000, // 15 min with no update => stalled (mirrors the orchestrator's soft cutoff)
  maxRunMs: 60 * 60 * 1000, // 60 min wall-clock => runaway (over its budget)
  occupancyCap: 20, // soft cap on concurrent orchestrators (SM "occupancy")
  maxReassigns: 2, // cut+reassign this many times before escalating to self-healing
  // NEVER preempt the fleet's own immune system or the controller itself — cutting
  // these would be the scheduler killing its own scheduler. Matched against a
  // run's workflow path + name.
  protectedRe: /self-healing|repo-self-healer|fleet-controller|agent-monitor|secret-persistence-guard|biome-/i,
});

// Fallback LLM chain a cut orchestrator is reassigned through (best → next).
// House model policy (.github/agent-models.yml + MODEL_CONFIG.md): the Opus
// twins carry execution, Fable 5 is the reasoning-tier escalation. Sonnet and
// auto/fusion are DENYLISTED (refused/violated repo rules in fleet testing) —
// a drift test in controller-core.test.js checks this chain against the SSOT
// denylist so a banned model can never sneak back in.
const DEFAULT_MODEL_CHAIN = Object.freeze([
  'anthropic/claude-opus-5', // Opus twin — primary
  'anthropic/claude-opus-4.8', // Opus twin — fallback
  'anthropic/claude-fable-5', // reasoning-tier escalation (Claude 5 family)
]);

// --- time helpers (pure) ---------------------------------------------------

function parseMs(...candidates) {
  for (const c of candidates) {
    const t = Date.parse(c || '');
    if (Number.isFinite(t)) return t;
  }
  return null;
}

function runStartMs(run) {
  return parseMs(run.run_started_at, run.created_at);
}

function runUpdatedMs(run) {
  return parseMs(run.updated_at, run.run_started_at, run.created_at);
}

function isProtected(run, re = DEFAULTS.protectedRe) {
  return re.test(`${run.path || ''} ${run.name || ''}`);
}

// --- classification (pure) -------------------------------------------------

// Map one workflow run (an orchestrator/trigger observation) to a health verdict.
function classifyRun(run, nowMs, cfg = DEFAULTS) {
  const base = {
    id: run.id,
    name: run.name || null,
    path: run.path || null,
    url: run.html_url || null,
    event: run.event || null,
    headBranch: run.head_branch || null,
    status: run.status, // queued | in_progress | completed | waiting | …
    protected: isProtected(run, cfg.protectedRe),
  };

  if (run.status === 'completed') {
    return { ...base, health: 'done', ageMs: null, sinceUpdateMs: null, reason: run.conclusion || 'completed' };
  }
  if (run.status !== 'in_progress') {
    // queued / waiting / pending / requested — a trigger that hasn't been picked up.
    return { ...base, health: 'queued', ageMs: null, sinceUpdateMs: null, reason: 'awaiting a runner (trigger)' };
  }

  const start = runStartMs(run);
  const upd = runUpdatedMs(run);
  const ageMs = start != null ? nowMs - start : null;
  const sinceUpdateMs = upd != null ? nowMs - upd : null;

  let health = 'healthy';
  let reason = 'running within budget';
  if (ageMs != null && ageMs >= cfg.maxRunMs) {
    health = 'runaway';
    reason = `running ${Math.round(ageMs / 60000)}m ≥ ${Math.round(cfg.maxRunMs / 60000)}m budget`;
  } else if (sinceUpdateMs != null && sinceUpdateMs >= cfg.stallMs) {
    health = 'stalled';
    reason = `no progress for ${Math.round(sinceUpdateMs / 60000)}m ≥ ${Math.round(cfg.stallMs / 60000)}m`;
  }
  return { ...base, health, ageMs, sinceUpdateMs, reason };
}

// Which orchestrators to cut: the stalled + runaway ones, never a protected run
// (the immune system / the controller itself). This is the eviction decision.
function selectPreemptions(classified, cfg = DEFAULTS) {
  return classified.filter((c) => (c.health === 'stalled' || c.health === 'runaway') && !c.protected);
}

// Next untried model in the fallback chain (null when exhausted).
function nextModel(chain, tried) {
  const seen = new Set(tried || []);
  for (const m of chain || []) if (!seen.has(m)) return m;
  return null;
}

/**
 * Decide what to DO with each cut orchestrator: don't just kill it — cut + reassign
 * to a fresh LLM and relaunch, up to `maxReassigns` times; once the chain/cap is
 * exhausted, ESCALATE to self-healing instead of looping forever.
 *
 * `priorReassigns` (keyed by workflow path / id) carries how many times each has
 * already been reassigned and which models were tried — read back from the last
 * feed so the controller is stateless between cron ticks.
 */
function planPreemptions(cuts, opts = {}) {
  const chain = opts.modelChain || DEFAULT_MODEL_CHAIN;
  const maxReassigns = opts.maxReassigns != null ? opts.maxReassigns : DEFAULTS.maxReassigns;
  const prior = opts.priorReassigns || {};
  return (cuts || []).map((c) => {
    const key = c.path || String(c.id);
    const seen = prior[key] || { count: 0, tried: [] };
    const next = nextModel(chain, seen.tried);
    if (seen.count < maxReassigns && next) {
      return {
        ...c,
        action: 'reassign',
        nextModel: next,
        reassignCount: seen.count + 1,
        triedModels: [...(seen.tried || []), next],
        ref: c.headBranch || 'main',
      };
    }
    return {
      ...c,
      action: 'escalate',
      reassignCount: seen.count,
      triedModels: seen.tried || [],
      reason: `${c.reason}; ${seen.count} reassignment(s) exhausted — handing to self-healing`,
    };
  });
}

// Occupancy + status rollup across the grid.
function summarizeFleet(classified, cfg = DEFAULTS) {
  const counts = { total: classified.length, running: 0, queued: 0, done: 0, healthy: 0, stalled: 0, runaway: 0, protected: 0 };
  for (const c of classified) {
    if (c.status === 'completed') counts.done += 1;
    else if (c.health === 'queued') counts.queued += 1;
    else counts.running += 1; // in_progress
    if (c.health === 'healthy') counts.healthy += 1;
    if (c.health === 'stalled') counts.stalled += 1;
    if (c.health === 'runaway') counts.runaway += 1;
    if (c.protected) counts.protected += 1;
  }
  return {
    ...counts,
    occupancy: counts.running,
    occupancyCap: cfg.occupancyCap,
    overCapacity: counts.running > cfg.occupancyCap,
  };
}

// --- feed + stop-signal shapes (pure) --------------------------------------

// Lovable-consumable monitor feed. `planned` action ('reassign' | 'escalate')
// comes from planPreemptions; `cut`/`reassign_outcome` are filled by the driver.
function buildControllerFeed(state) {
  const classified = state.classified || [];
  const cfg = state.cfg || DEFAULTS;
  const summary = summarizeFleet(classified, cfg);
  const preemptions = state.preemptions || [];
  return {
    schema: 'fleet-controller/v1',
    generated_at: state.generatedAtIso,
    preempt_enabled: Boolean(state.preemptEnabled),
    occupancy: { running: summary.occupancy, cap: summary.occupancyCap, over_capacity: summary.overCapacity },
    counts: summary,
    orchestrators: classified.map((c) => ({
      id: c.id,
      name: c.name,
      path: c.path,
      url: c.url,
      status: c.status,
      health: c.health,
      age_ms: c.ageMs ?? null,
      since_update_ms: c.sinceUpdateMs ?? null,
      reason: c.reason,
      protected: Boolean(c.protected),
    })),
    preemptions: preemptions.map((p) => ({
      id: p.id,
      name: p.name,
      path: p.path,
      health: p.health,
      reason: p.reason,
      planned: p.action, // 'reassign' | 'escalate'
      next_model: p.nextModel || null,
      reassign_count: p.reassignCount || 0,
      tried_models: p.triedModels || [],
      cut: p.cut || (state.preemptEnabled ? 'cancelled' : 'would-cancel'),
      reassign_outcome: p.reassignOutcome || (p.action === 'reassign' && state.preemptEnabled ? 'pending' : null),
      error: p.error || null,
    })),
  };
}

// Self-healing ingestion node: the cut orchestrators that EXHAUSTED reassignment
// and now need the heal loop (file a [SELF-HEAL]/[AGENT-FAILURE] WR, route, etc.).
// Read-only product of the scan — the self-healer consumes this, the controller
// never files issues itself (stays a scheduler, not a healer).
function buildIngestion(preemptions, generatedAtIso) {
  const escalations = (preemptions || []).filter((p) => p.action === 'escalate');
  return {
    schema: 'fleet-controller-ingestion/v1',
    generated_at: generatedAtIso,
    needs_healing: escalations.map((p) => ({
      id: p.id,
      name: p.name,
      path: p.path,
      url: p.url,
      health: p.health,
      reassign_count: p.reassignCount || 0,
      tried_models: p.triedModels || [],
      reason: p.reason,
    })),
  };
}

/**
 * The whole scheduling decision as ONE pure node — given the raw runs + the last
 * feed's reassignment state, return everything the driver writes and everything
 * self-healing ingests. No I/O, so self-healing can require this and ingest the
 * verdict directly (the "controller as a node" half of the ask).
 */
function evaluate(runs, nowMs, opts = {}) {
  const cfg = opts.cfg || DEFAULTS;
  const generatedAtIso = opts.generatedAtIso || new Date(nowMs).toISOString();
  const classified = (runs || []).map((r) => classifyRun(r, nowMs, cfg));
  const cuts = selectPreemptions(classified, cfg);
  const preemptions = planPreemptions(cuts, opts);
  return {
    classified,
    preemptions,
    feed: buildControllerFeed({ classified, preemptions, cfg, preemptEnabled: opts.preemptEnabled, generatedAtIso }),
    stop: buildStopSignal(preemptions, generatedAtIso),
    ingestion: buildIngestion(preemptions, generatedAtIso),
  };
}

// Sentinel an in-process orchestrator can read at its next gateway tick to
// self-halt (the "signal stop" half of preemption, for arms not running as a
// cancellable workflow). `hasStop(stop, id)` is the reader's check.
function buildStopSignal(preemptions, generatedAtIso) {
  return {
    schema: 'fleet-controller-stop/v1',
    generated_at: generatedAtIso,
    stop: (preemptions || []).map((p) => ({ id: p.id, name: p.name, reason: p.reason })),
  };
}

function hasStop(stopSignal, id) {
  if (!stopSignal || !Array.isArray(stopSignal.stop)) return false;
  return stopSignal.stop.some((s) => String(s.id) === String(id));
}

module.exports = {
  DEFAULTS,
  DEFAULT_MODEL_CHAIN,
  parseMs,
  runStartMs,
  runUpdatedMs,
  isProtected,
  classifyRun,
  selectPreemptions,
  nextModel,
  planPreemptions,
  summarizeFleet,
  buildControllerFeed,
  buildStopSignal,
  hasStop,
  buildIngestion,
  evaluate,
};

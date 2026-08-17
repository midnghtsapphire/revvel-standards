#!/usr/bin/env node
'use strict';

/**
 * Research Orchestrator — a Manus-style monitor over parallel search "arms"
 * (twin / triplet / swarm models). Runtime-agnostic CORE: the decision logic,
 * checkpoint/handoff schema, and incremental synthesis are pure and tested here;
 * a thin driver (`orchestrate`) wires them to real model calls, and callers
 * supply where checkpoints land (git commit, workspace file, …) and how the
 * soft-budget gateway behaves (auto-continue, stop, or ask a human).
 *
 * What it does:
 *  1. Monitor — track each arm's last progress; a stalled arm (no output within
 *     `stallMs`) is cut and reassigned to the next fallback model.
 *  2. Realtime checkpoint/handoff — every tick it emits a resumable checkpoint
 *     (JSON) + handoff doc (Markdown) so a cut-off never loses an hour.
 *  3. Soft budget — at `softBudgetMs` (default 15 min) it asks the caller's
 *     gateway whether to continue, instead of hard-killing.
 *  4. Incremental synthesis — partial results are merged as arms land.
 *
 * Pure functions are exported for tests; the async driver is integration glue.
 */

const DEFAULTS = Object.freeze({
  stallMs: 120000, // 2 min with no progress => the arm is stalled
  softBudgetMs: 900000, // 15 min soft cutoff (the "ask me" point)
  tickMs: 5000, // monitor cadence
});

// --- pure decision logic ---------------------------------------------------

function isStalled(arm, nowMs, stallMs) {
  return (
    arm.status === 'running' &&
    typeof arm.lastProgressAt === 'number' &&
    nowMs - arm.lastProgressAt >= stallMs
  );
}

// Next model from the arm's fallback list that hasn't been tried yet.
function nextFallbackModel(profileModels, triedModels) {
  const tried = new Set(triedModels || []);
  for (const m of profileModels || []) {
    if (!tried.has(m)) return m;
  }
  return null;
}

function budgetState(startedAtMs, nowMs, softBudgetMs) {
  return nowMs - startedAtMs >= softBudgetMs ? 'soft-exceeded' : 'within';
}

function summarizeProgress(arms) {
  const s = { total: arms.length, running: 0, done: 0, failed: 0, stalled: 0, reassigned: 0 };
  for (const a of arms) {
    if (a.status === 'running') s.running += 1;
    else if (a.status === 'done') s.done += 1;
    else if (a.status === 'failed') s.failed += 1;
    else if (a.status === 'stalled') s.stalled += 1;
    if ((a.triedModels || []).length > 1) s.reassigned += 1;
  }
  return s;
}

// Incremental synthesis — collate completed arms as they land (the orchestrator
// organizes results right away rather than waiting for every arm).
function mergePartials(arms) {
  const done = arms.filter((a) => a.status === 'done' && a.result);
  const citations = [];
  const seen = new Set();
  for (const a of done) {
    for (const u of a.result.citations || []) {
      if (!seen.has(u)) {
        seen.add(u);
        citations.push(u);
      }
    }
  }
  const running = arms.filter((a) => a.status === 'running').length;
  return {
    completed: done.length,
    pending: running,
    answers: done.map((a) => ({ arm: a.id, model: a.model, answer: a.result.answer || '' })),
    citations,
    note: done.length
      ? `Synthesizing ${done.length} completed arm(s); ${running} still running.`
      : 'No arms completed yet.',
  };
}

function buildCheckpoint(state) {
  return {
    schema: 'research-checkpoint/v1',
    query: state.query,
    started_at: state.startedAtIso,
    updated_at: state.updatedAtIso,
    soft_budget_ms: state.softBudgetMs,
    budget_state: state.budgetState,
    progress: summarizeProgress(state.arms),
    arms: state.arms.map((a) => ({
      id: a.id,
      model: a.model,
      status: a.status,
      tried_models: a.triedModels || [],
      last_progress_at: typeof a.lastProgressAt === 'number' ? a.lastProgressAt : null,
      has_result: !!a.result,
      error: a.error || null,
    })),
    synthesis: state.synthesis || mergePartials(state.arms),
  };
}

// Resumable, human-readable handoff doc (canonical handoff sections). Written in
// realtime so picking up after a cut-off is "read this, continue from here".
function buildHandoffDoc(state) {
  const p = summarizeProgress(state.arms);
  const syn = state.synthesis || mergePartials(state.arms);
  const lines = [
    '# Research handoff — resumable checkpoint',
    '',
    `**Query:** ${state.query}`,
    `**Started:** ${state.startedAtIso} · **Updated:** ${state.updatedAtIso}`,
    `**Budget:** ${state.budgetState} (soft ${Math.round((state.softBudgetMs || 0) / 60000)} min)`,
    `**Progress:** ${p.done} done · ${p.running} running · ${p.stalled} stalled · ${p.failed} failed · ${p.reassigned} reassigned (of ${p.total})`,
    '',
    '## Arms',
    '',
    '| Arm | Model | Status | Tried | Sources |',
    '| --- | --- | --- | --- | ---: |',
  ];
  for (const a of state.arms) {
    const srcCount = a.result && Array.isArray(a.result.citations) ? a.result.citations.length : 0;
    lines.push(`| ${a.id} | ${a.model} | ${a.status} | ${(a.triedModels || []).join(' → ')} | ${srcCount} |`);
  }
  lines.push('');
  lines.push('## Partial synthesis');
  lines.push('');
  lines.push(syn.note);
  for (const ans of syn.answers) {
    lines.push('');
    lines.push(`### ${ans.arm} (${ans.model})`);
    lines.push(ans.answer ? ans.answer.slice(0, 2000) : '_(no content)_');
  }
  lines.push('');
  lines.push('## Resume from here');
  lines.push('');
  lines.push('- Re-dispatch any arm still `running`/`stalled` (reassign to its next untried model).');
  lines.push('- Completed arms above are final — do not re-run them.');
  lines.push('- Citations gathered so far:');
  for (const c of syn.citations.slice(0, 30)) lines.push(`  - ${c}`);
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  DEFAULTS,
  isStalled,
  nextFallbackModel,
  budgetState,
  summarizeProgress,
  mergePartials,
  buildCheckpoint,
  buildHandoffDoc,
  orchestrate,
};

// --- async driver (integration glue; pure logic above is what's unit-tested) -

/**
 * @param {object} opts
 * @param {Array<{id:string, model:string, kind?:string, profileModels?:string[]}>} opts.armSpecs
 * @param {(arm, ctx)=>Promise<{answer,citations,cost_usd}>} opts.dispatch
 *        arm is a frozen read-only {id, model, kind} view (not the live arm).
 *        ctx = { onProgress(): void, signal: AbortSignal }. Call onProgress() as
 *        output streams so the monitor sees the arm is alive; honor `signal` so a
 *        cut/stopped arm is actually aborted (and its resources freed) rather than
 *        hanging — the monitor only polls every `tickMs`, so detection of a stall
 *        lands within `stallMs + tickMs`.
 * @param {(checkpoint, handoffMd)=>void|Promise} [opts.onCheckpoint] persist hook
 * @param {(state)=>Promise<'continue'|'stop'>} [opts.onSoftBudget] 15-min gateway
 * @param {number} [opts.stallMs] @param {number} [opts.softBudgetMs] @param {number} [opts.tickMs]
 * @param {()=>number} [opts.now] injectable clock (tests)
 */
async function orchestrate(opts) {
  const {
    armSpecs,
    dispatch,
    onCheckpoint = () => {},
    onSoftBudget = async () => 'continue',
    stallMs = DEFAULTS.stallMs,
    softBudgetMs = DEFAULTS.softBudgetMs,
    tickMs = DEFAULTS.tickMs,
    now = Date.now,
  } = opts;

  if (!Array.isArray(armSpecs) || armSpecs.length === 0) {
    throw new Error('orchestrate: armSpecs must be a non-empty array');
  }
  for (const s of armSpecs) {
    if (!s || !s.id || !s.model) {
      throw new Error('orchestrate: each arm spec needs both an id and a model');
    }
  }

  const startedAt = now();
  const startedAtIso = new Date(startedAt).toISOString();
  const arms = armSpecs.map((s) => ({
    id: s.id,
    model: s.model,
    kind: s.kind, // arm type for the dispatch adapter ('single' | 'twin' | 'triplet')
    profileModels: s.profileModels || [s.model],
    triedModels: [s.model],
    status: 'running',
    lastProgressAt: startedAt,
    controller: null,
    generation: 0, // bumped on each launch; stale callbacks (post-reassign) are ignored
    result: null,
    error: null,
  }));

  const state = { query: opts.query || '', startedAtIso, updatedAtIso: startedAtIso, softBudgetMs, budgetState: 'within', arms, synthesis: null };
  let softBudgetFired = false;
  let stopped = false;

  const writeCheckpoint = async () => {
    state.updatedAtIso = new Date(now()).toISOString();
    state.synthesis = mergePartials(arms);
    await onCheckpoint(buildCheckpoint(state), buildHandoffDoc(state));
  };

  function launch(arm) {
    const controller = new AbortController();
    arm.controller = controller;
    arm.lastProgressAt = now();
    const gen = (arm.generation += 1); // this launch's epoch; guards against stale callbacks
    // Hand dispatch a frozen read-only view, never the live arm — a misbehaving
    // dispatch can't corrupt internal state (controller/generation/status/…).
    const armView = Object.freeze({ id: arm.id, model: arm.model, kind: arm.kind });
    Promise.resolve()
      .then(() =>
        dispatch(armView, {
          onProgress: () => { if (arm.generation === gen) arm.lastProgressAt = now(); },
          signal: controller.signal,
        })
      )
      .then((result) => {
        // Ignore a late resolve from a reassigned/aborted launch (race: the arm was
        // already cut and relaunched, so this result is stale).
        if (arm.generation !== gen || arm.status !== 'running') return;
        arm.status = 'done';
        arm.result = result;
        arm.controller = null; // terminal: release the abort controller
      })
      .catch((err) => {
        if (arm.generation !== gen || arm.status !== 'running') return; // stale or already terminal
        const next = nextFallbackModel(arm.profileModels, arm.triedModels);
        if (next) {
          arm.model = next;
          arm.triedModels.push(next);
          launch(arm); // reassign to the next fallback model (bumps generation)
        } else {
          arm.status = 'failed';
          arm.error = err.message;
          arm.controller = null; // terminal: release the abort controller
        }
      });
  }

  for (const arm of arms) launch(arm);

  // Monitor loop.
  while (!stopped && arms.some((a) => a.status === 'running')) {
    await new Promise((r) => setTimeout(r, tickMs));
    const t = now();

    for (const arm of arms) {
      if (isStalled(arm, t, stallMs)) {
        arm.status = 'stalled';
        if (arm.controller) arm.controller.abort();
        const next = nextFallbackModel(arm.profileModels, arm.triedModels);
        if (next) {
          arm.model = next;
          arm.triedModels.push(next);
          arm.status = 'running';
          launch(arm); // cut the stalled node and reassign to another model
        } else {
          arm.status = 'failed';
          arm.error = 'stalled, no fallback model left';
          arm.controller = null; // terminal: already aborted above
        }
      }
    }

    state.budgetState = budgetState(startedAt, t, softBudgetMs);
    await writeCheckpoint();

    if (state.budgetState === 'soft-exceeded' && !softBudgetFired) {
      softBudgetFired = true;
      const decision = await onSoftBudget(state); // the 15-min gateway
      if (decision === 'stop') {
        stopped = true;
        for (const arm of arms) {
          if (arm.status !== 'running') continue;
          // Mark terminal BEFORE aborting and bump the generation, so the abort's
          // reject doesn't slip into launch()'s catch and reassign to a fallback
          // (which would keep working after the run was stopped).
          arm.generation += 1;
          arm.status = 'failed';
          arm.error = 'stopped at soft-budget gateway';
          if (arm.controller) {
            arm.controller.abort();
            arm.controller = null;
          }
        }
      }
    }
  }

  await writeCheckpoint();
  return { checkpoint: buildCheckpoint(state), handoff: buildHandoffDoc(state), arms, stopped };
}

// --- CLI demo (stubbed dispatch so it runs without an API key) -------------
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const outDir = process.env.ORCH_OUT_DIR || path.join(process.cwd(), 'docs', 'research-engine', 'checkpoints');
  const query = process.argv.slice(2).join(' ') || 'demo query';
  const live = process.env.ORCH_LIVE === '1' || process.env.ORCH_LIVE === 'true';

  // Live wiring: each arm runs a real runner (deep-search / twin / triplet) via
  // the subprocess dispatcher; arms are heterogeneous so the orchestrator
  // monitors single-LLM and twin/triplet "swarm" arms side by side. Set
  // ORCH_LIVE=1 with a funded OPENROUTER_API_KEY. Default is the keyless stub.
  const dispatchArms = live ? require('./dispatch-arms') : null;
  let armSpecs;
  if (live) {
    // Every spec carries a real (non-empty) model so orchestrate()'s validation
    // accepts it; we then keep only arms whose runner script is actually present
    // on this branch. twin/triplet auto-activate once their PRs land — until
    // then ORCH_LIVE runs what exists rather than crashing on a missing runner.
    const DEFAULT_LIVE_MODEL = 'anthropic/claude-3.5-sonnet';
    const candidates = [
      { id: 'arm-deep', kind: 'single', model: 'deep_search', profileModels: ['deep_search', 'technical', 'market_research'] },
      { id: 'arm-twin', kind: 'twin', model: DEFAULT_LIVE_MODEL, profileModels: [DEFAULT_LIVE_MODEL] },
      { id: 'arm-triplet', kind: 'triplet', model: DEFAULT_LIVE_MODEL, profileModels: [DEFAULT_LIVE_MODEL] },
    ];
    armSpecs = candidates.filter((s) => {
      const script = dispatchArms.ARM_RUNNERS[s.kind];
      const present = script && fs.existsSync(path.join(__dirname, script));
      if (!present) console.error(`[orchestrator] live: skipping ${s.id} (${s.kind}) — runner ${script} not present on this branch yet`);
      return present;
    });
    if (!armSpecs.length) {
      console.error('[orchestrator] live: no runner scripts present; nothing to dispatch.');
      process.exit(1);
    }
  } else {
    armSpecs = [
      { id: 'arm-1', model: 'model-a', profileModels: ['model-a', 'model-a-fallback'] },
      { id: 'arm-2', model: 'model-b', profileModels: ['model-b', 'model-b-fallback'] },
      { id: 'arm-3', model: 'model-c', profileModels: ['model-c', 'model-c-fallback'] },
    ];
  }

  // Stub dispatch: resolves after a short delay with a canned answer (keyless).
  // Live dispatch: spawns the real runners via dispatch-arms.js.
  const dispatch = live
    ? dispatchArms.makeDispatch(query)
    : (arm) =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ answer: `stub answer from ${arm.model}`, citations: [`https://example.com/${arm.id}`], cost_usd: 0 }), 50)
        );

  orchestrate({
    query,
    armSpecs,
    dispatch,
    // Live runs are slow: give arms minutes before calling them stalled and use
    // the real 15-min soft budget; the stub demo stays snappy.
    stallMs: live ? 120000 : 1000,
    softBudgetMs: live ? 900000 : 10000,
    tickMs: live ? 5000 : 100,
    onCheckpoint: (checkpoint, handoffMd) => {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'checkpoint.json'), `${JSON.stringify(checkpoint, null, 2)}\n`);
      fs.writeFileSync(path.join(outDir, 'handoff.md'), handoffMd);
    },
  })
    .then((r) => {
      console.log(JSON.stringify(r.checkpoint, null, 2));
      console.error(
        r.stopped
          ? 'run STOPPED at the soft-budget gateway (partial result; resume from checkpoint).'
          : 'run COMPLETE (all arms reached a terminal state).'
      );
    })
    .catch((e) => {
      console.error('orchestrator error:', e.stack || e.message);
      process.exit(1);
    });
}

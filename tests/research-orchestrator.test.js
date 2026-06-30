'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  DEFAULTS,
  isStalled,
  nextFallbackModel,
  budgetState,
  summarizeProgress,
  mergePartials,
  buildCheckpoint,
  buildHandoffDoc,
  orchestrate,
} = require('../products/rnd-research-fleet/orchestrator');

test('isStalled: running arm with no progress past stallMs', () => {
  assert.equal(isStalled({ status: 'running', lastProgressAt: 0 }, 5000, 2000), true);
  assert.equal(isStalled({ status: 'running', lastProgressAt: 4000 }, 5000, 2000), false);
  assert.equal(isStalled({ status: 'done', lastProgressAt: 0 }, 5000, 2000), false); // not running
});

test('nextFallbackModel returns first untried model, else null', () => {
  assert.equal(nextFallbackModel(['a', 'b', 'c'], ['a']), 'b');
  assert.equal(nextFallbackModel(['a', 'b'], ['a', 'b']), null);
  assert.equal(nextFallbackModel([], ['a']), null);
});

test('budgetState flips to soft-exceeded at the soft limit', () => {
  assert.equal(budgetState(0, 899000, 900000), 'within');
  assert.equal(budgetState(0, 900000, 900000), 'soft-exceeded');
  assert.equal(DEFAULTS.softBudgetMs, 900000); // 15 min
});

test('summarizeProgress counts statuses + reassignments', () => {
  const arms = [
    { status: 'done', triedModels: ['a'] },
    { status: 'running', triedModels: ['b', 'b2'] }, // reassigned
    { status: 'failed', triedModels: ['c', 'c2', 'c3'] }, // reassigned
    { status: 'stalled', triedModels: ['d'] },
  ];
  const s = summarizeProgress(arms);
  assert.deepEqual(s, { total: 4, running: 1, done: 1, failed: 1, stalled: 1, reassigned: 2 });
});

test('mergePartials collates done arms + dedupes citations', () => {
  const arms = [
    { id: 'a1', model: 'm1', status: 'done', result: { answer: 'A', citations: ['https://x.com', 'https://y.com'] } },
    { id: 'a2', model: 'm2', status: 'running' },
    { id: 'a3', model: 'm3', status: 'done', result: { answer: 'C', citations: ['https://y.com', 'https://z.com'] } },
  ];
  const m = mergePartials(arms);
  assert.equal(m.completed, 2);
  assert.equal(m.pending, 1);
  assert.deepEqual(m.citations, ['https://x.com', 'https://y.com', 'https://z.com']);
  assert.equal(m.answers.length, 2);
});

test('buildCheckpoint emits the resumable v1 schema', () => {
  const state = {
    query: 'q', startedAtIso: 't0', updatedAtIso: 't1', softBudgetMs: 900000, budgetState: 'within',
    arms: [{ id: 'a1', model: 'm1', status: 'done', triedModels: ['m1'], lastProgressAt: 5, result: { answer: 'x', citations: [] } }],
  };
  const c = buildCheckpoint(state);
  assert.equal(c.schema, 'research-checkpoint/v1');
  assert.equal(c.query, 'q');
  assert.equal(c.progress.done, 1);
  assert.equal(c.arms[0].has_result, true);
  assert.ok(c.synthesis); // incremental synthesis embedded
});

test('buildHandoffDoc is resumable markdown with arms + resume section', () => {
  const state = {
    query: 'find X', startedAtIso: 't0', updatedAtIso: 't1', softBudgetMs: 900000, budgetState: 'soft-exceeded',
    arms: [{ id: 'a1', model: 'm1', status: 'running', triedModels: ['m1', 'm1b'], lastProgressAt: 5, result: null }],
  };
  const md = buildHandoffDoc(state);
  assert.match(md, /# Research handoff/);
  assert.match(md, /Resume from here/);
  assert.match(md, /m1 → m1b/); // reassignment trail shown
  assert.match(md, /find X/);
});

// --- driver integration (fake clock + dispatch) ---

test('orchestrate: reassigns a rejecting arm to its fallback, completes', async () => {
  const calls = [];
  const dispatch = (arm) => {
    calls.push(arm.model);
    if (arm.model === 'bad') return Promise.reject(new Error('boom'));
    return Promise.resolve({ answer: `ok ${arm.model}`, citations: ['https://s.com'], cost_usd: 0 });
  };
  const res = await orchestrate({
    query: 'q',
    armSpecs: [{ id: 'a1', model: 'bad', profileModels: ['bad', 'good'] }],
    dispatch,
    tickMs: 5,
    stallMs: 100000,
    softBudgetMs: 100000,
  });
  assert.ok(calls.includes('good')); // reassigned after 'bad' rejected
  assert.equal(res.arms[0].status, 'done');
  assert.deepEqual(res.arms[0].triedModels, ['bad', 'good']);
});

test('orchestrate: rejects empty or malformed armSpecs', async () => {
  await assert.rejects(
    () => orchestrate({ query: 'q', armSpecs: [], dispatch: () => Promise.resolve({}) }),
    /non-empty array/
  );
  await assert.rejects(
    () => orchestrate({ query: 'q', armSpecs: [{ id: 'a1' }], dispatch: () => Promise.resolve({}) }),
    /id and a model/
  );
});

test('orchestrate: a stale dispatch resolving after stall→reassign does not clobber the arm', async () => {
  // arm-1's first model hangs (never resolves) until aborted, tripping the stall
  // path -> reassign to the fallback, which resolves cleanly. If the original
  // (stale) launch later resolved, its result must be ignored.
  let resolveStale;
  const dispatch = (arm, ctx) => {
    if (arm.model === 'slow') {
      return new Promise((resolve) => {
        resolveStale = () => resolve({ answer: 'STALE', citations: [] });
        ctx.signal.addEventListener('abort', () => {}); // ignores abort on purpose
      });
    }
    return Promise.resolve({ answer: `fresh ${arm.model}`, citations: ['https://ok.com'] });
  };
  const res = await orchestrate({
    query: 'q',
    armSpecs: [{ id: 'a1', model: 'slow', profileModels: ['slow', 'fast'] }],
    dispatch,
    tickMs: 5,
    stallMs: 1, // trip stall almost immediately
    softBudgetMs: 100000,
  });
  // Now fire the stale resolution after the run completed; it must be a no-op.
  if (resolveStale) resolveStale();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(res.arms[0].status, 'done');
  assert.equal(res.arms[0].result.answer, 'fresh fast'); // not 'STALE'
  assert.deepEqual(res.arms[0].triedModels, ['slow', 'fast']);
});

test('orchestrate: onSoftBudget stop halts the run', async () => {
  let asked = false;
  const dispatch = () => new Promise(() => {}); // never resolves -> stays running
  const res = await orchestrate({
    query: 'q',
    armSpecs: [{ id: 'a1', model: 'm', profileModels: ['m'] }],
    dispatch,
    tickMs: 5,
    stallMs: 100000, // don't trip stall
    softBudgetMs: 1, // immediately soft-exceeded
    onSoftBudget: async () => { asked = true; return 'stop'; },
  });
  assert.equal(asked, true);
  assert.equal(res.stopped, true);
});

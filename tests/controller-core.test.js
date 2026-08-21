'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  DEFAULTS,
  DEFAULT_MODEL_CHAIN,
  runStartMs,
  isProtected,
  classifyRun,
  selectPreemptions,
  nextModel,
  planPreemptions,
  summarizeFleet,
  buildControllerFeed,
  buildStopSignal,
  hasStop,
  evaluate,
} = require('../scripts/controller/core');

const MIN = 60 * 1000;
const now = Date.parse('2026-06-30T12:00:00Z');
const iso = (msAgo) => new Date(now - msAgo).toISOString();

test('DEFAULTS are frozen and sane', () => {
  assert.equal(DEFAULTS.stallMs, 15 * MIN);
  assert.equal(DEFAULTS.maxRunMs, 60 * MIN);
  assert.throws(() => { DEFAULTS.stallMs = 1; }, TypeError);
});

test('runStartMs prefers run_started_at, falls back to created_at, else null', () => {
  assert.equal(runStartMs({ run_started_at: iso(0) }), now);
  assert.equal(runStartMs({ created_at: iso(0) }), now);
  assert.equal(runStartMs({}), null);
});

test('isProtected shields the immune system + the controller itself', () => {
  assert.equal(isProtected({ path: '.github/workflows/self-healing.yml' }), true);
  assert.equal(isProtected({ path: '.github/workflows/fleet-controller.yml' }), true);
  assert.equal(isProtected({ name: 'BIOME Sentinel', path: '.github/workflows/biome-sentinel.yml' }), true);
  assert.equal(isProtected({ path: '.github/workflows/some-research-arm.yml', name: 'Research Arm' }), false);
});

test('classifyRun: completed run is done', () => {
  const c = classifyRun({ id: 1, status: 'completed', conclusion: 'success' }, now);
  assert.equal(c.health, 'done');
});

test('classifyRun: queued run is a pending trigger', () => {
  const c = classifyRun({ id: 2, status: 'queued' }, now);
  assert.equal(c.health, 'queued');
});

test('classifyRun: in_progress within budget is healthy', () => {
  const c = classifyRun({ id: 3, status: 'in_progress', run_started_at: iso(5 * MIN), updated_at: iso(1 * MIN) }, now);
  assert.equal(c.health, 'healthy');
});

test('classifyRun: no update past stallMs is stalled', () => {
  const c = classifyRun({ id: 4, status: 'in_progress', run_started_at: iso(20 * MIN), updated_at: iso(16 * MIN) }, now);
  assert.equal(c.health, 'stalled');
  assert.match(c.reason, /no progress/);
});

test('classifyRun: past maxRunMs is runaway (takes priority over stall)', () => {
  const c = classifyRun({ id: 5, status: 'in_progress', run_started_at: iso(75 * MIN), updated_at: iso(75 * MIN) }, now);
  assert.equal(c.health, 'runaway');
  assert.match(c.reason, /budget/);
});

test('selectPreemptions cuts stalled + runaway but never protected', () => {
  const classified = [
    { id: 1, health: 'healthy', protected: false },
    { id: 2, health: 'stalled', protected: false },
    { id: 3, health: 'runaway', protected: false },
    { id: 4, health: 'runaway', protected: true }, // protected => spared
    { id: 5, health: 'queued', protected: false },
  ];
  const cut = selectPreemptions(classified);
  assert.deepEqual(cut.map((c) => c.id), [2, 3]);
});

test('summarizeFleet rolls up occupancy + over-capacity', () => {
  const classified = [
    { status: 'in_progress', health: 'healthy', protected: false },
    { status: 'in_progress', health: 'stalled', protected: false },
    { status: 'queued', health: 'queued', protected: false },
    { status: 'completed', health: 'done', protected: false },
  ];
  const s = summarizeFleet(classified, { ...DEFAULTS, occupancyCap: 1 });
  assert.equal(s.running, 2);
  assert.equal(s.queued, 1);
  assert.equal(s.done, 1);
  assert.equal(s.stalled, 1);
  assert.equal(s.occupancy, 2);
  assert.equal(s.overCapacity, true); // 2 running > cap 1
});

test('buildControllerFeed emits the v1 schema with dry-run cut labels', () => {
  const classified = [classifyRun({ id: 7, status: 'in_progress', name: 'X', run_started_at: iso(20 * MIN), updated_at: iso(16 * MIN) }, now)];
  const preemptions = planPreemptions(selectPreemptions(classified));
  const feed = buildControllerFeed({ classified, preemptions, preemptEnabled: false, generatedAtIso: iso(0) });
  assert.equal(feed.schema, 'fleet-controller/v1');
  assert.equal(feed.preempt_enabled, false);
  assert.equal(feed.orchestrators.length, 1);
  assert.equal(feed.preemptions[0].cut, 'would-cancel'); // dry-run label
  assert.equal(feed.preemptions[0].planned, 'reassign'); // first cut => reassign, not kill
});

test('nextModel returns the first untried model, else null', () => {
  assert.equal(nextModel(['a', 'b', 'c'], ['a']), 'b');
  assert.equal(nextModel(['a', 'b'], ['a', 'b']), null);
});

test('planPreemptions: cut+reassign up to the cap, then escalate to self-healing', () => {
  const cut = [{ id: 9, path: '.github/workflows/foo.yml', health: 'stalled', reason: 'no progress for 16m', headBranch: 'main' }];
  // fresh => reassign to chain[0] (derived from the chain, never hardcoded)
  const first = planPreemptions(cut)[0];
  assert.equal(first.action, 'reassign');
  assert.equal(first.nextModel, DEFAULT_MODEL_CHAIN[0]);
  assert.equal(first.reassignCount, 1);
  assert.equal(first.ref, 'main');
  // already reassigned twice with two models tried => escalate
  const exhausted = planPreemptions(cut, {
    priorReassigns: { '.github/workflows/foo.yml': { count: 2, tried: DEFAULT_MODEL_CHAIN.slice(0, 2) } },
  })[0];
  assert.equal(exhausted.action, 'escalate');
  assert.match(exhausted.reason, /exhausted/);
});

test('DEFAULT_MODEL_CHAIN honours the SSOT model policy (twins + Fable 5, no denylisted models)', () => {
  // Drift-proof: read the denylist straight from .github/agent-models.yml so
  // this test fails the moment a banned model (Sonnet family, auto/fusion)
  // sneaks back into the controller's reassignment chain.
  const fs = require('fs');
  const path = require('path');
  const YAML = require('yaml');
  const ssot = YAML.parse(fs.readFileSync(path.join(__dirname, '..', '.github', 'agent-models.yml'), 'utf8'));
  const denyRes = (ssot.denylist || []).map((d) =>
    new RegExp(`^${String(d.pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
  );
  assert.ok(denyRes.length >= 2, 'SSOT denylist should exist');
  for (const model of DEFAULT_MODEL_CHAIN) {
    for (const re of denyRes) {
      assert.ok(!re.test(model), `${model} is denylisted by ${re}`);
    }
  }
  // The owner's standing policy: Opus 5/4.8 twins first, Fable 5 reasoning.
  // Twins rolled forward from 4.8/4.7 on 2026-08-21 (see agent-models.yml
  // house rules). The pattern is what is pinned here, not the version pair:
  // current Opus primary, one version back as the fallback.
  assert.deepEqual(DEFAULT_MODEL_CHAIN.slice(0, 2), ['anthropic/claude-opus-5', 'anthropic/claude-opus-4.8']);
  assert.equal(DEFAULT_MODEL_CHAIN[2], 'anthropic/claude-fable-5');
});

test('evaluate is a pure node: feed + stop + self-healing ingestion', () => {
  const runs = [
    { id: 1, status: 'in_progress', name: 'Healthy', path: '.github/workflows/a.yml', run_started_at: iso(2 * MIN), updated_at: iso(1 * MIN) },
    { id: 2, status: 'in_progress', name: 'Stalled', path: '.github/workflows/b.yml', run_started_at: iso(30 * MIN), updated_at: iso(20 * MIN) },
    { id: 3, status: 'in_progress', name: 'SelfHeal', path: '.github/workflows/self-healing.yml', run_started_at: iso(90 * MIN), updated_at: iso(90 * MIN) },
  ];
  // arm b as already-exhausted so it lands in ingestion
  const out = evaluate(runs, now, {
    preemptEnabled: true,
    priorReassigns: { '.github/workflows/b.yml': { count: 2, tried: DEFAULT_MODEL_CHAIN.slice(0, 2) } },
  });
  assert.equal(out.feed.schema, 'fleet-controller/v1');
  assert.equal(out.ingestion.schema, 'fleet-controller-ingestion/v1');
  // b escalates -> ingestion; self-healing run (protected) is never cut
  assert.equal(out.ingestion.needs_healing.length, 1);
  assert.equal(out.ingestion.needs_healing[0].id, 2);
  assert.ok(!out.preemptions.some((p) => p.path && p.path.includes('self-healing')));
});

test('buildStopSignal + hasStop round-trip', () => {
  const stop = buildStopSignal([{ id: 42, name: 'Y', reason: 'stalled' }], iso(0));
  assert.equal(stop.schema, 'fleet-controller-stop/v1');
  assert.equal(hasStop(stop, 42), true);
  assert.equal(hasStop(stop, '42'), true); // string/number tolerant
  assert.equal(hasStop(stop, 99), false);
  assert.equal(hasStop(null, 1), false);
});

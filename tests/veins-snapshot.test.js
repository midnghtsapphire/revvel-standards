'use strict';

/**
 * Unit tests for scripts/veins-snapshot.js
 * Pins frequency analysis, effectiveness index, snapshot builder, and report renderer.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const path     = require('node:path');
const fs       = require('node:fs');

const {
  buildSnapshot,
  renderReport,
  frequencyStats,
  effectivenessIndex,
} = require('../scripts/veins-snapshot');

// ── fixtures ─────────────────────────────────────────────────────────────────

const STUB_CONTENT = `# VEINS Heal Proposal

**Title:** Flaky workflow candidate: 🎛️ PR State Orchestrator

> Opened by **V.E.I.N.S.** self-healing engine
**Severity:** 🟢 \`low\`
**Source:** \`workflow_run\` — <https://github.com/midnghtsapphire/revvel-standards/actions/runs/28634026490>
**Hypothesis:** Workflow "🎛️ PR State Orchestrator" flipped pass/fail 3× in the last 8 runs.
**Component:** \`🎛️ PR State Orchestrator\`
Heal event id: \`FLAKY-🎛️ PR S\`

---

_This file was committed by the VEINS engine as a human-reviewable proposal. Edit or replace with the real patch on this branch before merging._
`;

const ACTIONED_CONTENT = `# VEINS Heal Proposal

**Title:** Patched workflow

**Component:** \`Some Workflow\`
**Severity:** 🔴 \`high\`
**Source:** \`workflow_run\` — <https://github.com/midnghtsapphire/revvel-standards/actions/runs/12300000001>
Heal event id: \`FLAKY-some-wf\`

Real fix applied here — stub marker removed.
`;

const ISO_DATES_RECENT = [
  '2026-07-03T13:49:52+00:00',  // newest
  '2026-07-02T05:52:09+00:00',
  '2026-07-01T23:04:13+00:00',  // oldest
];

const FINGERPRINT = {
  schema: 'bnat-fingerprint/v1',
  generated_at: '2026-08-21T01:30:41.878Z',
  dim_H0: 1,
  dim_H1: 3,
  energy: 0,
  consistent: true,
  obstruction: true,
  long_lived_h1_count: 0,
};

// ── frequencyStats ────────────────────────────────────────────────────────────

test('frequencyStats returns null for empty input', () => {
  assert.strictEqual(frequencyStats([]), null);
  assert.strictEqual(frequencyStats(null), null);
});

test('frequencyStats computes span and avg interval', () => {
  const stats = frequencyStats(ISO_DATES_RECENT);
  assert.ok(stats !== null);
  assert.strictEqual(stats.total_commits, 3);
  assert.strictEqual(stats.span_days, 2);  // ~2 days between 2026-07-01 and 2026-07-03
  assert.ok(typeof stats.avg_interval_hours === 'number');
});

test('frequencyStats: first/last commit are ISO strings', () => {
  const stats = frequencyStats(ISO_DATES_RECENT);
  assert.match(stats.first_commit, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(stats.last_commit,  /^\d{4}-\d{2}-\d{2}T/);
  // first_commit < last_commit (oldest → newest)
  assert.ok(new Date(stats.first_commit) < new Date(stats.last_commit));
});

test('frequencyStats: single commit has null avg interval', () => {
  const stats = frequencyStats(['2026-07-03T13:49:52+00:00']);
  assert.strictEqual(stats.span_days, 0);
  assert.strictEqual(stats.avg_interval_hours, null);
});

// ── effectivenessIndex ────────────────────────────────────────────────────────

test('effectivenessIndex: 100 for zero proposals', () => {
  const analysis = { total: 0, stubs: 0, repeat_firing: [] };
  assert.strictEqual(effectivenessIndex(analysis, 0), 100);
});

test('effectivenessIndex: all stubs drops score by 50', () => {
  const analysis = { total: 2, stubs: 2, repeat_firing: [] };
  // stubRate = 1 → −50; no repeat-firing; silence 0 days → 50
  assert.strictEqual(effectivenessIndex(analysis, 0), 50);
});

test('effectivenessIndex: repeat-firing drops score by 30', () => {
  const analysis = { total: 2, stubs: 0, repeat_firing: [{ component: 'X', count: 3, unique_runs: 2 }] };
  // no stubs (0), repeat-firing (−30), silence 0 → 70
  assert.strictEqual(effectivenessIndex(analysis, 0), 70);
});

test('effectivenessIndex: silence > 30 days drops score by 20', () => {
  const analysis = { total: 0, stubs: 0, repeat_firing: [] };
  assert.strictEqual(effectivenessIndex(analysis, 31), 80);
});

test('effectivenessIndex: minimum is 0 (does not go negative)', () => {
  const analysis = { total: 4, stubs: 4, repeat_firing: [{ component: 'X', count: 3, unique_runs: 2 }] };
  const score = effectivenessIndex(analysis, 60);
  assert.ok(score >= 0);
});

// ── buildSnapshot ─────────────────────────────────────────────────────────────

test('buildSnapshot: healthy when no proposals and engine recently active', () => {
  // Use a commit date within the last 7 days so daysSilent is low.
  const recentDate = new Date(Date.now() - 3 * 86400000).toISOString();
  const snap = buildSnapshot([], [recentDate], null, new Date().toISOString());
  assert.strictEqual(snap.status, 'healthy');
  assert.strictEqual(snap.what.total_proposals, 0);
  assert.strictEqual(snap.effectiveness.stub_unactioned, 0);
});

test('buildSnapshot: down when all stubs', () => {
  const snap = buildSnapshot([STUB_CONTENT, STUB_CONTENT], ISO_DATES_RECENT, null, '2026-07-03T14:00:00Z');
  assert.strictEqual(snap.status, 'down');
  assert.strictEqual(snap.effectiveness.stub_unactioned, 2);
  assert.strictEqual(snap.effectiveness.actioned, 0);
  assert.strictEqual(snap.effectiveness.stub_rate_pct, 100);
});

test('buildSnapshot: mixed stub + actioned lowers stub_rate_pct', () => {
  const snap = buildSnapshot([STUB_CONTENT, ACTIONED_CONTENT], ISO_DATES_RECENT, null, '2026-07-03T14:00:00Z');
  assert.strictEqual(snap.effectiveness.stub_unactioned, 1);
  assert.strictEqual(snap.effectiveness.actioned, 1);
  assert.strictEqual(snap.effectiveness.stub_rate_pct, 50);
});

test('buildSnapshot: includes sheaf topology when fingerprint provided', () => {
  const snap = buildSnapshot([], ISO_DATES_RECENT, FINGERPRINT, '2026-07-03T14:00:00Z');
  assert.ok(snap.sheaf_topology !== null);
  assert.strictEqual(snap.sheaf_topology.dim_H0, 1);
  assert.strictEqual(snap.sheaf_topology.dim_H1, 3);
});

test('buildSnapshot: sheaf_topology is null when no fingerprint', () => {
  const snap = buildSnapshot([], ISO_DATES_RECENT, null, '2026-07-03T14:00:00Z');
  assert.strictEqual(snap.sheaf_topology, null);
});

test('buildSnapshot: commit history populated from dates', () => {
  const snap = buildSnapshot([], ISO_DATES_RECENT, null, '2026-07-03T14:00:00Z');
  assert.ok(snap.how_frequently.commit_history !== null);
  assert.strictEqual(snap.how_frequently.unique_veins_runs, 0);
});

test('buildSnapshot: schema field is veins-snapshot/v1', () => {
  const snap = buildSnapshot([], [], null, '2026-07-03T14:00:00Z');
  assert.strictEqual(snap.schema, 'veins-snapshot/v1');
});

// ── renderReport ──────────────────────────────────────────────────────────────

test('renderReport: contains all three section headers', () => {
  const snap = buildSnapshot([STUB_CONTENT], ISO_DATES_RECENT, FINGERPRINT, '2026-07-03T14:00:00Z');
  const report = renderReport(snap);
  assert.ok(report.includes('1. WHAT IS VEINS CHANGING'), 'missing section 1');
  assert.ok(report.includes('2. HOW FREQUENTLY'),         'missing section 2');
  assert.ok(report.includes('3. ARE THEY DOING ANYTHING'), 'missing section 3');
});

test('renderReport: flags unactioned stubs', () => {
  const snap = buildSnapshot([STUB_CONTENT], ISO_DATES_RECENT, null, '2026-07-03T14:00:00Z');
  const report = renderReport(snap);
  assert.ok(report.includes('All proposals are stubs'), report);
});

test('renderReport: flags repeat-firing component', () => {
  // Three stubs from same component → repeat-firing
  const snap = buildSnapshot(
    [STUB_CONTENT, STUB_CONTENT, STUB_CONTENT],
    ISO_DATES_RECENT,
    null,
    '2026-07-03T14:00:00Z'
  );
  const report = renderReport(snap);
  assert.ok(report.includes('repeat-firing'), report);
});

test('renderReport: sheaf topology section present when fingerprint provided', () => {
  const snap = buildSnapshot([], ISO_DATES_RECENT, FINGERPRINT, '2026-07-03T14:00:00Z');
  const report = renderReport(snap);
  assert.ok(report.includes('SHEAF TOPOLOGY'), report);
  assert.ok(report.includes('dim H'), report);
});

// ── live integration: run against the repo's own .veins/proposals/ ────────────

test('live: snapshot script can run against real proposals directory', () => {
  const proposalsDir = path.join(__dirname, '..', '.veins', 'proposals');
  if (!fs.existsSync(proposalsDir)) return; // skip if not present

  const files = fs.readdirSync(proposalsDir).filter((f) => f.endsWith('.md'));
  const contents = files.map((f) => fs.readFileSync(path.join(proposalsDir, f), 'utf8'));
  const snap = buildSnapshot(contents, [], null, new Date().toISOString());

  assert.strictEqual(snap.schema, 'veins-snapshot/v1');
  assert.ok(['healthy', 'degraded', 'down'].includes(snap.status));
  assert.ok(snap.what.total_proposals === files.length);
});

test('live: real proposals are all stubs for 🎛️ PR State Orchestrator', () => {
  const proposalsDir = path.join(__dirname, '..', '.veins', 'proposals');
  if (!fs.existsSync(proposalsDir)) return;

  const files = fs.readdirSync(proposalsDir).filter((f) => f.endsWith('.md'));
  const contents = files.map((f) => fs.readFileSync(path.join(proposalsDir, f), 'utf8'));
  const snap = buildSnapshot(contents, [], null, new Date().toISOString());

  assert.ok(snap.effectiveness.actioned === 0, 'expected no actioned proposals yet');
  assert.ok(snap.effectiveness.stub_unactioned === files.length, 'all proposals should be stubs');
  assert.ok(snap.what.targets.length > 0, 'at least one component targeted');
});

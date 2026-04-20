#!/usr/bin/env node
// Unit tests for scripts/fork-audit-bot.js
// Run: node tests/scripts/fork-audit-bot.test.js
//
// Keeps to the same style as tests/scripts/check-compliance.test.js:
// plain `assert`, no framework dependency.

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Prevent main() from executing when required.
const originalMain = require.main;
require.main = null;
const {
  scoreRepo,
  recencyScore,
  goalTagAlignmentBonus,
  buildAuditBody,
  loadConfig,
  ROUTING_LABELS,
} = require('../../scripts/fork-audit-bot.js');
require.main = originalMain;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// ─── scoreRepo ───────────────────────────────────────────────

test('scoreRepo throws on invalid repo', () => {
  assert.throws(() => scoreRepo(null, {}), /repo must be an object/);
  assert.throws(() => scoreRepo('not-an-object', {}), /repo must be an object/);
});

test('scoreRepo returns clamped total between 0 and 100', () => {
  // Absurdly large repo — still must clamp.
  const repo = {
    stargazers_count: 1e9,
    forks_count: 1e9,
    open_issues_count: 0,
    license: { spdx_id: 'MIT' },
    pushed_at: new Date().toISOString(),
    topics: ['secrets', 'vault', 'dx'],
    description: 'secrets vault dx',
  };
  const r = scoreRepo(repo, { strategic_value: 10, goal_tags: ['secrets'] });
  assert.ok(r.total <= 100, `total ${r.total} must be <= 100`);
  assert.ok(r.total >= 0, `total ${r.total} must be >= 0`);
  assert.strictEqual(r.band, 'A — upstream PR');
});

test('scoreRepo applies archived penalty', () => {
  const base = {
    stargazers_count: 500,
    forks_count: 100,
    open_issues_count: 5,
    license: { spdx_id: 'MIT' },
    pushed_at: new Date().toISOString(),
  };
  const live = scoreRepo(base, { strategic_value: 5 });
  const archived = scoreRepo(Object.assign({}, base, { archived: true }), {
    strategic_value: 5,
  });
  assert.ok(archived.total < live.total, 'archived repo should score lower');
  assert.strictEqual(archived.breakdown.archivedPenalty, -25);
});

test('scoreRepo treats NOASSERTION as unlicensed', () => {
  const r = scoreRepo(
    {
      stargazers_count: 100,
      forks_count: 10,
      open_issues_count: 1,
      license: { spdx_id: 'NOASSERTION' },
      pushed_at: new Date().toISOString(),
    },
    { strategic_value: 3 },
  );
  assert.strictEqual(r.breakdown.license, 0);
});

test('scoreRepo handles missing fields gracefully', () => {
  const r = scoreRepo({}, {});
  assert.strictEqual(Number.isFinite(r.total), true);
  assert.ok(r.total >= 0 && r.total <= 100);
  assert.ok(typeof r.band === 'string' && r.band.length > 0);
});

test('scoreRepo band thresholds', () => {
  // Force a low-score repo: old, unlicensed, zero strategic.
  const low = scoreRepo(
    {
      stargazers_count: 1,
      forks_count: 0,
      open_issues_count: 200,
      pushed_at: '2018-01-01T00:00:00Z',
    },
    { strategic_value: 0 },
  );
  assert.ok(
    low.band === 'D — skip' || low.band === 'C — mirror issue only',
    `unexpected band ${low.band}`,
  );
});

// ─── recencyScore ────────────────────────────────────────────

test('recencyScore — recent push scores 15', () => {
  assert.strictEqual(recencyScore(new Date().toISOString()), 15);
});

test('recencyScore — missing / invalid returns 0', () => {
  assert.strictEqual(recencyScore(undefined), 0);
  assert.strictEqual(recencyScore('not-a-date'), 0);
});

test('recencyScore — old push returns 0', () => {
  assert.strictEqual(recencyScore('2010-01-01T00:00:00Z'), 0);
});

// ─── goalTagAlignmentBonus ───────────────────────────────────

test('goalTagAlignmentBonus — no tags = 0', () => {
  assert.strictEqual(goalTagAlignmentBonus({}, {}), 0);
  assert.strictEqual(goalTagAlignmentBonus({}, { goal_tags: [] }), 0);
});

test('goalTagAlignmentBonus — capped at 15', () => {
  const bonus = goalTagAlignmentBonus(
    {
      description: 'ai ml llm copilot vault secrets dx',
      topics: ['ai', 'ml', 'llm'],
    },
    { goal_tags: ['ai', 'ml', 'llm', 'copilot', 'vault', 'secrets', 'dx'] },
  );
  assert.strictEqual(bonus, 15);
});

test('goalTagAlignmentBonus — partial match', () => {
  const bonus = goalTagAlignmentBonus(
    { description: 'a secrets manager', topics: [] },
    { goal_tags: ['secrets', 'spaceships'] },
  );
  assert.strictEqual(bonus, 5);
});

// ─── buildAuditBody ──────────────────────────────────────────

test('buildAuditBody contains required routing references', () => {
  const body = buildAuditBody({
    cand: { repo: 'foo/bar', goal_tags: ['x'], notes: 'nb', strategic_value: 7 },
    repo: {
      stargazers_count: 10,
      forks_count: 1,
      open_issues_count: 0,
      pushed_at: '2026-04-01T00:00:00Z',
      license: { spdx_id: 'MIT' },
      default_branch: 'main',
    },
    score: scoreRepo(
      {
        stargazers_count: 10,
        forks_count: 1,
        open_issues_count: 0,
        pushed_at: '2026-04-01T00:00:00Z',
        license: { spdx_id: 'MIT' },
      },
      { strategic_value: 7 },
    ),
  });
  assert.ok(body.includes('Fork-Audit Report'));
  assert.ok(body.includes('foo/bar'));
  assert.ok(body.includes('OPENROUTER_ASSIGNEE_PROCESS.md'));
  assert.ok(body.includes('Rubric breakdown'));
});

// ─── ROUTING_LABELS ──────────────────────────────────────────

test('ROUTING_LABELS includes every required routing signal', () => {
  // These are consumed by openrouter-assignee.yml / ralph-loop.yml.
  for (const required of [
    'openrouter',
    'auto-fix',
    'copilot',
    'role:orchestrator',
    'fork-audit',
  ]) {
    assert.ok(
      ROUTING_LABELS.includes(required),
      `missing routing label: ${required}`,
    );
  }
});

test('ROUTING_LABELS is frozen', () => {
  assert.ok(Object.isFrozen(ROUTING_LABELS));
});

// ─── loadConfig ──────────────────────────────────────────────

test('loadConfig parses the shipped candidates.json', () => {
  const cfg = loadConfig(
    path.join(__dirname, '..', '..', 'fork-audit', 'candidates.json'),
  );
  assert.ok(Array.isArray(cfg.candidates));
  assert.ok(cfg.candidates.length > 0);
  assert.ok(Number.isFinite(cfg.defaults.mirror_issue_when_score_gte));
});

test('loadConfig rejects missing candidates[]', () => {
  const tmp = path.join(os.tmpdir(), 'fork-audit-bad.json');
  fs.writeFileSync(tmp, JSON.stringify({ defaults: {} }));
  try {
    assert.throws(() => loadConfig(tmp), /missing candidates/);
  } finally {
    fs.unlinkSync(tmp);
  }
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

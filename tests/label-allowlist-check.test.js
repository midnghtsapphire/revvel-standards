'use strict';

/**
 * Regression tests for config/labels-allowlist.yml + scripts/label-allowlist-check.mjs.
 *
 * Weekly audit #16947 found Tier A PR #16929 blocked solely because fleet bots
 * apply bare `ready-to-merge`, which was missing from the post-#16944 allowlist.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const ALLOWLIST_PATH = path.join(REPO_ROOT, 'config', 'labels-allowlist.yml');
const CHECKER_PATH = path.join(REPO_ROOT, 'scripts', 'label-allowlist-check.mjs');

function runChecker(args, env = {}) {
  return spawnSync(process.execPath, [CHECKER_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('labels-allowlist.yml parses with the real yaml package', () => {
  const cfg = yaml.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  assert.ok(cfg);
  assert.ok(Array.isArray(cfg.labels));
  assert.ok(cfg.labels.length > 0);
  assert.ok(Number.isFinite(cfg.max_labels_total));
  assert.ok(cfg.labels.length <= cfg.max_labels_total);
});

test('allowlist stays at or under max_labels_total (≤80)', () => {
  const cfg = yaml.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const names = cfg.labels.map((l) => (typeof l === 'string' ? l : l.name));
  assert.equal(new Set(names).size, names.length, 'duplicate label names');
  assert.ok(names.length <= cfg.max_labels_total);
});

test('fleet merge-routing labels are first-class allowlist entries', () => {
  const cfg = yaml.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const names = new Set(cfg.labels.map((l) => (typeof l === 'string' ? l : l.name)));
  for (const required of [
    'ready-to-merge',
    'work-request',
    'has-conflicts',
    'review:stuck',
    'approved',
    'checks-passing',
    'checks-failing',
  ]) {
    assert.ok(names.has(required), `missing first-class label: ${required}`);
  }
});

test('strict checker accepts bare ready-to-merge (regression for #16929)', () => {
  const result = runChecker(['--strict', 'ready-to-merge']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /ok: all labels allowed or mapped/);
});

test('strict checker accepts the #16929 live label soup after allowlist fix', () => {
  const labels = [
    'copilot',
    'openrouter',
    'priority-p1',
    'role:orchestrator',
    'approved',
    'checks-passing',
    'ready-to-merge',
    'status:approved',
    'status:checks-failing',
  ].join(',');
  const result = runChecker(['--strict'], { LABELS: labels });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('status:ready-to-merge maps to ready-to-merge (not default in-review)', () => {
  const result = runChecker(['--strict', 'status:ready-to-merge']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /status:ready-to-merge → ready-to-merge/,
  );
});

test('strict checker still rejects truly unknown labels', () => {
  const result = runChecker(['--strict', 'this-label-should-never-exist-zz']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /UNKNOWN labels/);
});

/**
 * Regression for the WR-PR governance gate.
 *
 * `wr-pr-creation.yml` copies `jules`, `research-engine` and every
 * `research:*` lane from the WR issue onto the WR PR. `pr-governance-checks.yml`
 * then runs `label-allowlist-check.mjs --strict` over that PR's labels with no
 * `|| true`, so each of those unallowlisted names failed the gate the moment
 * the PR was opened — every WR PR was born red.
 */
test('strict checker accepts the label set wr-pr-creation.yml puts on a WR PR', () => {
  const labels = [
    'weekly-research',
    'work-request',
    'deep-research',
    'openrouter',
    'role:orchestrator',
    'jules',
    'bito-ai',
    'awaiting-review',
    'wr:in-progress',
    // wr-pr-creation.yml derives this from the WR's Output Type
    // (production-app -> deliver:app) and applies it to the PR too.
    'deliver:app',
    'research-engine',
    'research:marketing',
    'research:seo',
    'research:competitors',
    'research:chatter',
    'research:facts',
    'research:technical',
    'research:revenue',
    'research:reviewer',
    'research:repo-web',
    'research:complete',
    'research:blocked',
    'research:review-needed',
  ].join(',');
  const result = runChecker(['--strict'], { LABELS: labels });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('research: lanes resolve by prefix, so a brand-new lane cannot re-break the gate', () => {
  const result = runChecker(['--strict', 'research:some-lane-invented-tomorrow']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /research:some-lane-invented-tomorrow → research \(research: prefix\)/);
});

test('research:blocked and research:review-needed keep their distinct meaning', () => {
  const blocked = runChecker(['--strict', 'research:blocked']);
  assert.equal(blocked.status, 0, blocked.stderr || blocked.stdout);
  assert.match(blocked.stdout, /research:blocked → blocked/);

  const review = runChecker(['--strict', 'research:review-needed']);
  assert.equal(review.status, 0, review.stderr || review.stdout);
  assert.match(review.stdout, /research:review-needed → in-review/);
});

test('first-class label count is pinned, not just checked against the budget', () => {
  const cfg = yaml.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const names = cfg.labels.map((l) => (typeof l === 'string' ? l : l.name));
  assert.equal(cfg.max_labels_total, 80);
  // Pinned, not just `<= 80`: an under-budget check still passes while more
  // first-class labels are spent. Spending budget must be deliberate and update
  // this number.
  //
  // 77 → 80 in #17737: the `issue:*` lifecycle triad took the last three slots.
  // The budget is now fully spent, so the next addition must alias, add a
  // prefix rule, become a Project field, or make the case for raising the cap
  // in writing. This assertion is what makes that unavoidable, and it fired on
  // exactly the change it was written for.
  assert.equal(
    names.length,
    80,
    `allowlist is ${names.length} labels, expected 80. `
      + `If you deliberately added a first-class label, update this count — `
      + `and note that the budget is spent, so you also need to raise the cap.`,
  );
});

test('deliver:* resolves by prefix — WR PRs carry one per Output Type', () => {
  for (const label of [
    'deliver:app',
    'deliver:pdf',
    'deliver:docs',
    'deliver:api',
    'deliver:cli',
    'deliver:docker',
    'deliver:package',
    'deliver:mcp',
    'deliver:video',
  ]) {
    const result = runChecker(['--strict', label]);
    assert.equal(result.status, 0, `${label}: ${result.stderr || result.stdout}`);
    assert.match(result.stdout, new RegExp(`${label} → automation \\(deliver: prefix\\)`));
  }
});

test('research:reviewer stays a research lane and is not read as a review state', () => {
  const result = runChecker(['--strict', 'research:reviewer']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /research:reviewer → research \(research: prefix\)/);
  assert.doesNotMatch(result.stdout, /research:reviewer → in-review/);
});

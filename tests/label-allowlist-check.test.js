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

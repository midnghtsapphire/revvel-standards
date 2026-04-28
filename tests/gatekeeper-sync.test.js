#!/usr/bin/env node
'use strict';

/**
 * Tests for scripts/gatekeeper-sync.sh
 *
 * The script can't reach Doppler in unit tests, so we exercise the parts we
 * can verify deterministically:
 *   1. --help exits 0 and prints usage
 *   2. Invalid args (missing --secrets) exit non-zero
 *   3. DRY_RUN=1 + --json emits a parseable JSON summary with the expected
 *      shape and de-duplicates / trims the input list
 *   4. The script is referenced by the credential-gatekeeper workflow
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'gatekeeper-sync.sh');
const WORKFLOW = path.resolve(
  __dirname, '..', '.github', 'workflows', 'credential-gatekeeper.yml'
);

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS: ${name}`); passed++; }
  catch (e) { console.log(`FAIL: ${name}\n    ${e.stack || e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertEq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg || 'mismatch'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}

test('script file exists and is executable on non-Windows platforms', () => {
  const stat = fs.statSync(SCRIPT);
  assert(stat.isFile(), 'not a file');
  if (process.platform !== 'win32') {
    assert((stat.mode & 0o111) !== 0, 'not executable');
  }
});

test('--help exits 0 and prints usage', () => {
  const out = execFileSync(SCRIPT, ['--help'], { encoding: 'utf8' });
  assert(/--secrets/.test(out), 'help text missing --secrets');
  assert(/--repo/.test(out), 'help text missing --repo');
});

test('missing --secrets exits non-zero', () => {
  const r = spawnSync(SCRIPT, ['--repo', 'foo/bar'], { encoding: 'utf8' });
  assert(r.status !== 0, `expected non-zero exit, got ${r.status}`);
  assert(/--secrets is required/.test(r.stderr), 'expected error about --secrets');
});

test('malformed --repo exits non-zero', () => {
  const r = spawnSync(SCRIPT, ['--secrets', 'X', '--repo', 'noslash'], { encoding: 'utf8' });
  assert(r.status !== 0, 'expected non-zero exit');
  assert(/owner\/repo/.test(r.stderr), 'expected owner/repo error');
});

test('DRY_RUN --json dedupes, trims, and emits expected JSON shape', () => {
  const r = spawnSync(SCRIPT,
    ['--secrets', 'OPENROUTER_API_KEY, DIGITALOCEAN_API_TOKEN ,, OPENROUTER_API_KEY',
     '--repo', 'midnghtsapphire/revvel-standards', '--json'],
    { encoding: 'utf8', env: { ...process.env, DRY_RUN: '1' } });
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  // The JSON line is the last non-empty line of stdout.
  const lines = r.stdout.trim().split('\n').filter(Boolean);
  const summary = JSON.parse(lines[lines.length - 1]);
  assertEq(summary.repo, 'midnghtsapphire/revvel-standards', 'repo');
  assertEq(summary.project, 'revvel-standards', 'project (default)');
  assertEq(summary.config, 'prd', 'config (default)');
  assertEq(summary.synced, ['OPENROUTER_API_KEY', 'DIGITALOCEAN_API_TOKEN'], 'synced (deduped, trimmed)');
  assertEq(summary.missing_in_doppler, [], 'missing_in_doppler');
  assertEq(summary.failed, [], 'failed');
});

test('credential-gatekeeper workflow invokes gatekeeper-sync.sh', () => {
  const wf = fs.readFileSync(WORKFLOW, 'utf8');
  assert(/scripts\/gatekeeper-sync\.sh/.test(wf),
    'credential-gatekeeper.yml does not reference scripts/gatekeeper-sync.sh');
  assert(/auto-provision/.test(wf),
    'credential-gatekeeper.yml is missing the auto-provision job');
  assert(/types: \[opened, reopened, labeled\]/.test(wf),
    'credential-gatekeeper.yml is not wired to issues: opened/reopened');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

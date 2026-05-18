#!/usr/bin/env node
'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'agent-self-heal.js');
const WEEKLY_RESEARCH = path.join(REPO_ROOT, '.github', 'workflows', 'weekly-research.yml');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

test('agent self-heal script exists and is executable', () => {
  const stat = fs.statSync(SCRIPT);
  assert(stat.isFile(), 'script is not a file');
  if (process.platform !== 'win32') {
    assert((stat.mode & 0o111) !== 0, 'script is not executable');
  }
});

test('credential failures route to backup harness and fallback labels', () => {
  const out = execFileSync(SCRIPT, [
    '--component',
    'goap/credential-gatekeeper',
    '--error',
    'Doppler token missing and OPENROUTER_API_KEY secret unavailable',
    '--json',
  ], { encoding: 'utf8' });
  const packet = JSON.parse(out);
  assert(packet.recovery_rules.includes('credential-backup'), 'packet should classify credential backup');
  for (const label of ['auto-fix', 'ralph-loop', 'agent-fallback']) {
    assert(packet.labels.includes(label), `packet missing ${label}`);
  }
  assert(packet.actions.some((action) => action.includes('credential-backup-harness')), 'packet should recommend backup harness');
});

test('agent timeouts route through fallback chain', () => {
  const out = execFileSync(SCRIPT, [
    '--component',
    'OpenHands',
    '--error',
    'Agent unavailable: timeout after no response',
    '--json',
  ], { encoding: 'utf8' });
  const packet = JSON.parse(out);
  assert(packet.recovery_rules.includes('agent-timeout'), 'packet should classify timeout');
  assert(packet.actions.some((action) => action.includes('OpenHands -> Cursor -> OpenRouter')), 'packet should recommend fallback chain');
});

test('weekly-research workflow invokes self-heal packet on OpenRouter failure', () => {
  const wf = fs.readFileSync(WEEKLY_RESEARCH, 'utf8');
  assert(wf.includes('scripts/agent-self-heal.js'), 'weekly research should call self-heal script');
  assert(wf.includes('--component "weekly-research/openrouter-triage"'), 'weekly research should identify failing component');
  assert(!wf.includes('Manual research coordination may be needed'), 'workflow should not leave a manual-only failure comment');
});

test('missing required args fail clearly', () => {
  const result = spawnSync(SCRIPT, ['--component', 'goap'], { encoding: 'utf8' });
  assert(result.status !== 0, 'expected non-zero exit');
  assert(result.stderr.includes('--error is required'), 'expected missing error message');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

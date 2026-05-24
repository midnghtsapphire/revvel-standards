'use strict';

const assert = require('assert');
const { parseArgs, buildContract } = require('../scripts/self-heal-contract');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed += 1;
  }
}

test('parseArgs parses CLI flags', () => {
  const args = parseArgs([
    'node',
    'self-heal-contract.js',
    '--component',
    'workflow-monitor/retry',
    '--error',
    'rerun verification failed',
    '--issue',
    '123',
    '--repo',
    'midnghtsapphire/revvel-standards',
    '--workflow',
    'workflow-monitor.yml',
    '--run-id',
    '999',
    '--action',
    'auto-rerun',
    '--verification',
    'run-detection',
  ]);

  assert.strictEqual(args.component, 'workflow-monitor/retry');
  assert.strictEqual(args.issue, '123');
  assert.strictEqual(args.runId, '999');
  assert.strictEqual(args.verification, 'run-detection');
});

test('buildContract includes needs-human label when error is present', () => {
  const contract = buildContract({
    component: 'weekly-research/openrouter-triage',
    error: 'triage failed',
    issue: '42',
    repo: 'midnghtsapphire/revvel-standards',
    workflow: 'weekly-research.yml',
    runId: '456',
    action: 'fallback-route',
    verification: 'manual',
  });

  assert.strictEqual(contract.component, 'weekly-research/openrouter-triage');
  assert.strictEqual(contract.issue_number, '42');
  assert.strictEqual(contract.incident.action_taken, 'fallback-route');
  assert.strictEqual(contract.verification.required, true);
  assert.ok(contract.incident.labels.includes('needs-human'));
});

test('buildContract omits needs-human label when error is not provided', () => {
  const contract = buildContract({
    component: 'agent-monitor/health-check',
    error: '',
    action: 'noop',
    verification: 'manual',
  });

  assert.strictEqual(contract.incident.error, null);
  assert.ok(!contract.incident.labels.includes('needs-human'));
});

if (failed > 0) {
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`${passed} passed, ${failed} failed`);

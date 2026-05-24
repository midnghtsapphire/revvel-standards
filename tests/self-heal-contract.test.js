'use strict';

const assert = require('assert');
const { parseArgs, buildContract } = require('../scripts/self-heal-contract');

function testParseArgs() {
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
  console.log('ok parse args');
}

function testBuildContract() {
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
  console.log('ok build contract');
}

testParseArgs();
testBuildContract();
console.log('self-heal-contract: all tests passed');

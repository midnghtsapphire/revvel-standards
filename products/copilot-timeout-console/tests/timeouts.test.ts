import assert from 'node:assert/strict';
import {
  FLOOR_MINUTES,
  POLICY,
  TARGET_CATALOG,
  answerLine,
  classifyTimeout,
  humanSteps,
  shippedReport,
  verifyCommands,
} from '../lib/timeouts';

function run() {
  assert.equal(FLOOR_MINUTES, 60);
  assert.equal(POLICY.floor_minutes, 60);
  assert.equal(POLICY.recommended_ceiling_minutes, 90);
  assert.match(POLICY.error_signature, /10m0s/);

  assert.equal(classifyTimeout(null).ok, false);
  assert.equal(classifyTimeout(10).label, 'below-floor');
  assert.equal(classifyTimeout(60).label, 'at-floor');
  assert.equal(classifyTimeout(90).label, 'above-floor');

  const report = shippedReport(new Date('2026-08-20T00:00:00.000Z'));
  assert.equal(report.ok, true);
  assert.equal(report.total, TARGET_CATALOG.length);
  assert.equal(report.passed, TARGET_CATALOG.length);
  assert.match(answerLine(report), /YES/);
  assert.ok(TARGET_CATALOG.some((t) => t.id === 'agent-fallback'));
  assert.ok(TARGET_CATALOG.some((t) => t.id === 'openrouter-coder'));
  assert.ok(TARGET_CATALOG.every((t) => t.expected_minutes >= 60));

  const steps = humanSteps();
  assert.ok(steps.length >= 4);
  assert.ok(steps.every((s) => s.id && s.title && s.detail));

  const cmds = verifyCommands();
  assert.ok(cmds.some((c) => c.includes('copilot-timeout-audit')));

  console.log('copilot-timeout-console tests: ok');
}

run();

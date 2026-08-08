import assert from 'node:assert/strict';
import {
  SURFACE_CATALOG,
  answerLine,
  buildReport,
  externalSetupSteps,
  isMergeMeBotLogin,
  isMergeMeInstallation,
  shippedReport,
} from '../lib/wiring';

{
  assert.ok(SURFACE_CATALOG.length >= 8);
  const ids = new Set(SURFACE_CATALOG.map((s) => s.id));
  assert.ok(ids.has('connections-registry'));
  assert.ok(ids.has('status-workflow'));
  assert.ok(ids.has('status-product'));
}

{
  const empty = buildReport({});
  assert.equal(empty.wired, false);
  assert.equal(empty.passed, 0);
  assert.match(answerLine(empty), /^NO/);
}

{
  const full = shippedReport();
  assert.equal(full.wired, true);
  assert.equal(full.passed, full.total);
  assert.match(answerLine(full), /^YES/);
  assert.match(full.summary, /IS wired/);
}

{
  assert.equal(isMergeMeInstallation({ app_slug: 'mergeme-app' }), true);
  assert.equal(isMergeMeInstallation({ name: 'Merge Me' }), true);
  assert.equal(isMergeMeInstallation({ app_slug: 'vercel' }), false);
  assert.equal(isMergeMeBotLogin('mergeme[bot]'), true);
  assert.equal(isMergeMeBotLogin('copilot'), false);
}

{
  const steps = externalSetupSteps();
  assert.ok(steps.length >= 5);
  assert.ok(steps.every((s) => s.href.startsWith('https://')));
}

console.log('✅ mergeme-status wiring tests passed.');

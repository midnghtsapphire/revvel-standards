'use strict';

/**
 * Regression tests for MergeMe.dev wiring (WR #16824).
 * Would have failed before the wiring surfaces landed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const mm = require('../scripts/mergeme-wiring');

test('auditWiring on the real repo reports fully wired after ship', () => {
  const report = mm.auditWiring();
  assert.equal(typeof report.wired, 'boolean');
  assert.equal(report.total, mm.REQUIRED_SURFACES.length);
  assert.equal(report.passed, report.surfaces.filter((s) => s.ok).length);
  assert.ok(report.score.includes('/'));
  assert.match(report.summary, /MergeMe\.dev/i);
  // After this PR lands all surfaces, wired must be true.
  assert.equal(
    report.wired,
    true,
    `expected full wiring, missing: ${report.surfaces
      .filter((s) => !s.ok)
      .map((s) => s.id)
      .join(', ')}`
  );
});

test('auditWiring fails closed on an empty temp tree', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mergeme-wiring-'));
  try {
    const report = mm.auditWiring(tmp);
    assert.equal(report.wired, false);
    assert.equal(report.passed, 0);
    assert.ok(report.surfaces.every((s) => s.ok === false));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('isMergeMeInstallation recognizes marketplace slug variants', () => {
  assert.equal(mm.isMergeMeInstallation({ app_slug: 'mergeme-app' }), true);
  assert.equal(mm.isMergeMeInstallation({ app_slug: 'mergeme' }), true);
  assert.equal(mm.isMergeMeInstallation({ name: 'MergeMe App' }), true);
  assert.equal(mm.isMergeMeInstallation({ app_slug: 'octopus-review' }), false);
  assert.equal(mm.isMergeMeInstallation(null), false);
});

test('isMergeMeBotLogin matches bot logins only', () => {
  assert.equal(mm.isMergeMeBotLogin('mergeme-app[bot]'), true);
  assert.equal(mm.isMergeMeBotLogin('MergeMe[bot]'), true);
  assert.equal(mm.isMergeMeBotLogin('midnghtsapphire'), false);
  assert.equal(mm.isMergeMeBotLogin(''), false);
});

test('renderMarkdownReport includes answer line and surface table', () => {
  const report = mm.auditWiring();
  const md = mm.renderMarkdownReport(report);
  assert.match(md, /MergeMe\.dev wiring status/);
  assert.match(md, /Answer:/);
  assert.match(md, /Connections registry entry/);
  assert.match(md, /mergeme\.dev/i);
  assert.match(md, /https:\/\/mergeme\.dev/);
});

test('externalSetupSteps are non-empty actionable URLs', () => {
  const steps = mm.externalSetupSteps();
  assert.ok(steps.length >= 4);
  for (const step of steps) {
    assert.ok(step.id && step.title && step.href && step.detail);
    assert.match(step.href, /^https:\/\//);
  }
});

test('connections.yml carries a mergeme app entry used by the workflow', () => {
  const yml = fs.readFileSync(path.join(__dirname, '../config/connections.yml'), 'utf8');
  assert.match(yml, /^\s*-\s*id:\s*mergeme\s*$/m);
  assert.match(yml, /mergeme-status\.yml/);
  assert.match(yml, /mergeme\.dev/i);
});

test('mergeme-status workflow is valid YAML-shaped Actions file', () => {
  const wf = fs.readFileSync(
    path.join(__dirname, '../.github/workflows/mergeme-status.yml'),
    'utf8'
  );
  assert.match(wf, /^name:\s+/m);
  assert.match(wf, /^on:/m);
  assert.match(wf, /mergeme-wiring\.js/);
  assert.match(wf, /workflow_dispatch/);
});

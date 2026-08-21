'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const WF_PATH = path.join(__dirname, '..', '.github', 'workflows', 'wr-field-filler.yml');
const wf = yaml.parse(fs.readFileSync(WF_PATH, 'utf8'));

// GitHub Actions YAML parses `on:` as boolean `true` on some YAML libraries,
// but the `yaml` npm package used here preserves the string key. Guard both.
const triggers = wf.on || wf.true || {};

test('wr-field-filler triggers on issue events (intake path)', () => {
  assert.ok(triggers.issues, 'issues trigger must exist');
  const types = triggers.issues.types || [];
  for (const t of ['opened', 'edited', 'labeled']) {
    assert.ok(types.includes(t), `issues.types must include "${t}"`);
  }
});

test('wr-field-filler self-heals on downstream failure via workflow_run', () => {
  // The main reason this trigger exists: a WR that fails wr-pr-creation
  // because a field is blank must be picked up automatically. Without this
  // trigger, the filler only runs on issue events and the owner has to
  // rerun by hand.
  const wr = triggers.workflow_run;
  assert.ok(wr, 'workflow_run trigger must exist for self-heal loop');
  assert.ok(Array.isArray(wr.workflows), 'workflow_run.workflows must be an array');
  assert.ok(wr.workflows.includes('WR PR Creation'), 'must listen to WR PR Creation failures');
  assert.ok(wr.workflows.includes('WR Lint'), 'must listen to WR Lint failures');
});

test('wr-field-filler runs a scheduled sweep for stragglers', () => {
  // COST FREEZE 2026-08-21: the schedule is commented out in the workflow,
  // preserved in place (RVS-AGENT-001) rather than deleted. ~496 scheduled
  // runs/day across 46 workflows drove the Actions bill on a repo with no
  // product traffic. tests/no-scheduled-workflows.test.js is the guard that
  // keeps it off; this assertion is inverted to match that decision, so a
  // silent re-enable fails here too.
  assert.strictEqual(triggers.schedule, undefined, 'schedule must stay frozen (cost freeze)');
  // The 15-minute sweep was 96 runs/day on its own. Stragglers are now picked
  // up by the issues / workflow_run triggers, or by a manual dispatch.
  const source = fs.readFileSync(WF_PATH, 'utf8');
  assert.match(source, /^\s*#\s*schedule:/m,
    'the frozen sweep schedule must remain in the file, commented, so it can be restored');
  assert.match(source, /^\s*#\s*-\s*cron:/m,
    'the frozen cron expression must remain, commented, so the cadence is recoverable');
});

test('wr-field-filler exposes workflow_dispatch for manual runs', () => {
  assert.ok(triggers.workflow_dispatch, 'workflow_dispatch must exist for manual runs');
});

test('wr-field-filler permissions grant issues:write and actions:write', () => {
  // issues:write is needed to edit body + add label; actions:write is
  // needed so the filler can re-dispatch the failed downstream workflow
  // as part of the self-heal loop.
  const perms = wf.permissions || {};
  assert.strictEqual(perms.issues, 'write', 'issues: write is required for the fill step');
  assert.strictEqual(perms.actions, 'write', 'actions: write is required to re-dispatch downstream workflows');
});

test('wr-field-filler toggles wr:reset after a successful fill (self-heal loop)', () => {
  // The label toggle is what closes the loop: wr-pr-creation.yml watches
  // for `wr:reset` as its self-heal signal. Without this step, a filled WR
  // still needs a human to poke it. Regression-guard by asserting the step
  // exists and references the label.
  const jobs = wf.jobs || {};
  const fillJob = jobs.fill || jobs['fill'];
  assert.ok(fillJob, 'fill job must exist');
  const steps = fillJob.steps || [];
  const toggleStep = steps.find((s) => /wr:reset/i.test(String(s.run || '')));
  assert.ok(toggleStep, 'a step must run gh issue edit --add-label wr:reset');
  const runScript = String(toggleStep.run);
  assert.match(runScript, /--remove-label\s+["']?wr:reset/, 'must remove wr:reset first (label cycle)');
  assert.match(runScript, /--add-label\s+["']?wr:reset/, 'must re-add wr:reset to trigger downstream');
});

test('wr-field-filler skips when the triggering workflow_run was successful', () => {
  // Idempotency: workflow_run fires on EVERY completion, not just failures.
  // A green run must be a no-op so we do not thrash the API on every
  // successful downstream execution.
  const jobs = wf.jobs || {};
  const discover = jobs.discover;
  assert.ok(discover, 'discover job must exist');
  const skipStep = (discover.steps || []).find((s) =>
    /conclusion\s*!=\s*'failure'/.test(String(s.if || '')),
  );
  assert.ok(skipStep, 'discover must have a step guarded by conclusion != failure');
});

test('wr-field-filler uses ADMIN_GITHUB_TOKEN fallback (CLAUDE.md gotcha #2)', () => {
  // A default GITHUB_TOKEN cannot trigger downstream workflows; the ADMIN
  // PAT can. The whole point of this workflow is to trigger downstream
  // work, so it MUST use the fallback pattern.
  const raw = fs.readFileSync(WF_PATH, 'utf8');
  assert.match(
    raw,
    /ADMIN_GITHUB_TOKEN\s*!=\s*''\s*&&\s*secrets\.ADMIN_GITHUB_TOKEN\s*\|\|\s*secrets\.GITHUB_TOKEN/,
    'must use the standard ADMIN_GITHUB_TOKEN-with-fallback pattern',
  );
});

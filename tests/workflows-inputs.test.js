'use strict';

/**
 * Regression guards for WR recovery dispatch contracts (WR #17736).
 *
 * Both documented recovery paths used to be no-ops:
 *  - reset-self-heal-issue dispatched openrouter-assignee with no issue_number
 *  - wr-pr-creation documented --field issue_number but declared no inputs
 *  - the reset comment claimed Ralph Loop would re-evaluate even when nothing ran
 *
 * These tests pin the inputs callers/docs pass, the fields the reset actually
 * forwards, and the requirement that success text is conditional on dispatch.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WF = (name) => path.join(ROOT, '.github/workflows', name);

function loadWorkflow(name) {
  const raw = fs.readFileSync(WF(name), 'utf8');
  return { raw, doc: yaml.parse(raw) };
}

function dispatchInputs(doc) {
  const on = doc?.on ?? doc?.true;
  const wd = on?.workflow_dispatch;
  if (wd === undefined || wd === null) return null;
  if (wd === true) return {};
  return wd.inputs || {};
}

test('openrouter-assignee.yml declares workflow_dispatch.issue_number', () => {
  const { doc } = loadWorkflow('openrouter-assignee.yml');
  const inputs = dispatchInputs(doc);
  assert.ok(inputs, 'workflow_dispatch must be declared');
  assert.ok(inputs.issue_number, 'must declare issue_number for targeted reset');
  assert.equal(inputs.issue_number.required, false);
  assert.equal(inputs.issue_number.type, 'string');
  assert.ok(inputs.dry_run, 'dry_run input must remain');
});

test('openrouter-assignee.yml force-reroutes targeted dispatch even with openrouter label', () => {
  const { raw } = loadWorkflow('openrouter-assignee.yml');
  assert.match(
    raw,
    /FORCE_REROUTE:\s*\$\{\{\s*github\.event_name\s*==\s*'workflow_dispatch'/,
    'targeted dispatch must set FORCE_REROUTE'
  );
  assert.match(raw, /forceReroute/, 'check step must read FORCE_REROUTE');
  assert.match(
    raw,
    /labels\.includes\('openrouter'\)\s*&&\s*!forceReroute/,
    'openrouter idempotency skip must be bypassed on force re-route'
  );
  assert.match(
    raw,
    /github\.event\.inputs\.issue_number/,
    'concurrency group must key targeted dispatches by issue_number'
  );
});

test('openrouter-triage.yml declares workflow_dispatch.issue_number and a targeted job', () => {
  const { doc, raw } = loadWorkflow('openrouter-triage.yml');
  const inputs = dispatchInputs(doc);
  assert.ok(inputs, 'workflow_dispatch must be declared');
  assert.ok(inputs.issue_number, 'must declare issue_number for targeted reset');
  assert.ok(
    doc.jobs['targeted-triage'],
    'must have a targeted-triage job for issue_number dispatch'
  );
  assert.match(
    String(doc.jobs['targeted-triage'].if || ''),
    /workflow_dispatch/,
    'targeted-triage runs on workflow_dispatch'
  );
  assert.match(
    String(doc.jobs['targeted-triage'].if || ''),
    /issue_number/,
    'targeted-triage requires issue_number'
  );
  // Sweep must not fan out on every targeted reset.
  assert.match(
    raw,
    /inputs\.issue_number\s*==\s*''/,
    'sweep-discover must skip when issue_number is provided'
  );
  assert.match(
    raw,
    /node scripts\/openrouter-triage\.js/,
    'targeted path must run the triage script'
  );
});

test('wr-pr-creation.yml declares required workflow_dispatch.issue_number', () => {
  const { doc, raw } = loadWorkflow('wr-pr-creation.yml');
  const inputs = dispatchInputs(doc);
  assert.ok(inputs, 'workflow_dispatch must be declared with inputs (not null)');
  assert.ok(inputs.issue_number, 'must declare issue_number so playbook §1 works');
  assert.equal(inputs.issue_number.required, true);
  assert.equal(inputs.issue_number.type, 'string');
  assert.match(
    raw,
    /github\.event\.inputs\.issue_number/,
    'concurrency group already assumes inputs.issue_number'
  );
});

test('reset-self-heal-issue.yml passes issue_number to assignee and triage', () => {
  const { doc, raw } = loadWorkflow('reset-self-heal-issue.yml');
  const inputs = dispatchInputs(doc);
  assert.ok(inputs?.issue_number, 'reset itself takes issue_number');
  assert.equal(inputs.issue_number.required, true);

  assert.match(
    raw,
    /gh workflow run openrouter-assignee\.yml[\s\S]*--field ["']?issue_number=/,
    'must pass issue_number into openrouter-assignee.yml'
  );
  assert.match(
    raw,
    /gh workflow run openrouter-triage\.yml[\s\S]*--field ["']?issue_number=/,
    'must pass issue_number into openrouter-triage.yml (produces triage comment)'
  );
  assert.match(raw, /assignee_success=/, 'must track assignee dispatch outcome');
  assert.match(raw, /triage_success=/, 'must track triage dispatch outcome');
});

test('reset-self-heal-issue.yml does not claim downstream work it did not dispatch', () => {
  const { raw } = loadWorkflow('reset-self-heal-issue.yml');

  // Success path must be gated on dispatch outcomes.
  assert.match(raw, /TRIGGER_SUCCESS/, 'comment step must read trigger outcome');
  assert.match(raw, /ASSIGNEE_SUCCESS/, 'comment must distinguish assignee dispatch');
  assert.match(raw, /TRIAGE_SUCCESS/, 'comment must distinguish triage dispatch');
  assert.match(raw, /needs-human/, 'failed dispatch must label needs-human');
  assert.match(raw, /core\.setFailed/, 'failed dispatch must fail the job');

  // Forbidden overclaims from the pre-fix comment (WR #17736 defect 2).
  assert.doesNotMatch(
    raw,
    /The Ralph Loop will now re-evaluate/,
    'must not assert Ralph Loop will run — dispatch ≠ completion'
  );
  assert.doesNotMatch(
    raw,
    /attempt to fix this issue/,
    'must not promise a fix that the reset workflow itself does not perform'
  );

  // Success copy must only claim dispatch, not completion.
  assert.match(
    raw,
    /were \*dispatched\*/,
    'success comment must state dispatches only'
  );
});

test('playbook §1/§2 document the issue_number fields callers must pass', () => {
  const playbook = fs.readFileSync(
    path.join(ROOT, 'docs/playbooks/wr-manual-processes.md'),
    'utf8'
  );

  assert.match(
    playbook,
    /gh workflow run wr-pr-creation\.yml[\s\S]*--field issue_number=/,
    '§1 CLI must pass issue_number'
  );
  assert.match(
    playbook,
    /gh workflow run reset-self-heal-issue\.yml[\s\S]*--field issue_number=/,
    '§2 CLI must pass issue_number'
  );
  assert.match(
    playbook,
    /openrouter-triage\.yml/,
    '§2 must document the triage dispatch (not assignee alone)'
  );
  assert.match(
    playbook,
    /needs-human/,
    'playbook must mention needs-human on failed reset'
  );
  assert.doesNotMatch(
    playbook,
    /so Ralph Loop picks it up again/,
    'playbook must not repeat the false Ralph Loop claim'
  );
});

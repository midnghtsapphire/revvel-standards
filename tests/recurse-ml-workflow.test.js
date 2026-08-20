'use strict';

/**
 * Drift guard for the RecurseML review lane (DECISIONS.md D014, reversing D007).
 *
 * D007 cut RecurseML on the rationale "RECURSE_ML_API_KEY absent → no results
 * posted; zero unique catches". That measured the workflow lane, which without
 * the secret could not post anything by construction — while the RecurseML
 * GitHub App posted its `recurseml/analysis` check independently of this file
 * and never needed that secret. The App kept running through the entire cut and
 * was never in the sample. D014 restores the lane on that correction.
 *
 * These tests exist so the lane cannot be silently re-cut: disabling the
 * triggers again must come with a new decision entry, not a quiet edit.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'recurse-ml.yml');
const DECISIONS_PATH = path.join(REPO_ROOT, 'DECISIONS.md');

function loadWorkflow() {
  const doc = yaml.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  // `on:` is the YAML 1.1 boolean `true` after parsing unless quoted.
  return { doc, on: doc.on ?? doc[true] };
}

test('recurse-ml.yml parses as valid YAML', () => {
  const { doc } = loadWorkflow();
  assert.ok(doc, 'workflow did not parse');
  assert.ok(doc.jobs, 'workflow has no jobs');
  assert.ok(doc.jobs['recurse-ml-review'], 'primary scan job is missing');
});

test('RecurseML auto-triggers are enabled (D014 restored what D007 disabled)', () => {
  const { on } = loadWorkflow();
  assert.ok(on, 'workflow has no trigger block');
  assert.ok(
    on.pull_request,
    'pull_request trigger is disabled — if this is deliberate, add a new '
      + 'DECISIONS.md entry reversing D014 rather than editing this file quietly',
  );
  assert.deepEqual(
    [...(on.pull_request.types || [])].sort(),
    ['opened', 'reopened', 'synchronize'],
    'pull_request types drifted from the set D007 originally disabled',
  );
  assert.ok(on.push, 'push trigger is disabled');
  assert.ok(
    (on.push.branches || []).includes('main'),
    'push trigger no longer covers main',
  );
  // Kept alongside the auto-triggers so on-demand scans still work.
  assert.ok(on.workflow_dispatch !== undefined, 'workflow_dispatch was dropped');
});

test('a missing RECURSE_ML_API_KEY no-ops instead of failing the run', () => {
  // This is what makes restoring the triggers safe regardless of secret state:
  // without it, re-enabling would paint every PR red when the key is unset.
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const scanStep = raw.slice(raw.indexOf('Run RecurseML Analysis'));
  const guard = scanStep.slice(0, scanStep.indexOf('Determine the diff target'));
  assert.match(guard, /if \[ -z "\$RECURSE_ML_API_KEY" \]/, 'key-absent guard is gone');
  assert.match(guard, /exit 0/, 'key-absent path no longer exits 0');
});

test('DECISIONS.md records D014 and still preserves the superseded D007', () => {
  const decisions = fs.readFileSync(DECISIONS_PATH, 'utf8');
  assert.match(decisions, /\|\s*D014\s*\|/, 'D014 is missing from the decisions log');
  assert.match(
    decisions,
    /D014.*RecurseML/s,
    'D014 does not reference RecurseML',
  );
  // RVS-PRESERVE-001: superseded decisions are preserved, never rewritten away.
  assert.match(decisions, /\|\s*D007\s*\|/, 'D007 was removed — supersede, do not delete');
});

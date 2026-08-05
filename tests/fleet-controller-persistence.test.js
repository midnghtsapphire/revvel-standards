'use strict';

// Regression tests for the fleet-controller state-persistence lanes.
//
// Symptoms these lock in (all seen in PR #16864):
//   1. A bad merge left two `run:` keys on one step, so the whole workflow file
//      became unparseable YAML and every scheduled run died at load time.
//   2. The state-PR fallback fell back to `secrets.GITHUB_TOKEN`. PRs authored by
//      the default token never start the required checks (CLAUDE.md gotcha #3),
//      so the state PR could never merge and controller state stalled forever.
//   3. `gh pr merge` interpolated a `${{ }}` expression straight into `run:`,
//      which zizmor flags as template injection.
//   4. `create-pull-request` without `add-paths` commits the whole tree, so any
//      future controller artifact would silently ride along in the state PR.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'fleet-controller.yml');
const source = fs.readFileSync(WORKFLOW, 'utf8');

test('fleet-controller.yml parses with unique keys', () => {
  const doc = YAML.parseDocument(source);
  assert.deepEqual(
    doc.errors.map((e) => e.message),
    [],
    'duplicate/invalid YAML keys make GitHub reject the whole workflow'
  );
});

const workflow = YAML.parse(source);
const steps = workflow.jobs['schedule-grid'].steps;
const stepByName = (name) => steps.find((s) => s.name === name);

test('no step declares both run and uses', () => {
  for (const step of steps) {
    assert.ok(
      !(step.run && step.uses),
      `step "${step.name}" has both run and uses — GitHub rejects the workflow`
    );
  }
});

test('state-PR fallback never falls back to GITHUB_TOKEN', () => {
  const token = workflow.jobs['schedule-grid'].env.STATE_PR_TOKEN;
  assert.match(token, /ADMIN_GITHUB_TOKEN/);
  assert.doesNotMatch(
    token,
    /GITHUB_TOKEN\s*\}\}|secrets\.GITHUB_TOKEN/,
    'GITHUB_TOKEN-authored PRs never start required checks, so the state PR would never merge'
  );

  const pr = stepByName('Open or update controller-state PR');
  assert.equal(pr.with.token, '${{ env.STATE_PR_TOKEN }}');
  assert.match(pr.if, /env\.STATE_PR_TOKEN != ''/, 'skip the PR lane when no PAT is configured');
});

test('state PR commits only the controller state files', () => {
  const pr = stepByName('Open or update controller-state PR');
  assert.equal(pr.with['add-paths'], 'docs/controller/*.json');
});

test('auto-merge passes the PR number through env, not template expansion', () => {
  const merge = stepByName('Enable auto-merge on controller-state PR');
  assert.doesNotMatch(merge.run, /\$\{\{/, 'inline ${{ }} in run: is a template-injection sink');
  assert.match(merge.run, /"\$PR_NUMBER"/);
  assert.equal(merge.env.PR_NUMBER, '${{ steps.state_pr.outputs.pull-request-number }}');
});

test('an unpersisted state change fails the job instead of reporting green', () => {
  const guard = stepByName('Verify controller state was persisted');
  assert.match(guard.if, /steps\.persist\.outcome == 'failure'/);
  assert.match(guard.if, /steps\.state_pr\.outcome != 'success'/);
  assert.match(guard.run, /exit 1/);
});

test('the direct-push lane is non-fatal so the PR fallback can still run', () => {
  const persist = stepByName('Commit controller state');
  assert.equal(persist.id, 'persist');
  assert.equal(persist['continue-on-error'], true);
});

test('durable state is seeded from a pending state-sync branch', () => {
  const seed = stepByName('Seed durable state from pending state-sync branch');
  assert.match(seed.run, /fleet-controller\/state-sync/);
  assert.match(seed.run, /controller-state\.json/);
});

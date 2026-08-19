#!/usr/bin/env node
'use strict';

// @permit told us things about our own workflows that were not true.
//
// Checking its 194 findings against the workflows they named turned up two
// defect classes, each confirmed against a specific file:
//
//   1. A pull request IS an issue. Commenting on a PR, labelling it or closing
//      it all go through the `issues` REST namespace and are authorised by
//      `pull-requests: write`. The detector read any `rest.issues.*` call as
//      proof the job needed `issues: write`, so docs-freshness-check.yml —
//      which holds `pull-requests: write`, calls
//      `github.rest.issues.createComment`, and demonstrably works — was
//      reported as missing a permission it does not need.
//
//   2. `uses:` steps were invisible. jobText() reads `run:` bodies and
//      `with.script:` only, so an action was never examined.
//      agent-fallback.yml's `execute` job runs
//      peter-evans/create-pull-request, which requires `pull-requests: write`,
//      and was reported as holding that scope in excess. 118 of the 165
//      excess-permission findings sat on jobs with a non-benign `uses:` step.
//
// The second is the shape worth naming: "excess" was an assertion of absence
// drawn from a scan that could not see the whole job. Same family as #17704,
// #17714, #17717 and #17718 — a report of success (here, a confident finding)
// that the work behind it does not support. A detector that cannot read a step
// must say so, which is what `unverified-permission` is for.
//
// The tests below pin both fixes AND the true positives they must not swallow:
// agent-dispatcher.yml really does run `gh workflow run` with no `actions:`
// scope, and that finding has to survive.

const test = require('node:test');
const assert = require('node:assert/strict');
const { auditPermissions } = require('../scripts/security-fleet.js');

const rulesFor = (yaml, rule) =>
  auditPermissions(yaml, 'fixture.yml').filter((f) => f.rule === rule);

// ── 1. shared issue/PR endpoints ──────────────────────────────────────────

test('commenting on a PR via rest.issues is satisfied by pull-requests: write', () => {
  const yaml = `
name: pr comment
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: 'hello',
            });
`;
  assert.deepEqual(rulesFor(yaml, 'missing-permission'), []);
});

test('labelling through the issues namespace is satisfied by either scope', () => {
  const base = (perms) => `
name: label
on: pull_request
permissions:
${perms}
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.addLabels({ labels: ['x'] });
`;
  assert.deepEqual(rulesFor(base('  pull-requests: write'), 'missing-permission'), []);
  assert.deepEqual(rulesFor(base('  issues: write'), 'missing-permission'), []);
});

test('opening a NEW issue still requires issues: write', () => {
  // The fix must not relax the one issues-namespace call a PR token cannot make.
  const yaml = `
name: open issue
on: schedule
permissions:
  contents: read
  pull-requests: write
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({ title: 't' });
`;
  const found = rulesFor(yaml, 'missing-permission');
  assert.equal(found.length, 1);
  assert.equal(found[0].scope, 'issues');
});

// ── 2. uses: steps ────────────────────────────────────────────────────────

test('an action known to need a scope makes holding that scope not excess', () => {
  const yaml = `
name: open pr
on: workflow_dispatch
permissions:
  contents: write
  pull-requests: write
jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peter-evans/create-pull-request@v6
`;
  assert.deepEqual(rulesFor(yaml, 'excess-permission'), []);
});

test('an unreadable action downgrades excess to unverified, not silence', () => {
  const yaml = `
name: unknown action
on: workflow_dispatch
permissions:
  contents: read
  issues: write
jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: some-vendor/some-action@v1
`;
  assert.deepEqual(rulesFor(yaml, 'excess-permission'), []);
  const unverified = rulesFor(yaml, 'unverified-permission');
  assert.equal(unverified.length, 1);
  assert.equal(unverified[0].scope, 'issues');
  assert.match(unverified[0].excerpt, /verify by hand/);
});

// ── 3. true positives that must survive both fixes ────────────────────────

test('a job that only checks out and runs a script still reports excess', () => {
  const yaml = `
name: idle
on: workflow_dispatch
permissions:
  contents: read
  issues: write
jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "no api calls here"
`;
  const found = rulesFor(yaml, 'excess-permission');
  assert.equal(found.length, 1);
  assert.equal(found[0].scope, 'issues');
});

test('gh workflow run without actions: write is still reported missing', () => {
  // This is agent-dispatcher.yml. It was previously written off as the
  // detector matching the literal `workflow_dispatch` trigger; it is not —
  // the job really does dispatch a workflow and really does lack the scope.
  const yaml = `
name: dispatch
on: workflow_dispatch
permissions:
  issues: write
  contents: read
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - run: gh workflow run perplexity-research-agent.yml -f issue_number=1
`;
  const found = rulesFor(yaml, 'missing-permission');
  assert.equal(found.length, 1);
  assert.equal(found[0].scope, 'actions');
});

// ── 4. an unreadable workflow is a finding, not a clean bill ──────────────

test('a workflow that does not parse is reported, not silently skipped', () => {
  // auditPermissions used to `return findings` on a parse error, so a broken
  // workflow scored zero findings and read as clean. Two fixtures in this very
  // file were invalid YAML and passed vacuously against that behaviour.
  const yaml = `
jobs:
  check:
    steps:
      - uses: actions/github-script@v7
        with:
          script: await github.rest.issues.create({ title: 't' });
`;
  const found = rulesFor(yaml, 'unparseable-workflow');
  assert.equal(found.length, 1);
  assert.match(found[0].excerpt, /no permission was checked/);
});

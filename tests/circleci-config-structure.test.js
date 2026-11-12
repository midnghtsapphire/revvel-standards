'use strict';

/**
 * Structural guard for .circleci/config.yml.
 *
 * PR #18371 (WR #18333): a merge with main spliced two jobs together.
 *   - `billing-selfhost-lint:` became an empty mapping, so CircleCI rejected
 *     the whole config and every check on the PR failed.
 *   - `billing-sql-validate`'s last `run` step had `name`/`command` twice; YAML
 *     last-key-wins silently replaced the SQL assertions with a DigitalOcean
 *     deploy command.
 *   - Workflow entries had no branch filters, so they ran on the wrong branches.
 *
 * Each of those is a merge-conflict artefact that a text merge cannot see, so
 * this test pins the invariants instead of the specific jobs:
 *   1. the file parses with NO duplicate keys (yaml `uniqueKeys`),
 *   2. every job defines an executor/docker and at least one step,
 *   3. every workflow job exists and carries a branch filter, and
 *   4. every job listed in a workflow is a defined job.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const CONFIG = path.join(__dirname, '..', '.circleci', 'config.yml');
const source = fs.readFileSync(CONFIG, 'utf8');

// `uniqueKeys` (default true) makes duplicate keys a parse error, which is the
// exact failure that hid the swapped `command:` line.
const docObj = yaml.parseDocument(source, { uniqueKeys: true });

test('config.yml parses with no errors or duplicate keys', () => {
  assert.deepEqual(
    docObj.errors.map((e) => e.message),
    [],
    'duplicate keys / YAML errors usually mean a bad merge splice',
  );
});

const doc = docObj.toJS();

test('every job has an executor (or docker) and at least one step', () => {
  for (const [name, job] of Object.entries(doc.jobs || {})) {
    assert.ok(job && typeof job === 'object', `job "${name}" is empty — CircleCI rejects the config`);
    assert.ok(
      job.executor || job.docker || job.machine || job.macos,
      `job "${name}" has no executor/docker/machine`,
    );
    assert.ok(Array.isArray(job.steps) && job.steps.length > 0, `job "${name}" has no steps`);
  }
});

test('every workflow job is defined and has a branch filter', () => {
  const jobs = doc.jobs || {};
  for (const [wfName, wf] of Object.entries(doc.workflows || {})) {
    if (wfName === 'version') continue;
    for (const entry of wf.jobs || []) {
      const [jobName, opts] = typeof entry === 'string' ? [entry, null] : Object.entries(entry)[0];
      assert.ok(jobs[jobName], `workflow "${wfName}" lists undefined job "${jobName}"`);
      const branches = opts && opts.filters && opts.filters.branches;
      assert.ok(
        branches && (branches.only || branches.ignore),
        `workflow "${wfName}" job "${jobName}" has no branches only/ignore filter — `
          + 'it would run on both PR and main',
      );
    }
  }
});

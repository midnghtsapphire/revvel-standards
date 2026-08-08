'use strict';

/**
 * Regression tests for WR-15860 — rethab/actions-lint@v1.0.0 integration.
 *
 * Guards:
 *   - the workflow file exists, parses, and wires the required action
 *   - triggers cover pull_request + push to main
 *   - timeout + permissions + failure gate are present
 *   - exclude list only names real workflow basenames and never the
 *     actions-lint workflow itself
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'actions-lint.yml');
const EXCLUDE = path.join(ROOT, '.github', 'actions-lint-exclude.txt');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');

const PINNED_SHA = 'c449a3994b36a467abb90c24a1c0d5c30b6db0d4';
const ACTION_REF = `rethab/actions-lint@${PINNED_SHA}`;

function readWorkflow() {
  assert.ok(fs.existsSync(WORKFLOW), 'actions-lint.yml must exist');
  const raw = fs.readFileSync(WORKFLOW, 'utf8');
  const doc = yaml.parse(raw);
  return { raw, doc };
}

function readExcludeBasenames() {
  assert.ok(fs.existsSync(EXCLUDE), 'actions-lint-exclude.txt must exist');
  const names = [];
  for (const line of fs.readFileSync(EXCLUDE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.replace(/#.*$/, '').trim();
    if (trimmed) names.push(trimmed);
  }
  return names;
}

test('actions-lint workflow parses with name + on triggers', () => {
  const { doc } = readWorkflow();
  assert.equal(doc.name, 'Actions Lint');
  // yaml may parse bare `on` as boolean key `true`
  const on = doc.on || doc.true;
  assert.ok(on, 'missing on: trigger');
  assert.ok(on.pull_request, 'must run on pull_request');
  assert.ok(on.push, 'must run on push');
  const pushBranches = on.push.branches || [];
  assert.ok(
    pushBranches.includes('main'),
    `push.branches must include main, got ${JSON.stringify(pushBranches)}`
  );
  assert.ok(on.workflow_dispatch !== undefined, 'must allow workflow_dispatch');
});

test('actions-lint workflow declares contents: read and job timeouts', () => {
  const { doc, raw } = readWorkflow();
  assert.equal(doc.permissions?.contents, 'read');
  assert.match(raw, /timeout-minutes:\s*\d+/);
  // Every job should declare a timeout (discover / lint / gate).
  const jobs = doc.jobs || {};
  for (const [id, job] of Object.entries(jobs)) {
    assert.ok(
      typeof job['timeout-minutes'] === 'number',
      `job ${id} missing timeout-minutes`
    );
  }
});

test('actions-lint step uses rethab/actions-lint pinned to v1.0.0 SHA', () => {
  const { raw, doc } = readWorkflow();
  assert.ok(
    raw.includes(ACTION_REF),
    `expected uses: ${ACTION_REF}`
  );
  assert.ok(
    raw.includes('# v1.0.0') || raw.includes('v1.0.0'),
    'pin comment or ref must mention v1.0.0'
  );

  // Walk steps to ensure the action is actually invoked with `files:`.
  let found = false;
  for (const job of Object.values(doc.jobs || {})) {
    for (const step of job.steps || []) {
      if (typeof step.uses === 'string' && step.uses.startsWith('rethab/actions-lint@')) {
        found = true;
        assert.equal(step.uses, ACTION_REF);
        assert.ok(step.with && step.with.files, 'files input is required by the action');
      }
    }
  }
  assert.ok(found, 'no step uses rethab/actions-lint');
});

test('actions-lint forces Node 24 for the node16 action runtime', () => {
  const { raw } = readWorkflow();
  assert.match(
    raw,
    /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*["']?true["']?/
  );
});

test('actions-lint has a stable gate job that fails on lint errors', () => {
  const { doc, raw } = readWorkflow();
  assert.ok(doc.jobs['actions-lint'], 'stable gate job `actions-lint` required');
  assert.match(raw, /One or more workflow files failed actions-lint/);
  assert.match(raw, /needs\.lint\.result/);
});

test('exclude list only names existing workflow basenames and skips self', () => {
  const excluded = readExcludeBasenames();
  assert.ok(excluded.length > 0, 'exclude list should not be empty (legacy surface)');
  assert.ok(
    !excluded.includes('actions-lint.yml'),
    'actions-lint.yml must never be excluded from itself'
  );

  const existing = new Set(
    fs
      .readdirSync(WORKFLOWS_DIR)
      .filter((f) => /\.ya?ml$/.test(f))
  );

  const missing = excluded.filter((name) => !existing.has(name));
  assert.deepEqual(
    missing,
    [],
    `exclude list references missing workflows: ${missing.join(', ')}`
  );

  // No duplicates.
  assert.equal(new Set(excluded).size, excluded.length, 'exclude list has duplicates');
});

test('at least one non-excluded workflow remains to lint', () => {
  const excluded = new Set(readExcludeBasenames());
  const remaining = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => /\.ya?ml$/.test(f) && !excluded.has(f));
  assert.ok(
    remaining.includes('actions-lint.yml'),
    'actions-lint.yml itself must be in the lint set'
  );
  assert.ok(
    remaining.length >= 1,
    'exclude list must leave at least one workflow to lint'
  );
});

test('path filters cover workflow changes on PR and main push', () => {
  const { doc } = readWorkflow();
  const on = doc.on || doc.true;
  const prPaths = on.pull_request.paths || [];
  const pushPaths = on.push.paths || [];
  for (const paths of [prPaths, pushPaths]) {
    assert.ok(
      paths.some((p) => p.includes('.github/workflows')),
      'paths must include .github/workflows/**'
    );
  }
});

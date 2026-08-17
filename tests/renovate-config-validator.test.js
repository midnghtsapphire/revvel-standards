'use strict';

// Regression guard for WR #15811 — renovate-config-validator workflow bundle.
// Would have failed if the step name, action pin, path filters, or permissions
// drifted from the definition of done.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'renovate-config-validator.yml');
const TEMPLATE = path.join(ROOT, 'templates', 'cicd', 'renovate-config-validator.yml');
const AUDIT_SCRIPT = path.join(ROOT, 'scripts', 'audit-third-party-actions.sh');
const DOCS = path.join(ROOT, 'docs', 'RENOVATE_SETUP.md');
const RENOVATE_CONFIG = path.join(ROOT, '.github', 'renovate.json5');

const ACTION_OWNER_REPO = 'suzuki-shunsuke/github-action-renovate-config-validator';
const ACTION_SHA = 'ee9f69e1f683ed0d08225086482b34fc9abe9300';
const ACTION_VERSION = 'v2.1.0';
const STEP_NAME = 'Validate Renovate Configuration';

const EXPECTED_PATH_FILTERS = [
  'renovate.json',
  'renovate.json5',
  '.renovaterc',
  '.renovaterc.json',
  '.renovaterc.json5',
  '.github/renovate.json',
  '.github/renovate.json5',
  '.github/workflows/renovate-config-validator.yml',
];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseWorkflow(filePath) {
  const raw = read(filePath);
  // yaml treats bare `on:` as boolean key `true`
  const doc = yaml.parse(raw);
  return { raw, doc };
}

function collectUses(doc) {
  const uses = [];
  for (const job of Object.values(doc.jobs || {})) {
    for (const step of job.steps || []) {
      if (typeof step.uses === 'string') uses.push(step);
    }
  }
  return uses;
}

test('workflow file exists and parses with name + on', () => {
  assert.ok(fs.existsSync(WORKFLOW), 'missing workflow file');
  const { doc } = parseWorkflow(WORKFLOW);
  assert.equal(doc.name, 'Renovate Config Validator');
  assert.ok(doc.on || doc.true, 'missing on: trigger');
});

test('workflow declares contents: read only permissions', () => {
  const { doc } = parseWorkflow(WORKFLOW);
  assert.ok(doc.permissions && typeof doc.permissions === 'object');
  assert.equal(doc.permissions.contents, 'read');
  // No write scopes — validation is read-only.
  for (const [key, value] of Object.entries(doc.permissions)) {
    if (key === 'contents') continue;
    assert.notEqual(value, 'write', `unexpected write permission: ${key}`);
  }
});

test('workflow triggers on pull_request, push to main, and workflow_dispatch', () => {
  const { doc } = parseWorkflow(WORKFLOW);
  const on = doc.on || doc.true;
  assert.ok(on.pull_request, 'missing pull_request trigger');
  assert.ok(on.push, 'missing push trigger');
  assert.ok(on.workflow_dispatch !== undefined, 'missing workflow_dispatch');
  assert.deepEqual(on.push.branches, ['main']);
});

test('path filters cover common Renovate config locations', () => {
  const { doc } = parseWorkflow(WORKFLOW);
  const on = doc.on || doc.true;
  for (const event of ['pull_request', 'push']) {
    const paths = on[event].paths || [];
    for (const expected of EXPECTED_PATH_FILTERS) {
      assert.ok(
        paths.includes(expected),
        `${event}.paths missing ${expected}`
      );
    }
  }
});

test(`workflow has a step named "${STEP_NAME}" using the pinned v2.1.0 action`, () => {
  const { raw, doc } = parseWorkflow(WORKFLOW);
  const jobs = doc.jobs || {};
  assert.ok(jobs.validate, 'expected job id "validate"');
  assert.equal(jobs.validate.name, STEP_NAME);

  const steps = jobs.validate.steps || [];
  const validateStep = steps.find((s) => s.name === STEP_NAME);
  assert.ok(validateStep, `missing step named "${STEP_NAME}"`);
  assert.equal(
    validateStep.uses,
    `${ACTION_OWNER_REPO}@${ACTION_SHA}`
  );

  // Trailing version comment must stay next to the pin so humans/Renovate
  // can see which release the SHA maps to without a git fetch.
  assert.match(
    raw,
    new RegExp(
      `${ACTION_OWNER_REPO}@${ACTION_SHA}\\s*#\\s*${ACTION_VERSION}`
    )
  );

  // Inputs required by the DoD / this repo's config location.
  assert.equal(validateStep.with.config_file_path, '.github/renovate.json5');
  assert.equal(String(validateStep.with.strict), 'true');
  assert.equal(String(validateStep.with.npm_cache), 'true');
});

test('workflow fails closed when .github/renovate.json5 is missing', () => {
  const { raw, doc } = parseWorkflow(WORKFLOW);
  const steps = doc.jobs.validate.steps || [];
  const guard = steps.find((s) => /Ensure Renovate config is present/i.test(s.name || ''));
  assert.ok(guard, 'missing presence-guard step');
  assert.ok(typeof guard.run === 'string' && guard.run.includes('.github/renovate.json5'));
  assert.match(raw, /::error::/);
});

test('workflow does not interpolate untrusted github.event.* into run: shells', () => {
  const { doc } = parseWorkflow(WORKFLOW);
  for (const job of Object.values(doc.jobs || {})) {
    for (const step of job.steps || []) {
      if (typeof step.run === 'string') {
        assert.ok(
          !/\$\{\{\s*github\.event\./.test(step.run),
          `step "${step.name}" interpolates github.event.* into run:`
        );
      }
    }
  }
});

test('template mirrors the production action pin and step name', () => {
  assert.ok(fs.existsSync(TEMPLATE), 'missing templates/cicd/renovate-config-validator.yml');
  const { raw, doc } = parseWorkflow(TEMPLATE);
  assert.equal(doc.name, 'Renovate Config Validator');
  const steps = collectUses(doc);
  const validate = steps.find((s) => s.name === STEP_NAME);
  assert.ok(validate, `template missing step "${STEP_NAME}"`);
  assert.equal(validate.uses, `${ACTION_OWNER_REPO}@${ACTION_SHA}`);
  assert.match(
    raw,
    new RegExp(`${ACTION_OWNER_REPO}@${ACTION_SHA}\\s*#\\s*${ACTION_VERSION}`)
  );
});

test('third-party audit allowlists the suzuki-shunsuke validator action', () => {
  const audit = read(AUDIT_SCRIPT);
  assert.match(audit, /ACCEPTED_SINGLE_AUTHOR_ACTIONS=\(/);
  assert.match(
    audit,
    /suzuki-shunsuke\/github-action-renovate-config-validator/
  );
});

test('docs cover CI validation and local fallback', () => {
  const docs = read(DOCS);
  assert.match(docs, /renovate-config-validator/i);
  assert.match(docs, /suzuki-shunsuke\/github-action-renovate-config-validator/);
  assert.match(docs, /v2\.1\.0/);
  assert.match(docs, /\.github\/workflows\/renovate-config-validator\.yml/);
  // Local fallback must stay documented for offline / pre-push checks.
  assert.match(docs, /npx --yes -p renovate renovate-config-validator/);
});

test('repo still has the Renovate config the workflow validates', () => {
  assert.ok(
    fs.existsSync(RENOVATE_CONFIG),
    'expected .github/renovate.json5 — update workflow config_file_path if moved'
  );
});

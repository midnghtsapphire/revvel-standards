'use strict';

/**
 * Regression tests for the XAI Review (oleg fork) marketplace integration.
 *
 * Issue: https://github.com/midnghtsapphire/revvel-standards/issues/16878
 * Marketplace: https://github.com/marketplace/actions/xai-review-oleg-fork
 * Action repo: https://github.com/HomeBake/ai-review
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const repoRoot = path.join(__dirname, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'xai-review-oleg-fork.yml');
const templatePath = path.join(repoRoot, 'templates', 'cicd', 'xai-review-oleg-fork.yml');
const docsPath = path.join(repoRoot, 'docs', 'OPENROUTER_MARKETPLACE_ACTIONS.md');
const templatesReadmePath = path.join(repoRoot, 'templates', 'cicd', 'README.md');

const PINNED_SHA = 'de103eb5948eef1a54717d43992d8cfb156677ba';
const ACTION_REF = `HomeBake/ai-review@${PINNED_SHA}`;

function loadYaml(filePath) {
  return yaml.parse(fs.readFileSync(filePath, 'utf8'));
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('active workflow and template both exist', () => {
  assert.ok(fs.existsSync(workflowPath), 'active workflow missing');
  assert.ok(fs.existsSync(templatePath), 'template missing');
});

test('workflow name, triggers, and skip-review gate', () => {
  const workflow = loadYaml(workflowPath);

  assert.equal(workflow.name, 'XAI Review (oleg fork)');
  assert.ok(workflow.on.pull_request, 'pull_request trigger required');
  assert.deepEqual(workflow.on.pull_request.types, [
    'opened',
    'synchronize',
    'reopened',
    'ready_for_review',
  ]);
  assert.ok(workflow.on.workflow_dispatch, 'workflow_dispatch required');

  const inputs = workflow.on.workflow_dispatch.inputs;
  assert.equal(inputs['review-command'].default, 'run-summary');
  assert.ok(inputs['review-command'].options.includes('run-inline'));
  assert.ok(inputs['review-command'].options.includes('run-summary'));
  assert.equal(inputs['pull-request-number'].required, true);

  const jobIf = workflow.jobs.review.if;
  assert.match(String(jobIf), /skip-review/);
  assert.match(String(jobIf), /workflow_dispatch/);
  assert.match(String(jobIf), /draft/);
});

test('workflow routes through OpenRouter and pins HomeBake/ai-review', () => {
  const raw = read(workflowPath);
  const workflow = loadYaml(workflowPath);
  const steps = workflow.jobs.review.steps;
  const checkoutStep = steps.find((s) => s.name === 'Checkout');
  const runStep = steps.find((s) => s.name === 'Run XAI Review (oleg fork)');

  assert.ok(runStep, 'Run XAI Review step must exist');
  assert.equal(runStep.uses, ACTION_REF);
  assert.match(raw, new RegExp(`${PINNED_SHA}.*v1\\.2\\.4`));
  assert.match(
    String(checkoutStep?.uses || ''),
    /actions\/checkout@[0-9a-f]{40}/,
    'checkout must be SHA-pinned'
  );
  assert.equal(runStep['continue-on-error'], true);

  assert.equal(runStep.env.LLM__PROVIDER, 'OPENROUTER');
  assert.equal(runStep.env.LLM__HTTP_CLIENT__API_URL, 'https://openrouter.ai/api/v1');
  assert.match(String(runStep.env.LLM__HTTP_CLIENT__API_TOKEN), /OPENROUTER_API_KEY/);
  assert.equal(runStep.env.VCS__PROVIDER, 'GITHUB');
  assert.match(String(runStep.env.VCS__PIPELINE__PULL_NUMBER), /pull_request\.number|pull-request-number/);

  // Missing secret must degrade to a warning, not a red job.
  const verify = steps.find((s) => s.name === 'Verify OPENROUTER_API_KEY is configured');
  assert.ok(verify);
  assert.match(verify.run, /::warning::/);
  assert.match(verify.run, /OPENROUTER_API_KEY is not set/);
});

test('template mirrors the active workflow contract', () => {
  const template = loadYaml(templatePath);
  const workflow = loadYaml(workflowPath);
  const templateRun = template.jobs.review.steps.find(
    (s) => s.name === 'Run XAI Review (oleg fork)'
  );
  const workflowRun = workflow.jobs.review.steps.find(
    (s) => s.name === 'Run XAI Review (oleg fork)'
  );

  assert.equal(template.name, workflow.name);
  assert.deepEqual(template.on.pull_request.types, workflow.on.pull_request.types);
  assert.ok(templateRun, 'template must include the Run XAI Review step');
  assert.equal(templateRun.uses, ACTION_REF);
  assert.equal(templateRun.uses, workflowRun.uses);
  assert.equal(templateRun.env.LLM__PROVIDER, 'OPENROUTER');
  assert.equal(templateRun.env.LLM__PROVIDER, workflowRun.env.LLM__PROVIDER);
  assert.equal(
    template.jobs.review.env.FORCE_JAVASCRIPT_ACTIONS_TO_NODE24,
    workflow.jobs.review.env.FORCE_JAVASCRIPT_ACTIONS_TO_NODE24
  );
});

test('docs inventory lists the oleg-fork marketplace action', () => {
  const docs = read(docsPath);
  assert.match(docs, /xai-review-oleg-fork/);
  assert.match(docs, /HomeBake\/ai-review/);
  assert.match(docs, /marketplace\/actions\/xai-review-oleg-fork/);
  assert.match(docs, /xai-review-oleg-fork\.yml/);
});

test('templates README indexes xai-review-oleg-fork.yml', () => {
  const readme = read(templatesReadmePath);
  assert.match(readme, /xai-review-oleg-fork\.yml/);
  assert.match(readme, /HomeBake\/ai-review/);
});

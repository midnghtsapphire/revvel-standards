#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const WORKFLOW_PATH = path.resolve(
  __dirname,
  '..',
  '.github',
  'workflows',
  'pr-state-orchestrator.yml',
);

function getGithubScriptSteps(workflow) {
  return Object.entries(workflow.jobs).flatMap(([jobName, job]) =>
    (job.steps || [])
      .filter((step) => step.uses === 'actions/github-script@v9.0.0')
      .map((step) => ({ jobName, step })),
  );
}

test('pr-state-orchestrator uses the default GITHUB_TOKEN for github-script jobs', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const githubScriptSteps = getGithubScriptSteps(workflow);

  assert.ok(githubScriptSteps.length > 0, 'expected github-script steps in pr-state-orchestrator');

  for (const { jobName, step } of githubScriptSteps) {
    assert.equal(
      step.with?.['github-token'],
      '${{ secrets.GITHUB_TOKEN }}',
      `expected ${jobName} to use the default GITHUB_TOKEN`,
    );
  }
});

test('re-sync job is present and no longer prefers ADMIN_GITHUB_TOKEN', () => {
  const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const workflow = YAML.parse(source);
  const resyncStep = workflow.jobs['resync-all-prs']?.steps?.find(
    (step) => step.uses === 'actions/github-script@v9.0.0',
  );

  assert.match(source, /name:\s+🔄 Re-sync All Open PRs/);
  assert.ok(resyncStep, 'expected the re-sync job to contain a github-script step');
  assert.equal(resyncStep.with?.['github-token'], '${{ secrets.GITHUB_TOKEN }}');
});

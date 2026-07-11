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

test('every github-script job wraps fallible reads with the safeApi helper', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const githubScriptSteps = getGithubScriptSteps(workflow);

  assert.ok(githubScriptSteps.length > 0, 'expected github-script steps in pr-state-orchestrator');

  for (const { jobName, step } of githubScriptSteps) {
    const script = step.with?.script || '';
    assert.match(
      script,
      /async function safeApi\(callName, fn, fallback\)/,
      `expected ${jobName} to define the safeApi error-handling helper`,
    );
    assert.match(
      script,
      /core\.warning\(.*callName.*failed.*e\.message.*\)/,
      `expected ${jobName} safeApi to surface failures via core.warning`,
    );
  }
});

test('label reads are guarded by safeApi instead of raw awaits', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const githubScriptSteps = getGithubScriptSteps(workflow);

  for (const { jobName, step } of githubScriptSteps) {
    const script = step.with?.script || '';
    if (!script.includes('listLabelsOnIssue')) continue;
    assert.doesNotMatch(
      script,
      /await github\.rest\.issues\.listLabelsOnIssue\(/,
      `expected ${jobName} to call listLabelsOnIssue only through safeApi`,
    );
  }
});

test('safeApi degrades gracefully on API rate-limit 403s', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const githubScriptSteps = getGithubScriptSteps(workflow);

  for (const { jobName, step } of githubScriptSteps) {
    const script = step.with?.script || '';
    // Match the intent (403 + "rate limit" message sniffing) rather than the
    // exact source text so harmless refactors don't break the test.
    assert.match(
      script,
      /status === 403/,
      `expected ${jobName} safeApi to check for HTTP 403 status`,
    );
    assert.match(
      script,
      /\/rate limit\/i/,
      `expected ${jobName} safeApi to sniff "rate limit" in the error message`,
    );
  }
});

test('bulk reads (pulls.list, checks.listForRef, listReviews) go through safeApi', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const githubScriptSteps = getGithubScriptSteps(workflow);

  for (const { jobName, step } of githubScriptSteps) {
    const script = step.with?.script || '';
    // Raw awaits on these reads caused unhandled HttpError job failures when
    // the installation rate limit was exhausted (e.g. run 29153321163).
    // Regex (instead of a literal string) so whitespace variations between
    // `await` and the call can't slip past the guard.
    for (const method of ['pulls.list', 'checks.listForRef', 'pulls.listReviews']) {
      const rawAwait = new RegExp(
        String.raw`await\s+github\.rest\.` + method.replace(/\./g, String.raw`\.`) + String.raw`\s*\(`,
      );
      assert.ok(
        !rawAwait.test(script),
        `expected ${jobName} to call github.rest.${method}() only through safeApi`,
      );
    }
  }
});

test('workflow dedupes stacked runs with a per-PR/SHA concurrency group', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const concurrency = workflow.concurrency;

  assert.ok(concurrency, 'expected a top-level concurrency block');
  assert.equal(concurrency['cancel-in-progress'], true);
  assert.match(concurrency.group, /github\.event_name/);
  assert.match(concurrency.group, /pull_request\.number/);
  assert.match(concurrency.group, /check_run\.head_sha/);
});

test('every job has a right-sized timeout-minutes limit', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));

  const expected = {
    'pr-lifecycle': 10,
    'review-handler': 10,
    'check-suite-handler': 15,
    'check-run-handler': 15,
    'resync-all-prs': 30,
    'manual-reevaluate': 10,
  };

  assert.deepEqual(
    Object.keys(workflow.jobs).sort(),
    Object.keys(expected).sort(),
    'job list drifted — update expected timeouts',
  );
  for (const [jobName, minutes] of Object.entries(expected)) {
    assert.equal(
      workflow.jobs[jobName]['timeout-minutes'],
      minutes,
      `expected ${jobName} to have timeout-minutes: ${minutes}`,
    );
  }
});

test('multi-PR loops pace themselves with sleep(150)', () => {
  const workflow = YAML.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));

  for (const jobName of ['check-suite-handler', 'check-run-handler', 'resync-all-prs']) {
    const step = workflow.jobs[jobName]?.steps?.find(
      (s) => s.uses === 'actions/github-script@v9.0.0',
    );
    const script = step?.with?.script || '';
    assert.match(
      script,
      /async function sleep\(ms\)/,
      `expected ${jobName} to define a sleep helper`,
    );
    assert.match(
      script,
      /await sleep\(150\);/,
      `expected ${jobName} to sleep between PRs to avoid secondary rate limits`,
    );
  }
});

#!/usr/bin/env node
'use strict';

// Regression guards for three CI-automation defects that all shared one root
// cause: a workflow asserting a result it had not actually established.
//
//   1. pr-check-status.yml reported a SINGLE check suite's conclusion as
//      "✅ All checks have passed". With many suites per commit (Actions,
//      CircleCI, Vercel, third-party apps), one green suite declared the whole
//      PR green — on PRs whose combined status was `failure`. Because the
//      passing branch also adds `ready-to-merge`, this fed ready-for-review.yml
//      and let red PRs be promoted out of draft and merged (#17685, #17688).
//
//   2. docs-freshness-check.yml computed changed files with a two-dot diff
//      against `pull_request.base.sha`, which is frozen at PR-open time. Every
//      file changed on the base branch since then was attributed to the PR,
//      firing pairing rules for files the author never touched.
//
//   3. wr-autotitle.yml and xai-review-oleg-fork.yml referenced the `inputs`
//      context in a workflow-level `concurrency.group`, where it does not
//      exist. GitHub rejected both files outright ("Unrecognized named-context:
//      'inputs'" / "File ... is invalid"), so neither workflow ran at all.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const root = path.resolve(__dirname, '..');
const wf = (name) => path.join(root, '.github/workflows', name);
const readRaw = (name) => fs.readFileSync(wf(name), 'utf8');
const readYaml = (name) => yaml.parse(readRaw(name));

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function scriptOf(name, jobName) {
  const doc = readYaml(name);
  const step = doc.jobs[jobName].steps.find((s) => s.with && typeof s.with.script === 'string');
  assert.ok(step, `expected an inline github-script step in ${name}:${jobName}`);
  return step.with.script;
}

test('pr-check-status confirms the whole PR before claiming success', () => {
  const script = scriptOf('pr-check-status.yml', 'check-suite-status');

  // Must consult every check run and every commit status on the head SHA.
  // Commit statuses are a separate surface — CircleCI and Vercel report there,
  // so checking only check runs is what let "Account is blocked" sit under a
  // green banner.
  assert.match(script, /checks\.listForRef/, 'must aggregate all check runs for the head SHA');
  assert.match(
    script,
    /getCombinedStatusForRef/,
    'must aggregate commit statuses too — CircleCI and Vercel report there'
  );

  // The defect in one line: mapping the triggering suite's own conclusion
  // straight to "passing".
  assert.doesNotMatch(
    script,
    /conclusion === 'success'[^\n]*\?\s*'passing'/,
    "a single suite's conclusion must not decide the PR-wide state"
  );

  // Only claim "all checks passed" when nothing is still running.
  assert.match(script, /status !== 'completed'/, 'in-flight checks must block a passing verdict');
});

test('pr-check-status still short-circuits on a failing suite', () => {
  // A failing suite is conclusive on its own. Keeping that path free of extra
  // API calls matters: this workflow fires on every completed suite and has
  // already caused an installation-wide rate-limit outage once.
  const script = scriptOf('pr-check-status.yml', 'check-suite-status');
  assert.match(script, /if \(FAILING\.includes\(conclusion\)\)/);
  assert.match(script, /desired = 'failing'/);
});

test('label removal swallows 404 only, never an auth failure', () => {
  // CLAUDE.md gotcha 1: removeLabel is not idempotent. A blanket catch also
  // swallows 401/403, so a token that has lost label permission is
  // indistinguishable from a label that was already gone, and the PR keeps a
  // stale state with nothing reported. config/error-ledger.json tracks this
  // as LABEL-RACE-001.
  const script = scriptOf('pr-check-status.yml', 'check-suite-status');

  assert.doesNotMatch(
    script,
    /catch \(e\) \{ \/\* already gone \*\/ \}/,
    'a blanket catch hides 401/403 as well as 404'
  );
  assert.match(
    script,
    /if \(err\.status !== 404\) throw err;/,
    'non-404 errors must propagate'
  );
  // Every removal must go through the guarded helper.
  const rawRemovals = script.match(/issues\.removeLabel\(/g) || [];
  assert.equal(rawRemovals.length, 1, 'removeLabel should be called in exactly one guarded place');
});

test('the failure comment links somewhere real', () => {
  // `check_suite` webhook payloads carry no `html_url`, so linking to it
  // rendered literally as "[check results](undefined)" on every failing PR.
  const script = scriptOf('pr-check-status.yml', 'check-suite-status');
  assert.doesNotMatch(script, /suite\.html_url/, 'check_suite has no html_url');
  assert.match(script, /pull\/\$\{prNumber\}\/checks/, 'link to the PR checks tab');
});

test('pr-check-status embedded script is syntactically valid', () => {
  // github-script wraps the body in an async function, so top-level await is
  // legal here — but a syntax error would only surface at runtime in CI.
  for (const job of ['check-suite-status', 'workflow-run-status']) {
    const script = scriptOf('pr-check-status.yml', job);
    assert.doesNotThrow(
      () => new AsyncFunction('github', 'context', 'core', script),
      `${job} script must parse`
    );
  }
});

test('docs-freshness diffs against the merge base, not the base tip', () => {
  const raw = readRaw('docs-freshness-check.yml');

  // Two-dot attributes every commit landed on the base branch since the PR
  // opened to the PR itself.
  assert.doesNotMatch(
    raw,
    /git diff --name-only "\$BASE_SHA" "\$HEAD_SHA"/,
    'two-dot diff misattributes base-branch commits to the PR'
  );
  assert.match(raw, /git diff --name-only "\$BASE_SHA\.\.\.\$HEAD_SHA"/);
});

test('no workflow references the inputs context at workflow level', () => {
  // `inputs` is only valid inside jobs/steps. Using it in a top-level
  // `concurrency.group` makes GitHub reject the entire file, so the workflow
  // silently never runs.
  const files = fs.readdirSync(path.join(root, '.github/workflows'))
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  const offenders = [];
  for (const file of files) {
    const doc = readYaml(file);
    const group = doc && doc.concurrency && doc.concurrency.group;
    if (typeof group === 'string' && /(^|[^.\w])inputs\./.test(group)) {
      offenders.push(`${file}: ${group}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'workflow-level concurrency must use github.event.inputs, not inputs:\n' + offenders.join('\n')
  );
});

test('every workflow in the repo is structurally valid', () => {
  // The permanent guard. scripts/check-workflow-yaml.js already knew how to
  // find invalid workflows, and tests/check-workflow-yaml.test.js already
  // exercised that helper — but nothing ever pointed it at the real
  // .github/workflows directory and asserted the result was empty. So three
  // workflows sat unparseable (duplicate `timeout-minutes` keys) and five more
  // were rejected for an invalid context, and CI stayed quiet about all eight:
  // an invalid workflow produces no run, and no run produces no failure.
  //
  // This is the assertion that makes a silently dead workflow impossible to
  // reintroduce. Do not weaken it to a warning.
  const { findInvalidWorkflows } = require('../scripts/check-workflow-yaml');
  const invalid = findInvalidWorkflows();
  assert.deepEqual(
    invalid,
    [],
    'these workflows will never run until they parse:\n' +
      invalid.map((i) => `  ${i.file || i.path}: ${i.error || i.reason}`).join('\n')
  );
});

test('the two previously-invalid workflows parse and keep their dispatch inputs', () => {
  const autotitle = readYaml('wr-autotitle.yml');
  assert.match(autotitle.concurrency.group, /github\.event\.inputs\.issue_number/);
  assert.ok(autotitle.on.workflow_dispatch.inputs.issue_number, 'issue_number stays declared');

  const xai = readYaml('xai-review-oleg-fork.yml');
  // Hyphenated input names need index syntax — dot notation would parse the
  // hyphens as subtraction.
  assert.match(xai.concurrency.group, /github\.event\.inputs\['pull-request-number'\]/);
  assert.ok(
    xai.on.workflow_dispatch.inputs['pull-request-number'],
    'pull-request-number stays declared'
  );
});

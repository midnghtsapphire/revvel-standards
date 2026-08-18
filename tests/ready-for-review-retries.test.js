#!/usr/bin/env node
'use strict';

// A transient 5xx must not abandon a PR in draft.
//
// `promote-draft` is the job that flips a draft PR to Ready for Review once
// every external check has gone green. It polls `checks.listForRef` for up to
// eight minutes. Every Octokit call in it was bare, so one 502 from the API
// threw straight out of the poll loop and aborted the step — after the wait,
// with CI green, and with nothing on the PR explaining why it stayed a draft.
// The request was never wrong; the call had already succeeded on earlier
// iterations of the same loop.
//
// That is CLAUDE.md gotcha 2: a bare Octokit call in a workflow script, where
// a "best-effort" path forwards the raw call and lets a transient failure end
// the job.
//
// These tests execute the real inline script out of the workflow YAML rather
// than grepping it, because the property that matters is behavioural: a blip
// is retried, and a definite answer is NOT. A regex can confirm the word
// `withRetry` appears; only running it can confirm a 404 fails fast instead of
// burning four attempts and 15 seconds on a result that will not change.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WORKFLOW = path.join(__dirname, '..', '.github/workflows/ready-for-review.yml');

function scriptFor(jobName, stepMatcher) {
  const doc = yaml.load(fs.readFileSync(WORKFLOW, 'utf8'));
  const job = doc.jobs[jobName];
  assert.ok(job, `job ${jobName} must exist`);
  const step = job.steps.find((s) => stepMatcher.test(s.name || ''));
  assert.ok(step, `step matching ${stepMatcher} must exist in ${jobName}`);
  return step.with.script;
}

/**
 * Run an inline github-script body with mocks. `setTimeout` is passed as a
 * parameter so it SHADOWS the global inside the script: the real thing waits
 * 15s before its first poll and 30s between polls, which no test should sit
 * through. Backoff sleeps collapse to nothing and we still exercise the real
 * control flow.
 */
function runScript(script, { github, core, context }) {
  const noWait = (fn) => { fn(); return 0; };
  const body = `return (async () => {\n${script}\n})();`;
  // eslint-disable-next-line no-new-func
  return new Function('github', 'context', 'core', 'setTimeout', body)(
    github, context, core, noWait
  );
}

const err = (props) => Object.assign(new Error('boom'), props);

function harness(listForRefImpl) {
  const warnings = [];
  const outputs = {};
  return {
    warnings,
    outputs,
    github: { rest: { checks: { listForRef: listForRefImpl } } },
    core: {
      info() {},
      warning: (m) => warnings.push(String(m)),
      setOutput: (k, v) => { outputs[k] = v; },
    },
    context: {
      repo: { owner: 'o', repo: 'r' },
      payload: { pull_request: { head: { sha: 'abc123' }, number: 1 } },
    },
  };
}

const completed = (name, conclusion) => ({ name, status: 'completed', conclusion });

test('a transient 5xx on the poll call is retried, not fatal', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls += 1;
    if (calls <= 2) throw err({ status: 502 });
    return { data: { check_runs: [completed('build', 'success')] } };
  });

  const result = await runScript(scriptFor('promote-draft', /check all ci status/i), h);

  assert.equal(calls, 3, 'must retry the failed call rather than abort the job');
  assert.equal(result, true, 'and still reach the correct verdict afterwards');
  assert.equal(h.outputs.all_passed, 'true');
  assert.equal(h.warnings.length, 2, 'each retry should be visible in the log');
});

test('a rate-limit response is treated as transient', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls += 1;
    if (calls === 1) throw err({ status: 429 });
    return { data: { check_runs: [completed('build', 'success')] } };
  });

  await runScript(scriptFor('promote-draft', /check all ci status/i), h);
  assert.equal(calls, 2, '429 must be retried — it is the most common blip of all');
});

test('a network-level error is treated as transient', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls += 1;
    if (calls === 1) throw err({ code: 'ECONNRESET' });
    return { data: { check_runs: [completed('build', 'success')] } };
  });

  await runScript(scriptFor('promote-draft', /check all ci status/i), h);
  assert.equal(calls, 2, 'a reset connection carries no .status but is still a blip');
});

test('a definite answer is NOT retried', async () => {
  // The inverse failure is just as real: retrying a 404 four times delays the
  // true error and buries it under warnings about attempts that never had a
  // chance. Fail fast on anything the API has actually decided.
  for (const status of [404, 403, 422]) {
    let calls = 0;
    const h = harness(async () => { calls += 1; throw err({ status }); });

    await assert.rejects(
      () => runScript(scriptFor('promote-draft', /check all ci status/i), h),
      /boom/,
      `${status} must propagate`
    );
    assert.equal(calls, 1, `${status} is an answer, not a blip — it must not be retried`);
  }
});

test('retries are bounded — a permanent outage still ends the step', async () => {
  let calls = 0;
  const h = harness(async () => { calls += 1; throw err({ status: 503 }); });

  await assert.rejects(() => runScript(scriptFor('promote-draft', /check all ci status/i), h));
  assert.equal(calls, 4, 'must give up after the attempt budget rather than loop forever');
});

test('the promote mutation is guarded too', () => {
  // Wrapping only the poll call would fix half the defect: the mutation is the
  // entire point of the job, and losing it to a blip throws away the full
  // eight-minute wait for CI.
  const script = scriptFor('promote-draft', /ready for review/i);
  assert.match(
    script,
    /withRetry\(\s*'markPullRequestReadyForReview'/,
    'the markPullRequestReadyForReview mutation must be retried'
  );
});

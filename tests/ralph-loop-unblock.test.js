#!/usr/bin/env node
'use strict';

// Ralph Loop must not remove a merge block on one suite's say-so.
//
// `ralph-unblock` is triggered by a single check_suite completing with
// conclusion 'success'. A single green suite is not "all checks passed": this
// repo runs ~109 check runs across many suites on a commit (Actions, CircleCI,
// Vercel, third-party review apps), so the first suite to go green fired this
// job while others were still red.
//
// Observed on PR #17701 at 03:11:08 UTC: this workflow posted
//
//   "✅ Ralph Loop — All checks passed! Merge block removed. This PR is ready
//    to merge."
//
// in the SAME SECOND that pr-check-status.yml correctly posted "❌ CI Checks
// Failed" for the same commit. Three Vercel statuses and CircleCI
// lint-and-test were failing at the time.
//
// This is the identical defect pr-check-status.yml carried until #17691 —
// reporting one suite's conclusion as the whole PR's state — but it matters
// more here, because this workflow ACTS on the verdict: it deletes the
// `won't-merge` and `auto-fix` labels that were holding the PR back.
//
// The guard below pins the aggregation, and pins the ORDER: every early return
// must precede the first label mutation, or the block is already gone by the
// time the workflow decides it should not have been.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WORKFLOW = path.join(__dirname, '..', '.github/workflows/ralph-loop.yml');

function unblockScript() {
  const doc = yaml.load(fs.readFileSync(WORKFLOW, 'utf8'));
  const job = doc.jobs['ralph-unblock'];
  assert.ok(job, 'ralph-unblock job must exist');
  const step = job.steps.find((s) => /remove.*label/i.test(s.name || ''));
  assert.ok(step, 'the label-removal step must exist');
  return step.with.script;
}

test('unblock consults every check run, not just the triggering suite', () => {
  const script = unblockScript();
  assert.match(
    script,
    /checks\.listForRef/,
    'must enumerate check runs on the head SHA before unblocking'
  );
  assert.match(
    script,
    /paginate/,
    'must paginate — this repo exceeds one page of check runs'
  );
});

test('unblock consults commit statuses, where CircleCI and Vercel report', () => {
  const script = unblockScript();
  assert.match(
    script,
    /getCombinedStatusForRef/,
    'check runs alone miss commit statuses; that is how "Account is blocked" sat under a green banner'
  );
});

test('a failing or pending check prevents the unblock', () => {
  const script = unblockScript();
  for (const conclusion of ['failure', 'timed_out', 'cancelled', 'action_required']) {
    assert.ok(
      script.includes(`'${conclusion}'`),
      `must treat ${conclusion} as failing`
    );
  }
  assert.match(script, /status !== 'completed'/, 'must refuse to unblock while checks are still running');
});

test('every refusal happens BEFORE the first label is removed', () => {
  // Order is the whole guarantee. An aggregation that runs after removeLabel
  // would still delete the merge block and then decide it should not have.
  const script = unblockScript();
  const firstMutation = script.search(/removeLabel/);
  assert.ok(firstMutation > 0, 'removeLabel must be present');

  for (const guard of ['checks.listForRef', 'getCombinedStatusForRef']) {
    const at = script.indexOf(guard);
    assert.ok(at > 0, `${guard} must be present`);
    assert.ok(
      at < firstMutation,
      `${guard} must run before removeLabel, or the block is gone before the check`
    );
  }

  const returns = [...script.matchAll(/\breturn;/g)].map((m) => m.index);
  assert.ok(
    returns.some((i) => i < firstMutation),
    'at least one early return must precede any label mutation'
  );
});

test('the success comment does not claim more than was verified', () => {
  // Match the `body:` line only. A bare /All checks passed!/ over the whole
  // script also matches the comment that DOCUMENTS the old wording — which
  // would forbid explaining the defect as well as committing it. (Third time
  // this session a broad invariant caught its own documentation.)
  const script = unblockScript();
  const body = script.split('\n').find((l) => /^\s*body:/.test(l));
  assert.ok(body, 'the unblock comment body must be present');
  assert.doesNotMatch(
    body,
    /All checks passed!/,
    'the old wording asserted a repo-wide state from one suite; say what was actually checked'
  );
  assert.match(body, /Verified/, 'the comment should state what was verified');
});

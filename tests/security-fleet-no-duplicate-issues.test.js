#!/usr/bin/env node
'use strict';

// One finding, one issue.
//
// The security-fleet event lane filed every PR finding twice. Four pairs were
// open at once, each pair reporting the same finding on the same source:
//
//   #17546 "[security-fleet] finding on PR #17136"
//   #17547 "[security-fleet] finding on issue #17136"
//   #17551 / #17550   (PR #17107)
//   #17564 / #17565   (PR #17222)
//   #17666 / #17642   (PR #17225)
//
// The subject was derived from whichever payload key happened to be set:
//
//   context.payload.issue?.number  ? `issue #N`
//   : context.payload.pull_request?.number ? `PR #N`
//
// But a pull request IS an issue to the webhook payload. An `issue_comment`
// event on a PR arrives with payload.issue populated to that PR's number,
// while the `pull_request` event for the same PR sets payload.pull_request.
// So one subject produced two titles, and the dedup — an exact title match
// against open issues — could never see across the pair.
//
// The lane fires on `issues`, `issue_comment` AND `pull_request`, so a PR
// that gets a comment reliably triggers both shapes. This was not a rare race.
//
// Numbers are drawn from one sequence per repository, so the number alone
// identifies the subject. These tests drive the real inline script from the
// workflow YAML under both payload shapes and require one issue, not two.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WORKFLOW = path.join(__dirname, '..', '.github/workflows/security-fleet.yml');

function fileFindingStep() {
  const doc = yaml.load(fs.readFileSync(WORKFLOW, 'utf8'));
  const step = (doc.jobs['event-lane'].steps || []).find((s) => /file finding/i.test(s.name || ''));
  assert.ok(step, 'the finding-filing step must exist');
  return step;
}

/**
 * Drive the step's inline script against a fake repo.
 * `openIssues` is shared across calls so the second invocation sees what the
 * first filed — which is the whole point: dedup only works if it can.
 */
function runScript(script, { payload, eventName, openIssues }) {
  const findings = { findings: [{ rule: 'hidden-html-directive', excerpt: 'x' }] };
  const fakeFs = {
    readFileSync: (p) => {
      if (String(p).includes('sentinel-findings')) return JSON.stringify(findings);
      throw new Error('ENOENT');
    },
  };
  const github = {
    rest: {
      issues: {
        getLabel: async () => ({}),
        createLabel: async () => ({}),
        listForRepo: async () => ({ data: openIssues }),
        create: async (args) => { openIssues.push({ number: 900 + openIssues.length, title: args.title }); return { data: {} }; },
      },
    },
  };
  const core = { info() {}, warning() {} };
  const context = { repo: { owner: 'o', repo: 'r' }, payload, eventName };
  const body = `return (async () => {\n${script}\n})();`;
  // eslint-disable-next-line no-new-func
  const fn = new Function('github', 'context', 'core', 'require', 'process', body);
  return fn(github, context, core, (m) => (m === 'fs' ? fakeFs : require(m)), { env: {} });
}

// The same PR, seen through the two payload shapes the lane actually receives.
const AS_PULL_REQUEST = { payload: { pull_request: { number: 17222 } }, eventName: 'pull_request' };
const AS_ISSUE_COMMENT = { payload: { issue: { number: 17222 } }, eventName: 'issue_comment' };

test('the same subject yields one issue across both payload shapes', async () => {
  const script = fileFindingStep().with.script;
  const openIssues = [];

  await runScript(script, { ...AS_PULL_REQUEST, openIssues });
  assert.equal(openIssues.length, 1, 'the first event must file the finding');

  await runScript(script, { ...AS_ISSUE_COMMENT, openIssues });
  assert.equal(
    openIssues.length,
    1,
    'a comment on the same PR must dedup against the issue already filed — ' +
      `instead got: ${openIssues.map((i) => i.title).join(' | ')}`
  );
});

test('order does not matter', async () => {
  // The comment can arrive before the synchronize. If the title depended on
  // arrival order the dedup would still work in only one direction.
  const script = fileFindingStep().with.script;
  const openIssues = [];

  await runScript(script, { ...AS_ISSUE_COMMENT, openIssues });
  await runScript(script, { ...AS_PULL_REQUEST, openIssues });
  assert.equal(openIssues.length, 1, 'dedup must hold regardless of which event lands first');
});

test('the title carries the number without a PR/issue prefix', async () => {
  const script = fileFindingStep().with.script;
  const openIssues = [];
  await runScript(script, { ...AS_PULL_REQUEST, openIssues });

  assert.equal(openIssues[0].title, '[security-fleet] finding on #17222');
  assert.doesNotMatch(
    openIssues[0].title,
    /\b(PR|issue) #/,
    'prefixing the number with the payload shape is what split one subject into two titles'
  );
});

test('distinct subjects still get distinct issues', async () => {
  // The inverse. Collapsing every finding onto one title would pass the dedup
  // tests above while silently dropping every finding after the first.
  const script = fileFindingStep().with.script;
  const openIssues = [];

  await runScript(script, { payload: { pull_request: { number: 100 } }, eventName: 'pull_request', openIssues });
  await runScript(script, { payload: { pull_request: { number: 200 } }, eventName: 'pull_request', openIssues });

  assert.equal(openIssues.length, 2, 'two different PRs must produce two issues');
  assert.notEqual(openIssues[0].title, openIssues[1].title);
});

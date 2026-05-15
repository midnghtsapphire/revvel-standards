#!/usr/bin/env node
'use strict';

const assert = require('assert');

const {
  extractPrNumbersFromText,
  findAssociatedPr,
  hasIssueBranchRef,
  isAssociatedPr,
  referencesIssue,
} = require('../scripts/stuck-wr-detector');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

function mockGithub({ pulls = [], comments = [], pullByNumber = {} } = {}) {
  return {
    rest: {
      pulls: {
        list: async () => ({ data: pulls }),
        get: async ({ pull_number: pullNumber }) => {
          if (!pullByNumber[pullNumber]) {
            throw new Error(`PR #${pullNumber} not found`);
          }
          return { data: pullByNumber[pullNumber] };
        },
      },
      issues: {
        listComments: async () => ({ data: comments }),
      },
    },
  };
}

const issue = {
  number: 13460,
  title: '[WR] create engine for website ui creation using openrouter or open hands Orchestrator use swarms for research',
};

(async () => {
  await test('hasIssueBranchRef matches WR branches containing the issue number', () => {
    assert.equal(
      hasIssueBranchRef(
        { head: { ref: 'wr/issue-13460-create-engine-for-website-ui-creation' } },
        13460
      ),
      true
    );
  });

  await test('referencesIssue matches closing references in PR bodies', () => {
    assert.equal(referencesIssue('### Related\n\nCloses #13460', 13460), true);
  });

  await test('extractPrNumbersFromText finds workflow comment PR references', () => {
    assert.deepEqual(
      extractPrNumbersFromText(
        'WR PR Created!\n\nPR: #13461\n\n[View the PR](https://github.com/org/repo/pull/13464)'
      ),
      [13461, 13464]
    );
  });

  await test('isAssociatedPr rejects title-only matches without issue-specific signals', () => {
    assert.equal(
      isAssociatedPr(issue, {
        state: 'open',
        title: '[WR] create engine for website ui creation using openrouter',
        body: '',
        head: { ref: 'wr/unrelated-branch' },
        labels: [],
      }),
      false
    );
  });

  await test('findAssociatedPr detects open PRs by issue-specific branch name', async () => {
    const github = mockGithub({
      pulls: [
        {
          number: 13461,
          state: 'open',
          title: '[WR] create engine for website ui creation',
          body: '',
          head: { ref: 'wr/issue-13460-create-engine-for-website-ui-creation' },
          html_url: 'https://github.com/org/repo/pull/13461',
        },
      ],
    });

    const pr = await findAssociatedPr({ github, owner: 'org', repo: 'repo', issue });
    assert.equal(pr.number, 13461);
  });

  await test('findAssociatedPr detects the workflow-created PR comment fallback', async () => {
    const github = mockGithub({
      pulls: [],
      comments: [{ body: 'WR PR Created!\n\nPR: #13461' }],
      pullByNumber: {
        13461: {
          number: 13461,
          state: 'open',
          title: '[WR] create engine for website ui creation',
          body: '',
          head: { ref: 'wr/generated' },
          html_url: 'https://github.com/org/repo/pull/13461',
        },
      },
    });

    const pr = await findAssociatedPr({ github, owner: 'org', repo: 'repo', issue });
    assert.equal(pr.number, 13461);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();

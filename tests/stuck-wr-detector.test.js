#!/usr/bin/env node
'use strict';

const assert = require('assert');

const {
  extractPrNumbersFromText,
  findAssociatedPr,
  hasIssueBranchRef,
  isAssociatedPr,
  referencesIssue,
  isWrReadyForPr,
  stuckAgeVerdict,
  DEFAULT_MIN_STUCK_AGE_MS,
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

  await test('isWrReadyForPr requires a completion signal', () => {
    assert.equal(isWrReadyForPr(['work-request', 'research:complete']), true);
    assert.equal(isWrReadyForPr(['work-request', 'wr:complete']), true);
    assert.equal(isWrReadyForPr(new Set(['research:complete'])), true);
    assert.equal(isWrReadyForPr(['work-request', 'wr:in-progress']), false);
    assert.equal(isWrReadyForPr([]), false);
  });

  await test('stuck threshold is 5 min so a throttled cron cannot strand a WR', () => {
    assert.equal(DEFAULT_MIN_STUCK_AGE_MS, 5 * 60 * 1000);
  });

  await test('stuckAgeVerdict windows a WR by age', () => {
    const created = '2026-06-13T15:00:00Z';
    const at = (mins) => new Date('2026-06-13T15:00:00Z').getTime() + mins * 60000;
    // The exact gap that stranded #14545: completed ~12 min in, the old 15-min
    // gate called it too young; the new 5-min gate makes it eligible.
    assert.equal(stuckAgeVerdict(created, { now: at(12) }), 'eligible');
    assert.equal(stuckAgeVerdict(created, { now: at(3) }), 'too_young');
    assert.equal(stuckAgeVerdict(created, { now: at(200), maxAgeMs: 60 * 60 * 1000 }), 'too_old');
    // Old behaviour, asserted for contrast.
    assert.equal(stuckAgeVerdict(created, { now: at(12), minStuckAgeMs: 15 * 60 * 1000 }), 'too_young');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();

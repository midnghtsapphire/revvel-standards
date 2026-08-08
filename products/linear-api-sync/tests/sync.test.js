'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractLinearIssueIds,
  parseGithubPushPayload,
  filterCommitsWithIssues,
  buildLinearSyncMutation,
  buildSyncCommentText,
  planLinearUpdates,
  syncGithubPayloadToLinear,
  verifyWebhookSecret,
  getPublicConfig,
} = require('../lib/sync.js');

describe('extractLinearIssueIds', () => {
  it('finds unique Linear keys', () => {
    assert.deepEqual(
      extractLinearIssueIds('fix: ENG-105 and ENG-105 plus OPS-12'),
      ['ENG-105', 'OPS-12'],
    );
  });

  it('ignores lowercase noise', () => {
    assert.deepEqual(extractLinearIssueIds('fixed eng-105 already'), []);
  });
});

describe('parseGithubPushPayload', () => {
  it('reads head_commit from a GitHub push body', () => {
    const items = parseGithubPushPayload({
      head_commit: {
        id: 'abc123',
        message: 'feat: ship ENG-99',
        url: 'https://example.com/abc123',
        author: { name: 'Ada' },
      },
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].primaryIssueId, 'ENG-99');
    assert.equal(items[0].author, 'Ada');
  });

  it('supports n8n nested body + playground message shape', () => {
    const nested = parseGithubPushPayload({
      body: {
        head_commit: {
          message: 'chore: ENG-1',
          author: { name: 'Bot' },
          url: 'u',
          id: '1',
        },
      },
    });
    assert.equal(nested[0].primaryIssueId, 'ENG-1');

    const play = parseGithubPushPayload({
      message: 'docs: ENG-2',
      author: 'Sam',
      url: 'u2',
      sha: 's2',
    });
    assert.equal(play[0].author, 'Sam');
    assert.equal(play[0].sha, 's2');
  });
});

describe('mutations + planning', () => {
  it('builds comment-only mutation without done state', () => {
    const m = buildLinearSyncMutation({
      issueId: 'ENG-105',
      commentText: 'hi',
    });
    assert.equal(m.mode, 'comment-only');
    assert.match(m.query, /commentCreate/);
    assert.equal(m.variables.id, 'ENG-105');
  });

  it('builds state-and-comment mutation with done state', () => {
    const m = buildLinearSyncMutation({
      issueId: 'ENG-105',
      commentText: 'done',
      doneStateId: 'state-uuid',
    });
    assert.equal(m.mode, 'state-and-comment');
    assert.match(m.query, /issueUpdate/);
    assert.equal(m.variables.stateId, 'state-uuid');
  });

  it('plans one update per issue id', () => {
    const plans = planLinearUpdates(
      { message: 'fix: ENG-1 and ENG-2', author: 'a', url: 'u', sha: 's' },
      { doneStateId: 'done' },
    );
    assert.equal(plans.length, 2);
    assert.equal(plans[0].mutation.mode, 'state-and-comment');
    assert.match(buildSyncCommentText(plans[0]), /Agent Factory/);
  });

  it('filters commits without issues', () => {
    const items = parseGithubPushPayload({ message: 'no keys here', author: 'x' });
    assert.equal(filterCommitsWithIssues(items).length, 0);
  });
});

describe('syncGithubPayloadToLinear', () => {
  it('dry-runs by default without fetch', async () => {
    const result = await syncGithubPayloadToLinear({
      message: 'fix: ENG-7',
      author: 'bot',
      url: 'https://example.com/7',
      sha: '7',
    });
    assert.equal(result.dryRun, true);
    assert.equal(result.planned, 1);
    assert.equal(result.results[0].status, 'planned');
  });

  it('executes live mutations via injected fetch', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { commentCreate: { success: true } } }),
      };
    };

    const result = await syncGithubPayloadToLinear(
      { message: 'fix: ENG-8', author: 'bot', url: 'u', sha: '8' },
      { dryRun: false, apiKey: 'lin_test_key', fetchImpl },
    );
    assert.equal(result.dryRun, false);
    assert.equal(result.results[0].status, 'ok');
    assert.equal(calls.length, 1);
    assert.match(String(calls[0].url), /linear\.app\/graphql/);
  });
});

describe('webhook secret + public config', () => {
  it('allows missing secret when none configured', () => {
    assert.equal(verifyWebhookSecret({ configuredSecret: '', providedSecret: '' }).ok, true);
  });

  it('rejects mismatch', () => {
    assert.equal(
      verifyWebhookSecret({ configuredSecret: 'abc', providedSecret: 'nope' }).ok,
      false,
    );
  });

  it('never leaks secret values in public config', () => {
    const cfg = getPublicConfig({
      LINEAR_API_KEY: 'secret-value',
      LINEAR_DONE_STATE_ID: 'state',
      GITHUB_WEBHOOK_SECRET: 'whsec',
    });
    assert.equal(cfg.hasLinearApiKey, true);
    assert.equal(cfg.hasDoneStateId, true);
    assert.equal(cfg.hasWebhookSecret, true);
    assert.equal(JSON.stringify(cfg).includes('secret-value'), false);
  });
});

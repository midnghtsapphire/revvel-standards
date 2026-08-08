#!/usr/bin/env node
'use strict';

/**
 * Root regression tests for Linear API Synchronization (WR-16444).
 * Pure helpers — no Next.js runtime, no network.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const syncPath = path.join(root, 'products/linear-api-sync/lib/sync.js');
const scriptPath = path.join(root, 'scripts/linear-api-sync.js');
const n8nPath = path.join(root, 'workflows/n8n/linear-github-commit-sync.json');
const secretsMapPath = path.join(root, 'docs/SECRETS_MAP.md');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

test('product lib, CLI script, n8n workflow, and SECRETS_MAP exist', () => {
  assert.ok(fs.existsSync(syncPath), 'missing lib/sync.js');
  assert.ok(fs.existsSync(scriptPath), 'missing scripts/linear-api-sync.js');
  assert.ok(fs.existsSync(n8nPath), 'missing n8n workflow json');
  assert.ok(fs.existsSync(secretsMapPath), 'missing docs/SECRETS_MAP.md');
});

const {
  extractLinearIssueIds,
  parseGithubPushPayload,
  planLinearUpdates,
  buildLinearSyncMutation,
  verifyWebhookSecret,
  getPublicConfig,
} = require(syncPath);

test('extracts ENG-105 style ids from commit messages', () => {
  assert.deepStrictEqual(extractLinearIssueIds('fix: heal ENG-105'), ['ENG-105']);
});

test('parses GitHub head_commit payload used by the n8n blueprint', () => {
  const items = parseGithubPushPayload({
    head_commit: {
      message: 'feat: ENG-105 done',
      author: { name: 'Factory' },
      url: 'https://github.com/example/commit/1',
      id: '1',
    },
  });
  assert.strictEqual(items[0].primaryIssueId, 'ENG-105');
});

test('plans Linear GraphQL update with Done state placeholder replaced by env id', () => {
  const plans = planLinearUpdates(
    { message: 'fix: ENG-105', author: 'a', url: 'u', sha: 's' },
    { doneStateId: 'DONE_STATE_ID_HERE' },
  );
  assert.strictEqual(plans.length, 1);
  assert.strictEqual(plans[0].mutation.mode, 'state-and-comment');
  assert.strictEqual(plans[0].mutation.variables.stateId, 'DONE_STATE_ID_HERE');
  assert.ok(plans[0].mutation.query.includes('issueUpdate'));
  assert.ok(plans[0].mutation.query.includes('commentCreate'));
});

test('comment-only mode when Done state missing', () => {
  const m = buildLinearSyncMutation({ issueId: 'ENG-1', commentText: 'x' });
  assert.strictEqual(m.mode, 'comment-only');
});

test('webhook secret verification', () => {
  assert.strictEqual(verifyWebhookSecret({ configuredSecret: null, providedSecret: null }).ok, true);
  assert.strictEqual(
    verifyWebhookSecret({ configuredSecret: 's3cret', providedSecret: 's3cret' }).ok,
    true,
  );
  assert.strictEqual(
    verifyWebhookSecret({ configuredSecret: 's3cret', providedSecret: 'nope' }).ok,
    false,
  );
});

test('public config never embeds secret values', () => {
  const cfg = getPublicConfig({ LINEAR_API_KEY: 'lin_super_secret' });
  assert.strictEqual(cfg.hasLinearApiKey, true);
  assert.strictEqual(JSON.stringify(cfg).includes('lin_super_secret'), false);
});

test('n8n workflow JSON is valid and wires webhook → parse → Linear', () => {
  const wf = JSON.parse(fs.readFileSync(n8nPath, 'utf8'));
  assert.ok(wf.name);
  assert.ok(Array.isArray(wf.nodes));
  const names = wf.nodes.map((n) => n.name);
  assert.ok(names.includes('GitHub Webhook Trigger'));
  assert.ok(names.includes('Parse Linear Issue ID'));
  assert.ok(names.includes('Linear GraphQL API Update'));
  assert.ok(wf.connections['GitHub Webhook Trigger']);
  assert.ok(wf.connections['Parse Linear Issue ID']);
  const http = wf.nodes.find((n) => n.name === 'Linear GraphQL API Update');
  assert.ok(http.parameters.url.includes('api.linear.app'));
  assert.notStrictEqual(http.parameters.url, 'https://linear.app');
});

test('SECRETS_MAP documents Linear sync secret names only', () => {
  const md = fs.readFileSync(secretsMapPath, 'utf8');
  assert.ok(md.includes('LINEAR_API_KEY'));
  assert.ok(md.includes('LINEAR_DONE_STATE_ID'));
  assert.ok(md.includes('GITHUB_WEBHOOK_SECRET'));
  assert.ok(md.includes('linear-api-sync'));
  // crude guard: map should not look like it embeds a lin_ live token
  assert.ok(!/lin_[A-Za-z0-9]{20,}/.test(md));
});

test('product package.json exposes port 3012 scripts', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, 'products/linear-api-sync/package.json'), 'utf8'),
  );
  assert.ok(pkg.scripts.dev.includes('3012'));
  assert.ok(pkg.scripts.test);
});

console.log(`\nlinear-api-sync tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

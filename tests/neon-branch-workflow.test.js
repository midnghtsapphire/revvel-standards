#!/usr/bin/env node
'use strict';

// Regression guard for the Neon preview-branch workflow (PR #16855 review).
// The original version shipped under `workflows/` (never executed by GitHub),
// advertised job outputs from a step id that did not exist, used floating
// action tags, had no permissions block, ran for fork/Dependabot PRs where
// NEON_API_KEY is unavailable, and deleted branches non-idempotently.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/neon-branch.yml');

test('Neon workflow lives where GitHub Actions reads workflows', () => {
  assert.ok(fs.existsSync(workflowPath), 'expected .github/workflows/neon-branch.yml');
  assert.ok(
    !fs.existsSync(path.join(root, 'workflows/NEON_Workflow.yaml')),
    'the inert copy under workflows/ must not come back'
  );
});

test('Neon workflow is wired correctly', () => {
  const wf = fs.readFileSync(workflowPath, 'utf8');

  // Job outputs must read the step that actually exists, using the v6 action's
  // real output names (`db_url`, `db_url_pooled`).
  assert.doesNotMatch(wf, /create_neon_branch_encode/);
  assert.doesNotMatch(wf, /db_url_with_pooler/);
  assert.match(wf, /db_url_pooled:\s*\$\{\{ steps\.create_neon_branch\.outputs\.db_url_pooled \}\}/);

  // Least privilege, and no secret-less runs from forks or Dependabot.
  assert.match(wf, /^permissions:\n {2}contents: read$/m);
  assert.match(wf, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(wf, /github\.actor != 'dependabot\[bot\]'/);

  // Cleanup tolerates an already-expired branch without failing the check.
  assert.match(wf, /if: steps\.check_branch\.outputs\.exists == 'true'/);

  // CLAUDE.md gotcha #8: third-party actions pinned to full commit SHAs,
  // including the commented-out schema-diff example.
  const uses = wf.match(/uses:\s*\S+/g) || [];
  assert.ok(uses.length > 0, 'expected at least one action reference');
  for (const line of uses) {
    assert.match(line, /uses:\s*[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `unpinned action: ${line}`);
  }
});

// ── branch lookup ───────────────────────────────────────────────────────────

const { branchExists } = require('../scripts/neon-branch-exists');

function fakeNeon(pages) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const cursor = new URL(url).searchParams.get('cursor');
    const page = pages.find((p) => (p.cursor ?? null) === cursor);
    if (!page) throw new Error(`unexpected cursor: ${cursor}`);
    return {
      status: page.status ?? 200,
      json: async () => page.body ?? {},
    };
  };
  return { fetchImpl, calls };
}

const lookup = { apiKey: 'key', projectId: 'proj', branchName: 'preview/pr-1-feat', apiHost: 'https://neon.test/api/v2' };

test('branch lookup follows every page of the paginated listing', async () => {
  // Regression: a single unpaginated request missed branches past page 1 and
  // skipped a delete that was needed, leaking the preview branch until expiry.
  const { fetchImpl, calls } = fakeNeon([
    { cursor: null, body: { branches: [{ name: 'preview/pr-2-other' }], pagination: { next: 'cur2' } } },
    { cursor: 'cur2', body: { branches: [{ name: 'preview/pr-1-feat' }] } },
  ]);
  assert.equal(await branchExists({ ...lookup, fetchImpl }), true);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /search=preview%2Fpr-1-feat/);
});

test('branch lookup reports a genuinely absent branch, and stops on a repeated cursor', async () => {
  const { fetchImpl, calls } = fakeNeon([
    { cursor: null, body: { branches: [{ name: 'main' }], pagination: { next: 'loop' } } },
    { cursor: 'loop', body: { branches: [{ name: 'main' }], pagination: { next: 'loop' } } },
  ]);
  assert.equal(await branchExists({ ...lookup, fetchImpl }), false);
  assert.equal(calls.length, 2);
});

test('branch lookup fails loudly on a non-200 response', async () => {
  const { fetchImpl } = fakeNeon([{ cursor: null, status: 401 }]);
  await assert.rejects(() => branchExists({ ...lookup, fetchImpl }), /HTTP 401/);
});

test('branch lookup throws NeonApiError on a malformed 200 response (missing branches array)', async () => {
  // Regression for thread 14: a 200 with no "branches" key must not be silently
  // treated as "branch absent" — that would skip deletion and leak the preview branch.
  const { fetchImpl } = fakeNeon([{ cursor: null, body: { error: 'unexpected payload' } }]);
  await assert.rejects(
    () => branchExists({ ...lookup, fetchImpl }),
    { name: 'NeonApiError', message: /malformed response/ }
  );
});

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

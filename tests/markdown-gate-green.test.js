#!/usr/bin/env node
'use strict';

// The markdown gate must be green on main, and `npm test` must say so.
//
// lint-md.yml runs markdownlint-cli over the whole repo with
// .markdownlint.yaml + .markdownlintignore. That check was failing on main
// with 15 findings — two documents concatenated so each carried its own H1,
// five bare URLs, four `[WR] ` code spans with a semantic trailing space, a
// stray blank line, and two unlabelled code fences.
//
// Nothing local caught it. CLAUDE.md requires `npm ci && npm test` to pass
// before pushing, and it did: the markdown gate lived only in CI, where a red
// check on main is a notification nobody has to act on. The other local gate
// (`npm run lint`) reads a different config and a different file set, so it
// could not have caught this either.
//
// Same defect family as #17704 (`npm test || true`) and #17714 (workflows
// that opened PRs claiming to close issues): an artifact that reports success
// without doing the work — here, a pre-push checklist that never looked at
// the one gate that was red.
//
// This test runs the CI gate's exact rules and exact file set, so the pre-push
// suite fails on anything lint-md.yml would fail on. It shares that invocation
// with `npm run lint` via scripts/markdownlint-repo.mjs, so there is one way
// to lint this repo's markdown and no second copy to drift.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');

test('the markdown gate lint-md.yml runs is green', async () => {
  const mod = await import(
    pathToFileURL(path.join(repoRoot, 'scripts', 'markdownlint-repo.mjs')).href
  );

  assert.ok(
    fs.existsSync(path.join(repoRoot, '.markdownlint.yaml')),
    '.markdownlint.yaml is missing',
  );
  assert.ok(
    fs.existsSync(path.join(repoRoot, '.markdownlintignore')),
    '.markdownlintignore is missing',
  );

  const result = mod.runMarkdownlint({ root: repoRoot });

  assert.equal(
    result.error,
    undefined,
    `markdownlint-cli2 failed to run: ${result.error && result.error.message}`,
  );

  // Findings go to stderr, one per line, as "path:line[:col] MDxxx/name ...".
  const findings = String(result.stderr || '')
    .split('\n')
    .filter((line) => /\.md:\d+/.test(line));

  assert.deepEqual(
    findings,
    [],
    `markdownlint findings on main (lint-md.yml would be red):\n${findings.join('\n')}`,
  );
  assert.equal(result.status, 0, 'markdownlint-cli2 exited non-zero');
});

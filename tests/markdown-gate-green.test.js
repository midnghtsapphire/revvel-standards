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
// suite fails on anything lint-md.yml would fail on.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const cli = path.join(repoRoot, 'node_modules', '.bin', 'markdownlint-cli2');
const configPath = path.join(repoRoot, '.markdownlint.yaml');
const ignorePath = path.join(repoRoot, '.markdownlintignore');

// .markdownlintignore is gitignore-style; markdownlint-cli2 takes the same
// exclusions as "#glob" arguments. Reading the file rather than restating the
// patterns keeps this test and lint-md.yml on one source of truth: widen the
// ignore file and both gates widen together.
function ignoreGlobs() {
  return fs
    .readFileSync(ignorePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((pattern) => `#${pattern}`);
}

test('the markdown gate lint-md.yml runs is green', () => {
  assert.ok(
    fs.existsSync(cli),
    'markdownlint-cli2 is not installed — run `npm ci` before `npm test`',
  );
  assert.ok(fs.existsSync(configPath), '.markdownlint.yaml is missing');
  assert.ok(fs.existsSync(ignorePath), '.markdownlintignore is missing');

  const result = spawnSync(
    cli,
    ['--config', configPath, '**/*.md', ...ignoreGlobs()],
    { cwd: repoRoot, encoding: 'utf8', timeout: 300_000 },
  );

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

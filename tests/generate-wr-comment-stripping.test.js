#!/usr/bin/env node
'use strict';

/**
 * Regression test: generate-wr.sh must strip leading multi-line HTML comments
 * from WR_TEMPLATE_FULL.md so the H1 lands on line 1.
 *
 * Covers the fix for #15307 — the awk comment-stripper must handle multi-line
 * <!-- --> blocks (not just single-line ones) so the linter does not reject
 * the output with "H1 is at line 7, expected line 1".
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATE_SH = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const WR_ISSUES_DIR = path.join(REPO_ROOT, 'wr', 'issues');

test('generate-wr.sh: H1 lands on line 1 (multi-line comment stripping)', () => {
  // Write a minimal body file
  const bodyFile = path.join(os.tmpdir(), 'wr-test-body.md');
  fs.writeFileSync(bodyFile, 'Test issue body for comment stripping regression.\n');

  const title = 'Comment Stripping Regression Test WR';
  const issueNum = 'test-comment-strip';

  const result = spawnSync('bash', [
    GENERATE_SH,
    '--issue', issueNum,
    '--title', title,
    '--body-file', bodyFile,
    '--class', 'full',
  ], { encoding: 'utf8', cwd: REPO_ROOT });

  // Clean up generated file regardless of outcome
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  const outFile = path.join(WR_ISSUES_DIR, `issue-${issueNum}-${slug}.md`);
  try {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  } catch (_) { /* ignore cleanup errors */ }
  fs.unlinkSync(bodyFile);

  assert.strictEqual(result.status, 0,
    `generate-wr.sh failed with exit code ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);

  assert.ok(
    !result.stderr.includes('H1 is at line'),
    `wr-lint reported H1 not at line 1 — multi-line comment stripping broken.\nstderr: ${result.stderr}`
  );
});

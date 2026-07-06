#!/usr/bin/env node
'use strict';

/**
 * Regression test: generate-wr.sh must strip ALL leading HTML comments
 * (both single-line and multi-line) before the H1 so that wr-lint sees
 * the `# WR:` header on line 1.
 *
 * Covers the fix for WR_TEMPLATE_FULL.md's multi-line Source-packet
 * convention comment that was causing H1-at-line-7 failures.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATE_WR = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const WR_LINT = path.join(REPO_ROOT, 'wr', 'scripts', 'wr-lint.mjs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

/**
 * Run generate-wr.sh with a given title and class, return the generated file
 * content (or null on failure).
 */
function runGenerator(issueNum, title, bodyText, wrClass) {
  const tmpBody = path.join(os.tmpdir(), `test-wr-body-${issueNum}.txt`);
  fs.writeFileSync(tmpBody, bodyText);

  const result = spawnSync(
    'bash',
    [
      GENERATE_WR,
      '--issue', String(issueNum),
      '--title', title,
      '--body-file', tmpBody,
      '--class', wrClass,
    ],
    { encoding: 'utf8', cwd: REPO_ROOT }
  );

  fs.unlinkSync(tmpBody);

  const dest = path.join(
    REPO_ROOT, 'wr', 'issues',
    `issue-${issueNum}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)}.md`
  );

  if (result.status !== 0) {
    return { ok: false, stderr: result.stderr, dest };
  }

  const content = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
  return { ok: true, content, dest };
}

// ---------------------------------------------------------------------------
// Test 1: FULL-class WR (multi-line leading comments) — H1 must be on line 1
// ---------------------------------------------------------------------------
test('FULL template: H1 lands on line 1 despite multi-line leading HTML comments', () => {
  const r = runGenerator(
    'test-mline',
    'test multiline comment strip',
    'https://example.com/reference',
    'full'
  );
  assert(r.ok, `Generator failed: ${r.stderr}`);
  assert(r.content, 'No output file created');

  const firstLine = r.content.split('\n')[0];
  assert(
    firstLine.startsWith('# WR:'),
    `Expected H1 on line 1, got: "${firstLine}"`
  );

  // Cleanup
  if (fs.existsSync(r.dest)) fs.unlinkSync(r.dest);
});

// ---------------------------------------------------------------------------
// Test 2: BASIC-class WR — H1 still on line 1
// ---------------------------------------------------------------------------
test('BASIC template: H1 lands on line 1', () => {
  const r = runGenerator(
    'test-basic',
    'test basic comment strip fix',
    'Some body text',
    'basic'
  );
  assert(r.ok, `Generator failed: ${r.stderr}`);
  assert(r.content, 'No output file created');

  const firstLine = r.content.split('\n')[0];
  assert(
    firstLine.startsWith('# WR:'),
    `Expected H1 on line 1, got: "${firstLine}"`
  );

  // Cleanup
  if (fs.existsSync(r.dest)) fs.unlinkSync(r.dest);
});

// ---------------------------------------------------------------------------
// Test 3: No raw {TOKEN} placeholders left in FULL-class output
// ---------------------------------------------------------------------------
test('FULL template: no unfilled {TOKEN} placeholders remain', () => {
  const r = runGenerator(
    'test-tokens',
    'test token substitution completeness',
    'https://example.com/source',
    'full'
  );
  assert(r.ok, `Generator failed: ${r.stderr}`);
  assert(r.content, 'No output file created');

  const rawTokens = r.content.match(/\{[A-Z_]+\}/g);
  assert(
    !rawTokens,
    `Unfilled tokens found: ${rawTokens ? rawTokens.join(', ') : 'none'}`
  );

  // Cleanup
  if (fs.existsSync(r.dest)) fs.unlinkSync(r.dest);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

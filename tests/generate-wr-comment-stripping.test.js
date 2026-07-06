#!/usr/bin/env node
'use strict';

/**
 * Regression test: generate-wr.sh must strip leading multi-line HTML comments
 * from WR_TEMPLATE_FULL.md so the H1 lands on line 1 and passes wr-lint.
 *
 * This exercises the in_comment state fix in generate-wr.sh (wr/scripts/).
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATE_WR = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const WR_ISSUES_DIR = path.join(REPO_ROOT, 'wr', 'issues');

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

// ---- helpers ----

/**
 * Run generate-wr.sh in a temp dir and return the generated file path.
 */
function runGenerator({ issue = 'test99', title, body = '', extraArgs = [] } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-wr-'));
  const bodyFile = path.join(tmpDir, 'body.txt');
  fs.writeFileSync(bodyFile, body);

  const result = spawnSync('bash', [
    GENERATE_WR,
    '--issue', String(issue),
    '--title', title,
    '--body-file', bodyFile,
    '--class', 'full',
    ...extraArgs,
  ], { encoding: 'utf8', cwd: REPO_ROOT });

  if (result.status !== 0) {
    const err = (result.stderr || '') + (result.stdout || '');
    throw new Error(`generate-wr.sh exited ${result.status}: ${err}`);
  }

  // find the generated file
  const files = fs.readdirSync(WR_ISSUES_DIR)
    .filter(f => f.startsWith(`issue-${issue}-`))
    .map(f => path.join(WR_ISSUES_DIR, f));

  if (files.length === 0) {
    throw new Error('No output file found in wr/issues/');
  }

  return { filePath: files[files.length - 1], tmpDir };
}

// ---- tests ----

test('WR_TEMPLATE_FULL has multi-line HTML comment before H1', () => {
  const fullTemplate = path.join(REPO_ROOT, 'wr', 'WR_TEMPLATE_FULL.md');
  const lines = fs.readFileSync(fullTemplate, 'utf8').split('\n');
  // There must be at least one multi-line HTML comment (opens on one line, closes on a later line)
  let inComment = false;
  let foundMultiLine = false;
  for (const line of lines) {
    if (!inComment && line.trim().startsWith('<!--') && !line.includes('-->')) {
      inComment = true;
    } else if (inComment && line.includes('-->')) {
      inComment = false;
      foundMultiLine = true;
      break;
    }
  }
  assert(foundMultiLine, 'WR_TEMPLATE_FULL.md should contain at least one multi-line HTML comment before the H1');
});

test('generate-wr.sh produces H1 on line 1 for FULL template', () => {
  const issueNum = `99001`;
  let filePath;
  try {
    ({ filePath } = runGenerator({
      issue: issueNum,
      title: 'Test PBM Therapy Bed App for app or tool',
      body: 'https://example.com/test.pdf',
    }));
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    assert(lines[0].startsWith('# WR:'), `Line 1 must start with '# WR:' but got: ${lines[0]}`);
  } finally {
    // clean up generated file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

test('generate-wr.sh strips all leading HTML comments before H1', () => {
  const issueNum = `99002`;
  let filePath;
  try {
    ({ filePath } = runGenerator({
      issue: issueNum,
      title: 'PhotoBioModulation Tool app',
      body: 'https://example.com/pbm.pdf',
    }));
    const content = fs.readFileSync(filePath, 'utf8');
    const firstNonBlank = content.split('\n').find(l => l.trim() !== '');
    assert(
      firstNonBlank && firstNonBlank.startsWith('# WR:'),
      `First non-blank line must be the H1. Got: ${firstNonBlank}`
    );
    // no HTML comment should appear before the H1
    const h1Line = content.indexOf('# WR:');
    const commentBefore = content.substring(0, h1Line);
    assert(!commentBefore.includes('<!--'), `No HTML comment should appear before the H1. Found: ${commentBefore}`);
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// ---- summary ----
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

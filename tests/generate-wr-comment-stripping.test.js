#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATOR = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const ISSUE_NUMBER = '999998';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.stack || err.message}`);
    failed += 1;
  }
}

function cleanupGeneratedFiles() {
  const issuesDir = path.join(REPO_ROOT, 'wr', 'issues');
  for (const name of fs.readdirSync(issuesDir)) {
    if (name.startsWith(`issue-${ISSUE_NUMBER}-`) && name.endsWith('.md')) {
      fs.unlinkSync(path.join(issuesDir, name));
    }
  }
}

test('generate-wr strips leading multi-line HTML comments so H1 is line 1', () => {
  cleanupGeneratedFiles();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-wr-test-'));
  const bodyFile = path.join(tmpDir, 'body.md');
  fs.writeFileSync(bodyFile, 'https://example.com/source\n', 'utf8');

  try {
    execFileSync(
      'bash',
      [
        GENERATOR,
        '--issue',
        ISSUE_NUMBER,
        '--title',
        'World First: Patient Receives High-Risk Therapy to Make Cells Young Again : ScienceAlert#tools #apps',
        '--body-file',
        bodyFile,
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );

    const issuesDir = path.join(REPO_ROOT, 'wr', 'issues');
    const generated = fs
      .readdirSync(issuesDir)
      .find((name) => name.startsWith(`issue-${ISSUE_NUMBER}-`) && name.endsWith('.md'));

    assert.ok(generated, 'expected generator to create a WR issue file');
    const content = fs.readFileSync(path.join(issuesDir, generated), 'utf8');
    assert.ok(content.startsWith('# WR:'), 'expected generated WR to start with H1 on line 1');
  } finally {
    cleanupGeneratedFiles();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${passed} test(s) passed`);

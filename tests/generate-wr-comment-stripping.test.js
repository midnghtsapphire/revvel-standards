#!/usr/bin/env node
'use strict';

/**
 * Regression test for generate-wr.sh multi-line HTML comment stripping.
 *
 * WR_TEMPLATE_FULL.md has a multi-line <!-- --> block (lines 3-8) above the
 * H1. The generator's awk comment-stripper must handle multi-line comments
 * (using in_comment state) so that the H1 always lands on line 1 of the
 * generated output — the requirement enforced by wr-lint rule 1.
 *
 * Issue reference: #15307 / #15325
 */

const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..');
const generateWr = path.resolve(repoRoot, 'wr/scripts/generate-wr.sh');
const issuesDir = path.resolve(repoRoot, 'wr/issues');

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

// Write a temporary body file
const bodyFile = path.join(os.tmpdir(), 'test-wr-comment-strip-body.txt');
fs.writeFileSync(bodyFile, 'Regression body for comment stripping test.\n');

const TEST_ISSUE = '00001';
let generatedFile = null;

// Run the generator
let generatorFailed = false;
try {
  execSync(
    `bash "${generateWr}" --issue "${TEST_ISSUE}" --title "comment stripping regression test wr" --body-file "${bodyFile}" --class full`,
    { cwd: repoRoot, encoding: 'utf8' }
  );
} catch (err) {
  generatorFailed = true;
  console.error('Generator failed:', err.stderr || err.message);
}

// Locate the generated file
if (!generatorFailed) {
  try {
    const files = fs.readdirSync(issuesDir).filter((f) => f.startsWith(`issue-${TEST_ISSUE}-`));
    if (files.length > 0) {
      generatedFile = path.resolve(issuesDir, files[0]);
    }
  } catch (_) {}
}

if (test('generator produces a file for full-class WR', () => {
  assert.ok(!generatorFailed, 'generate-wr.sh should exit 0');
  assert.ok(generatedFile && fs.existsSync(generatedFile), 'generated file should exist in wr/issues/');
})) { passed++; } else { failed++; }

if (generatedFile && fs.existsSync(generatedFile)) {
  const content = fs.readFileSync(generatedFile, 'utf8');
  const lines = content.split('\n');

  if (test('H1 is the very first line of the generated WR (no leading comments)', () => {
    assert.ok(
      lines[0].startsWith('# WR:'),
      `Line 1 should be "# WR:…", got: "${lines[0]}"`
    );
  })) { passed++; } else { failed++; }

  if (test('no HTML comment block remains before the H1', () => {
    const beforeH1 = lines.slice(0, lines.findIndex((l) => l.startsWith('# WR:'))).join('\n');
    assert.ok(
      !beforeH1.includes('<!--'),
      `Found HTML comment before H1. Content before H1:\n${beforeH1}`
    );
  })) { passed++; } else { failed++; }
}

// Cleanup
try { fs.unlinkSync(bodyFile); } catch (_) {}
if (generatedFile && fs.existsSync(generatedFile)) {
  try { fs.unlinkSync(generatedFile); } catch (_) {}
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

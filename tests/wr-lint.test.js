#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const lintScript = path.join(repoRoot, 'wr/scripts/wr-lint.mjs');

function runLint(content) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-lint-'));
  const file = path.join(tmpDir, 'sample.md');
  fs.writeFileSync(file, content);
  const result = spawnSync('node', [lintScript, file], { encoding: 'utf8' });
  return result;
}

test('fails when star claims are missing timestamp/source evidence', () => {
  const result = runLint(`# WR: test\n\n## Competitors\n| Tool | GitHub Stars |\n|---|---|\n| OpenAI Evals | 14.2k |\n`);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /competitor\/star claims need verification metadata/i);
});

test('fails blocked WR without awaiting-input checklist', () => {
  const result = runLint(`# WR: test\n\n## 1. Executive Decision\n\n**BLOCKED - CRITICAL INFORMATION MISSING**\n`);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /blocked WR missing intake gate/i);
});

test('passes when evidence + blocked intake checklist are present', () => {
  const result = runLint(`# WR: test\n\nData collected: 2026-07-02\nSources: GitHub API https://github.com/openai/evals\n\n| Tool | GitHub Stars |\n|---|---|\n| OpenAI Evals | 14.2k |\n\n## 1. Executive Decision\n\n**BLOCKED - CRITICAL INFORMATION MISSING**\n\n### AWAITING INPUT\n- [ ] Revenue data provided\n- [ ] Cost data provided\n`);
  assert.strictEqual(result.status, 0, result.stdout || result.stderr);
});

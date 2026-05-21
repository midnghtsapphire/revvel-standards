#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'perplexity-research-issue.js');
const {
  buildResearchPrompt,
  callPerplexity,
  fetchGitHubIssue,
} = require('../scripts/perplexity-research-issue.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${error.message}`);
    failed += 1;
  }
}

function runScriptWithEnv(extraEnv) {
  return spawnSync('node', [SCRIPT_PATH], {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

test('exports expected helper functions', () => {
  assert.strictEqual(typeof buildResearchPrompt, 'function');
  assert.strictEqual(typeof callPerplexity, 'function');
  assert.strictEqual(typeof fetchGitHubIssue, 'function');
});

test('buildResearchPrompt includes required handoff sections and issue context', () => {
  const prompt = buildResearchPrompt({
    number: 13664,
    title: 'Create product for graphify',
    body: 'Need a complete WR handoff',
    labels: ['wr:research', 'deep-research'],
    comments: [{ author: { login: 'midnghtsapphire' }, body: 'Please include sources.' }],
  });

  assert.ok(prompt.includes('Issue #13664: Create product for graphify'));
  assert.ok(prompt.includes('Labels: wr:research, deep-research'));
  assert.ok(prompt.includes('## Diagnosis'));
  assert.ok(prompt.includes('## Implementation Plan'));
  assert.ok(prompt.includes('## Code Agent Handoff'));
  assert.ok(prompt.includes('Recent comments:'));
});

test('script exits with clear error when PERPLEXITY_API_KEY is missing', () => {
  const result = runScriptWithEnv({
    PERPLEXITY_API_KEY: '',
    ISSUE_NUMBER: '1',
    REPO: 'midnghtsapphire/revvel-standards',
  });

  assert.notStrictEqual(result.status, 0);
  const output = `${result.stderr || ''}${result.stdout || ''}`;
  assert.ok(output.includes('Missing PERPLEXITY_API_KEY secret'));
});

test('script exits with clear error when ISSUE_NUMBER is missing', () => {
  const result = runScriptWithEnv({
    PERPLEXITY_API_KEY: 'test-key',
    ISSUE_NUMBER: '',
    REPO: 'midnghtsapphire/revvel-standards',
  });

  assert.notStrictEqual(result.status, 0);
  const output = `${result.stderr || ''}${result.stdout || ''}`;
  assert.ok(output.includes('Missing ISSUE_NUMBER'));
});

test('script exits with clear error when REPO is missing', () => {
  const result = runScriptWithEnv({
    PERPLEXITY_API_KEY: 'test-key',
    ISSUE_NUMBER: '1',
    REPO: '',
  });

  assert.notStrictEqual(result.status, 0);
  const output = `${result.stderr || ''}${result.stdout || ''}`;
  assert.ok(output.includes('Missing REPO (format: owner/repo)'));
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

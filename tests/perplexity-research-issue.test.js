#!/usr/bin/env node
'use strict';

/**
 * Tests for scripts/perplexity-research-issue.js
 * Validates the no-key OpenRouter fallback and core module exports.
 */

const assert = require('assert');
const {
  callPerplexity,
  callPerplexityViaOpenRouter,
  buildResearchPrompt,
  fetchGitHubIssue,
} = require('../scripts/perplexity-research-issue.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// ── Module shape ────────────────────────────────────────────────────────────

test('exports callPerplexity function', () => {
  assert.strictEqual(typeof callPerplexity, 'function');
});

test('exports callPerplexityViaOpenRouter function (no-key lane)', () => {
  assert.strictEqual(typeof callPerplexityViaOpenRouter, 'function');
});

test('exports buildResearchPrompt function', () => {
  assert.strictEqual(typeof buildResearchPrompt, 'function');
});

test('exports fetchGitHubIssue function', () => {
  assert.strictEqual(typeof fetchGitHubIssue, 'function');
});

// ── buildResearchPrompt ─────────────────────────────────────────────────────

test('buildResearchPrompt includes issue title and body', () => {
  const issue = {
    number: 42,
    title: 'Fix autoprocessing',
    body: 'Autoprocessing stopped working.',
    labels: ['work-request', 'weekly-research'],
    comments: [],
    recentCommits: [],
  };
  const prompt = buildResearchPrompt(issue);
  assert.ok(prompt.includes('42'), 'should include issue number');
  assert.ok(prompt.includes('Fix autoprocessing'), 'should include issue title');
  assert.ok(prompt.includes('Autoprocessing stopped working'), 'should include issue body');
});

test('buildResearchPrompt includes labels when present', () => {
  const issue = {
    number: 1,
    title: 'Test',
    body: 'Body',
    labels: ['work-request', 'mindmappr'],
    comments: [],
    recentCommits: [],
  };
  const prompt = buildResearchPrompt(issue);
  assert.ok(prompt.includes('work-request'), 'should include labels');
  assert.ok(prompt.includes('mindmappr'), 'should include mindmappr label');
});

test('buildResearchPrompt handles empty body gracefully', () => {
  const issue = {
    number: 10,
    title: 'No body issue',
    body: null,
    labels: [],
    comments: [],
    recentCommits: [],
  };
  const prompt = buildResearchPrompt(issue);
  assert.ok(prompt.includes('No body issue'), 'should include title');
  // Should not throw on null body
});

test('buildResearchPrompt contains required output sections', () => {
  const issue = {
    number: 5,
    title: 'Section check',
    body: 'Some body',
    labels: [],
    comments: [],
    recentCommits: [],
  };
  const prompt = buildResearchPrompt(issue);
  assert.ok(prompt.includes('Diagnosis'), 'should include Diagnosis section');
  assert.ok(prompt.includes('Implementation Plan'), 'should include Implementation Plan section');
  assert.ok(prompt.includes('Code Agent Handoff'), 'should include Code Agent Handoff section');
});

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} test(s) run: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}

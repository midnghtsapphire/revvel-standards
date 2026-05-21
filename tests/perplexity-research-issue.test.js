#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  buildResearchPrompt,
  callPerplexityNoKey,
} = require('../scripts/perplexity-research-issue.js');

const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
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

async function run() {
  await test('buildResearchPrompt includes issue details and recent comments', () => {
    const prompt = buildResearchPrompt({
      number: 42,
      title: 'Add Rex lane',
      body: 'Need no-key Perplexity research in oAudrey.',
      labels: ['work-request', 'oaudrey'],
      comments: [{ author: { login: 'midnghtsapphire' }, body: 'the wr is not incomplete when there is no data they must get it' }],
    });

    assert.ok(prompt.includes('Issue #42: Add Rex lane'));
    assert.ok(prompt.includes('Labels: work-request, oaudrey'));
    assert.ok(prompt.includes('midnghtsapphire'));
    assert.ok(prompt.includes('no-key Perplexity'));
  });

  await test('callPerplexityNoKey uses the python no-key bridge with sonar + auto fallback', async () => {
    const calls = [];
    const output = await callPerplexityNoKey('research prompt', (command, args, options) => {
      calls.push({ command, args, options });
      return 'Research answer\n';
    });

    assert.strictEqual(output, 'Research answer');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].command, 'python3');
    assert.ok(Array.isArray(calls[0].args));
    assert.strictEqual(calls[0].args[2], 'research prompt');
    assert.strictEqual(calls[0].args[3], 'sonar');
    assert.strictEqual(calls[0].args[4], 'auto');
  });

  await test('workflow installs helallao/perplexity-ai and does not require PERPLEXITY_API_KEY', () => {
    const workflow = fs.readFileSync(
      path.join(REPO_ROOT, '.github', 'workflows', 'perplexity-research-agent.yml'),
      'utf8'
    );

    assert.ok(workflow.includes('helallao/perplexity-ai.git@main'));
    assert.ok(workflow.includes('Install no-key Perplexity bridge'));
    assert.ok(!workflow.includes('PERPLEXITY_API_KEY'));
  });

  await test('no-key integration doc exists and references the Rex / oAudrey lane', () => {
    const docPath = path.join(REPO_ROOT, 'docs', 'PERPLEXITY_NO_KEY_INTEGRATION.md');
    assert.ok(fs.existsSync(docPath), 'docs/PERPLEXITY_NO_KEY_INTEGRATION.md should exist');

    const doc = fs.readFileSync(docPath, 'utf8');
    assert.ok(doc.includes('helallao/perplexity-ai'));
    assert.ok(doc.includes('Rex'));
    assert.ok(doc.includes('oAudrey'));
  });

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((error) => {
  console.log(`FAIL: test runner\n    ${error.stack || error.message}`);
  process.exit(1);
});
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

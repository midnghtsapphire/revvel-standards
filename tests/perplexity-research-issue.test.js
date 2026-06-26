#!/usr/bin/env node
'use strict';

/**
 * Tests for scripts/perplexity-research-issue.js
 *
 * Validates the reconciled no-key-first strategy: the free no-key bridge is the
 * primary lane, OpenRouter perplexity/sonar-pro is the backup. Tests use an
 * injected execFileSync so no live calls are made.
 *
 * 2026-05-21 (Claude): merged two concatenated test suites into one coherent
 * suite matching the reconciled module exports (dropped the never-defined
 * `callPerplexity`).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  buildResearchPrompt,
  callPerplexityNoKey,
  callPerplexityViaOpenRouter,
  fetchGitHubIssue,
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
    failed++;
  }
}

async function run() {
  // ── Module shape ──────────────────────────────────────────────────────────
  await test('exports the no-key primary and OpenRouter backup lanes', () => {
    assert.strictEqual(typeof callPerplexityNoKey, 'function');
    assert.strictEqual(typeof callPerplexityViaOpenRouter, 'function');
    assert.strictEqual(typeof buildResearchPrompt, 'function');
    assert.strictEqual(typeof fetchGitHubIssue, 'function');
  });

  // ── buildResearchPrompt ───────────────────────────────────────────────────
  await test('buildResearchPrompt includes issue details and recent comments', () => {
    const prompt = buildResearchPrompt({
      number: 42,
      title: 'Add Rex lane',
      body: 'Need no-key Perplexity research in oAudrey.',
      labels: ['work-request', 'oaudrey'],
      comments: [{ author: { login: 'midnghtsapphire' }, body: 'get the data, do not leave it incomplete' }],
    });

    assert.ok(prompt.includes('Issue #42: Add Rex lane'));
    assert.ok(prompt.includes('Labels: work-request, oaudrey'));
    assert.ok(prompt.includes('midnghtsapphire'));
    assert.ok(prompt.includes('no-key Perplexity'));
  });

  await test('buildResearchPrompt handles empty body gracefully', () => {
    const prompt = buildResearchPrompt({
      number: 10,
      title: 'No body issue',
      body: null,
      labels: [],
      comments: [],
    });
    assert.ok(prompt.includes('No body issue'));
    assert.ok(prompt.includes('(No body)'));
  });

  await test('buildResearchPrompt contains the required output sections', () => {
    const prompt = buildResearchPrompt({
      number: 5, title: 'Section check', body: 'Some body', labels: [], comments: [],
    });
    assert.ok(prompt.includes('Diagnosis'));
    assert.ok(prompt.includes('Implementation Plan'));
    assert.ok(prompt.includes('Code Agent Handoff'));
    assert.ok(prompt.includes('Sources'));
  });

  // ── Primary lane: no-key bridge ───────────────────────────────────────────
  await test('callPerplexityNoKey uses the python no-key bridge with sonar + auto fallback', async () => {
    const calls = [];
    const output = await callPerplexityNoKey('research prompt', (command, args) => {
      calls.push({ command, args });
      return 'Research answer\n';
    });

    assert.strictEqual(output, 'Research answer');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].command, 'python3');
    assert.strictEqual(calls[0].args[2], 'research prompt');
    assert.strictEqual(calls[0].args[3], 'sonar');
    assert.strictEqual(calls[0].args[4], 'auto');
  });

  await test('callPerplexityNoKey throws when the bridge returns nothing', async () => {
    await assert.rejects(
      () => callPerplexityNoKey('p', () => '   '),
      /No response returned from no-key Perplexity bridge/
    );
  });

  // ── Workflow + docs contract ──────────────────────────────────────────────
  await test('workflow installs helallao/perplexity-ai and requires no PERPLEXITY_API_KEY', () => {
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

  await test('OpenRouter deep_search fallback keeps Sonnet 3.5 + Fusion and returns text content', () => {
    const script = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts', 'perplexity-research-issue.js'),
      'utf8'
    );
    assert.ok(script.includes("['anthropic/claude-3.5-sonnet', 'openrouter/fusion']"));
    assert.ok(script.includes('return result.text;'));
  });

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.log(`FAIL: test runner\n    ${error.stack || error.message}`);
  process.exit(1);
});

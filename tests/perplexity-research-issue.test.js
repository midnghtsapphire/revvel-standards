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

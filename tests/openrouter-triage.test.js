#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  buildSystemPrompt,
  buildUserPrompt,
} = require('../scripts/openrouter-triage.js');

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

test('buildSystemPrompt includes triage sections and provided labels', () => {
  const prompt = buildSystemPrompt(['triage:new', 'openrouter', 'role:orchestrator']);
  assert.ok(prompt.includes('Classification'));
  assert.ok(prompt.includes('Suggested Labels'));
  assert.ok(prompt.includes('triage:new'));
  assert.ok(prompt.includes('openrouter'));
});

test('buildUserPrompt includes event kind and fallback body behavior', () => {
  const prompt = buildUserPrompt({
    eventKind: 'pull_request',
    issueNumber: '123',
    title: 'Fix workflow',
    body: '',
  });
  assert.ok(prompt.includes('Event kind: pull_request'));
  assert.ok(prompt.includes('Number: #123'));
  assert.ok(prompt.includes('Title: Fix workflow'));
  assert.ok(prompt.includes('(no body provided)'));
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

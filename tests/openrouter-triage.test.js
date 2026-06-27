#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const {
  buildSystemPrompt,
  buildUserPrompt,
  buildFailureComment,
  buildPerplexityTriageScript,
  truncateForComment,
  normalizeUrl,
  extractUrls,
  collectUrlContext,
  FAILURE_LABELS,
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
  assert.ok(prompt.includes('do NOT classify them as incomplete just because sections are empty'));
  assert.ok(prompt.includes('Infer the likely implementation ask from the title, labels, comments, and repository conventions'));
});

test('buildUserPrompt includes event kind and fallback body behavior', () => {
  const prompt = buildUserPrompt({
    eventKind: 'pull_request',
    issueNumber: '123',
    title: 'Fix workflow',
    body: '',
    comments: [],
  });
  assert.ok(prompt.includes('Event kind: pull_request'));
  assert.ok(prompt.includes('Number: #123'));
  assert.ok(prompt.includes('Title: Fix workflow'));
  assert.ok(prompt.includes('(no body provided)'));
  assert.ok(prompt.includes('(no comments provided)'));
});

test('buildUserPrompt includes comment context and unwrapped LinkedIn URLs', () => {
  const prompt = buildUserPrompt({
    eventKind: 'issue',
    issueNumber: '14696',
    title: '[WR] example',
    body: 'See https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fexample.com%2Fform&foo=1',
    comments: [{ author: 'midnghtsapphire', body: 'Please review https://lnkd.in/gCM4qf6v' }],
  });
  assert.ok(prompt.includes('Comment 1 (midnghtsapphire): Please review https://lnkd.in/gCM4qf6v'));
  assert.ok(prompt.includes('URLs observed in title/body/comments'));
  assert.ok(prompt.includes('https://example.com/form'));

test('normalizeUrl unwraps LinkedIn safety redirects', () => {
  const normalized = normalizeUrl(
    'https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fexample.com%2Fform%3Fa%3D1&urlhash=abc'
  );
  assert.strictEqual(normalized, 'https://example.com/form?a=1');
});

test('extractUrls and collectUrlContext dedupe normalized URLs', () => {
  const text = [
    'Primary https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fexample.com%2Fx',
    'Secondary https://example.com/x and https://example.com/y.',
  ].join(' ');
  assert.deepStrictEqual(extractUrls(text), ['https://example.com/x', 'https://example.com/y']);
  assert.strictEqual(
    collectUrlContext([text, 'repeat https://example.com/x']),
    'https://example.com/x\nhttps://example.com/y'
  );
});

test('truncateForComment truncates long bodies and leaves short ones untouched', () => {
  assert.strictEqual(truncateForComment(''), '');
  assert.strictEqual(truncateForComment('short'), 'short');
  const long = 'x'.repeat(1000);
  const truncated = truncateForComment(long, 100);
  assert.ok(truncated.startsWith('x'.repeat(100)));
  assert.ok(truncated.endsWith('…(truncated)'));
  assert.ok(truncated.length < long.length);
});

test('buildFailureComment(needs-key) surfaces the operator action and labels', () => {
  const body = buildFailureComment({
    kind: 'needs-key',
    detail: 'OPENROUTER_API_KEY missing',
    model: 'anthropic/claude-sonnet-4',
    issueNumber: '42',
    eventKind: 'issue',
  });
  assert.ok(body.includes('OPENROUTER_API_KEY'));
  assert.ok(body.includes(FAILURE_LABELS.NEEDS_KEY));
  assert.ok(body.includes(FAILURE_LABELS.NEEDS_HUMAN));
  assert.ok(body.includes('#42'));
  assert.ok(body.includes('anthropic/claude-sonnet-4'));
});

test('buildFailureComment(triage-failed) captures the error and references recovery', () => {
  const detail = 'HTTP 502: bad gateway';
  const body = buildFailureComment({
    kind: 'triage-failed',
    detail,
    model: 'anthropic/claude-sonnet-4',
    issueNumber: '99',
    eventKind: 'pull_request',
  });
  assert.ok(body.includes('OpenRouter triage failed'));
  assert.ok(body.includes(detail));
  assert.ok(body.includes(FAILURE_LABELS.TRIAGE_FAILED));
  assert.ok(body.includes(FAILURE_LABELS.NEEDS_HUMAN));
  assert.ok(body.includes('clear these labels automatically'));
});

test('FAILURE_LABELS are aligned with .github/labels.yml names', () => {
  assert.strictEqual(FAILURE_LABELS.NEEDS_KEY, 'openrouter:needs-key');
  assert.strictEqual(FAILURE_LABELS.TRIAGE_FAILED, 'openrouter:triage-failed');
  assert.strictEqual(FAILURE_LABELS.NEEDS_HUMAN, 'needs-human');
});

test('buildPerplexityTriageScript emits Python that parses with quoted install hints', () => {
  const installHint = 'python3 -m pip install "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"';
  const script = buildPerplexityTriageScript(installHint);
  execFileSync('python3', ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'], { input: script });
  assert.ok(script.includes('INSTALL_HINT = '));
  assert.ok(script.includes('Install with: {INSTALL_HINT}'));
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

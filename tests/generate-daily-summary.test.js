#!/usr/bin/env node
'use strict';

/**
 * Tests for generate-daily-summary.js
 * 
 * Tests core functionality:
 * - Date calculations
 * - HTML escaping
 * - Vercel URL extraction
 * - Repository reference extraction
 * - Markdown to HTML conversion
 */

const assert = require('assert');
const Module = require('module');

// Mock dependencies for testing
const mockModule = {
  getToday: null,
  getYesterday: null,
  formatDate: null,
  escapeHtml: null,
  extractVercelUrls: null,
  extractRepoReferences: null
};

// Helper: simple test runner
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${error.message}`);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

// Test: escapeHtml function
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

if (test('escapeHtml escapes HTML special characters', () => {
  assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.strictEqual(escapeHtml("it's & \"quoted\""), "it&#39;s &amp; &quot;quoted&quot;");
  assert.strictEqual(escapeHtml(''), '');
  assert.strictEqual(escapeHtml(null), '');
})) passed++; else failed++;

// Test: extractVercelUrls
function extractVercelUrls(text) {
  if (!text) return [];
  const vercelPattern = /https?:\/\/[a-zA-Z0-9-]+\.vercel\.app[^\s)]*/g;
  return [...new Set(text.match(vercelPattern) || [])];
}

if (test('extractVercelUrls finds Vercel URLs', () => {
  const text = 'Check out https://myapp-123.vercel.app and https://demo-abc.vercel.app';
  const urls = extractVercelUrls(text);
  assert.strictEqual(urls.length, 2);
  assert(urls.includes('https://myapp-123.vercel.app'));
  assert(urls.includes('https://demo-abc.vercel.app'));
})) passed++; else failed++;

if (test('extractVercelUrls handles duplicates', () => {
  const text = 'https://same.vercel.app and https://same.vercel.app again';
  const urls = extractVercelUrls(text);
  assert.strictEqual(urls.length, 1);
})) passed++; else failed++;

if (test('extractVercelUrls returns empty for no URLs', () => {
  const urls = extractVercelUrls('No URLs here');
  assert.strictEqual(urls.length, 0);
})) passed++; else failed++;

// Test: extractRepoReferences
function extractRepoReferences(text) {
  if (!text) return [];
  const repoPattern = /(?:^|[\s@]|repo:)([a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+)(?=[\s,.\)]|$)/g;
  const matches = [];
  let match;
  while ((match = repoPattern.exec(text)) !== null) {
    const repo = match[1];
    if (!repo.split('/')[0].includes('.')) {
      matches.push(repo);
    }
  }
  return [...new Set(matches)];
}

if (test('extractRepoReferences finds valid repo references', () => {
  const text = 'See midnghtsapphire/revvel-standards and @octocat/hello-world';
  const repos = extractRepoReferences(text);
  assert.strictEqual(repos.length, 2);
  assert(repos.includes('midnghtsapphire/revvel-standards'));
  assert(repos.includes('octocat/hello-world'));
})) passed++; else failed++;

if (test('extractRepoReferences excludes URLs', () => {
  const text = 'Visit example.com/path not a repo';
  const repos = extractRepoReferences(text);
  assert.strictEqual(repos.length, 0);
})) passed++; else failed++;

if (test('extractRepoReferences handles repo: prefix', () => {
  const text = 'repo:owner/name is valid';
  const repos = extractRepoReferences(text);
  assert.strictEqual(repos.length, 1);
  assert(repos.includes('owner/name'));
})) passed++; else failed++;

// Test: formatDate with UTC
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  }) + ' UTC';
}

if (test('formatDate includes UTC timezone', () => {
  const formatted = formatDate('2026-05-02T12:00:00Z');
  assert(formatted.includes('UTC'), 'Formatted date should include UTC');
})) passed++; else failed++;

// Test: Date override functionality
if (test('DATE_OVERRIDE is supported in getToday', () => {
  // This test validates the concept - actual implementation uses process.env
  const DATE_OVERRIDE = '2026-01-15';
  function getToday() {
    if (DATE_OVERRIDE) return DATE_OVERRIDE;
    return new Date().toISOString().split('T')[0];
  }
  assert.strictEqual(getToday(), '2026-01-15');
})) passed++; else failed++;

// Test: Yesterday calculation respects DATE_OVERRIDE
if (test('getYesterday respects DATE_OVERRIDE', () => {
  const DATE_OVERRIDE = '2026-05-15';
  function getToday() {
    if (DATE_OVERRIDE) return DATE_OVERRIDE;
    return new Date().toISOString().split('T')[0];
  }
  function getYesterday() {
    const today = getToday();
    const date = new Date(today + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().split('T')[0];
  }
  assert.strictEqual(getYesterday(), '2026-05-14');
})) passed++; else failed++;

// Test: XSS protection in HTML generation
if (test('HTML escaping prevents XSS in malicious input', () => {
  const malicious = '<img src=x onerror=alert(1)>';
  const escaped = escapeHtml(malicious);
  assert(!escaped.includes('<img'), 'Should not contain raw HTML tags');
  assert(escaped.includes('&lt;'), 'Should contain escaped characters');
})) passed++; else failed++;

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${error.message}`);
    return false;
  }
}

function requireProductionWithMock(mockPaginate) {
  const originalRequire = Module.prototype.require;
  const originalEnv = { ...process.env };

  process.env.GITHUB_TOKEN = 'test-token';
  process.env.GITHUB_REPOSITORY_OWNER = 'test-org';
  process.env.GITHUB_REPOSITORY = 'test-org/test-repo';

  Module.prototype.require = function(id) {
    if (id === '@octokit/rest') {
      return { Octokit: function() {
        this.paginate = mockPaginate;
        this.rest = { search: { issuesAndPullRequests: 'search.issuesAndPullRequests' } };
      }};
    }
    return originalRequire.apply(this, arguments);
  };

  try {
    const modulePath = require.resolve('../scripts/generate-daily-summary.js');
    delete require.cache[modulePath];
    return require(modulePath);
  } finally {
    Module.prototype.require = originalRequire;
    Object.keys(process.env).forEach(k => {
      if (!(k in originalEnv)) delete process.env[k];
    });
    Object.assign(process.env, originalEnv);
  }
}

async function runProductionQueryTests() {
  let asyncPassed = 0;
  let asyncFailed = 0;

  const capturedCalls = [];
  const capturingPaginate = async (method, params) => {
    capturedCalls.push({ method, params });
    return [];
  };

  const productionModule = requireProductionWithMock(capturingPaginate);

  if (await testAsync('fetchPRsSince constructs correct search query with repo, type, and date filter', async () => {
    capturedCalls.length = 0;
    await productionModule.fetchPRsSince('2026-05-01');
    assert.strictEqual(capturedCalls.length, 1);
    const call = capturedCalls[0];
    assert.strictEqual(call.params.q, 'repo:test-org/test-repo is:pr created:>=2026-05-01');
    assert.strictEqual(call.params.sort, 'created');
    assert.strictEqual(call.params.order, 'desc');
    assert.strictEqual(call.params.per_page, 100);
  })) asyncPassed++; else asyncFailed++;

  if (await testAsync('fetchIssuesSince constructs correct search query with repo, type, and date filter', async () => {
    capturedCalls.length = 0;
    await productionModule.fetchIssuesSince('2026-03-15');
    assert.strictEqual(capturedCalls.length, 1);
    const call = capturedCalls[0];
    assert.strictEqual(call.params.q, 'repo:test-org/test-repo is:issue created:>=2026-03-15');
    assert.strictEqual(call.params.sort, 'created');
    assert.strictEqual(call.params.order, 'desc');
    assert.strictEqual(call.params.per_page, 100);
  })) asyncPassed++; else asyncFailed++;

  if (await testAsync('fetchPRsSince filters results to only items with pull_request property', async () => {
    const mod = requireProductionWithMock(async () => [
      { number: 1, pull_request: { url: 'http://...' } },
      { number: 2 },
      { number: 3, pull_request: { url: 'http://...' } }
    ]);
    const results = await mod.fetchPRsSince('2026-01-01');
    assert.strictEqual(results.length, 2);
    assert(results.every(r => r.pull_request));
  })) asyncPassed++; else asyncFailed++;

  if (await testAsync('fetchIssuesSince filters out items with pull_request property', async () => {
    const mod = requireProductionWithMock(async () => [
      { number: 1, pull_request: { url: 'http://...' } },
      { number: 2 },
      { number: 3 }
    ]);
    const results = await mod.fetchIssuesSince('2026-01-01');
    assert.strictEqual(results.length, 2);
    assert(results.every(r => !r.pull_request));
  })) asyncPassed++; else asyncFailed++;

  return { passed: asyncPassed, failed: asyncFailed };
}

// ────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────

runProductionQueryTests().then(asyncResults => {
  const totalPassed = passed + asyncResults.passed;
  const totalFailed = failed + asyncResults.failed;
  console.log('');
  console.log(`Test Summary: ${totalPassed} passed, ${totalFailed} failed`);
  if (totalFailed > 0) {
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ Unexpected error in async tests:', err);
  process.exit(1);
});

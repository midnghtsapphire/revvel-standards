#!/usr/bin/env node
'use strict';
/**
 * Unit tests for Music Video Creator API route helpers.
 *
 * Tests pure functions from products/music-video-creator/src/lib/video-job-helpers.js.
 * No Next.js runtime required — runs with plain `node`.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  VIDEO_PROVIDERS,
  selectBestProvider,
  extractJsonFromContent,
  buildErrorJobStatus,
  normalizeProviderStatus,
} = require('../products/music-video-creator/src/lib/video-job-helpers');

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

// ─── VIDEO_PROVIDERS ─────────────────────────────────────────────────────────

test('VIDEO_PROVIDERS contains heygen, luma, runway in that order', () => {
  assert.strictEqual(VIDEO_PROVIDERS.length, 3);
  assert.strictEqual(VIDEO_PROVIDERS[0].name, 'heygen');
  assert.strictEqual(VIDEO_PROVIDERS[1].name, 'luma');
  assert.strictEqual(VIDEO_PROVIDERS[2].name, 'runway');
});

test('VIDEO_PROVIDERS each has envKey and label', () => {
  for (const p of VIDEO_PROVIDERS) {
    assert.ok(p.envKey, `${p.name} missing envKey`);
    assert.ok(p.label, `${p.name} missing label`);
  }
});

// ─── selectBestProvider ───────────────────────────────────────────────────────

test('selectBestProvider returns first available when orchestrator choice is absent', () => {
  const result = selectBestProvider(['luma', 'runway'], '');
  assert.strictEqual(result, 'luma');
});

test('selectBestProvider honours orchestrator choice when it is in the available list', () => {
  const result = selectBestProvider(['heygen', 'luma', 'runway'], 'luma');
  assert.strictEqual(result, 'luma');
});

test('selectBestProvider falls back to first when orchestrator choice is not in list', () => {
  const result = selectBestProvider(['heygen', 'runway'], 'luma');
  assert.strictEqual(result, 'heygen');
});

test('selectBestProvider throws when available list is empty', () => {
  assert.throws(
    () => selectBestProvider([], 'heygen'),
    /No video providers available/,
  );
});

test('selectBestProvider throws when available list is null/undefined', () => {
  assert.throws(() => selectBestProvider(null, 'heygen'), Error);
});

// ─── extractJsonFromContent ───────────────────────────────────────────────────

test('extractJsonFromContent parses a bare JSON string', () => {
  const result = extractJsonFromContent('{"provider":"heygen","rationale":"best"}');
  assert.deepStrictEqual(result, { provider: 'heygen', rationale: 'best' });
});

test('extractJsonFromContent extracts JSON from surrounding prose', () => {
  const content = 'Here is my plan:\n{"provider":"luma","steps":["a","b"]}\nDone.';
  const result = extractJsonFromContent(content);
  assert.strictEqual(result.provider, 'luma');
  assert.deepStrictEqual(result.steps, ['a', 'b']);
});

test('extractJsonFromContent correctly handles nested objects', () => {
  const content = 'Response: {"outer":{"inner":{"deep":true}},"list":[1,2]}';
  const result = extractJsonFromContent(content);
  assert.deepStrictEqual(result.outer, { inner: { deep: true } });
  assert.deepStrictEqual(result.list, [1, 2]);
});

test('extractJsonFromContent stops at first balanced block (no greedy merge)', () => {
  // Two JSON objects in the same string — should return only the first one
  const content = '{"a":1} some text {"b":2}';
  const result = extractJsonFromContent(content);
  assert.strictEqual(result.a, 1);
  assert.strictEqual(result.b, undefined);
});

test('extractJsonFromContent returns null for content with no JSON', () => {
  const result = extractJsonFromContent('No JSON here at all');
  assert.strictEqual(result, null);
});

test('extractJsonFromContent returns null for invalid JSON in braces', () => {
  const result = extractJsonFromContent('{invalid json{}}');
  assert.strictEqual(result, null);
});

test('extractJsonFromContent returns null for null input', () => {
  assert.strictEqual(extractJsonFromContent(null), null);
});

test('extractJsonFromContent returns null for empty string', () => {
  assert.strictEqual(extractJsonFromContent(''), null);
});

test('extractJsonFromContent handles strings containing escaped quotes', () => {
  const content = '{"message":"he said \\"hello\\""}';
  const result = extractJsonFromContent(content);
  assert.strictEqual(result.message, 'he said "hello"');
});

test('orchestrator safeParse delegates to balanced JSON extraction', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../products/music-video-creator/src/lib/orchestrator.ts'),
    'utf8',
  );

  assert.ok(
    source.includes('extractJsonFromContent(text)'),
    'orchestrator safeParse must use the balanced-brace extractor',
  );
  assert.ok(
    !source.includes('text.match(/(\\{[\\s\\S]*\\})/)'),
    'orchestrator safeParse must not use the greedy JSON fallback regex',
  );
});

// ─── buildErrorJobStatus ──────────────────────────────────────────────────────

test('buildErrorJobStatus sets failure_reason and render_status=failed by default', () => {
  const status = buildErrorJobStatus('Something went wrong');
  assert.strictEqual(status.failure_reason, 'Something went wrong');
  assert.strictEqual(status.render_status, 'failed');
  assert.strictEqual(status.video_exists, false);
  assert.strictEqual(status.provider, '');
  assert.strictEqual(status.provider_job_id, null);
});

test('buildErrorJobStatus accepts a custom render_status', () => {
  const status = buildErrorJobStatus('No keys configured', 'backend_wiring_pending');
  assert.strictEqual(status.render_status, 'backend_wiring_pending');
  assert.strictEqual(status.failure_reason, 'No keys configured');
});

// ─── normalizeProviderStatus ──────────────────────────────────────────────────

test('normalizeProviderStatus heygen completed → artifact_created, video_exists=true', () => {
  const r = normalizeProviderStatus('heygen', 'completed');
  assert.strictEqual(r.render_status, 'artifact_created');
  assert.strictEqual(r.video_exists, true);
});

test('normalizeProviderStatus heygen failed → failed, video_exists=false', () => {
  const r = normalizeProviderStatus('heygen', 'failed');
  assert.strictEqual(r.render_status, 'failed');
  assert.strictEqual(r.video_exists, false);
});

test('normalizeProviderStatus heygen processing → processing, video_exists=false', () => {
  const r = normalizeProviderStatus('heygen', 'processing');
  assert.strictEqual(r.render_status, 'processing');
  assert.strictEqual(r.video_exists, false);
});

test('normalizeProviderStatus luma completed → artifact_created, video_exists=true', () => {
  const r = normalizeProviderStatus('luma', 'completed');
  assert.strictEqual(r.render_status, 'artifact_created');
  assert.strictEqual(r.video_exists, true);
});

test('normalizeProviderStatus luma failed → failed, video_exists=false', () => {
  const r = normalizeProviderStatus('luma', 'failed');
  assert.strictEqual(r.render_status, 'failed');
  assert.strictEqual(r.video_exists, false);
});

test('normalizeProviderStatus luma dreaming (unknown) → processing, video_exists=false', () => {
  const r = normalizeProviderStatus('luma', 'dreaming');
  assert.strictEqual(r.render_status, 'processing');
  assert.strictEqual(r.video_exists, false);
});

test('normalizeProviderStatus runway (defined but unhandled) → processing', () => {
  const r = normalizeProviderStatus('runway', 'completed');
  assert.strictEqual(r.render_status, 'processing');
  assert.strictEqual(r.video_exists, false);
});

test('normalizeProviderStatus unknown provider → processing, video_exists=false', () => {
  const r = normalizeProviderStatus('unknown_provider', 'processing');
  assert.strictEqual(r.render_status, 'processing');
  assert.strictEqual(r.video_exists, false);
});

test('normalizeProviderStatus handles null/undefined rawStatus', () => {
  const r1 = normalizeProviderStatus('heygen', null);
  assert.strictEqual(r1.render_status, 'processing');
  const r2 = normalizeProviderStatus('luma', undefined);
  assert.strictEqual(r2.render_status, 'processing');
});

test('normalizeProviderStatus handles null/undefined/empty provider', () => {
  const r1 = normalizeProviderStatus(null, 'completed');
  assert.strictEqual(r1.render_status, 'processing');
  const r2 = normalizeProviderStatus(undefined, 'completed');
  assert.strictEqual(r2.render_status, 'processing');
  const r3 = normalizeProviderStatus('', 'completed');
  assert.strictEqual(r3.render_status, 'processing');
});

test('Music Video Creator polling treats provider completion as terminal success', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../products/music-video-creator/src/app/page.tsx'),
    'utf8',
  );

  const terminalStatusesBlock = source.match(/const TERMINAL_STATUSES = new Set\(\[\n([\s\S]*?)\n\]\);/);
  assert.ok(terminalStatusesBlock, 'page.tsx must define TERMINAL_STATUSES');
  assert.ok(
    terminalStatusesBlock[1].includes("'artifact_created'"),
    'artifact_created must stop polling because provider completed maps to artifact_created',
  );

  const successStatusesBlock = source.match(/const SUCCESS_STATUSES = new Set\(\[\n([\s\S]*?)\n\]\);/);
  assert.ok(successStatusesBlock, 'page.tsx must define SUCCESS_STATUSES');
  assert.ok(
    successStatusesBlock[1].includes("'artifact_created'"),
    'artifact_created must render as a settled success state',
  );

  const processingStatusesBlock = source.match(/const PROCESSING_STATUSES = new Set\(\[\n([\s\S]*?)\n\]\);/);
  assert.ok(processingStatusesBlock, 'page.tsx must define PROCESSING_STATUSES');
  assert.ok(
    !processingStatusesBlock[1].includes("'artifact_created'"),
    'artifact_created must not keep the spinner active after provider completion',
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('Music Video API Test Summary');
console.log('='.repeat(60));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}

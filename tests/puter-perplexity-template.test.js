#!/usr/bin/env node
/**
 * Tests for scripts/puter-perplexity-template.js
 *
 * Validates:
 *  - Generator produces HTML with no embedded API keys.
 *  - Puter.js loaded from canonical CDN.
 *  - All supported Perplexity models present.
 *  - Output uses textContent (not innerHTML) for safety.
 *  - CSP header is present and references puter.com origins.
 *  - Generator rejects invalid model IDs and empty model lists.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const {
  SUPPORTED_MODELS,
  DEFAULT_MODEL,
  PUTER_SCRIPT_URL,
  generateWidget,
  escapeHtml,
} = require('../scripts/puter-perplexity-template.js');

let failures = 0;
function test(name, fn) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures += 1;
    // eslint-disable-next-line no-console
    console.error(`  FAIL ${name}: ${err && err.message ? err.message : err}`);
  }
}

// eslint-disable-next-line no-console
console.log('puter-perplexity-template');

test('exports supported models list', () => {
  assert.ok(Array.isArray(SUPPORTED_MODELS) && SUPPORTED_MODELS.length >= 5);
  assert.ok(SUPPORTED_MODELS.includes('perplexity/sonar'));
  assert.ok(SUPPORTED_MODELS.includes('perplexity/sonar-pro'));
  assert.ok(SUPPORTED_MODELS.includes('perplexity/sonar-deep-research'));
});

test('default model is in supported list', () => {
  assert.ok(SUPPORTED_MODELS.includes(DEFAULT_MODEL));
});

test('Puter script URL is canonical CDN', () => {
  assert.strictEqual(PUTER_SCRIPT_URL, 'https://js.puter.com/v2/');
});

test('escapeHtml escapes dangerous characters', () => {
  const out = escapeHtml('<script>alert("x")</script>');
  assert.ok(!out.includes('<script>'));
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('&quot;'));
});

test('generateWidget produces non-empty HTML doc', () => {
  const html = generateWidget();
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('</html>'));
});

test('generated HTML loads Puter.js from canonical CDN', () => {
  const html = generateWidget();
  assert.ok(html.includes('src="https://js.puter.com/v2/"'));
});

test('generated HTML includes all supported models', () => {
  const html = generateWidget();
  for (const m of SUPPORTED_MODELS) {
    assert.ok(html.includes(m), `missing model ${m}`);
  }
});

test('generated HTML has CSP allowing puter.com origins', () => {
  const html = generateWidget();
  assert.ok(/Content-Security-Policy/i.test(html));
  assert.ok(html.includes('https://js.puter.com'));
  assert.ok(html.includes('https://api.puter.com'));
});

test('generated HTML uses textContent (not innerHTML)', () => {
  const html = generateWidget();
  assert.ok(html.includes('textContent'));
  assert.ok(!/\.innerHTML\s*=/.test(html), 'innerHTML assignment found');
});

test('generated HTML contains no API key patterns', () => {
  const html = generateWidget();
  // Common key prefixes / patterns that must not appear.
  const forbidden = [
    /pplx-[A-Za-z0-9]{8,}/,        // Perplexity API key prefix
    /sk-[A-Za-z0-9]{16,}/,         // OpenAI-style key
    /Bearer\s+[A-Za-z0-9._-]{16,}/i,
    /api[_-]?key\s*[:=]\s*['"][A-Za-z0-9._-]{8,}['"]/i,
    /authorization\s*:\s*['"][^'"]+['"]/i,
  ];
  for (const re of forbidden) {
    assert.ok(!re.test(html), `forbidden pattern found: ${re}`);
  }
});

test('generated HTML calls puter.ai.chat with stream=true', () => {
  const html = generateWidget();
  assert.ok(html.includes('puter.ai.chat'));
  assert.ok(/stream\s*:\s*true/.test(html));
});

test('generator rejects empty models array', () => {
  assert.throws(() => generateWidget({ models: [] }), /non-empty array/);
});

test('generator rejects non-perplexity model ids', () => {
  assert.throws(
    () => generateWidget({ models: ['openai/gpt-4'], defaultModel: 'openai/gpt-4' }),
    /Unsupported model id/,
  );
});

test('generator rejects defaultModel not in models list', () => {
  assert.throws(
    () => generateWidget({ models: ['perplexity/sonar'], defaultModel: 'perplexity/sonar-pro' }),
    /not in models list/,
  );
});

test('generator escapes custom title to prevent injection', () => {
  const html = generateWidget({ title: '<img src=x onerror=alert(1)>' });
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('&lt;img'));
});

if (failures > 0) {
  // eslint-disable-next-line no-console
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
// eslint-disable-next-line no-console
console.log('\nAll puter-perplexity-template tests passed.');

// Ensure file path resolves (sanity check for CI cwd).
assert.ok(path.basename(__filename) === 'puter-perplexity-template.test.js');

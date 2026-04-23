#!/usr/bin/env node
// Unit tests for scripts/research-module.js
// Run: node tests/scripts/research-module.test.js
//
// Matches the plain-`assert`, no-framework style used by the other
// tests/scripts/*.test.js files.
//
// Focus: safe error logging on malformed OpenRouter responses
//   1. Raw body is truncated to ~2KB before being put in an Error message.
//   2. Authorization / Bearer strings are redacted and never leak into the
//      thrown error's message.

'use strict';

const assert = require('assert');
const https = require('https');
const { EventEmitter } = require('events');

// Set required env vars BEFORE requiring the module so it can also be run
// directly via `node` without the module's require.main guard tripping.
// NOTE: fixture token strings deliberately use a non-provider prefix
// (`fake-token-*`) so secret scanners (e.g. GitGuardian) don't flag them as
// leaked OpenRouter keys. The redaction logic under test is format-agnostic.
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'fake-token-test-fixture';
process.env.QUESTION = process.env.QUESTION || 'test question';
process.env.OUTPUT_FILE = process.env.OUTPUT_FILE || '/tmp/research-module-test-output.md';

// Prevent main() from executing when required.
const originalMain = require.main;
require.main = null;
const {
  callOpenRouter,
  truncateForError,
  redactSecrets,
  safeBodyForError,
  MAX_ERROR_BODY_BYTES,
} = require('../../scripts/research-module.js');
require.main = originalMain;

let passed = 0;
let failed = 0;
let chain = Promise.resolve();
function test(name, fn) {
  chain = chain.then(async () => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ FAIL: ${name}\n    ${(e && e.stack) || e}`);
      failed++;
    }
  });
}

// ---------------------------------------------------------------------------
// Pure-helper tests
// ---------------------------------------------------------------------------

test('truncateForError caps output around the 2KB limit', () => {
  const huge = 'a'.repeat(10 * 1024); // 10KB
  const out = truncateForError(huge);
  assert.ok(out.length < huge.length, 'output should be shorter than input');
  assert.ok(
    out.length <= MAX_ERROR_BODY_BYTES + 64,
    `output length ${out.length} should be ~${MAX_ERROR_BODY_BYTES} + short suffix`
  );
  assert.ok(out.includes('truncated'), 'should mention truncation');
});

test('truncateForError returns short bodies unchanged', () => {
  assert.strictEqual(truncateForError('hello'), 'hello');
  assert.strictEqual(truncateForError(''), '');
  assert.strictEqual(truncateForError(null), '');
  assert.strictEqual(truncateForError(undefined), '');
});

test('redactSecrets scrubs Bearer tokens and Authorization headers', () => {
  const fakeToken = 'fake-token-super-secret-abc123';
  const input = `Authorization: Bearer ${fakeToken}`;
  const out = redactSecrets(input);
  assert.ok(!out.includes(fakeToken), 'raw token must not appear');
  assert.ok(!/Bearer\s+fake-token/i.test(out), 'Bearer token must be redacted');
  assert.ok(/REDACTED/.test(out), 'should mark the redaction');
});

test('redactSecrets scrubs x-api-key headers', () => {
  const input = 'x-api-key: abcdef-super-secret\nOther: ok';
  const out = redactSecrets(input);
  assert.ok(!out.includes('abcdef-super-secret'));
  assert.ok(out.includes('[REDACTED]'));
});

test('redactSecrets scrubs the OPENROUTER_API_KEY value if it leaks', () => {
  const prev = process.env.OPENROUTER_API_KEY;
  const fakeLeaked = 'fake-token-unique-leaked-value-xyz';
  process.env.OPENROUTER_API_KEY = fakeLeaked;
  try {
    const out = redactSecrets(`body mentioning ${fakeLeaked} in error`);
    assert.ok(!out.includes(fakeLeaked));
    assert.ok(out.includes('[REDACTED]'));
  } finally {
    process.env.OPENROUTER_API_KEY = prev;
  }
});

// ---------------------------------------------------------------------------
// callOpenRouter error-path tests — mock https.request
// ---------------------------------------------------------------------------

function mockHttpsOnce(responseBody) {
  const originalRequest = https.request;
  https.request = function mockedRequest(_options, callback) {
    const res = new EventEmitter();
    process.nextTick(() => {
      callback(res);
      res.emit('data', Buffer.from(responseBody));
      res.emit('end');
    });
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {};
    return req;
  };
  return () => { https.request = originalRequest; };
}

test('callOpenRouter: >2KB invalid-JSON body produces a truncated error message', async () => {
  const huge = '<html>' + 'x'.repeat(20 * 1024) + '</html>'; // ~20KB, not JSON
  const restore = mockHttpsOnce(huge);
  try {
    await assert.rejects(
      () => callOpenRouter('m', 's', 'u'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes('Failed to parse OpenRouter response'),
          'prefix preserved'
        );
        assert.ok(
          err.message.length < huge.length,
          `error message (${err.message.length}) must be shorter than raw body (${huge.length})`
        );
        assert.ok(
          err.message.length <= MAX_ERROR_BODY_BYTES + 512,
          `error message length ${err.message.length} exceeds expected ~2KB cap`
        );
        assert.ok(err.message.includes('truncated'), 'error mentions truncation');
        return true;
      }
    );
  } finally {
    restore();
  }
});

test('callOpenRouter: no Authorization/Bearer string appears in thrown error', async () => {
  // A pathological response that echoes back the outbound auth header.
  const fakeLeakedToken = 'fake-token-leaked-abc-XYZ-123';
  const leaky = `Authorization: Bearer ${fakeLeakedToken} not-json-at-all {{{`;
  const restore = mockHttpsOnce(leaky);
  try {
    await assert.rejects(
      () => callOpenRouter('m', 's', 'u'),
      (err) => {
        assert.ok(!/Bearer\s+fake-token/i.test(err.message), 'raw Bearer token leaked');
        assert.ok(
          !/Authorization:\s*Bearer\s+fake-token/i.test(err.message),
          'Authorization header value leaked'
        );
        assert.ok(!err.message.includes(fakeLeakedToken), 'raw token leaked');
        assert.ok(err.message.includes('[REDACTED]'), 'expected redaction marker');
        return true;
      }
    );
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

(async () => {
  await chain;
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();

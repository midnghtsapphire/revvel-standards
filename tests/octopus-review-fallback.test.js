'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeRetryDelayMs,
  isRateLimitedResponse,
  githubRequest,
} = require('../scripts/octopus-review-fallback.js');

test('classifyRateLimit returns null for non-rate-limit statuses', () => {
  assert.equal(classifyRateLimit(200, {}, ''), null);
  assert.equal(classifyRateLimit(404, {}, ''), null);
  assert.equal(classifyRateLimit(500, {}, ''), null);
});

test('classifyRateLimit returns null for genuine permission 403 (no rate-limit signals)', () => {
  const result = classifyRateLimit(
    403,
    { 'content-type': 'application/json' },
    JSON.stringify({ message: 'Resource not accessible by integration' }),
  );
  assert.equal(result, null);
});

test('classifyRateLimit detects primary limit via headers', () => {
  const result = classifyRateLimit(
    403,
    { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600) },
    JSON.stringify({ message: 'API rate limit exceeded for installation ID 12345' }),
  );
  assert.equal(result, 'primary');
});

test('classifyRateLimit detects primary limit via body fallback', () => {
  const result = classifyRateLimit(
    403,
    {},
    JSON.stringify({ message: 'API rate limit exceeded for installation ID 12345' }),
  );
  assert.equal(result, 'primary');
});

test('classifyRateLimit detects secondary limit via Retry-After', () => {
  const result = classifyRateLimit(
    429,
    { 'retry-after': '30' },
    JSON.stringify({ message: 'Please slow down' }),
  );
  assert.equal(result, 'secondary');
});

test('classifyRateLimit detects secondary limit via explicit wording', () => {
  const result = classifyRateLimit(
    403,
    {},
    JSON.stringify({ message: 'You have exceeded a secondary rate limit' }),
  );
  assert.equal(result, 'secondary');
});

test('classifyRateLimit distinguishes abuse detection as secondary', () => {
  const result = classifyRateLimit(
    403,
    {},
    JSON.stringify({ message: 'You have triggered an abuse detection mechanism' }),
  );
  assert.equal(result, 'secondary');
});

test('computePrimaryResetWaitMs returns milliseconds until reset', () => {
  const now = Date.now();
  const resetSec = Math.floor(now / 1000) + 300; // 5 minutes out
  const waitMs = computePrimaryResetWaitMs({ 'x-ratelimit-reset': String(resetSec) }, now);
  // Expect ~5 minutes plus 1s pad.
  assert.ok(waitMs >= 300 * 1000, `expected >= 300000ms, got ${waitMs}`);
  assert.ok(waitMs <= 302 * 1000, `expected <= 302000ms, got ${waitMs}`);
});

test('computePrimaryResetWaitMs returns null when header missing', () => {
  assert.equal(computePrimaryResetWaitMs({}), null);
  assert.equal(computePrimaryResetWaitMs({ 'x-ratelimit-reset': '' }), null);
  assert.equal(computePrimaryResetWaitMs({ 'x-ratelimit-reset': 'not-a-number' }), null);
});

test('computePrimaryResetWaitMs returns 0 when reset is already in the past', () => {
  const past = Math.floor(Date.now() / 1000) - 60;
  assert.equal(computePrimaryResetWaitMs({ 'x-ratelimit-reset': String(past) }), 0);
});

test('computeRetryDelayMs honors server-provided Retry-After in full (not capped at 20s)', () => {
  // Retry-After: 120 seconds. Under a generous maxWait, we must honor all 120s
  // — the old code clamped at 20s, which is what this test guards against.
  const delay = computeRetryDelayMs({ 'retry-after': '120' }, 0, { maxWait: 10 * 60 * 1000 });
  assert.equal(delay, 120 * 1000);
});

test('computeRetryDelayMs bounds Retry-After by maxWait ceiling', () => {
  const delay = computeRetryDelayMs({ 'retry-after': '99999' }, 0, { maxWait: 60 * 1000 });
  assert.equal(delay, 60 * 1000);
});

test('computeRetryDelayMs falls back to exponential backoff without Retry-After', () => {
  const d0 = computeRetryDelayMs({}, 0, { baseDelay: 1500, maxWait: 10 * 60 * 1000 });
  const d1 = computeRetryDelayMs({}, 1, { baseDelay: 1500, maxWait: 10 * 60 * 1000 });
  const d2 = computeRetryDelayMs({}, 2, { baseDelay: 1500, maxWait: 10 * 60 * 1000 });
  assert.equal(d0, 1500);
  assert.equal(d1, 3000);
  assert.equal(d2, 6000);
});

test('isRateLimitedResponse remains true for both primary and secondary', () => {
  assert.equal(isRateLimitedResponse(429, { 'retry-after': '5' }, ''), true);
  assert.equal(
    isRateLimitedResponse(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '9999999999' }, ''),
    true,
  );
  assert.equal(isRateLimitedResponse(200, {}, ''), false);
});

test('githubRequest waits real x-ratelimit-reset time for primary limit (not exponential guess)', async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const resetSec = nowSec + 4; // ~4 seconds out
  let calls = 0;
  const sleeps = [];
  const transport = async () => {
    calls += 1;
    if (calls === 1) {
      return {
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetSec),
        },
        body: JSON.stringify({ message: 'API rate limit exceeded for installation' }),
      };
    }
    return { status: 200, headers: {}, body: '{}' };
  };
  const fakeSleep = async (ms) => {
    sleeps.push(ms);
  };
  const res = await githubRequest('GET', '/x', 'token', null, {
    transport,
    sleep: fakeSleep,
    maxWait: 10 * 60 * 1000,
  });
  assert.equal(res.status, 200);
  assert.equal(sleeps.length, 1);
  // Must be within a couple of seconds of the real reset delta (>= 3s, well
  // above the 1.5s exponential-backoff first step that the old code used).
  assert.ok(sleeps[0] >= 3 * 1000, `expected >= 3000ms wait, got ${sleeps[0]}`);
  assert.ok(sleeps[0] <= 6 * 1000, `expected <= 6000ms wait, got ${sleeps[0]}`);
});

test('githubRequest defers (throws RATE_LIMIT_DEFERRED) when primary reset exceeds ceiling', async () => {
  const farFutureSec = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  const transport = async () => ({
    status: 403,
    headers: {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(farFutureSec),
    },
    body: JSON.stringify({ message: 'API rate limit exceeded for installation' }),
  });
  const sleeps = [];
  const fakeSleep = async (ms) => sleeps.push(ms);
  await assert.rejects(
    githubRequest('GET', '/x', 'token', null, {
      transport,
      sleep: fakeSleep,
      maxWait: 10 * 60 * 1000, // 10 min ceiling; 1h reset exceeds it
    }),
    (err) => err && err.code === 'RATE_LIMIT_DEFERRED',
  );
  // Must NOT have slept — we gave up immediately rather than burning retries.
  assert.equal(sleeps.length, 0);
});

test('githubRequest retries secondary limit with short backoff honoring Retry-After', async () => {
  let calls = 0;
  const sleeps = [];
  const transport = async () => {
    calls += 1;
    if (calls === 1) {
      return {
        status: 429,
        headers: { 'retry-after': '2' },
        body: JSON.stringify({ message: 'Please slow down' }),
      };
    }
    return { status: 200, headers: {}, body: '{}' };
  };
  const fakeSleep = async (ms) => sleeps.push(ms);
  const res = await githubRequest('GET', '/x', 'token', null, {
    transport,
    sleep: fakeSleep,
    maxWait: 10 * 60 * 1000,
  });
  assert.equal(res.status, 200);
  assert.equal(sleeps.length, 1);
  assert.equal(sleeps[0], 2000); // full Retry-After honored
});

test('githubRequest returns genuine permission 403 without retrying', async () => {
  let calls = 0;
  const transport = async () => {
    calls += 1;
    return {
      status: 403,
      headers: {},
      body: JSON.stringify({ message: 'Resource not accessible by integration' }),
    };
  };
  const sleeps = [];
  const fakeSleep = async (ms) => sleeps.push(ms);
  const res = await githubRequest('GET', '/x', 'token', null, {
    transport,
    sleep: fakeSleep,
  });
  assert.equal(res.status, 403);
  assert.equal(calls, 1);
  assert.equal(sleeps.length, 0);
});

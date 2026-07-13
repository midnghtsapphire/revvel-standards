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

function makeResponse({ status, headers = {}, body = '' }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

test('classifyRateLimit: primary via header signal', () => {
  const kind = classifyRateLimit(
    403,
    { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1700000000' },
    { message: 'API rate limit exceeded for installation ID 12345.' },
  );
  assert.equal(kind, 'primary');
});

test('classifyRateLimit: primary via body wording only', () => {
  const kind = classifyRateLimit(
    403,
    {},
    { message: 'API rate limit exceeded for installation ID 12345.' },
  );
  assert.equal(kind, 'primary');
});

test('classifyRateLimit: secondary via explicit wording', () => {
  const kind = classifyRateLimit(
    403,
    { 'retry-after': '30' },
    { message: 'You have exceeded a secondary rate limit.' },
  );
  assert.equal(kind, 'secondary');
});

test('classifyRateLimit: secondary via bare Retry-After', () => {
  const kind = classifyRateLimit(429, { 'retry-after': '5' }, '');
  assert.equal(kind, 'secondary');
});

test('classifyRateLimit: null for a plain permission 403', () => {
  const kind = classifyRateLimit(
    403,
    {},
    { message: 'Resource not accessible by integration' },
  );
  assert.equal(kind, null);
});

test('classifyRateLimit: null for non-4xx', () => {
  assert.equal(classifyRateLimit(500, {}, ''), null);
});

test('computePrimaryResetWaitMs: computes future wait with cushion', () => {
  const now = 1_700_000_000_000;
  const resetSec = 1_700_000_060; // 60s in the future
  const wait = computePrimaryResetWaitMs({ 'x-ratelimit-reset': String(resetSec) }, now);
  assert.equal(wait, 60_000 + 1000);
});

test('computePrimaryResetWaitMs: returns 0 for a past reset', () => {
  const now = 1_700_000_000_000;
  const wait = computePrimaryResetWaitMs({ 'x-ratelimit-reset': '1699999000' }, now);
  assert.equal(wait, 0);
});

test('computePrimaryResetWaitMs: null when header is absent', () => {
  assert.equal(computePrimaryResetWaitMs({}), null);
});

test('computeRetryDelayMs: honors Retry-After in full (not capped at 20s)', () => {
  // 45s Retry-After should not be clamped to 20s (that was the bug).
  const delay = computeRetryDelayMs({ 'retry-after': '45' }, 0, 1500);
  assert.equal(delay, 45_000);
});

test('computeRetryDelayMs: exponential backoff when no Retry-After', () => {
  assert.equal(computeRetryDelayMs({}, 0, 1500), 1500);
  assert.equal(computeRetryDelayMs({}, 1, 1500), 3000);
  assert.equal(computeRetryDelayMs({}, 2, 1500), 6000);
  assert.equal(computeRetryDelayMs({}, 3, 1500), 12000);
});

test('isRateLimitedResponse: covers both flavors', () => {
  assert.equal(
    isRateLimitedResponse(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1' }, ''),
    true,
  );
  assert.equal(isRateLimitedResponse(429, { 'retry-after': '5' }, ''), true);
  assert.equal(isRateLimitedResponse(403, {}, { message: 'Not accessible' }), false);
});

test('githubRequest: primary limit sleeps the ACTUAL reset time, not exponential guess', async () => {
  const now = 1_700_000_000_000;
  const resetSec = 1_700_000_120; // ~120s in the future
  let call = 0;
  const sleeps = [];
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) {
      return makeResponse({
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetSec),
        },
        body: { message: 'API rate limit exceeded for installation ID 12345.' },
      });
    }
    return makeResponse({ status: 200, body: 'ok' });
  };
  const res = await githubRequest(
    'https://api.github.com/foo',
    {},
    {
      fetchImpl,
      sleepImpl: async (ms) => {
        sleeps.push(ms);
      },
      nowImpl: () => now,
      logger: { warn() {} },
      maxInProcessWaitMs: 15 * 60 * 1000,
    },
  );
  assert.equal(res.ok, true);
  assert.equal(sleeps.length, 1);
  // Should be ~120s + 1s cushion — NOT 1.5s / 3s / 6s / 12s exponential.
  assert.equal(sleeps[0], 121_000);
});

test('githubRequest: primary limit whose reset exceeds ceiling gives up immediately (no burn-loop)', async () => {
  const now = 1_700_000_000_000;
  const resetSec = 1_700_000_000 + 30 * 60; // 30min in the future
  let call = 0;
  const sleeps = [];
  const fetchImpl = async () => {
    call += 1;
    return makeResponse({
      status: 403,
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetSec),
      },
      body: { message: 'API rate limit exceeded for installation ID 12345.' },
    });
  };
  await assert.rejects(
    githubRequest(
      'https://api.github.com/foo',
      {},
      {
        fetchImpl,
        sleepImpl: async (ms) => {
          sleeps.push(ms);
        },
        nowImpl: () => now,
        logger: { warn() {} },
        maxInProcessWaitMs: 10 * 60 * 1000,
      },
    ),
    (err) => {
      assert.equal(err.rateLimit, 'primary');
      assert.ok(err.message.includes('exceeds in-process wait ceiling'));
      return true;
    },
  );
  assert.equal(call, 1, 'must not retry when reset exceeds the ceiling');
  assert.equal(sleeps.length, 0, 'must not sleep before giving up');
});

test('githubRequest: secondary limit retries with short backoff, honoring Retry-After in full', async () => {
  let call = 0;
  const sleeps = [];
  const fetchImpl = async () => {
    call += 1;
    if (call <= 2) {
      return makeResponse({
        status: 403,
        headers: { 'retry-after': '45' },
        body: { message: 'You have exceeded a secondary rate limit.' },
      });
    }
    return makeResponse({ status: 200, body: 'ok' });
  };
  const res = await githubRequest(
    'https://api.github.com/foo',
    {},
    {
      fetchImpl,
      sleepImpl: async (ms) => {
        sleeps.push(ms);
      },
      logger: { warn() {} },
      maxInProcessWaitMs: 60 * 1000,
    },
  );
  assert.equal(res.ok, true);
  assert.equal(call, 3);
  // Both sleeps should honor the 45s Retry-After (bounded to the 60s ceiling).
  assert.deepEqual(sleeps, [45_000, 45_000]);
});

test('githubRequest: genuine permission 403 fails fast (regression)', async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    return makeResponse({
      status: 403,
      headers: {},
      body: { message: 'Resource not accessible by integration' },
    });
  };
  await assert.rejects(
    githubRequest(
      'https://api.github.com/foo',
      {},
      { fetchImpl, sleepImpl: async () => {}, logger: { warn() {} } },
    ),
    (err) => {
      assert.equal(err.status, 403);
      // Must NOT be marked as a rate-limit error, and must NOT have retried.
      assert.equal(err.rateLimit, undefined);
      return true;
    },
  );
  assert.equal(call, 1, 'permission 403 must not trigger rate-limit retry loop');
});

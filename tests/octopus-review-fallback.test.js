'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyRateLimit,
  computePrimaryResetWaitMs,

const {
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const https = require('node:https');

const {
  isRateLimitedResponse,
  computeRetryDelayMs,
  isRateLimitedResponse,
  githubRequest,
  commentIndicatesQuota,
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
// -----------------------------------------------------------------------------
// isRateLimitedResponse
// -----------------------------------------------------------------------------

test('isRateLimitedResponse: 429 is always rate-limited', () => {
  assert.equal(isRateLimitedResponse(429, ''), true);
  assert.equal(isRateLimitedResponse(429, 'anything'), true);
});

test('isRateLimitedResponse: 403 with rate-limit body is rate-limited', () => {
  const body = '{"message":"API rate limit exceeded for installation."}';
  assert.equal(isRateLimitedResponse(403, body), true);
  assert.equal(
    isRateLimitedResponse(403, '{"message":"You have exceeded a secondary rate limit"}'),
    true
  );
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
  assert.strictEqual(profile.models[0], config.profiles.review.primary);
  if (config.profiles.review.fallback) {
    assert.strictEqual(profile.models[1], config.profiles.review.fallback);
  }
  assert.strictEqual(config.profiles.review.provider, 'openrouter');
});

test('isRateLimitedResponse: 403 permissions error is NOT rate-limited', () => {
  const body = '{"message":"Resource not accessible by integration"}';
  assert.equal(isRateLimitedResponse(403, body), false);
});

test('isRateLimitedResponse: 404 is NOT rate-limited', () => {
  assert.equal(isRateLimitedResponse(404, '{"message":"Not Found"}'), false);
});

// -----------------------------------------------------------------------------
// computeRetryDelayMs
// -----------------------------------------------------------------------------

test('computeRetryDelayMs: honors Retry-After header (seconds)', () => {
  const d = computeRetryDelayMs({ 'retry-after': '3' }, 0, 1500, 20000);
  assert.equal(d, 3000);
});

test('computeRetryDelayMs: exponential backoff when no header', () => {
  assert.equal(computeRetryDelayMs({}, 0, 1000, 20000), 1000);
  assert.equal(computeRetryDelayMs({}, 1, 1000, 20000), 2000);
  assert.equal(computeRetryDelayMs({}, 2, 1000, 20000), 4000);
});

test('computeRetryDelayMs: caps at maxDelayMs', () => {
  assert.equal(computeRetryDelayMs({}, 10, 1000, 5000), 5000);
  assert.equal(computeRetryDelayMs({ 'retry-after': '9999' }, 0, 1000, 5000), 5000);
});

// -----------------------------------------------------------------------------
// commentIndicatesQuota
// -----------------------------------------------------------------------------

test('commentIndicatesQuota: matches quota comment text', () => {
  assert.equal(
    commentIndicatesQuota('This app has reached its monthly AI usage limit. Please add your own API keys in Settings...'),
    true
  );
  assert.equal(commentIndicatesQuota('LGTM 👍'), false);
  assert.equal(commentIndicatesQuota(''), false);
  assert.equal(commentIndicatesQuota(null), false);
});

// -----------------------------------------------------------------------------
// githubRequest — integration with mocked https.request
// -----------------------------------------------------------------------------

function mockHttpsResponses(responses) {
  const calls = [];
  const original = https.request;
  let i = 0;
  https.request = function (options, cb) {
    calls.push({ method: options.method, path: options.path });
    const spec = responses[Math.min(i, responses.length - 1)];
    i += 1;
    const res = new EventEmitter();
    res.statusCode = spec.status;
    res.headers = Object.assign({ 'content-type': 'application/json' }, spec.headers || {});
    // Fire cb async so req.end() has been called first, mirroring real https.
    setImmediate(() => {
      cb(res);
      setImmediate(() => {
        if (spec.body) res.emit('data', Buffer.from(spec.body));
        res.emit('end');
      });
    });
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {};
    return req;
  };
  return {
    calls,
    restore() { https.request = original; },
  };
}

test('githubRequest: retries after rate-limit 403 and eventually succeeds', async () => {
  const mock = mockHttpsResponses([
    { status: 403, body: '{"message":"API rate limit exceeded for installation."}' },
    { status: 200, body: '[]' },
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
test('classifyRateLimit distinguishes PRIMARY (installation budget) from SECONDARY (abuse) limits', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Primary: header signal (most reliable — GitHub always sends these on a
  // primary-limit response).
  assert.strictEqual(
    classifyRateLimit(
      403,
      { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(nowSeconds + 1800) },
      '{}'
    ),
    'primary'
  );
  // Primary: text-only fallback when headers are missing/stripped — matches
  // docs/biome/README.md:147-155's documented wording for installation-budget
  // exhaustion (incident #15491).
  assert.strictEqual(
    classifyRateLimit(403, {}, JSON.stringify({ message: 'API rate limit exceeded for installation.' })),
    'primary'
  );
  // Secondary: text says so explicitly.
  assert.strictEqual(
    classifyRateLimit(
      403,
      { 'retry-after': '30' },
      JSON.stringify({ message: 'You have exceeded a secondary rate limit. Please retry your request again later.' })
    ),
    'secondary'
  );
  // Secondary: Retry-After present with no exhausted-budget headers and
  // generic wording (e.g. a bare 429).
  assert.strictEqual(classifyRateLimit(429, { 'retry-after': '5' }, ''), 'secondary');
  // A genuine permissions error is not a rate limit at all.
  assert.strictEqual(
    classifyRateLimit(403, {}, JSON.stringify({ message: 'Resource not accessible by integration' })),
    null
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
test('githubRequest falls back to short backoff for a primary-worded 403 with NO rate-limit headers to read a reset from', async () => {
  // No x-ratelimit-* headers at all (e.g. stripped upstream) — classifies
  // "primary" by text, but computePrimaryResetWaitMs has nothing to read,
  // so this exercises the generic-backoff fallback path rather than either
  // the real-reset-wait or the give-up path.
  const mock = mockHttpsResponses([
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
    { status: 200, data: JSON.stringify([{ id: 1 }]) },
  ]);
  try {
    const result = await githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/1/reviews' });
    assert.deepStrictEqual(result, [{ id: 1 }]);
    assert.strictEqual(mock.callCount(), 2, 'expected exactly one retry before success');
  } finally {
    mock.restore();
  }
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
test('githubRequest waits out the ACTUAL x-ratelimit-reset time for a real PRIMARY limit within the wait ceiling', async () => {
  const resetInSeconds = 2; // within the test override of RATE_LIMIT_MAX_INPROCESS_WAIT_MS (3000ms)
  const resetEpoch = Math.floor(Date.now() / 1000) + resetInSeconds;
  const mock = mockHttpsResponses([
    {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetEpoch) },
      data: JSON.stringify({ message: 'API rate limit exceeded for installation.' }),
    },
    { status: 200, data: JSON.stringify([{ id: 1 }]) },
  ]);
  try {
    const data = await githubRequest('GET', '/repos/o/r/pulls/1/reviews', {
      token: 't',
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 5,
      sleepFn: async () => {},
    });
    assert.deepEqual(data, []);
    assert.equal(mock.calls.length, 2);
  } finally {
    mock.restore();
  }
});

test('githubRequest: gives up after exhausting retries on persistent rate-limit', async () => {
  const mock = mockHttpsResponses([
    { status: 403, body: '{"message":"API rate limit exceeded for installation."}' },
  ]);
  try {
    await assert.rejects(
      () => githubRequest('GET', '/repos/o/r/pulls/1/reviews', {
        token: 't',
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 5,
        sleepFn: async () => {},
      }),
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.rateLimited, true);
        assert.match(err.message, /exhausted 2 retries/);
        return true;
      }
    );
    // 1 initial + 2 retries = 3 total calls
    assert.equal(mock.calls.length, 3);
  } finally {
    mock.restore();
  }
});

test('githubRequest: does NOT retry a genuine (non-rate-limit) error', async () => {
  const mock = mockHttpsResponses([
    { status: 404, body: '{"message":"Not Found"}' },
    { status: 200, body: '[]' }, // should never be reached
  ]);
  try {
    await assert.rejects(
      () => githubRequest('GET', '/repos/o/r/pulls/1/reviews', {
        token: 't',
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        sleepFn: async () => {},
      }),
      (err) => {
        assert.equal(err.status, 404);
        assert.notEqual(err.rateLimited, true);
        return true;
      }
    );
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});

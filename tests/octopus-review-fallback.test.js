'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');

const {
  isRateLimitedResponse,
  computeRetryDelayMs,
  githubRequest,
  commentIndicatesQuota,
} = require('../scripts/octopus-review-fallback.js');

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

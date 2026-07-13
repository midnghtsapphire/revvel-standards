'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');

const {
  isRateLimitedResponse,
  computeRetryDelayMs,
  githubRequest,
} = require('../scripts/octopus-review-fallback.js');

test('isRateLimitedResponse: HTTP 429 is always rate-limited', () => {
  assert.equal(isRateLimitedResponse(429, ''), true);
  assert.equal(isRateLimitedResponse(429, 'anything'), true);
});

test('isRateLimitedResponse: HTTP 403 with rate-limit body is rate-limited', () => {
  const body = JSON.stringify({
    message:
      'API rate limit exceeded for installation. If you reach out to GitHub Support for help, please include the request ID ABC',
  });
  assert.equal(isRateLimitedResponse(403, body), true);
});

test('isRateLimitedResponse: HTTP 403 permissions error is NOT rate-limited', () => {
  const body = JSON.stringify({ message: 'Resource not accessible by integration' });
  assert.equal(isRateLimitedResponse(403, body), false);
});

test('isRateLimitedResponse: HTTP 404 is not rate-limited', () => {
  assert.equal(isRateLimitedResponse(404, JSON.stringify({ message: 'Not Found' })), false);
});

test('computeRetryDelayMs: honors Retry-After header (seconds)', () => {
  const delay = computeRetryDelayMs({ 'retry-after': '3' }, 0, 1500);
  assert.equal(delay, 3000);
});

test('computeRetryDelayMs: falls back to exponential backoff without Retry-After', () => {
  assert.equal(computeRetryDelayMs({}, 0, 1000), 1000);
  assert.equal(computeRetryDelayMs({}, 1, 1000), 2000);
  assert.equal(computeRetryDelayMs({}, 2, 1000), 4000);
});

test('computeRetryDelayMs: caps at RATE_LIMIT_MAX_DELAY_MS (default 20000)', () => {
  const delay = computeRetryDelayMs({}, 10, 1500);
  assert.ok(delay <= 20000, `expected <=20000, got ${delay}`);
});

// --- Integration tests against a mocked https.request -----------------------

function mockHttpsRequest(responses) {
  // responses: array of { status, headers, body } consumed in order.
  const originalRequest = https.request;
  let call = 0;
  https.request = function mockedRequest(_opts, cb) {
    const idx = call++;
    const spec = responses[Math.min(idx, responses.length - 1)];
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.setEncoding = () => {};
      res.statusCode = spec.status;
      res.headers = Object.assign(
        { 'content-type': 'application/json' },
        spec.headers || {}
      );
      // Deliver asynchronously so listeners are wired up.
      setImmediate(() => {
        cb(res);
        setImmediate(() => {
          res.emit('data', typeof spec.body === 'string' ? spec.body : JSON.stringify(spec.body));
          res.emit('end');
        });
      });
    };
    return req;
  };
  return () => {
    https.request = originalRequest;
  };
}

test('githubRequest: retries after a rate-limited 403 and returns success', async () => {
  // This is the exact PR #15821/#15822 regression scenario.
  const restore = mockHttpsRequest([
    {
      status: 403,
      headers: { 'retry-after': '0' },
      body: { message: 'API rate limit exceeded for installation.' },
    },
    { status: 200, body: [{ id: 1, body: 'ok' }] },
  ]);
  // Force tiny backoff for test speed.
  process.env.RATE_LIMIT_BASE_DELAY_MS = '1';
  try {
    // Re-require to pick up env override for base delay? Not needed — Retry-After: 0 wins.
    const result = await githubRequest('GET', '/repos/o/r/pulls/1/reviews', { token: 't' });
    assert.ok(Array.isArray(result));
    assert.equal(result[0].id, 1);
  } finally {
    restore();
    delete process.env.RATE_LIMIT_BASE_DELAY_MS;
  }
});

test('githubRequest: gives up after exhausting retries on persistent rate limit', async () => {
  // Always respond with a rate-limited 403.
  const restore = mockHttpsRequest([
    { status: 403, headers: { 'retry-after': '0' }, body: { message: 'API rate limit exceeded' } },
  ]);
  try {
    await assert.rejects(
      () => githubRequest('GET', '/repos/o/r/pulls/1/reviews', { token: 't' }),
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /GitHub HTTP 403/);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test('githubRequest: does NOT retry a genuine non-rate-limit error (403 permissions)', async () => {
  let calls = 0;
  const originalRequest = https.request;
  https.request = function (_opts, cb) {
    calls++;
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.setEncoding = () => {};
      res.statusCode = 403;
      res.headers = { 'content-type': 'application/json' };
      setImmediate(() => {
        cb(res);
        setImmediate(() => {
          res.emit('data', JSON.stringify({ message: 'Resource not accessible by integration' }));
          res.emit('end');
        });
      });
    };
    return req;
  };
  try {
    await assert.rejects(
      () => githubRequest('GET', '/repos/o/r/pulls/1/reviews', { token: 't' }),
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Resource not accessible/);
        return true;
      }
    );
    assert.equal(calls, 1, 'must not retry a permissions 403');
  } finally {
    https.request = originalRequest;
  }
});

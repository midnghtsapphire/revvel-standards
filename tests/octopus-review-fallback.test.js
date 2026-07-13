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

test('isRateLimitedResponse: HTTP 429 is a rate limit', () => {
  assert.equal(isRateLimitedResponse(429, 'anything'), true);
});

test('isRateLimitedResponse: HTTP 403 with rate-limit body is a rate limit', () => {
  const body = JSON.stringify({
    message: 'API rate limit exceeded for installation. Please retry later.',
  });
  assert.equal(isRateLimitedResponse(403, body), true);
});

test('isRateLimitedResponse: HTTP 403 with permissions body is NOT a rate limit', () => {
  const body = JSON.stringify({ message: 'Resource not accessible by integration' });
  assert.equal(isRateLimitedResponse(403, body), false);
});

test('isRateLimitedResponse: HTTP 404 is not a rate limit', () => {
  assert.equal(isRateLimitedResponse(404, '{"message":"Not Found"}'), false);
});

test('computeRetryDelayMs: honors Retry-After header', () => {
  const delay = computeRetryDelayMs({ 'retry-after': '3' }, 0, 1000, 60000);
  assert.equal(delay, 3000);
});

test('computeRetryDelayMs: falls back to exponential backoff', () => {
  const d0 = computeRetryDelayMs({}, 0, 1000, 60000);
  const d1 = computeRetryDelayMs({}, 1, 1000, 60000);
  const d2 = computeRetryDelayMs({}, 2, 1000, 60000);
  assert.equal(d0, 1000);
  assert.equal(d1, 2000);
  assert.equal(d2, 4000);
});

test('computeRetryDelayMs: clamps to max delay', () => {
  const delay = computeRetryDelayMs({}, 10, 1000, 5000);
  assert.equal(delay, 5000);
});

// --- githubRequest integration tests against a mocked https.request ------

function mockHttpsRequestOnce(responses) {
  // responses: array of { status, headers, body } consumed in order
  const orig = https.request;
  let call = 0;
  https.request = function (_options, cb) {
    const idx = call++;
    const spec = responses[Math.min(idx, responses.length - 1)];
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = spec.status;
      res.headers = Object.assign({ 'content-type': 'application/json' }, spec.headers || {});
      res.setEncoding = () => {};
      setImmediate(() => {
        cb(res);
        setImmediate(() => {
          res.emit('data', spec.body || '');
          res.emit('end');
        });
      });
    };
    return req;
  };
  return () => {
    https.request = orig;
  };
}

test('githubRequest: retries after a rate-limited 403, then succeeds', async () => {
  const restore = mockHttpsRequestOnce([
    {
      status: 403,
      headers: { 'retry-after': '0' },
      body: JSON.stringify({ message: 'API rate limit exceeded for installation.' }),
    },
    { status: 200, headers: {}, body: JSON.stringify([]) },
  ]);
  try {
    const res = await githubRequest('GET', '/repos/x/y/pulls/1/reviews', 'tkn', null, {
      maxRetries: 4,
      baseDelayMs: 1,
      maxDelayMs: 5,
      sleepFn: () => Promise.resolve(),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, []);
  } finally {
    restore();
  }
});

test('githubRequest: gives up after exhausting retries on persistent rate limit', async () => {
  const restore = mockHttpsRequestOnce([
    {
      status: 403,
      headers: {},
      body: JSON.stringify({ message: 'API rate limit exceeded for installation.' }),
    },
  ]);
  try {
    await assert.rejects(
      () =>
        githubRequest('GET', '/repos/x/y/pulls/1/reviews', 'tkn', null, {
          maxRetries: 2,
          baseDelayMs: 1,
          maxDelayMs: 5,
          sleepFn: () => Promise.resolve(),
        }),
      /GitHub HTTP 403/
    );
  } finally {
    restore();
  }
});

test('githubRequest: does NOT retry a genuine (non-rate-limit) 403', async () => {
  let calls = 0;
  const orig = https.request;
  https.request = function (_options, cb) {
    calls += 1;
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 403;
      res.headers = { 'content-type': 'application/json' };
      res.setEncoding = () => {};
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
      () =>
        githubRequest('GET', '/repos/x/y/pulls/1/reviews', 'tkn', null, {
          maxRetries: 4,
          baseDelayMs: 1,
          maxDelayMs: 5,
          sleepFn: () => Promise.resolve(),
        }),
      /GitHub HTTP 403/
    );
    assert.equal(calls, 1, 'permissions 403 must not be retried');
  } finally {
    https.request = orig;
  }
});

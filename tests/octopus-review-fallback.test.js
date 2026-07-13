'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const workflowPath = path.join(REPO_ROOT, '.github', 'workflows', 'octopus-review-fallback.yml');

// Keep the retry-regression tests fast: override before require() since the
// script reads these as module-load-time constants. RATE_LIMIT_MAX_INPROCESS_WAIT_MS
// is kept small (3s) so the "primary limit exceeds the wait ceiling" test
// doesn't need a multi-minute reset to prove the give-up path, and the
// "waits out the real reset" test can use a sub-3s reset and still finish
// quickly.
process.env.RATE_LIMIT_BASE_DELAY_MS = process.env.RATE_LIMIT_BASE_DELAY_MS || '5';
process.env.RATE_LIMIT_MAX_RETRIES = process.env.RATE_LIMIT_MAX_RETRIES || '3';
process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS = process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS || '3000';

const {
  isQuotaDeathComment,
  loadReviewProfile,
  FALLBACK_MARKER,
  OCTOPUS_BOT_LOGIN,
  isRateLimitedResponse,
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
  assert.strictEqual(profile.models[0], config.profiles.review.primary);
  if (config.profiles.review.fallback) {
    assert.strictEqual(profile.models[1], config.profiles.review.fallback);
  }
  assert.strictEqual(config.profiles.review.provider, 'openrouter');
});

test('dedupe marker and bot login are stable identifiers', () => {
  assert.strictEqual(FALLBACK_MARKER, '<!-- octopus-review-fallback -->');
  assert.strictEqual(OCTOPUS_BOT_LOGIN, 'octopus-review[bot]');
});

test('workflow guards the issue_comment lane to octopus-review[bot] quota banners', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const job = workflow.jobs['fallback-review'];
  assert.ok(job, 'fallback-review job exists');
  assert.match(job.if, /octopus-review\[bot\]/);
  assert.match(job.if, /add your own API keys/);
  assert.strictEqual(workflow.permissions['pull-requests'], 'write');
});

test('workflow covers all three lanes: quota comment, sweep schedule, manual dispatch', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const triggers = workflow.on || workflow[true]; // yaml parses bare `on:` as boolean true
  assert.ok(triggers.issue_comment, 'issue_comment trigger present');
  assert.ok(triggers.schedule, 'schedule trigger present');
  assert.ok(triggers.workflow_dispatch, 'workflow_dispatch trigger present');
});

// --- Rate-limit retry regression tests -------------------------------------
//
// Root cause (2026-07-13 fallback-review audit): the issue_comment trigger is
// unscoped, so a burst of bot comments (Vercel, CI-status, ship-quality-check,
// Octopus itself, ...) on several PRs in the same few seconds spins up many
// concurrent fallback-review runs sharing one GitHub App installation's rate
// limit. Confirmed live in job logs for PR #15821 and #15822: the very first
// GitHub REST call (`GET /pulls/{n}/reviews`) came back
// `403 "API rate limit exceeded for installation"`, and because the whole
// script runs inside a top-level try/catch that never rethrows, the job
// still reported conclusion "success" with zero review posted — a silent
// no-op indistinguishable from "nothing to do here" in monitoring. These
// tests pin the fix: githubRequest() must retry transient rate-limit
// responses instead of surfacing them as an immediate failure.
//
// Follow-up (post-merge review of #15836, Copilot comment on
// scripts/octopus-review-fallback.js:98): the first pass of the fix above
// treated ALL rate-limit-flavored 403/429s the same way (short exponential
// backoff, capped at 20s even when GitHub sent an explicit Retry-After).
// That's correct for a SECONDARY/abuse-detection limit (short-lived, and
// GitHub tells you exactly how long via Retry-After) but wrong for a
// PRIMARY limit — the shared installation budget documented in
// docs/biome/README.md's "PR Lifecycle failing in bulk" field note
// (incident #15491): that budget resets via `x-ratelimit-reset` (a Unix
// timestamp that can be up to ~an hour out), doesn't reliably send
// Retry-After, and cannot be recovered by ANY amount of fast retrying. The
// tests below cover both the classification (classifyRateLimit) and the
// two different wait strategies (computePrimaryResetWaitMs vs
// computeRetryDelayMs) that githubRequest() now picks between.

/**
 * Replaces https.request with a stub that answers a fixed sequence of
 * { status, headers, data } responses (last one repeats if exhausted), and
 * returns a restore() to put the real implementation back.
 */
function mockHttpsResponses(responses) {
  const original = https.request;
  let callIndex = 0;
  https.request = (_options, callback) => {
    const spec = responses[Math.min(callIndex, responses.length - 1)];
    callIndex += 1;
    const res = new EventEmitter();
    res.statusCode = spec.status;
    res.headers = spec.headers || {};
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {
      process.nextTick(() => {
        callback(res);
        process.nextTick(() => {
          res.emit('data', Buffer.from(spec.data || ''));
          res.emit('end');
        });
      });
    };
    return req;
  };
  return {
    restore: () => { https.request = original; },
    callCount: () => callIndex,
  };
}

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
});

test('computePrimaryResetWaitMs reads x-ratelimit-reset as a Unix-seconds timestamp', () => {
  const futureSeconds = Math.floor(Date.now() / 1000) + 120;
  const waitMs = computePrimaryResetWaitMs({ 'x-ratelimit-reset': String(futureSeconds) });
  assert.ok(waitMs > 110000 && waitMs <= 121000, `expected ~120s wait, got ${waitMs}ms`);
  assert.strictEqual(computePrimaryResetWaitMs({}), null, 'missing header must not be guessed at');
  assert.strictEqual(computePrimaryResetWaitMs({ 'x-ratelimit-reset': 'not-a-number' }), null);
});

test('computeRetryDelayMs honors Retry-After in full (bounded only by the shared wait ceiling), falls back to short capped exponential backoff', () => {
  assert.strictEqual(computeRetryDelayMs({ 'retry-after': '2' }, 1, 1000), 2000);
  assert.strictEqual(computeRetryDelayMs({}, 1, 1000), 1000);
  assert.strictEqual(computeRetryDelayMs({}, 2, 1000), 2000);
  assert.strictEqual(computeRetryDelayMs({}, 3, 1000), 4000);
  // A server-provided Retry-After is now honored close to fully — bounded
  // only by RATE_LIMIT_MAX_INPROCESS_WAIT_MS (the shared in-process wait
  // ceiling), NOT clamped down to a few seconds. Clamping a real
  // Retry-After to 20s (the pre-fix behavior) meant retrying BEFORE
  // GitHub's requested delay — exactly the bug flagged in Copilot's
  // post-merge review of #15836.
  const ceilingMs = parseInt(process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS, 10);
  assert.strictEqual(computeRetryDelayMs({ 'retry-after': '9999' }, 1, 1000), ceilingMs);
  // No header at all still falls back to the short exponential guess,
  // capped at RATE_LIMIT_MAX_DELAY_MS (unrelated, deliberately small cap —
  // it's a guess, not a real number from GitHub).
  assert.strictEqual(computeRetryDelayMs({}, 10, 1000), 20000);
});

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

test('githubRequest gives up after exhausting retries on a persistent header-less rate limit', async () => {
  const mock = mockHttpsResponses([
    { status: 403, data: JSON.stringify({ message: 'API rate limit exceeded for installation.' }) },
  ]);
  try {
    await assert.rejects(
      () => githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/1/reviews' }),
      /GitHub HTTP 403/
    );
    // RATE_LIMIT_MAX_RETRIES retries + the initial attempt.
    const maxRetries = parseInt(process.env.RATE_LIMIT_MAX_RETRIES, 10);
    assert.strictEqual(mock.callCount(), maxRetries + 1);
  } finally {
    mock.restore();
  }
});

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
  const start = Date.now();
  try {
    const result = await githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/2/reviews' });
    const elapsedMs = Date.now() - start;
    assert.deepStrictEqual(result, [{ id: 1 }]);
    assert.strictEqual(mock.callCount(), 2, 'expected exactly one retry before success');
    // Must wait close to the REAL reset time, not a tiny exponential guess
    // (RATE_LIMIT_BASE_DELAY_MS is overridden to 5ms for the rest of this
    // file — finishing in a few ms here would mean the fix regressed to
    // guessing instead of reading x-ratelimit-reset).
    assert.ok(elapsedMs >= 500, `expected a real wait close to ${resetInSeconds}s, only waited ${elapsedMs}ms`);
  } finally {
    mock.restore();
  }
});

test('githubRequest gives up immediately (no wasted retries) when a PRIMARY limit reset exceeds the in-process wait ceiling', async () => {
  const resetEpoch = Math.floor(Date.now() / 1000) + 3600; // an hour out — far beyond the 3s test ceiling
  const mock = mockHttpsResponses([
    {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetEpoch) },
      data: JSON.stringify({ message: 'API rate limit exceeded for installation.' }),
    },
  ]);
  const start = Date.now();
  try {
    await assert.rejects(
      () => githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/3/reviews' }),
      /primary rate limit, reset too far out/
    );
    const elapsedMs = Date.now() - start;
    assert.strictEqual(
      mock.callCount(),
      1,
      'must not retry a primary limit that cannot recover before the job times out'
    );
    assert.ok(elapsedMs < 500, `expected an immediate give-up, took ${elapsedMs}ms`);
  } finally {
    mock.restore();
  }
});

test('githubRequest retries a SECONDARY (abuse-detection) limit with short backoff, honoring Retry-After', async () => {
  const mock = mockHttpsResponses([
    {
      status: 403,
      headers: { 'retry-after': '1' },
      data: JSON.stringify({
        message: 'You have exceeded a secondary rate limit. Please retry your request again later.',
      }),
    },
    { status: 200, data: JSON.stringify([{ id: 2 }]) },
  ]);
  const start = Date.now();
  try {
    const result = await githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/4/reviews' });
    const elapsedMs = Date.now() - start;
    assert.deepStrictEqual(result, [{ id: 2 }]);
    assert.strictEqual(mock.callCount(), 2, 'expected exactly one retry before success');
    // Retry-After (1s) should be honored close to in full, same as before
    // this fix — this is the case the original short-backoff retry was
    // actually designed for and must keep working.
    assert.ok(elapsedMs >= 800, `expected to honor Retry-After (~1s), only waited ${elapsedMs}ms`);
  } finally {
    mock.restore();
  }
});

test('githubRequest does not retry a non-rate-limit error (fails fast)', async () => {
  const mock = mockHttpsResponses([{ status: 404, data: JSON.stringify({ message: 'Not Found' }) }]);
  try {
    await assert.rejects(
      () => githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/999999/reviews' }),
      /GitHub HTTP 404/
    );
    assert.strictEqual(mock.callCount(), 1, 'a genuine 404 must not be retried');
  } finally {
    mock.restore();
  }
});

test('githubRequest does not retry a genuine permissions 403 (fails fast, still confirms real permission errors are never mistaken for rate limits)', async () => {
  const mock = mockHttpsResponses([
    { status: 403, data: JSON.stringify({ message: 'Resource not accessible by integration' }) },
  ]);
  try {
    await assert.rejects(
      () => githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/5/reviews' }),
      /GitHub HTTP 403/
    );
    assert.strictEqual(mock.callCount(), 1, 'a genuine permissions 403 must not be retried');
  } finally {
    mock.restore();
  }
});

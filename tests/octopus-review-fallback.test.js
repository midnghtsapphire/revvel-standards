'use strict';

// Tests for the Octopus quota-death review fallback lane:
// scripts/octopus-review-fallback.js + .github/workflows/octopus-review-fallback.yml
// (see wr/pending/07-review-fallback-when-octopus-quota-dead.md).

const test = require('node:test');
const {
  classifyRateLimit,
  computePrimaryResetWaitMs,

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
  githubRequest,
} = require('../scripts/octopus-review-fallback.js');

test('isQuotaDeathComment matches known Octopus quota banners (case-insensitive)', () => {
  assert.strictEqual(isQuotaDeathComment('Please Add Your Own API Keys to continue reviews'), true);
  assert.strictEqual(isQuotaDeathComment('Your monthly AI usage limit was hit.'), true);
  assert.strictEqual(isQuotaDeathComment('quota exceeded for this billing period'), true);
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

test('isQuotaDeathComment does NOT match healthy reviews or empty bodies', () => {
  assert.strictEqual(isQuotaDeathComment('Found a null-pointer bug in scripts/foo.js line 12'), false);
  assert.strictEqual(isQuotaDeathComment(''), false);
  assert.strictEqual(isQuotaDeathComment(null), false);
  assert.strictEqual(isQuotaDeathComment(undefined), false);
});

test('loadReviewProfile resolves the review profile from agent-models.yml', () => {
  const profile = loadReviewProfile();
  // Per agent-models.yml: Opus 4.7 primary, DeepSeek R1 fallback — but assert
  // structure (drift-proof), not exact model slugs.
  assert.ok(Array.isArray(profile.models) && profile.models.length >= 1);
  const config = yaml.parse(
    fs.readFileSync(path.join(REPO_ROOT, '.github', 'agent-models.yml'), 'utf8')
  );
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

test('isRateLimitedResponse matches 429 and GitHub rate-limit 403 bodies, not permission 403s', () => {
  assert.strictEqual(isRateLimitedResponse(429, ''), true);
  assert.strictEqual(
    isRateLimitedResponse(403, JSON.stringify({ message: 'API rate limit exceeded for installation.' })),
    true
  );
  assert.strictEqual(
    isRateLimitedResponse(403, JSON.stringify({ message: 'You have exceeded a secondary rate limit.' })),
    true
  );
  // A genuine permissions error must NOT be treated as retryable.
  assert.strictEqual(
    isRateLimitedResponse(403, JSON.stringify({ message: 'Resource not accessible by integration' })),
    false
  );
  assert.strictEqual(isRateLimitedResponse(404, 'not found'), false);
});

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
      status: 403,
      data: JSON.stringify({
        message: 'API rate limit exceeded for installation. If you reach out to GitHub Support...',
      }),
    },
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

'use strict';

// Tests for the Octopus quota-death review fallback lane:
// scripts/octopus-review-fallback.js + .github/workflows/octopus-review-fallback.yml
// (see wr/pending/07-review-fallback-when-octopus-quota-dead.md).

const test = require('node:test');
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
  shouldReview,
  postFallbackReview,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
} = require('../scripts/octopus-review-fallback.js');

test('isQuotaDeathComment matches known Octopus quota banners (case-insensitive)', () => {
  assert.strictEqual(isQuotaDeathComment('Please Add Your Own API Keys to continue reviews'), true);
  assert.strictEqual(isQuotaDeathComment('Your monthly AI usage limit was hit.'), true);
  assert.strictEqual(isQuotaDeathComment('quota exceeded for this billing period'), true);
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
  // D016 (2026-08-21): issue_comment cut with the rest of the Octopus lanes.
  // Inverted rather than deleted so a silent re-enable fails here too. Note
  // this does NOT stop octopus-review[bot] commenting — that is the GitHub
  // App, which reports independently of this workflow (#17872).
  assert.strictEqual(triggers.issue_comment, undefined, 'issue_comment must stay cut (D016)');
  assert.match(
    fs.readFileSync(workflowPath, 'utf8'),
    /^\s*#\s*issue_comment:/m,
    'the cut trigger must remain in the file, commented, so it can be restored',
  );
  // COST FREEZE 2026-08-21: the schedule is commented out in the workflow,
  // preserved in place (RVS-AGENT-001) rather than deleted. ~496 scheduled
  // runs/day across 46 workflows drove the Actions bill on a repo with no
  // product traffic. tests/no-scheduled-workflows.test.js is the guard that
  // keeps it off; this assertion is inverted to match that decision, so a
  // silent re-enable fails here too.
  assert.strictEqual(triggers.schedule, undefined, 'schedule must stay frozen (cost freeze)');
  assert.match(
    fs.readFileSync(workflowPath, 'utf8'),
    /^\s*#\s*schedule:/m,
    'the frozen sweep schedule must remain in the file, commented, so it can be restored',
  );
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
  // Assert against the module's own exported constant rather than re-parsing
  // the env var (which is fragile — NaN if unset before this line runs).
  assert.strictEqual(computeRetryDelayMs({ 'retry-after': '9999' }, 1, 1000), RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
  // No header at all still falls back to the short exponential guess,
  // capped at RATE_LIMIT_MAX_DELAY_MS (unrelated, deliberately small cap —
  // it's a guess, not a real number from GitHub).
  assert.strictEqual(computeRetryDelayMs({}, 10, 1000), 20000);
});

test('computeRetryDelayMs honors an explicit Retry-After: 0 as "retry immediately", not "missing"', () => {
  // Retry-After: 0 is a valid HTTP value meaning "no wait" — it must not be
  // treated the same as a missing header (which falls back to exponential
  // backoff instead of retrying right away).
  assert.strictEqual(computeRetryDelayMs({ 'retry-after': '0' }, 1, 1000), 0);
});

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

test('githubRequest gives up immediately when a SECONDARY Retry-After exceeds the in-process wait ceiling (no truncate-and-retry-early)', async () => {
  // Retry-After of 9999s is far beyond the 3s test ceiling. Truncating it to
  // the ceiling and retrying would fire long before GitHub's real window and,
  // across attempts, burn the job's timeout — so githubRequest must give up
  // cleanly on the FIRST response instead (cubic finding on #15932).
  const mock = mockHttpsResponses([
    {
      status: 403,
      headers: { 'retry-after': '9999' },
      data: JSON.stringify({
        message: 'You have exceeded a secondary rate limit. Please retry your request again later.',
      }),
    },
    { status: 200, data: JSON.stringify([{ id: 9 }]) },
  ]);
  const start = Date.now();
  try {
    await assert.rejects(
      () => githubRequest({ pathName: '/repos/midnghtsapphire/revvel-standards/pulls/6/reviews' }),
      /exceeds the in-process wait budget/
    );
    const elapsedMs = Date.now() - start;
    assert.strictEqual(mock.callCount(), 1, 'must not retry a Retry-After it cannot honor before timeout');
    assert.ok(elapsedMs < 500, `expected an immediate give-up, took ${elapsedMs}ms`);
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

// Regression coverage for the real-world bug this fixed: shouldReview() and
// postFallbackReview() called githubRequest() with a { path, token, body }
// shape it never accepted (it destructures pathName/payload and reads the
// token from a module-level constant), and shouldReview() additionally tried
// to JSON.parse() an already-parsed result. Both bugs were invisible to the
// pre-existing githubRequest()-only tests above because nothing exercised
// these two wrapper functions directly — every real invocation crashed
// inside main()'s try/catch, logged a swallowed warning, and the job still
// reported "success" despite never reading comments or posting a review.

test('shouldReview reads the real comments endpoint and finds an existing fallback marker', async () => {
  const mock = mockHttpsResponses([
    {
      status: 200,
      data: JSON.stringify([
        { body: 'unrelated comment' },
        { body: '<!-- octopus-review-fallback:v1 -->\nalready reviewed' },
      ]),
    },
  ]);
  try {
    const eligible = await shouldReview({
      owner: 'midnghtsapphire',
      repo: 'revvel-standards',
      prNumber: 123,
      markerRegex: /octopus-review-fallback:v1/,
    });
    assert.strictEqual(eligible, false, 'must detect the existing marker instead of throwing');
  } finally {
    mock.restore();
  }
});

test('shouldReview returns true (eligible) when no fallback marker exists yet, without throwing', async () => {
  const mock = mockHttpsResponses([
    { status: 200, data: JSON.stringify([{ body: 'a normal comment' }]) },
  ]);
  try {
    const eligible = await shouldReview({
      owner: 'midnghtsapphire',
      repo: 'revvel-standards',
      prNumber: 124,
      markerRegex: /octopus-review-fallback:v1/,
    });
    assert.strictEqual(eligible, true);
  } finally {
    mock.restore();
  }
});

test('postFallbackReview posts to the real issues/comments endpoint with the body as JSON payload', async () => {
  const mock = mockHttpsResponses([
    { status: 201, data: JSON.stringify({ id: 1, body: 'posted' }) },
  ]);
  try {
    const result = await postFallbackReview({
      owner: 'midnghtsapphire',
      repo: 'revvel-standards',
      prNumber: 125,
      body: '<!-- octopus-review-fallback:v1 -->\nfallback text',
    });
    assert.strictEqual(mock.callCount(), 1);
    assert.strictEqual(result.id, 1, 'must resolve with the parsed response, not throw');
  } finally {
    mock.restore();
  }
});

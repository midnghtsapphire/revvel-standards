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
// script reads these as module-load-time constants.
process.env.RATE_LIMIT_BASE_DELAY_MS = process.env.RATE_LIMIT_BASE_DELAY_MS || '5';
process.env.RATE_LIMIT_MAX_RETRIES = process.env.RATE_LIMIT_MAX_RETRIES || '3';

const {
  isQuotaDeathComment,
  loadReviewProfile,
  FALLBACK_MARKER,
  OCTOPUS_BOT_LOGIN,
  isRateLimitedResponse,
  computeRetryDelayMs,
  githubRequest,
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
// responses with backoff instead of surfacing them as an immediate failure.

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

test('computeRetryDelayMs prefers Retry-After header, falls back to capped exponential backoff', () => {
  assert.strictEqual(computeRetryDelayMs({ 'retry-after': '2' }, 1, 1000), 2000);
  assert.strictEqual(computeRetryDelayMs({}, 1, 1000), 1000);
  assert.strictEqual(computeRetryDelayMs({}, 2, 1000), 2000);
  assert.strictEqual(computeRetryDelayMs({}, 3, 1000), 4000);
  // Capped, even with a huge Retry-After or attempt count.
  assert.strictEqual(computeRetryDelayMs({ 'retry-after': '9999' }, 1, 1000), 20000);
  assert.strictEqual(computeRetryDelayMs({}, 10, 1000), 20000);
});

test('githubRequest retries a transient installation rate limit and succeeds (regression for #15821/#15822 silent no-op)', async () => {
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

test('githubRequest gives up after exhausting retries on a persistent rate limit', async () => {
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

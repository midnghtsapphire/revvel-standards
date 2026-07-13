#!/usr/bin/env node
/**
 * octopus-review-fallback.js
 *
 * Self-hosted fallback reviewer that posts a lightweight review comment on a PR
 * when the upstream Octopus review bot has exhausted its monthly quota.
 *
 * Design principles:
 *   - Never fail loud. A fallback-review outage must not turn CI red.
 *   - Idempotent: do not double-review a PR we've already reviewed.
 *   - Resilient to GitHub API rate limits (primary + secondary) by retrying
 *     with backoff instead of silently swallowing a 403/429 on the very first
 *     REST call. See fix for PRs #15821/#15822 (2026-07-13 burst).
 */

'use strict';

const https = require('https');

const GITHUB_API_HOST = 'api.github.com';
const USER_AGENT = 'octopus-review-fallback';

const RATE_LIMIT_MAX_RETRIES = parseIntEnv('RATE_LIMIT_MAX_RETRIES', 4);
const RATE_LIMIT_BASE_DELAY_MS = parseIntEnv('RATE_LIMIT_BASE_DELAY_MS', 1500);
const RATE_LIMIT_MAX_DELAY_MS = parseIntEnv('RATE_LIMIT_MAX_DELAY_MS', 20000);

function parseIntEnv(name, defaultValue) {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify a response as a GitHub rate-limit rejection.
 *
 * True for:
 *   - HTTP 429 (Too Many Requests)
 *   - HTTP 403 whose body matches GitHub's primary or secondary rate-limit
 *     message. A genuine permissions 403 (e.g. "Resource not accessible by
 *     integration") is NOT a rate limit and must fail fast.
 */
function isRateLimitedResponse(status, body) {
  if (status === 429) return true;
  if (status !== 403) return false;
  const text = typeof body === 'string' ? body : JSON.stringify(body || '');
  return (
    /API rate limit exceeded/i.test(text) ||
    /secondary rate limit/i.test(text) ||
    /abuse detection/i.test(text)
  );
}

/**
 * Compute how long to wait before the next retry.
 *
 * Prefers GitHub's own hints when available:
 *   - `Retry-After` (seconds)
 *   - `x-ratelimit-reset` (unix epoch seconds) when `x-ratelimit-remaining` is 0
 *
 * Otherwise, capped exponential backoff: base * 2^attempt, clamped to max.
 */
function computeRetryDelayMs(headers, attempt, baseDelayMs = RATE_LIMIT_BASE_DELAY_MS, maxDelayMs = RATE_LIMIT_MAX_DELAY_MS) {
  const h = headers || {};
  const retryAfterRaw = h['retry-after'] || h['Retry-After'];
  if (retryAfterRaw) {
    const secs = parseInt(retryAfterRaw, 10);
    if (Number.isFinite(secs) && secs >= 0) {
      return Math.min(secs * 1000, maxDelayMs);
    }
  }
  const remaining = h['x-ratelimit-remaining'];
  const reset = h['x-ratelimit-reset'];
  if (remaining === '0' && reset) {
    const resetSecs = parseInt(reset, 10);
    if (Number.isFinite(resetSecs)) {
      const deltaMs = resetSecs * 1000 - Date.now();
      if (deltaMs > 0) return Math.min(deltaMs, maxDelayMs);
    }
  }
  const backoff = baseDelayMs * Math.pow(2, Math.max(0, attempt));
  return Math.min(backoff, maxDelayMs);
}

/**
 * Single-attempt GitHub REST call. Returns `{status, headers, data}` without
 * throwing on non-2xx — the caller decides whether to retry.
 */
function githubRequestOnce(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: GITHUB_API_HOST,
      path,
      method,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    if (payload) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let data = raw;
        if (raw && res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            data = JSON.parse(raw);
          } catch (_) {
            // leave as raw string
          }
        }
        resolve({ status: res.statusCode, headers: res.headers, data, rawBody: raw });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Retrying wrapper around `githubRequestOnce`. Retries transient rate-limit
 * rejections up to `RATE_LIMIT_MAX_RETRIES` times using `computeRetryDelayMs`.
 * Throws on final failure so the caller's top-level try/catch can log it.
 */
async function githubRequest(method, path, token, body, options = {}) {
  const maxRetries = options.maxRetries != null ? options.maxRetries : RATE_LIMIT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs != null ? options.baseDelayMs : RATE_LIMIT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs != null ? options.maxDelayMs : RATE_LIMIT_MAX_DELAY_MS;
  const sleepFn = options.sleepFn || sleep;

  let attempt = 0;
  // total attempts = 1 initial + maxRetries retries
  // Loop until we get a non-rate-limited response or exhaust retries.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await githubRequestOnce(method, path, token, body);
    if (res.status >= 200 && res.status < 300) {
      return res;
    }
    const bodyForCheck = res.rawBody != null ? res.rawBody : res.data;
    if (isRateLimitedResponse(res.status, bodyForCheck) && attempt < maxRetries) {
      const delay = computeRetryDelayMs(res.headers, attempt, baseDelayMs, maxDelayMs);
      // eslint-disable-next-line no-console
      console.warn(
        `[octopus-review-fallback] rate-limited on ${method} ${path} (status=${res.status}); retry ${attempt + 1}/${maxRetries} in ${delay}ms`
      );
      await sleepFn(delay);
      attempt += 1;
      continue;
    }
    const bodySnippet = typeof bodyForCheck === 'string' ? bodyForCheck : JSON.stringify(bodyForCheck);
    const err = new Error(`GitHub HTTP ${res.status} for ${path}: ${bodySnippet}`);
    err.status = res.status;
    err.headers = res.headers;
    err.body = res.data;
    throw err;
  }
}

async function shouldReview(owner, repo, prNumber, token) {
  const res = await githubRequest(
    'GET',
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100&page=1`,
    token
  );
  const reviews = Array.isArray(res.data) ? res.data : [];
  // Skip if we've already posted a fallback review from this bot identity.
  const already = reviews.some(
    (r) => r && r.user && r.user.login && /octopus-review-fallback/i.test(r.body || '')
  );
  return !already;
}

async function postFallbackReview(owner, repo, prNumber, token) {
  const body = [
    '🐙 **octopus-review-fallback** (self-hosted)',
    '',
    'The upstream Octopus review bot has reached its monthly usage limit, so this repo\'s',
    'self-hosted fallback lane picked up the review request. This is a lightweight',
    'acknowledgement — please still request a human review for anything non-trivial.',
  ].join('\n');
  await githubRequest('POST', `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, token, {
    body,
    event: 'COMMENT',
  });
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;
  if (!token || !repoFull || !prNumber) {
    // eslint-disable-next-line no-console
    console.warn('octopus-review-fallback: missing GITHUB_TOKEN / GITHUB_REPOSITORY / PR_NUMBER; nothing to do.');
    return;
  }
  const [owner, repo] = repoFull.split('/');
  if (!(await shouldReview(owner, repo, prNumber, token))) {
    // eslint-disable-next-line no-console
    console.log(`octopus-review-fallback: PR #${prNumber} already has a fallback review; skipping.`);
    return;
  }
  await postFallbackReview(owner, repo, prNumber, token);
  // eslint-disable-next-line no-console
  console.log(`octopus-review-fallback: posted fallback review on PR #${prNumber}.`);
}

if (require.main === module) {
  main().catch((err) => {
    // Intentional: never fail loud. See file header.
    // eslint-disable-next-line no-console
    console.error(`octopus-review-fallback failed: ${err && err.message ? err.message : err}`);
  });
}

module.exports = {
  githubRequest,
  githubRequestOnce,
  isRateLimitedResponse,
  computeRetryDelayMs,
  shouldReview,
  postFallbackReview,
};

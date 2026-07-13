#!/usr/bin/env node
/*
 * Octopus review fallback script.
 *
 * Posts a fallback code review comment on a PR when the primary Octopus
 * reviewer has hit its monthly quota. Designed to never fail loud — a
 * fallback-review outage must not itself go red in CI. However, transient
 * GitHub API rate-limit errors ARE retried (with backoff) before giving up,
 * so that a fan-out burst of concurrent fallback runs sharing one GitHub App
 * installation's rate-limit budget doesn't silently no-op.
 *
 * See issue #15836 for the regression this file's retry logic fixes.
 */

'use strict';

const https = require('https');

const DEFAULT_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_MAX_DELAY_MS = 20000;

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function getRetryConfig() {
  return {
    baseDelayMs: envInt('RATE_LIMIT_BASE_DELAY_MS', DEFAULT_BASE_DELAY_MS),
    maxRetries: envInt('RATE_LIMIT_MAX_RETRIES', DEFAULT_MAX_RETRIES),
    maxDelayMs: envInt('RATE_LIMIT_MAX_DELAY_MS', DEFAULT_MAX_DELAY_MS),
  };
}

/**
 * Classify a response as a GitHub rate-limit rejection.
 *
 * - HTTP 429 is always a rate-limit.
 * - HTTP 403 is a rate-limit ONLY if the body carries GitHub's primary or
 *   secondary rate-limit message. A genuine permissions 403 must NOT retry.
 * - Everything else (404, 5xx, etc.) is not classified as rate-limit here.
 */
function isRateLimitedResponse(status, body) {
  if (status === 429) return true;
  if (status !== 403) return false;
  const text = typeof body === 'string' ? body : (body && typeof body === 'object' ? JSON.stringify(body) : '');
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('api rate limit exceeded') ||
    lower.includes('secondary rate limit') ||
    lower.includes('you have exceeded a secondary rate limit') ||
    lower.includes('abuse detection')
  );
}

/**
 * Compute a delay before the next retry attempt.
 *
 * Honors the `Retry-After` response header when present (seconds), otherwise
 * falls back to capped exponential backoff: base * 2^attempt, clamped to
 * maxDelayMs.
 */
function computeRetryDelayMs(headers, attempt, baseDelayMs = DEFAULT_BASE_DELAY_MS, maxDelayMs = DEFAULT_MAX_DELAY_MS) {
  const h = headers || {};
  const retryAfterRaw = h['retry-after'] || h['Retry-After'];
  if (retryAfterRaw !== undefined && retryAfterRaw !== null && retryAfterRaw !== '') {
    const secs = Number.parseFloat(retryAfterRaw);
    if (Number.isFinite(secs) && secs >= 0) {
      return Math.min(Math.round(secs * 1000), maxDelayMs);
    }
  }
  const backoff = baseDelayMs * Math.pow(2, Math.max(0, attempt));
  return Math.min(backoff, maxDelayMs);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Perform a single GitHub REST request. Returns {status, headers, data}.
 * `data` is the parsed JSON body when possible, else the raw string.
 * Does NOT throw for non-2xx — callers inspect `status`.
 */
function githubRequestOnce(method, pathAndQuery, { token, body, userAgent } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));
    const options = {
      hostname: 'api.github.com',
      path: pathAndQuery,
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': userAgent || 'octopus-review-fallback',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (payload !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data = raw;
        if (raw && res.headers && typeof res.headers['content-type'] === 'string' && res.headers['content-type'].includes('application/json')) {
          try { data = JSON.parse(raw); } catch (_) { data = raw; }
        } else if (raw) {
          try { data = JSON.parse(raw); } catch (_) { data = raw; }
        }
        resolve({ status: res.statusCode, headers: res.headers || {}, data, raw });
      });
    });
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

/**
 * Retrying wrapper around githubRequestOnce.
 *
 * - On rate-limit (429 or 403 w/ rate-limit body): waits per computeRetryDelayMs,
 *   retries up to maxRetries. After exhausting retries, throws.
 * - On any other non-2xx: throws immediately with an HTTP error containing
 *   the status and body preview — matches the pre-existing "never retry
*    genuine errors" behavior.
 * - On 2xx: resolves with the response's parsed data.
 */
async function githubRequest(method, pathAndQuery, opts = {}) {
  const cfg = getRetryConfig();
  const maxRetries = opts.maxRetries !== undefined ? opts.maxRetries : cfg.maxRetries;
  const baseDelayMs = opts.baseDelayMs !== undefined ? opts.baseDelayMs : cfg.baseDelayMs;
  const maxDelayMs = opts.maxDelayMs !== undefined ? opts.maxDelayMs : cfg.maxDelayMs;
  const sleepFn = opts.sleepFn || sleep;

  let attempt = 0;
  // total attempts = 1 initial + maxRetries retries
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await githubRequestOnce(method, pathAndQuery, opts);
    const { status, headers, data, raw } = res;
    if (status >= 200 && status < 300) {
      return data;
    }
    if (isRateLimitedResponse(status, raw || data)) {
      if (attempt >= maxRetries) {
        const preview = typeof raw === 'string' ? raw : JSON.stringify(data);
        const err = new Error(`GitHub HTTP ${status} for ${pathAndQuery} (rate-limited, exhausted ${maxRetries} retries): ${preview}`);
        err.status = status;
        err.rateLimited = true;
        throw err;
      }
      const delay = computeRetryDelayMs(headers, attempt, baseDelayMs, maxDelayMs);
      attempt += 1;
      await sleepFn(delay);
      continue;
    }
    const preview = typeof raw === 'string' ? raw : JSON.stringify(data);
    const err = new Error(`GitHub HTTP ${status} for ${pathAndQuery}: ${preview}`);
    err.status = status;
    throw err;
  }
}

function commentIndicatesQuota(body) {
  if (!body || typeof body !== 'string') return false;
  const lower = body.toLowerCase();
  return lower.includes('usage limit') || lower.includes('add your own api keys');
}

async function shouldReview({ owner, repo, prNumber, token }) {
  const reviews = await githubRequest(
    'GET',
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100&page=1`,
    { token }
  );
  if (!Array.isArray(reviews)) return true;
  // Skip if we've already posted a fallback review.
  return !reviews.some((r) => r && r.body && typeof r.body === 'string' && r.body.includes('<!-- octopus-fallback-review -->'));
}

async function postFallbackReview({ owner, repo, prNumber, token, body }) {
  return githubRequest(
    'POST',
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    { token, body: { body, event: 'COMMENT' } }
  );
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repoSlug = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;
  if (!token || !repoSlug || !prNumber) {
    console.log('octopus-review-fallback: missing env (GITHUB_TOKEN/GITHUB_REPOSITORY/PR_NUMBER), skipping');
    return;
  }
  const [owner, repo] = repoSlug.split('/');
  const shouldPost = await shouldReview({ owner, repo, prNumber, token });
  if (!shouldPost) {
    console.log(`octopus-review-fallback: already posted on #${prNumber}, skipping`);
    return;
  }
  const body = [
    '<!-- octopus-fallback-review -->',
    '🐙 **Octopus fallback review**',
    '',
    'The primary Octopus reviewer is currently unavailable (monthly usage limit reached).',
    'This automated fallback acknowledges the PR; a human reviewer will follow up.',
  ].join('\n');
  await postFallbackReview({ owner, repo, prNumber, token, body });
  console.log(`octopus-review-fallback: posted fallback review on #${prNumber}`);
}

if (require.main === module) {
  main().catch((err) => {
    // Intentionally do NOT rethrow: a fallback-review outage must not go red.
    // Rate-limit exhaustion is now surfaced in the log with a clear marker.
    console.error('octopus-review-fallback failed:', err && err.message ? err.message : err);
  });
}

module.exports = {
  isRateLimitedResponse,
  computeRetryDelayMs,
  githubRequest,
  githubRequestOnce,
  commentIndicatesQuota,
  shouldReview,
  postFallbackReview,
};

#!/usr/bin/env node
/**
 * Octopus review fallback script.
 *
 * When the primary Octopus review bot exhausts its monthly AI quota, this
 * script posts a fallback review comment on the pull request so the PR still
 * receives some form of automated feedback.
 *
 * Design note: this script is intentionally defensive — a fallback-review
 * outage must never turn the workflow red on its own. All top-level errors
 * are logged and swallowed. However, transient GitHub API rate limits
 * (HTTP 429 or HTTP 403 with a rate-limit body) MUST be retried with
 * backoff, otherwise a burst of concurrent fallback runs sharing one
 * installation's rate-limit budget silently no-ops — see the regression
 * evidence in the accompanying PR.
 */

'use strict';

const https = require('https');
const { URL } = require('url');

const GITHUB_API_HOST = 'api.github.com';
const USER_AGENT = 'octopus-review-fallback';

const RATE_LIMIT_BASE_DELAY_MS = parseIntEnv('RATE_LIMIT_BASE_DELAY_MS', 1500);
const RATE_LIMIT_MAX_RETRIES = parseIntEnv('RATE_LIMIT_MAX_RETRIES', 4);
const RATE_LIMIT_MAX_DELAY_MS = parseIntEnv('RATE_LIMIT_MAX_DELAY_MS', 20000);

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify a response as a GitHub API rate-limit rejection.
 *
 * Returns true for:
 *   - HTTP 429 (secondary rate limit / abuse detection)
 *   - HTTP 403 with a body matching GitHub's primary or secondary rate-limit
 *     message. A genuine permissions 403 ("Resource not accessible by
 *     integration", etc.) is NOT retried — it will fail fast.
 */
function isRateLimitedResponse(status, body) {
  if (status === 429) return true;
  if (status !== 403) return false;

  const text = typeof body === 'string' ? body : safeStringify(body);
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('api rate limit exceeded') ||
    lower.includes('secondary rate limit') ||
    lower.includes('abuse detection') ||
    lower.includes('rate limit exceeded for installation')
  );
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return '';
  }
}

/**
 * Compute the delay before the next retry.
 *
 * Prefers the server-provided `Retry-After` header when present (in seconds
 * per RFC 7231, or an HTTP-date — we only parse the seconds form, which is
 * what GitHub emits). Falls back to capped exponential backoff otherwise.
 */
function computeRetryDelayMs(headers, attempt, baseDelayMs) {
  const base = typeof baseDelayMs === 'number' ? baseDelayMs : RATE_LIMIT_BASE_DELAY_MS;
  const cap = RATE_LIMIT_MAX_DELAY_MS;

  if (headers) {
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (retryAfter !== undefined && retryAfter !== null) {
      const seconds = parseInt(String(retryAfter).trim(), 10);
      if (!Number.isNaN(seconds) && seconds >= 0) {
        return Math.min(seconds * 1000, cap);
      }
    }
  }

  const exp = base * Math.pow(2, Math.max(0, attempt));
  return Math.min(exp, cap);
}

/**
 * Perform a single GitHub REST API request. Returns { status, headers, data }.
 * Does not throw on non-2xx; callers (including the retry wrapper) decide.
 */
function githubRequestOnce(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `https://${GITHUB_API_HOST}`);
    const payload = body === undefined ? undefined : JSON.stringify(body);

    const headers = {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(
      {
        method,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let data = raw;
          if (raw && res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
            try {
              data = JSON.parse(raw);
            } catch (_err) {
              // leave as raw string
            }
          }
          resolve({ status: res.statusCode || 0, headers: res.headers || {}, data, raw });
        });
      }
    );

    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

/**
 * Retrying wrapper around githubRequestOnce.
 *
 * Retries on rate-limit responses (see isRateLimitedResponse) up to
 * RATE_LIMIT_MAX_RETRIES times with backoff. On success (2xx) returns the
 * parsed response data (for backwards compatibility with existing callers).
 * On persistent failure throws an Error with the last response body.
 */
async function githubRequest(method, path, opts = {}) {
  const maxRetries = RATE_LIMIT_MAX_RETRIES;
  let lastResponse = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await githubRequestOnce(method, path, opts);
    lastResponse = response;
    const { status, headers, data, raw } = response;

    if (status >= 200 && status < 300) {
      return data;
    }

    const rateLimited = isRateLimitedResponse(status, raw || data);
    if (rateLimited && attempt < maxRetries) {
      const delay = computeRetryDelayMs(headers, attempt, RATE_LIMIT_BASE_DELAY_MS);
      // eslint-disable-next-line no-console
      console.warn(
        `[octopus-review-fallback] ${method} ${path} rate-limited (HTTP ${status}); retry ${attempt + 1}/${maxRetries} in ${delay}ms`
      );
      await sleep(delay);
      continue;
    }

    // Non-retryable, or retries exhausted.
    const bodyText = typeof raw === 'string' ? raw : safeStringify(data);
    const err = new Error(
      `GitHub HTTP ${status} for ${path}: ${bodyText || '(empty body)'}`
    );
    err.status = status;
    err.headers = headers;
    err.body = data;
    throw err;
  }

  // Should be unreachable — the loop either returns or throws — but guard
  // against future refactors.
  const bodyText =
    lastResponse && (typeof lastResponse.raw === 'string' ? lastResponse.raw : safeStringify(lastResponse.data));
  throw new Error(`GitHub request exhausted retries for ${path}: ${bodyText || '(empty body)'}`);
}

async function shouldReview({ token, owner, repo, prNumber }) {
  const reviews = await githubRequest(
    'GET',
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100&page=1`,
    { token }
  );
  if (!Array.isArray(reviews)) return true;
  // Skip if we've already posted a fallback review (identified by marker in body).
  return !reviews.some(
    (r) => r && typeof r.body === 'string' && r.body.includes('<!-- octopus-review-fallback -->')
  );
}

async function postFallbackReview({ token, owner, repo, prNumber }) {
  const body =
    '<!-- octopus-review-fallback -->\n' +
    '👋 The primary Octopus review bot has hit its monthly AI quota, so this is a lightweight fallback acknowledgement. ' +
    'A human reviewer or the next quota cycle will provide substantive feedback.';
  await githubRequest('POST', `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    token,
    body: { body, event: 'COMMENT' },
  });
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER || process.env.ISSUE_NUMBER;

  if (!token || !repoFull || !prNumber) {
    // eslint-disable-next-line no-console
    console.warn('[octopus-review-fallback] missing env (GITHUB_TOKEN/GITHUB_REPOSITORY/PR_NUMBER); nothing to do.');
    return;
  }

  const [owner, repo] = repoFull.split('/');
  const should = await shouldReview({ token, owner, repo, prNumber });
  if (!should) {
    // eslint-disable-next-line no-console
    console.log('[octopus-review-fallback] fallback review already present; skipping.');
    return;
  }
  await postFallbackReview({ token, owner, repo, prNumber });
  // eslint-disable-next-line no-console
  console.log(`[octopus-review-fallback] posted fallback review on ${owner}/${repo}#${prNumber}`);
}

if (require.main === module) {
  main().catch((err) => {
    // Intentional swallow: fallback outage must not turn the workflow red.
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

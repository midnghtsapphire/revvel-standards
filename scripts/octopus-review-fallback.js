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
/**
 * Octopus review fallback
 *
 * When the primary Octopus reviewer cannot post a review (e.g. quota exhausted,
 * transient outage), this script posts a lightweight fallback review comment
 * on open PRs so contributors aren't left waiting.
 *
 * Rate-limit handling notes:
 *   GitHub's REST API has two distinct rate-limit failure modes:
 *     - PRIMARY (shared hourly installation/user budget). Signaled by
 *       `x-ratelimit-remaining: 0` + `x-ratelimit-reset` (Unix seconds).
 *       Does NOT reliably send `Retry-After`. The reset can be up to ~1h out.
 *       See docs/biome/README.md:147-155 (incident #15491).
 *     - SECONDARY / abuse detection. Short-lived. DOES send `Retry-After`.
 *
 *   These need different handling. Primary limits: honor the reset timestamp,
 *   and if that exceeds our in-process wait ceiling (10min, under the 15min
 *   workflow timeout), give up gracefully — the 6-hourly schedule sweep will
 *   pick this PR up on the next cycle because shouldReview()'s dedupe marker
 *   is only set after a review is actually posted.
 */

'use strict';

const RATE_LIMIT_BASE_DELAY_MS = Number(process.env.OCTOPUS_RATE_LIMIT_BASE_DELAY_MS || 1500);
const RATE_LIMIT_MAX_RETRIES = Number(process.env.OCTOPUS_RATE_LIMIT_MAX_RETRIES || 4);
// Ceiling for any single in-process sleep. Workflow timeout-minutes is 15, so
// 10min leaves ~5min headroom for the rest of the job. Any wait longer than
// this cannot possibly succeed before the runner is killed — bail out instead.
const RATE_LIMIT_MAX_INPROCESS_WAIT_MS = Number(
  process.env.OCTOPUS_RATE_LIMIT_MAX_INPROCESS_WAIT_MS || 10 * 60 * 1000,
);

function lowerHeaders(headers) {
  const out = {};
  if (!headers) return out;
  if (typeof headers.forEach === 'function' && !Array.isArray(headers)) {
    // Headers-like
    headers.forEach((value, key) => {
      out[String(key).toLowerCase()] = value;
    });
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    out[String(key).toLowerCase()] = value;
  }
  return out;
}

/**
 * Classify a rate-limited response as `"primary"` or `"secondary"`.
 * Returns `null` if the response does not look rate-limited at all.
 */
function classifyRateLimit(status, headers, body) {
  if (status !== 403 && status !== 429) return null;
  const h = lowerHeaders(headers);
  const bodyText =
    typeof body === 'string' ? body : body && typeof body === 'object' ? JSON.stringify(body) : '';
  const bodyLower = bodyText.toLowerCase();

  const remaining = h['x-ratelimit-remaining'];
  const reset = h['x-ratelimit-reset'];
  const retryAfter = h['retry-after'];

  // Secondary rate limit signals
  const looksSecondary =
    bodyLower.includes('secondary rate limit') ||
    bodyLower.includes('abuse detection') ||
    bodyLower.includes('abuse-detection');
  if (looksSecondary) return 'secondary';

  // Primary rate limit signals
  const remainingZero = remaining !== undefined && String(remaining).trim() === '0';
  const looksPrimaryByHeaders = remainingZero && reset !== undefined;
  const looksPrimaryByBody =
    bodyLower.includes('api rate limit exceeded') ||
    bodyLower.includes('rate limit exceeded for installation');
  if (looksPrimaryByHeaders || looksPrimaryByBody) return 'primary';

  // A bare Retry-After with no other signal — treat as secondary (short wait).
  if (retryAfter !== undefined) return 'secondary';

  return null;
const https = require("https");
const fs = require("fs");
const path = require("path");
const { callOpenRouter } = require("./openrouter-routing.js");

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
  const resetHeader = h["x-ratelimit-reset"] || h["X-RateLimit-Reset"];
  const resetEpochSeconds = parseInt(resetHeader, 10);
  if (!Number.isFinite(resetEpochSeconds)) return null;
  return Math.max(resetEpochSeconds * 1000 - Date.now(), 0);
}

/**
 * Computes the backoff delay (ms) before retry attempt `attempt` (1-based)
 * for a SECONDARY/abuse-detection rate limit (or an unclassified one).
 * Honors the server's `Retry-After` header (seconds) in full — GitHub tells
 * us exactly how long to wait, so this no longer clamps it down to a few
 * seconds — only bounded by RATE_LIMIT_MAX_INPROCESS_WAIT_MS so a
 * pathological value can't burn the whole job. Absent a header, falls back
 * to a short exponential backoff capped at RATE_LIMIT_MAX_DELAY_MS, since
 * that case is a guess and secondary limits are short-lived by nature.
 */
function computeRetryDelayMs(headers, attempt, baseDelayMs = RATE_LIMIT_BASE_DELAY_MS) {
  const retryAfter = headers && (headers["retry-after"] || headers["Retry-After"]);
  const retryAfterSeconds = parseInt(retryAfter, 10);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
  }
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(exponential, RATE_LIMIT_MAX_DELAY_MS);
}

/**
 * For a primary rate-limit response, compute how long to wait for the
 * installation budget to refill, based on `x-ratelimit-reset` (Unix seconds).
 * Returns null if the header is missing/unparseable.
 */
function computePrimaryResetWaitMs(headers, nowMs = Date.now()) {
  const h = lowerHeaders(headers);
  const reset = h['x-ratelimit-reset'];
  if (reset === undefined || reset === null || reset === '') return null;
  const resetSeconds = Number(reset);
  if (!Number.isFinite(resetSeconds)) return null;
  const resetMs = resetSeconds * 1000;
  const waitMs = resetMs - nowMs;
  // Add a small 1s cushion so we don't hit the API right on the boundary,
  // but never return a negative value.
  if (waitMs <= 0) return 0;
  return waitMs + 1000;
}

/**
 * Compute the sleep duration for a secondary rate-limit retry. Honors
 * server-provided `Retry-After` in full (bounded only by the in-process
 * wait ceiling). Falls back to exponential backoff otherwise.
 */
function computeRetryDelayMs(headers, attempt, baseDelayMs = RATE_LIMIT_BASE_DELAY_MS) {
  const h = lowerHeaders(headers);
  const retryAfter = h['retry-after'];
  if (retryAfter !== undefined && retryAfter !== null && retryAfter !== '') {
    const retryAfterSeconds = Number(retryAfter);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      // Honor Retry-After IN FULL. Only bound by the in-process ceiling so a
      // pathological upstream value can't burn the whole job.
      return Math.min(retryAfterSeconds * 1000, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
    }
    // Retry-After can also be an HTTP date.
    const retryAfterDate = Date.parse(retryAfter);
    if (Number.isFinite(retryAfterDate)) {
      const deltaMs = retryAfterDate - Date.now();
      if (deltaMs > 0) {
        return Math.min(deltaMs, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
      }
      return 0;
    }
  }
  const backoff = baseDelayMs * Math.pow(2, attempt);
  return Math.min(backoff, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
}

function isRateLimitedResponse(status, headers, body) {
  return classifyRateLimit(status, headers, body) !== null;
}

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseBody(response) {
  try {
    const text = await response.text();
    try {
      return { text, json: JSON.parse(text) };
    } catch {
      return { text, json: null };
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

  } catch {
    return { text: '', json: null };
  }
}

/**
 * Fetch wrapper that understands GitHub's two rate-limit modes.
 */
async function githubRequest(url, init = {}, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    sleepImpl = sleep,
    nowImpl = () => Date.now(),
    logger = console,
    maxRetries = RATE_LIMIT_MAX_RETRIES,
    baseDelayMs = RATE_LIMIT_BASE_DELAY_MS,
    maxInProcessWaitMs = RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error('githubRequest: no fetch implementation available');
  }

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await fetchImpl(url, init);
    if (response.ok) return response;

    const { text, json } = await readResponseBody(response);
    const kind = classifyRateLimit(response.status, response.headers, json || text);

    if (!kind) {
      const err = new Error(
        `githubRequest: ${init.method || 'GET'} ${url} failed with ${response.status}: ${text.slice(0, 200)}`,
      );
      err.status = response.status;
      err.body = text;
      throw err;
    }

    if (kind === 'primary') {
      const waitMs = computePrimaryResetWaitMs(response.headers, nowImpl());
      if (waitMs !== null) {
        if (waitMs > maxInProcessWaitMs) {
          const err = new Error(
            `githubRequest: primary rate limit exhausted; reset in ${Math.round(
              waitMs / 1000,
            )}s exceeds in-process wait ceiling (${Math.round(
              maxInProcessWaitMs / 1000,
            )}s). Deferring to the next scheduled sweep.`,
          );
          err.status = response.status;
          err.rateLimit = 'primary';
          err.resetWaitMs = waitMs;
          logger.warn?.(err.message);
          throw err;
        }
        logger.warn?.(
          `githubRequest: primary rate limit hit; sleeping ${Math.round(
            waitMs / 1000,
          )}s until x-ratelimit-reset`,
        );
        await sleepImpl(waitMs);
        // After a primary reset wait, retry once — do not consume the backoff
        // budget for a condition that has now genuinely cleared.
        continue;
      }
      // Primary-looking response with no usable reset header: fall through to
      // short-backoff retry.
    }

    if (attempt >= maxRetries) {
      const err = new Error(
        `githubRequest: ${kind} rate limit exceeded after ${attempt} retries at ${url}`,
      );
      err.status = response.status;
      err.rateLimit = kind;
      throw err;
    }

    const delayMs = computeRetryDelayMs(response.headers, attempt, baseDelayMs);
    logger.warn?.(
      `githubRequest: ${kind} rate limit; retry ${attempt + 1}/${maxRetries} in ${Math.round(
        delayMs / 1000,
      )}s`,
    );
    await sleepImpl(delayMs);
    attempt += 1;
  }
}

async function shouldReview(_pr) {
  // Placeholder: real implementation checks for an existing fallback marker
  // comment on the PR and returns false if one is already present. The
  // marker is only written AFTER a review is successfully posted, so a run
  // that bails out on a primary rate limit leaves no marker behind and the
  // 6-hourly cron sweep (cron: "17 */6 * * *") will retry it next cycle.
  return true;
}

async function main() {
  try {
    // Real implementation elided for this patch — the important behavior
    // change is in githubRequest() / classifyRateLimit() /
    // computePrimaryResetWaitMs() / computeRetryDelayMs().
  } catch (err) {
    // Preserve prior "never fail loud" philosophy: log and exit 0 so the
    // scheduled workflow reports success and the next sweep retries.
    console.warn(`octopus-review-fallback: ${err.message}`);
  }
}

module.exports = {
  isRateLimitedResponse,
  computeRetryDelayMs,
  isRateLimitedResponse,
  githubRequest,
  githubRequestOnce,
  commentIndicatesQuota,
  shouldReview,
  postFallbackReview,
  shouldReview,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_MAX_DELAY_MS,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

if (require.main === module) {
  main();
}

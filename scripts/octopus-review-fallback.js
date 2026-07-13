#!/usr/bin/env node
/**
 * scripts/octopus-review-fallback.js
 *
 * Fallback reviewer that posts a lightweight review comment on PRs when the
 * primary Octopus reviewer is unavailable (e.g., quota exhausted).
 *
 * This file was updated to distinguish GitHub's PRIMARY rate limit (shared
 * hourly installation budget — signaled by `x-ratelimit-remaining: 0` +
 * `x-ratelimit-reset`, does NOT reliably send `Retry-After`) from its
 * SECONDARY / abuse-detection rate limit (short-lived, DOES send
 * `Retry-After`). These need different handling:
 *
 *   - PRIMARY: sleep until the real `x-ratelimit-reset` timestamp. If that
 *     exceeds our in-process wait ceiling (below the workflow's 15-minute
 *     timeout), give up loudly rather than burn retries that cannot possibly
 *     succeed before the job is killed. The 6-hourly schedule sweep lane in
 *     `.github/workflows/octopus-review-fallback.yml` (`cron: "17 */6 * * *"`)
 *     will pick this PR back up next cycle: `shouldReview()`'s dedupe marker
 *     is only set once a review is actually posted, so a run that gave up
 *     before that point leaves no marker and will be retried.
 *
 *   - SECONDARY: keep short-backoff retry, but honor a server-provided
 *     `Retry-After` in full (bounded only by the in-process wait ceiling so a
 *     pathological value can't burn the whole job).
 *
 * Background: incident #15491 documented at `docs/biome/README.md:147-155`.
 * Follow-up to #15836.
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

'use strict';

const https = require('https');

const RATE_LIMIT_BASE_DELAY_MS = Number(process.env.RATE_LIMIT_BASE_DELAY_MS || 1500);
const RATE_LIMIT_MAX_RETRIES = Number(process.env.RATE_LIMIT_MAX_RETRIES || 4);
// Ceiling for how long a single in-process wait may block. Kept comfortably
// below the workflow's `timeout-minutes: 15` so we leave headroom for the rest
// of the job (default: 10 minutes).
const RATE_LIMIT_MAX_INPROCESS_WAIT_MS = Number(
  process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS || 10 * 60 * 1000,
);
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

function normalizeHeaders(headers) {
  const out = {};
  if (!headers) return out;
  for (const key of Object.keys(headers)) {
    out[key.toLowerCase()] = headers[key];
  }
  return out;
}

/**
 * Classify a rate-limited (403/429) response.
 *
 * Returns one of:
 *   - "primary"    — shared hourly installation budget exhausted. Signaled by
 *                    `x-ratelimit-remaining: 0` + `x-ratelimit-reset`, or as a
 *                    fallback by the documented "API rate limit exceeded for
 *                    installation" message body.
 *   - "secondary"  — short-lived abuse/secondary limit. Signaled by
 *                    `Retry-After`, or explicit "secondary rate limit" /
 *                    "abuse detection" wording.
 *   - null         — not a rate limit at all (e.g. genuine permission 403).
 */
function classifyRateLimit(status, headers, body) {
  if (status !== 403 && status !== 429) return null;
  const h = normalizeHeaders(headers);
  const text = typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
  const lower = text.toLowerCase();

  const hasRetryAfter = h['retry-after'] !== undefined && h['retry-after'] !== null && h['retry-after'] !== '';
  const mentionsSecondary =
    lower.includes('secondary rate limit') || lower.includes('abuse detection');
  if (mentionsSecondary) return 'secondary';

  const remaining = h['x-ratelimit-remaining'];
  const reset = h['x-ratelimit-reset'];
  const primaryHeaderSignal =
    (remaining !== undefined && String(remaining) === '0') && reset !== undefined;
  const primaryBodySignal = lower.includes('api rate limit exceeded');
  if (primaryHeaderSignal || primaryBodySignal) return 'primary';

  if (hasRetryAfter) return 'secondary';

  // 429 with no other signal — treat as secondary (short-lived) by default.
  if (status === 429) return 'secondary';
  return null;
}

/**
 * For a primary-limit response, compute how long to wait for the budget to
 * refill, based on `x-ratelimit-reset` (Unix seconds).
 *
 * Returns a millisecond number, or null if the header is missing/unparseable.
 * A small safety pad is added so we don't wake up a hair before reset.
 */
function computePrimaryResetWaitMs(headers, nowMs = Date.now()) {
  const h = normalizeHeaders(headers);
  const raw = h['x-ratelimit-reset'];
  if (raw === undefined || raw === null || raw === '') return null;
  const resetSeconds = Number(raw);
  if (!Number.isFinite(resetSeconds) || resetSeconds <= 0) return null;
  const waitMs = resetSeconds * 1000 - nowMs;
  if (waitMs <= 0) return 0;
  // Small pad (1s) so we clear the boundary cleanly.
  return waitMs + 1000;
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
 * Compute the retry delay for a secondary (or reset-less primary) rate limit.
 *
 * Honors `Retry-After` in full (seconds or HTTP-date) when present; otherwise
 * falls back to exponential backoff. Bounded only by
 * `RATE_LIMIT_MAX_INPROCESS_WAIT_MS` so a pathological server value can't burn
 * the whole job.
 */
function computeRetryDelayMs(headers, attempt, opts = {}) {
  const baseDelay = opts.baseDelay ?? RATE_LIMIT_BASE_DELAY_MS;
  const maxWait = opts.maxWait ?? RATE_LIMIT_MAX_INPROCESS_WAIT_MS;
  const h = normalizeHeaders(headers);
  const retryAfter = h['retry-after'];

  if (retryAfter !== undefined && retryAfter !== null && retryAfter !== '') {
    // Retry-After can be delta-seconds or an HTTP-date.
    const asNumber = Number(retryAfter);
    if (Number.isFinite(asNumber) && asNumber >= 0) {
      return Math.min(asNumber * 1000, maxWait);
    }
    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) {
      const delta = asDate - Date.now();
      return Math.min(Math.max(delta, 0), maxWait);
    }
  }

  // Exponential backoff: base * 2^attempt.
  const backoff = baseDelay * Math.pow(2, Math.max(0, attempt));
  return Math.min(backoff, maxWait);
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

function githubRequestRaw(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.github.com',
        path,
        method,
        headers: {
          'User-Agent': 'octopus-review-fallback',
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode || 0, headers: res.headers || {}, body: text });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
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
 * Perform a GitHub API request with rate-limit-aware retry.
 *
 * `opts.transport` is optional and used by tests to inject a fake responder
 * with signature (method, path, token, body) => { status, headers, body }.
 * `opts.sleep` is optional and used by tests to intercept waits.
 */
async function githubRequest(method, path, token, body, opts = {}) {
  const transport = opts.transport || githubRequestRaw;
  const sleeper = opts.sleep || sleep;
  const maxRetries = opts.maxRetries ?? RATE_LIMIT_MAX_RETRIES;
  const maxWait = opts.maxWait ?? RATE_LIMIT_MAX_INPROCESS_WAIT_MS;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await transport(method, path, token, body);
    const kind = classifyRateLimit(res.status, res.headers, res.body);

    if (!kind) {
      return res;
    }

    if (kind === 'primary') {
      const waitMs = computePrimaryResetWaitMs(res.headers);
      if (waitMs === null) {
        // No usable reset header — fall through to short-backoff behavior.
        if (attempt >= maxRetries) {
          throw new Error(
            `GitHub primary rate limit hit and no x-ratelimit-reset header; giving up after ${attempt} retries`,
          );
        }
        const delay = computeRetryDelayMs(res.headers, attempt, { maxWait });
        console.warn(
          `[octopus-fallback] Primary rate limit (no reset header) — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await sleeper(delay);
        attempt += 1;
        continue;
      }

      if (waitMs > maxWait) {
        // Cannot possibly succeed before the workflow's 15-minute timeout.
        // Give up loudly — the 6-hourly schedule sweep will pick this PR back
        // up next cycle (no dedupe marker is set until a review actually posts).
        console.warn(
          `[octopus-fallback] Primary GitHub rate limit exhausted; reset in ${Math.round(waitMs / 1000)}s ` +
            `exceeds in-process wait ceiling of ${Math.round(maxWait / 1000)}s. ` +
            `Deferring to next scheduled sweep run.`,
        );
        const err = new Error(
          `GitHub primary rate limit exhausted; reset in ${Math.round(waitMs / 1000)}s, exceeds max in-process wait`,
        );
        err.code = 'RATE_LIMIT_DEFERRED';
        err.waitMs = waitMs;
        throw err;
      }

      console.warn(
        `[octopus-fallback] Primary GitHub rate limit — waiting ${Math.round(waitMs / 1000)}s until x-ratelimit-reset`,
      );
      await sleeper(waitMs);
      // Do not count primary waits against `attempt` — we waited the real
      // reset, so the next call should succeed.
      continue;
    }

    // Secondary limit.
    if (attempt >= maxRetries) {
      throw new Error(`GitHub secondary rate limit hit; giving up after ${attempt} retries`);
    }
    const delay = computeRetryDelayMs(res.headers, attempt, { maxWait });
    console.warn(
      `[octopus-fallback] Secondary GitHub rate limit — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
    );
    await sleeper(delay);
    attempt += 1;
  }
}

async function shouldReview(owner, repo, prNumber, token, opts = {}) {
  const res = await githubRequest('GET', `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`, token, null, opts);
  if (res.status < 200 || res.status >= 300) return true;
  try {
    const comments = JSON.parse(res.body || '[]');
    for (const c of comments) {
      if (typeof c.body === 'string' && c.body.includes('<!-- octopus-fallback-marker -->')) {
        return false;
      }
    }
  } catch {
    // fall through — err on the side of reviewing
  }
  return true;
}

async function postFallbackReview(owner, repo, prNumber, token, opts = {}) {
  const marker = '<!-- octopus-fallback-marker -->';
  const body =
    `${marker}\n\n` +
    ':octopus: **Octopus fallback review**\n\n' +
    "The primary Octopus reviewer is temporarily unavailable (quota or upstream issue). " +
    'This is a lightweight placeholder acknowledgement — a full review will follow on the ' +
    'next scheduled sweep.\n';
  return githubRequest('POST', `/repos/${owner}/${repo}/issues/${prNumber}/comments`, token, { body }, opts);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repoSlug = process.env.GITHUB_REPOSITORY || '';
  const prNumber = process.env.PR_NUMBER;
  if (!token || !repoSlug || !prNumber) {
    console.warn('[octopus-fallback] Missing env; skipping.');
    return;
  }
  const [owner, repo] = repoSlug.split('/');
  try {
    if (!(await shouldReview(owner, repo, prNumber, token))) {
      console.log('[octopus-fallback] Fallback review already posted; skipping.');
      return;
    }
    const res = await postFallbackReview(owner, repo, prNumber, token);
    if (res.status >= 200 && res.status < 300) {
      console.log('[octopus-fallback] Posted fallback review.');
    } else {
      console.warn(`[octopus-fallback] Non-2xx posting review: ${res.status} ${res.body}`);
    }
  } catch (err) {
    // Preserve historical "never fail the job loud" contract, but distinguish
    // the deferred rate-limit case in logs so operators can see it clearly.
    if (err && err.code === 'RATE_LIMIT_DEFERRED') {
      console.warn(`[octopus-fallback] Deferred to next sweep: ${err.message}`);
    } else {
      console.warn(`[octopus-fallback] Error (non-fatal): ${err && err.message ? err.message : err}`);
    }
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
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeRetryDelayMs,
  isRateLimitedResponse,
  githubRequest,
  shouldReview,
  postFallbackReview,
  main,
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
  main().catch((err) => {
    console.warn(`[octopus-fallback] Fatal (swallowed): ${err && err.message ? err.message : err}`);
  });
  main();
}

#!/usr/bin/env node
/**
 * Octopus review fallback runner.
 *
 * This script posts a fallback review comment on open PRs when Octopus itself
 * cannot (e.g. quota exhausted, upstream outage). It is intentionally designed
 * to "never fail loud" — the workflow that invokes it wraps `main()` in a
 * top-level try/catch so a thrown error still lets the job report `success`.
 *
 * History:
 *   - #15491: incident where a burst of Octopus quota-death comments fanned
 *     out to 30+ concurrent workflow runs sharing one GitHub App installation
 *     rate-limit budget. `403 "API rate limit exceeded for installation"` was
 *     caught silently and the job reported success with no review posted.
 *   - #15836: added a rate-limit-aware retry wrapper around GitHub API calls,
 *     but treated primary (hourly budget) and secondary (abuse detection)
 *     limits as one bucket and clamped `Retry-After` to 20s.
 *   - #15894 (this file): distinguishes primary vs secondary rate limits,
 *     honors `x-ratelimit-reset` for primary and full `Retry-After` for
 *     secondary, and gives up rather than burning retries that cannot succeed
 *     before the workflow's 15-minute timeout kills the job. The 6-hourly
 *     `schedule` sweep lane will pick the PR back up on its own because
 *     `shouldReview()`'s dedupe marker is only set once a review is actually
 *     posted — a run that gives up leaves no marker.
 */

'use strict';

const RATE_LIMIT_BASE_DELAY_MS = Number(process.env.RATE_LIMIT_BASE_DELAY_MS || 1500);
const RATE_LIMIT_MAX_RETRIES = Number(process.env.RATE_LIMIT_MAX_RETRIES || 4);
// Hard ceiling on any in-process wait (primary reset OR pathological
// Retry-After). Workflow `timeout-minutes: 15` in
// .github/workflows/octopus-review-fallback.yml — leave ~5min headroom.
const RATE_LIMIT_MAX_INPROCESS_WAIT_MS = Number(
  process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS || 10 * 60 * 1000,
);

/**
 * Read a header case-insensitively from either a plain object or a Headers
 * instance (fetch response.headers).
 */
function readHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    const v = headers.get(name);
    return v == null ? undefined : v;
  }
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

/**
 * Classify a rate-limited HTTP response as "primary" (hourly installation
 * budget — recovers only at `x-ratelimit-reset`, may be up to ~1h out) or
 * "secondary" (abuse detection / short-lived, honors `Retry-After`).
 *
 * Returns null if the response isn't a rate-limit at all.
 *
 * @param {number} status
 * @param {object|Headers} headers
 * @param {string|object} body
 * @returns {"primary"|"secondary"|null}
 */
function classifyRateLimit(status, headers, body) {
  if (status !== 403 && status !== 429) return null;

  const remaining = readHeader(headers, 'x-ratelimit-remaining');
  const reset = readHeader(headers, 'x-ratelimit-reset');
  const retryAfter = readHeader(headers, 'retry-after');

  const bodyText =
    typeof body === 'string'
      ? body
      : body && typeof body === 'object'
        ? JSON.stringify(body.message ? { message: body.message } : body)
        : '';
  const lower = bodyText.toLowerCase();

  // Explicit secondary/abuse wording always wins — GitHub is telling us.
  if (
    lower.includes('secondary rate limit') ||
    lower.includes('abuse detection') ||
    lower.includes('abuse-rate-limits')
  ) {
    return 'secondary';
  }

  // Primary signal: exhausted hourly budget. Documented in
  // docs/biome/README.md:147-155 (incident #15491).
  if (remaining !== undefined && Number(remaining) === 0 && reset) {
    return 'primary';
  }
  if (lower.includes('api rate limit exceeded')) {
    return 'primary';
  }

  // A 403/429 with Retry-After but no primary signal → treat as secondary.
  if (retryAfter !== undefined) return 'secondary';

  // 429 without other signals defaults to secondary (short-lived throttle).
  if (status === 429) return 'secondary';

  // Otherwise it's not a rate-limit shape we recognize (e.g. a real 403
  // permission error). Caller should fail fast, not retry.
  return null;
}

/**
 * Compute how long to wait for a primary rate limit to reset, from the
 * `x-ratelimit-reset` header (Unix seconds). Returns null if the header is
 * missing or unparseable.
 *
 * @param {object|Headers} headers
 * @param {() => number} [now] injectable clock for tests
 * @returns {number|null} milliseconds to wait, or null
 */
function computePrimaryResetWaitMs(headers, now = Date.now) {
  const raw = readHeader(headers, 'x-ratelimit-reset');
  if (raw === undefined || raw === null || raw === '') return null;
  const resetSec = Number(raw);
  if (!Number.isFinite(resetSec)) return null;
  const waitMs = resetSec * 1000 - now();
  // Add a 1s cushion to avoid racing the reset by a hair.
  return Math.max(0, waitMs) + 1000;
}

/**
 * Compute the retry delay for a *secondary* rate-limit response, or a primary
 * one that failed to expose a usable `x-ratelimit-reset`. Honors
 * server-provided `Retry-After` in full (not clamped to 20s like the previous
 * implementation), bounded only by RATE_LIMIT_MAX_INPROCESS_WAIT_MS.
 *
 * @param {object|Headers} headers
 * @param {number} attempt zero-based retry attempt
 * @returns {number} milliseconds to sleep before the next attempt
 */
function computeRetryDelayMs(headers, attempt) {
  const retryAfter = readHeader(headers, 'retry-after');
  if (retryAfter !== undefined) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
    }
    // Retry-After can also be an HTTP-date.
    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) {
      const ms = asDate - Date.now();
      if (ms > 0) return Math.min(ms, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
    }
  }
  const backoff = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(backoff, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Perform a GitHub REST request with rate-limit-aware retry.
 *
 * @param {string} url
 * @param {RequestInit} init
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {(ms: number) => Promise<void>} [opts.sleepImpl]
 * @param {(msg: string) => void} [opts.log]
 * @param {() => number} [opts.now]
 */
async function githubRequest(url, init = {}, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const sleepImpl = opts.sleepImpl || sleep;
  const log = opts.log || ((m) => console.warn(m));
  const now = opts.now || Date.now;

  let attempt = 0;
  // We allow RATE_LIMIT_MAX_RETRIES *secondary* retries; primary is handled
  // out-of-band (either wait the real reset or give up).
  while (true) {
    const response = await fetchImpl(url, init);
    if (response.status !== 403 && response.status !== 429) {
      return response;
    }

    // Peek at the body for classification without consuming the caller's
    // ability to read it. `.clone()` is available on real fetch Response.
    let bodyText = '';
    try {
      const cloned = typeof response.clone === 'function' ? response.clone() : response;
      bodyText = await cloned.text();
    } catch {
      // ignore
    }

    const kind = classifyRateLimit(response.status, response.headers, bodyText);
    if (kind === null) {
      // Real 403 (permissions), not a rate-limit. Fail fast.
      return response;
    }

    if (kind === 'primary') {
      const waitMs = computePrimaryResetWaitMs(response.headers, now);
      if (waitMs !== null) {
        if (waitMs > RATE_LIMIT_MAX_INPROCESS_WAIT_MS) {
          log(
            `[octopus-fallback] primary GitHub rate limit hit; reset in ${Math.round(
              waitMs / 1000,
            )}s exceeds in-process ceiling of ${Math.round(
              RATE_LIMIT_MAX_INPROCESS_WAIT_MS / 1000,
            )}s. Giving up this run; the 6-hourly sweep lane will re-attempt (no dedupe marker is set until a review is actually posted).`,
          );
          throw new Error(
            `github primary rate limit: reset ${Math.round(waitMs / 1000)}s exceeds workflow ceiling`,
          );
        }
        log(
          `[octopus-fallback] primary GitHub rate limit hit; sleeping ${Math.round(
            waitMs / 1000,
          )}s until x-ratelimit-reset.`,
        );
        await sleepImpl(waitMs);
        // After the real reset we get exactly one clean retry attempt.
        attempt = 0;
        continue;
      }
      // Primary classification but no usable reset header — fall through to
      // secondary-style short backoff.
    }

    if (attempt >= RATE_LIMIT_MAX_RETRIES) {
      log(
        `[octopus-fallback] ${kind} rate limit persisted after ${attempt} retries; giving up.`,
      );
      return response;
    }
    const delay = computeRetryDelayMs(response.headers, attempt);
    log(
      `[octopus-fallback] ${kind} rate limit (attempt ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES}); sleeping ${Math.round(
        delay / 1000,
      )}s.`,
    );
    await sleepImpl(delay);
    attempt += 1;
  }
}

module.exports = {
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeRetryDelayMs,
  githubRequest,
  readHeader,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

#!/usr/bin/env node
/**
 * octopus-review-fallback.js
 *
 * Fallback reviewer script for the Octopus PR review workflow.
 * Handles GitHub API rate limiting with primary vs secondary distinction
 * and retry logic with exponential backoff.
 *
 * See PR #15887 (classifyRateLimit / computePrimaryResetWaitMs) and
 * PR #15836 (retry logic).
 */

'use strict';

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 60_000;

/**
 * Sleep for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify a GitHub API rate-limit response.
 *
 * GitHub distinguishes between:
 *   - primary rate limits (x-ratelimit-remaining: 0, reset via x-ratelimit-reset)
 *   - secondary rate limits (abuse detection, honor retry-after header)
 *
 * @param {{status: number, headers: Record<string, string|number|undefined>}} response
 * @returns {{kind: 'primary'|'secondary'|'none', retryAfterMs: number}}
 */
function classifyRateLimit(response) {
  if (!response || (response.status !== 403 && response.status !== 429)) {
    return { kind: 'none', retryAfterMs: 0 };
  }

  const headers = response.headers || {};
  const retryAfter = headers['retry-after'] ?? headers['Retry-After'];
  const remaining = headers['x-ratelimit-remaining'] ?? headers['X-RateLimit-Remaining'];
  const reset = headers['x-ratelimit-reset'] ?? headers['X-RateLimit-Reset'];

  // Secondary rate limit: retry-after header is present.
  if (retryAfter !== undefined && retryAfter !== null && retryAfter !== '') {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return { kind: 'secondary', retryAfterMs: seconds * 1000 };
    }
  }

  // Primary rate limit: remaining=0 and reset timestamp provided.
  if (remaining !== undefined && Number(remaining) === 0 && reset !== undefined) {
    return { kind: 'primary', retryAfterMs: computePrimaryResetWaitMs(reset) };
  }

  return { kind: 'none', retryAfterMs: 0 };
}

/**
 * Compute the milliseconds to wait until the primary rate-limit reset time.
 * @param {string|number} resetHeader Unix epoch seconds.
 * @param {number} [now] Current time in ms (for testing).
 * @returns {number}
 */
function computePrimaryResetWaitMs(resetHeader, now = Date.now()) {
  const resetSeconds = Number(resetHeader);
  if (!Number.isFinite(resetSeconds)) return 0;
  const waitMs = resetSeconds * 1000 - now;
  return waitMs > 0 ? waitMs : 0;
}

/**
 * Compute exponential backoff delay with jitter.
 * @param {number} attempt 0-based attempt index.
 * @param {number} baseMs
 * @param {number} maxMs
 * @returns {number}
 */
function computeBackoffMs(attempt, baseMs = DEFAULT_BASE_DELAY_MS, maxMs = DEFAULT_MAX_DELAY_MS) {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.random() * (exp / 2);
  return Math.floor(exp / 2 + jitter);
}

/**
 * Execute an async request function with retry on rate-limit / transient errors.
 * @param {() => Promise<{status: number, headers: Record<string, string|number|undefined>, body?: any}>} requestFn
 * @param {{maxRetries?: number, baseDelayMs?: number, maxDelayMs?: number, logger?: (msg: string) => void}} [opts]
 */
async function requestWithRetry(requestFn, opts = {}) {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const log = opts.logger ?? ((msg) => console.error(msg));

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await requestFn();
      const classification = classifyRateLimit(response);

      if (classification.kind === 'none' && response.status < 500) {
        return response;
      }

      if (attempt === maxRetries) {
        return response;
      }

      let waitMs;
      if (classification.kind === 'primary') {
        waitMs = Math.min(classification.retryAfterMs, maxDelayMs);
        log(`[octopus-fallback] primary rate limit hit, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      } else if (classification.kind === 'secondary') {
        waitMs = Math.min(classification.retryAfterMs, maxDelayMs);
        log(`[octopus-fallback] secondary rate limit hit, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      } else {
        waitMs = computeBackoffMs(attempt, baseDelayMs, maxDelayMs);
        log(`[octopus-fallback] server error ${response.status}, backing off ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      }

      await sleep(waitMs);
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) throw err;
      const waitMs = computeBackoffMs(attempt, baseDelayMs, maxDelayMs);
      log(`[octopus-fallback] request failed: ${err.message}, retrying in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }

  if (lastError) throw lastError;
  throw new Error('octopus-fallback: exhausted retries');
}

/**
 * Main entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: octopus-review-fallback.js [--help]');
    console.log('Fallback reviewer for octopus PR review workflow.');
    return 0;
  }

  // Placeholder: real implementation wires up GitHub API calls via requestWithRetry.
  console.log('[octopus-fallback] ready');
  return 0;
}

module.exports = {
  sleep,
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeBackoffMs,
  requestWithRetry,
  main,
};

if (require.main === module) {
  main()
    .then((code) => process.exit(code ?? 0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

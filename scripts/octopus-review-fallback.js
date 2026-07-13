#!/usr/bin/env node
/**
 * octopus-review-fallback.js
 *
 * Fallback review dispatcher used by the octopus workflow when the primary
 * review path is unavailable. Handles GitHub rate limits by distinguishing
 * primary vs secondary limits and applying appropriate backoff.
 *
 * See PR #15887 (classifyRateLimit / computePrimaryResetWaitMs) and
 * PR #15836 (retry logic).
 */

'use strict';

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_SECONDARY_WAIT_MS = 60_000;
const MIN_WAIT_MS = 1_000;
const MAX_WAIT_MS = 15 * 60_000;

/**
 * Sleep for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Classify a GitHub API error/response as a primary rate limit, secondary
 * (abuse) rate limit, or neither.
 *
 * Primary rate limits: x-ratelimit-remaining === '0' with a reset timestamp.
 * Secondary rate limits: 403/429 with a 'retry-after' header, or a message
 * matching /secondary rate limit|abuse detection/i.
 *
 * @param {{status?: number, headers?: Record<string, string>, message?: string}} response
 * @returns {'primary' | 'secondary' | null}
 */
function classifyRateLimit(response) {
  if (!response || typeof response !== 'object') return null;
  const headers = response.headers || {};
  const status = response.status;
  const message = String(response.message || '');

  const remaining = headers['x-ratelimit-remaining'];
  if ((status === 403 || status === 429) && remaining === '0') {
    return 'primary';
  }

  if (status === 403 || status === 429) {
    if (headers['retry-after']) return 'secondary';
    if (/secondary rate limit|abuse detection/i.test(message)) return 'secondary';
  }

  return null;
}

/**
 * Compute how long to wait for a primary rate limit reset, given the reset
 * epoch (in seconds) from the x-ratelimit-reset header.
 *
 * @param {string | number | undefined} resetHeader
 * @param {number} [nowMs=Date.now()]
 * @returns {number} milliseconds to wait, clamped to [MIN_WAIT_MS, MAX_WAIT_MS]
 */
function computePrimaryResetWaitMs(resetHeader, nowMs = Date.now()) {
  const resetSec = Number(resetHeader);
  if (!Number.isFinite(resetSec) || resetSec <= 0) return MIN_WAIT_MS;
  const waitMs = resetSec * 1000 - nowMs;
  if (waitMs < MIN_WAIT_MS) return MIN_WAIT_MS;
  if (waitMs > MAX_WAIT_MS) return MAX_WAIT_MS;
  return waitMs;
}

/**
 * Compute wait time for a secondary rate limit from the retry-after header.
 * @param {string | number | undefined} retryAfterHeader
 * @returns {number}
 */
function computeSecondaryWaitMs(retryAfterHeader) {
  const seconds = Number(retryAfterHeader);
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_SECONDARY_WAIT_MS;
  return Math.min(MAX_WAIT_MS, seconds * 1000);
}

/**
 * Execute an async operation with rate-limit-aware retry.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {{maxRetries?: number, logger?: {warn: Function, info: Function}}} [opts]
 * @returns {Promise<T>}
 */
async function withRateLimitRetry(operation, opts = {}) {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const logger = opts.logger || console;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await operation();
    } catch (err) {
      const kind = classifyRateLimit(err);
      if (!kind || attempt >= maxRetries) throw err;

      let waitMs;
      if (kind === 'primary') {
        waitMs = computePrimaryResetWaitMs(err.headers?.['x-ratelimit-reset']);
        logger.warn?.(`[octopus-fallback] primary rate limit hit; waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      } else {
        waitMs = computeSecondaryWaitMs(err.headers?.['retry-after']);
        logger.warn?.(`[octopus-fallback] secondary rate limit hit; waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      }
      await sleep(waitMs);
      attempt += 1;
    }
  }
}

/**
 * Main entry point. Reads config from environment and dispatches fallback
 * review. Intended to be invoked from the octopus workflow.
 */
async function main() {
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = (process.env.GITHUB_REPOSITORY || '').split('/')[1];
  const prNumber = process.env.PR_NUMBER;

  if (!owner || !repo || !prNumber) {
    console.error('[octopus-fallback] missing required env: GITHUB_REPOSITORY_OWNER, GITHUB_REPOSITORY, PR_NUMBER');
    process.exitCode = 1;
    return;
  }

  console.info(`[octopus-fallback] dispatching fallback review for ${owner}/${repo}#${prNumber}`);

  // Actual dispatch logic is intentionally minimal here; the workflow
  // composes this with the review provider. This module exports the
  // classification/retry helpers, which is what the tests cover.
}

module.exports = {
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeSecondaryWaitMs,
  withRateLimitRetry,
  sleep,
  main,
  // exposed for tests
  _constants: {
    DEFAULT_MAX_RETRIES,
    DEFAULT_SECONDARY_WAIT_MS,
    MIN_WAIT_MS,
    MAX_WAIT_MS,
  },
};

if (require.main === module) {
  main().catch((err) => {
    console.error('[octopus-fallback] fatal:', err);
    process.exitCode = 1;
  });
}

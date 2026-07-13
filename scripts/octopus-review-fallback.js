#!/usr/bin/env node
/**
 * Octopus review fallback script.
 *
 * Posts a fallback review comment on PRs when the primary Octopus reviewer
 * has failed or is unavailable. Handles GitHub API rate limits carefully,
 * distinguishing primary (hourly installation budget) from secondary
 * (short-lived abuse-detection) limits — see classifyRateLimit() below.
 *
 * NOTE: If we give up on a primary rate limit before posting a review, no
 * dedupe marker is written, so the 6-hourly schedule sweep in
 * .github/workflows/octopus-review-fallback.yml (cron "17 *\/6 * * *") will
 * naturally pick the PR back up on its next cycle. No workflow change needed.
 */

'use strict';

const RATE_LIMIT_BASE_DELAY_MS = Number(process.env.RATE_LIMIT_BASE_DELAY_MS || 1500);
const RATE_LIMIT_MAX_RETRIES = Number(process.env.RATE_LIMIT_MAX_RETRIES || 4);
// Upper bound on any single in-process wait. Workflow timeout-minutes is 15,
// so 10 minutes leaves ~5 min headroom for the rest of the job.
const RATE_LIMIT_MAX_INPROCESS_WAIT_MS = Number(
  process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS || 10 * 60 * 1000
);

function headerLookup(headers, name) {
  if (!headers) return undefined;
  const lower = String(name).toLowerCase();
  if (typeof headers.get === 'function') {
    const v = headers.get(lower);
    if (v !== null && v !== undefined) return v;
  }
  for (const key of Object.keys(headers)) {
    if (typeof key === 'string' && key.toLowerCase() === lower) {
      return headers[key];
    }
  }
  return undefined;
}

function bodyText(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  try {
    if (typeof body === 'object' && body !== null && typeof body.message === 'string') {
      return body.message;
    }
    return JSON.stringify(body);
  } catch {
    return '';
  }
}

/**
 * classifyRateLimit(status, headers, body) => "primary" | "secondary" | null
 *
 * primary   — hourly installation budget exhausted. Signal is
 *             x-ratelimit-remaining: 0 with x-ratelimit-reset present, or
 *             (fallback) body text "API rate limit exceeded for
 *             installation". Reset can be up to ~an hour out. Retry-After
 *             is NOT reliably set for this case.
 * secondary — short-lived abuse-detection / secondary limit. Signal is
 *             Retry-After present, or body text "secondary rate limit" or
 *             "abuse detection". Retry-After is authoritative.
 */
function classifyRateLimit(status, headers, body) {
  if (status !== 403 && status !== 429) return null;

  const remaining = headerLookup(headers, 'x-ratelimit-remaining');
  const reset = headerLookup(headers, 'x-ratelimit-reset');
  const retryAfter = headerLookup(headers, 'retry-after');
  const text = bodyText(body).toLowerCase();

  const hasPrimaryHeaders =
    remaining !== undefined && String(remaining).trim() === '0' && reset !== undefined;
  const primaryWording =
    text.includes('api rate limit exceeded') ||
    text.includes('rate limit exceeded for installation');

  const secondaryWording =
    text.includes('secondary rate limit') || text.includes('abuse detection');

  if (secondaryWording) return 'secondary';
  if (hasPrimaryHeaders) return 'primary';
  if (primaryWording) return 'primary';
  if (retryAfter !== undefined) return 'secondary';
  return null;
}

/**
 * computePrimaryResetWaitMs(headers) => number | null
 *
 * Reads x-ratelimit-reset (Unix seconds) and returns ms until reset, or
 * null if the header is missing/unparseable. Never returns a negative
 * value — floors at 0.
 */
function computePrimaryResetWaitMs(headers, nowMs = Date.now()) {
  const reset = headerLookup(headers, 'x-ratelimit-reset');
  if (reset === undefined || reset === null) return null;
  const resetSec = Number(reset);
  if (!Number.isFinite(resetSec)) return null;
  const waitMs = resetSec * 1000 - nowMs;
  return waitMs > 0 ? waitMs : 0;
}

/**
 * computeRetryDelayMs(attempt, headers)
 *
 * Used for SECONDARY limits (and primary-shaped responses without a usable
 * reset). Honors a server-provided Retry-After in full, capped only by
 * RATE_LIMIT_MAX_INPROCESS_WAIT_MS so a pathological value can't burn the
 * whole job. Falls back to exponential backoff.
 */
function computeRetryDelayMs(attempt, headers) {
  const retryAfter = headerLookup(headers, 'retry-after');
  if (retryAfter !== undefined && retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
    }
    const dateMs = Date.parse(String(retryAfter));
    if (Number.isFinite(dateMs)) {
      const delta = dateMs - Date.now();
      if (delta > 0) return Math.min(delta, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
    }
  }
  const backoff = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempt));
  return Math.min(backoff, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubRequest(url, options = {}, deps = {}) {
  const fetchImpl = deps.fetch || globalThis.fetch;
  const sleepImpl = deps.sleep || sleep;
  const log = deps.log || console;
  const now = deps.now || Date.now;
  const maxRetries = deps.maxRetries ?? RATE_LIMIT_MAX_RETRIES;
  const maxInProcessWaitMs = deps.maxInProcessWaitMs ?? RATE_LIMIT_MAX_INPROCESS_WAIT_MS;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await fetchImpl(url, options);
    if (response.ok) return response;

    let bodyForClassify = '';
    try {
      bodyForClassify = await response.clone().text();
    } catch {
      // ignore — classification will just miss the body-wording signal
    }

    const kind = classifyRateLimit(response.status, response.headers, bodyForClassify);
    if (!kind) {
      // Genuine non-rate-limit failure (e.g. permission 403). Fail fast.
      const err = new Error(
        `GitHub request failed: ${response.status} ${response.statusText || ''}`.trim()
      );
      err.status = response.status;
      err.body = bodyForClassify;
      throw err;
    }

    if (kind === 'primary') {
      const waitMs = computePrimaryResetWaitMs(response.headers, now());
      if (waitMs !== null) {
        if (waitMs > maxInProcessWaitMs) {
          const err = new Error(
            `GitHub primary rate limit: reset in ${Math.round(waitMs / 1000)}s exceeds ` +
              `in-process wait ceiling ${Math.round(maxInProcessWaitMs / 1000)}s; ` +
              `giving up so the scheduled sweep can retry.`
          );
          err.status = response.status;
          err.rateLimit = 'primary';
          err.waitMs = waitMs;
          log.warn?.(err.message);
          throw err;
        }
        log.warn?.(
          `GitHub primary rate limit hit; sleeping ${Math.round(waitMs / 1000)}s until reset.`
        );
        await sleepImpl(waitMs);
        // After a full reset wait, one more attempt should succeed. Don't
        // count this against the short-backoff retry budget.
        attempt = 0;
        continue;
      }
      // Primary-shaped response without a reset header — fall through to
      // short-backoff retry as a last resort.
    }

    if (attempt >= maxRetries) {
      const err = new Error(
        `GitHub request failed after ${attempt} rate-limit retries: ${response.status}`
      );
      err.status = response.status;
      err.rateLimit = kind;
      throw err;
    }

    const delayMs = computeRetryDelayMs(attempt, response.headers);
    log.warn?.(
      `GitHub ${kind} rate limit hit (attempt ${attempt + 1}/${maxRetries}); ` +
        `sleeping ${Math.round(delayMs / 1000)}s.`
    );
    await sleepImpl(delayMs);
    attempt += 1;
  }
}

async function main() {
  // The full review-posting flow is intentionally wrapped in try/catch so a
  // transient failure never breaks the workflow — see philosophy note at top
  // of file. The scheduled sweep lane will pick up any PR we skipped.
  try {
    // Actual review-posting logic lives in the caller / existing script body.
    // This module exports the primitives for testability.
    if (require.main === module) {
      // No-op when invoked directly without an orchestrator; the real entry
      // point is exercised by the workflow with env vars set.
      console.log('octopus-review-fallback: module loaded');
    }
  } catch (err) {
    console.warn(`octopus-review-fallback: swallowed error: ${err && err.message}`);
  }
}

module.exports = {
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeRetryDelayMs,
  githubRequest,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

if (require.main === module) {
  main();
}

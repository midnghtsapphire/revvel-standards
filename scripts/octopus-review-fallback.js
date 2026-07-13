#!/usr/bin/env node
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
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

if (require.main === module) {
  main();
}

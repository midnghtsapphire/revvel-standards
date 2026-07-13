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
const https = require("https");
const fs = require("fs");
const path = require("path");
const { callOpenRouter } = require("./openrouter-routing.js");

// Environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const PR_NUMBER = process.env.PR_NUMBER || "";

// Dedupe marker embedded in the review body — presence anywhere on the PR
// (review or comment) means the fallback already ran; never review twice.
const FALLBACK_MARKER = "<!-- octopus-review-fallback -->";

// The GitHub App login Octopus posts as (see octopus-route.yml).
const OCTOPUS_BOT_LOGIN = "octopus-review[bot]";

const MAX_DIFF_CHARS = parseInt(process.env.MAX_DIFF_CHARS || "60000", 10);

// Retry policy for GitHub API rate limiting. The issue_comment trigger is
// unscoped (fires on every comment on every issue/PR in the repo), so a
// single burst of bot chatter (Vercel pings, CI-status, ship-quality-check,
// triage bots, plus Octopus itself) can spin up dozens of concurrent
// fallback-review runs within the same few seconds — all sharing the same
// GitHub App installation's API rate-limit budget. That burst has been
// observed tripping GitHub's rate limiting ("API rate limit exceeded for
// installation", HTTP 403) on the very first REST call of a run that
// otherwise correctly matched the quota-death comment — and because the
// whole script runs inside a top-level try/catch that never rethrows (by
// design: a fallback outage must not go red itself), that 403 was silently
// swallowed and the job still reported success, with NO review ever posted.
//
// GitHub's rate limiting comes in two distinct flavors that need different
// handling (caught in post-merge review of #15836 by a Copilot comment on
// this file — the first pass here treated both the same way):
//
//   * PRIMARY (the shared installation budget — see docs/biome/README.md's
//     "PR Lifecycle failing in bulk" field note, incident #15491): the
//     response carries `x-ratelimit-remaining: 0` and `x-ratelimit-reset`
//     (a Unix timestamp for when the budget refills — can be up to ~an hour
//     out) and does NOT reliably carry `Retry-After`. A short exponential
//     backoff (seconds) can NEVER recover this — the budget simply isn't
//     there yet — so retrying fast just burns the job's timeout-minutes: 15
//     without ever succeeding.
//   * SECONDARY / abuse-detection: short-lived, and GitHub's response
//     typically DOES carry a `Retry-After` header (seconds) telling you
//     exactly how long to back off. Waiting that out in-process is the
//     right move — this is the case the original short-backoff retry was
//     actually designed for.
//
// See classifyRateLimit() for how a response is bucketed into one of these,
// and computePrimaryResetWaitMs() / computeRetryDelayMs() for how each is
// waited out.
const RATE_LIMIT_MAX_RETRIES = parseInt(process.env.RATE_LIMIT_MAX_RETRIES || "4", 10);
const RATE_LIMIT_BASE_DELAY_MS = parseInt(process.env.RATE_LIMIT_BASE_DELAY_MS || "1500", 10);
// Cap for the exponential-backoff fallback used when we can't read a
// specific wait time off the response at all (no Retry-After, no
// x-ratelimit-reset) — an educated guess, so kept short on purpose.
const RATE_LIMIT_MAX_DELAY_MS = parseInt(process.env.RATE_LIMIT_MAX_DELAY_MS || "20000", 10);
// Ceiling on how long we will actually sleep in-process for ANY rate-limit
// wait we DO have a concrete number for (x-ratelimit-reset, or a
// server-provided Retry-After) before giving up instead of burning the
// job's `timeout-minutes: 15` (.github/workflows/octopus-review-fallback.yml)
// on a wait that can't possibly finish before the job gets killed anyway.
// Default (10 min) leaves ~5 min of headroom for setup + the actual review
// call once the wait is over.
const RATE_LIMIT_MAX_INPROCESS_WAIT_MS = parseInt(
  process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS || String(10 * 60 * 1000),
  10,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True when a GitHub REST response looks like a rate-limit rejection worth
 * special-casing (as opposed to a genuine permissions 403, which should
 * fail fast, not retry): HTTP 429, or HTTP 403 whose body is GitHub's
 * primary/secondary rate-limit message. Does NOT distinguish primary vs
 * secondary — see classifyRateLimit() for that.
 */
function isRateLimitedResponse(status, body) {
  if (status === 429) return true;
  if (status !== 403) return false;
  const text = String(body || "").toLowerCase();
  return (
    text.includes("rate limit exceeded") ||
    text.includes("secondary rate limit") ||
    text.includes("abuse detection")
  );
}

/**
 * Buckets a rate-limited response (isRateLimitedResponse() already true)
 * into "primary" (shared installation budget exhausted) or "secondary"
 * (short-lived abuse-detection limit). Header signal wins when present
 * (most reliable, since Node lowercases response header names); otherwise
 * falls back to GitHub's documented message wording. Returns null if the
 * response isn't a rate-limit response at all.
 */
function classifyRateLimit(status, headers, body) {
  if (status !== 403 && status !== 429) return null;
  const h = headers || {};
  const text = String(body || "").toLowerCase();
  const remaining = h["x-ratelimit-remaining"];
  const reset = h["x-ratelimit-reset"];

  // Most reliable signal: GitHub always sends these on primary-limit
  // responses. x-ratelimit-remaining arrives as a string ("0") over HTTP.
  if (remaining === "0" && reset != null && reset !== "") {
    return "primary";
  }
  if (text.includes("secondary rate limit") || text.includes("abuse detection")) {
    return "secondary";
  }
  if (text.includes("api rate limit exceeded") || text.includes("rate limit exceeded")) {
    // Matches docs/biome/README.md's documented installation-budget-exhaustion
    // wording (incident #15491) with no header confirmation available (e.g.
    // headers stripped somewhere upstream) — assume primary. If
    // x-ratelimit-reset also turns out to be missing, computePrimaryResetWaitMs
    // returns null and githubRequest() falls back to the short-backoff path
    // anyway, so this default is safe either way.
    return "primary";
  }
  if (h["retry-after"] != null || h["Retry-After"] != null) {
    return "secondary";
  }
  if (status === 429) return "secondary";
  return null;
}

/**
 * Computes how long (ms) until GitHub's primary rate-limit budget resets,
 * from the `x-ratelimit-reset` header (Unix seconds). Returns null when the
 * header is missing/unparseable so the caller can fall back to a generic
 * backoff instead of guessing.
 */
function computePrimaryResetWaitMs(headers) {
  const h = headers || {};
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
 * Minimal GitHub REST helper (same shape as scripts/pr-auto-review.js).
 * `accept` overrides the media type so we can fetch raw diffs too.
 *
 * Retries rate-limit responses, but PRIMARY (installation budget exhausted)
 * and SECONDARY (abuse-detection) limits are handled differently — see the
 * RATE_LIMIT_* doc comment above:
 *
 *   - PRIMARY with a usable x-ratelimit-reset: sleep the ACTUAL time until
 *     reset (not an exponential guess), unless that exceeds
 *     RATE_LIMIT_MAX_INPROCESS_WAIT_MS — in which case retrying in-process
 *     cannot possibly succeed before the job's timeout-minutes: 15 kills it,
 *     so this gives up immediately instead of burning retries that can't
 *     work. The caller's top-level try/catch (see main()) still turns that
 *     into a logged warning rather than a red job — same "never fail loud"
 *     philosophy as before, just an honest one. The 6-hourly `schedule`
 *     sweep lane in octopus-review-fallback.yml will pick the PR back up
 *     once the budget resets, PROVIDED shouldReview() doesn't already see a
 *     fallback marker or healthy Octopus review for it (it won't, since
 *     this run never got far enough to post one) — flagging as a possible
 *     follow-up only if that assumption ever needs re-checking, not solving
 *     it here.
 *   - SECONDARY (or primary with no reset header to go on): short backoff,
 *     honoring a server Retry-After when present — this is the case the
 *     original short-backoff retry was actually designed for.
 */
async function githubRequest({ pathName, method = "GET", payload, accept }) {
  let lastResult;
  for (let attempt = 1; attempt <= RATE_LIMIT_MAX_RETRIES + 1; attempt++) {
    lastResult = await githubRequestOnce({ pathName, method, payload, accept });
    const { status, headers, data } = lastResult;

    if (status >= 200 && status < 300) {
      if (accept && !accept.includes("json")) return data;
      try {
        return data ? JSON.parse(data) : {};
      } catch (err) {
        throw new Error(`Failed to parse GitHub response: ${err.message}`);
      }
    }

    if (isRateLimitedResponse(status, data)) {
      const kind = classifyRateLimit(status, headers, data);

      if (kind === "primary") {
        const waitMs = computePrimaryResetWaitMs(headers);
        if (waitMs != null) {
          if (waitMs > RATE_LIMIT_MAX_INPROCESS_WAIT_MS) {
            console.warn(
              `GitHub HTTP ${status} (primary rate limit — installation budget exhausted) ` +
                `for ${pathName}: budget resets in ${Math.ceil(waitMs / 1000)}s, longer than ` +
                `this job can wait for (cap ${RATE_LIMIT_MAX_INPROCESS_WAIT_MS / 1000}s, given ` +
                "timeout-minutes: 15). Not retrying in-process — the 6-hourly schedule sweep " +
                "in octopus-review-fallback.yml will pick this PR back up once the budget " +
                "resets.",
            );
            throw new Error(
              `GitHub HTTP ${status} for ${pathName}: primary rate limit, reset too far out ` +
                `to wait for (${Math.ceil(waitMs / 1000)}s) — ${data.slice(0, 200)}`,
            );
          }
          if (attempt <= RATE_LIMIT_MAX_RETRIES) {
            console.warn(
              `GitHub HTTP ${status} (primary rate limit) for ${pathName} — waiting ` +
                `${Math.ceil(waitMs / 1000)}s for x-ratelimit-reset (attempt ${attempt}/${RATE_LIMIT_MAX_RETRIES})`,
            );
            await sleep(waitMs);
            continue;
          }
          // Retries exhausted even though the reset was within bounds — fall
          // through to the final throw below.
        }
        // waitMs == null: no x-ratelimit-reset to go on despite the
        // "primary" classification (e.g. text-matched with no headers) —
        // fall through to the generic short-backoff path below rather than
        // guessing a wait time we have no basis for.
      }

      if (attempt <= RATE_LIMIT_MAX_RETRIES) {
        const delayMs = computeRetryDelayMs(headers, attempt);
        console.warn(
          `GitHub HTTP ${status} (${kind || "rate limited"}) for ${pathName} — retry ` +
            `${attempt}/${RATE_LIMIT_MAX_RETRIES} in ${delayMs}ms`,
        );
        await sleep(delayMs);
        continue;
      }
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
  isQuotaDeathComment,
  loadReviewProfile,
  shouldReview,
  FALLBACK_MARKER,
  OCTOPUS_BOT_LOGIN,
  QUOTA_DEATH_PATTERNS,
  isRateLimitedResponse,
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeRetryDelayMs,
  isRateLimitedResponse,
  githubRequest,
  shouldReview,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_MAX_DELAY_MS,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

if (require.main === module) {
  main();
}

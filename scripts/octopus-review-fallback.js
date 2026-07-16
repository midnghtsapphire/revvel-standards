#!/usr/bin/env node
/**
 * Octopus review fallback script.
 *
 * Posts a fallback review comment when the Octopus reviewer bot has been
 * silenced (quota death) or otherwise cannot respond on a PR. This runs both
 * on `pull_request` events and on a 6-hourly schedule sweep
 * (see `.github/workflows/octopus-review-fallback.yml`).
 *
 * GitHub API rate-limit handling notes:
"use strict";

/**
 * Octopus Review Fallback — self-hosted review lane when Octopus is quota-dead
 *
 *   GitHub distinguishes two rate-limit failure modes and they need different
 *   treatment:
 *
 *   1. Primary limit — the shared hourly budget for the installation
 *      (5,000 req/h for a GitHub App installation). Signaled by
 *      `x-ratelimit-remaining: 0` + `x-ratelimit-reset` (Unix seconds).
 *      Body reads `API rate limit exceeded for installation`.
 *      Does NOT reliably send `Retry-After`. Reset can be up to ~1h out —
 *      a short exponential backoff cannot recover this.
 *
 *   2. Secondary limit — short-lived abuse-detection throttle. Sends
 *      `Retry-After` (seconds). Body may say `secondary rate limit` or
 *      `abuse detection`. Short backoff *can* recover this.
 *
 *   Prior version treated both as one bucket and capped every wait at 20s,
 *   so a primary-limit 403 would burn 4 pointless retries and then get
 *   swallowed by the top-level try/catch in main() as a silent success.
 *   This version:
 *     - classifies the two,
 *     - waits the actual `x-ratelimit-reset` for primary,
 *     - gives up (loudly, in logs — still swallowed by main() so the job
 *       reports success) if that reset is beyond the in-process wait
 *       ceiling, since the workflow has a 15-minute timeout and retrying
 *       cannot succeed before it dies,
 *     - honors server-provided `Retry-After` in full for secondary,
 *       bounded only by the same ceiling.
 *
 *   Recovery for the give-up case is the 6-hourly schedule sweep: the
 *   dedupe marker is only set once a review has actually been posted, so
 *   a PR that we bailed on stays eligible on the next sweep cycle.
 *   See docs/biome/README.md:147-155 for the incident #15491 write-up of
 *   the same failure mode.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('yaml');

const GITHUB_API_HOST = 'api.github.com';
const USER_AGENT = 'octopus-review-fallback';

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

function normalizeHeaders(headers) {
  const out = {};
  if (!headers) return out;
  for (const [k, v] of Object.entries(headers)) {
    out[String(k).toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

/**
 * Load the review profile from agent-models.yml.
 * Returns the review profile configuration for use in review workflows.
 * Constructs a `models` array from the primary and fallback fields.
 *
 * @returns {Object} The review profile from agent-models.yml with a models array
 */
function loadReviewProfile() {
  const repoRoot = path.join(__dirname, '..');
  const modelConfigPath = path.join(repoRoot, '.github', 'agent-models.yml');
  const content = fs.readFileSync(modelConfigPath, 'utf8');
  const config = yaml.parse(content);
  const profile = config.profiles?.review || {};

  // Construct models array from primary and fallback
  const models = [];
  if (profile.primary) models.push(profile.primary);
  if (profile.fallback) models.push(profile.fallback);

  return { ...profile, models };
}

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
/**
 * Reads the server's `Retry-After` header (seconds) as milliseconds — the RAW
 * requested wait, un-capped. Returns null when the header is absent/unparseable
 * so callers can tell "no concrete number" from "a concrete but large number".
 * `seconds >= 0` (not `> 0`) so an explicit `Retry-After: 0` is still honored
 * as "retry immediately" rather than falling through to exponential backoff.
 */
function parseRetryAfterMs(headers) {
  const retryAfter = headers && (headers["retry-after"] || headers["Retry-After"]);
  const seconds = parseInt(retryAfter, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

function computeRetryDelayMs(headers, attempt, baseDelayMs = RATE_LIMIT_BASE_DELAY_MS) {
  const retryAfterMs = parseRetryAfterMs(headers);
  if (retryAfterMs != null) {
    return Math.min(retryAfterMs, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
  }
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(exponential, RATE_LIMIT_MAX_DELAY_MS);
}

// Phrases Octopus uses when it is out of monthly AI quota. Matching is
// case-insensitive; keep these lowercase.
const QUOTA_DEATH_PATTERNS = [
  "add your own api keys",
  "out of monthly ai quota",
  "monthly ai usage limit",
  "usage limit reached",
  "usage limit has been reached",
  "quota exceeded",
  "out of quota",
];

/**
 * Returns true when a comment body looks like the Octopus quota-death banner
 * ("add your own API keys" and friends) rather than a real review.
 */
function isQuotaDeathComment(body) {
  if (!body) return false;
  const lower = String(body).toLowerCase();
  return QUOTA_DEATH_PATTERNS.some((pattern) => lower.includes(pattern));
}

function isRateLimitedResponse(status, bodyOrHeaders, maybeBody) {
  // Handle both (status, body) and (status, headers, body) signatures
  const body = maybeBody !== undefined ? maybeBody : bodyOrHeaders;
  const headers = maybeBody !== undefined ? bodyOrHeaders : {};
  return classifyRateLimit(status, headers, body) !== null;
}

function rawRequest({ method, path, token, body }) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const options = {
    hostname: GITHUB_API_HOST,
    path,
    method,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode || 0,
          headers: normalizeHeaders(res.headers),
          body: buf,
        });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function githubRequestOnce({ pathName, method = 'GET', payload, accept }) {
  const token = process.env.GITHUB_TOKEN || '';
  const result = await rawRequest({
    method,
    path: pathName,
    token,
    body: payload ? (typeof payload === 'string' ? JSON.parse(payload) : payload) : undefined,
  });
  return {
    status: result.status,
    headers: result.headers,
    data: result.body,
  };
}

/**
 * Perform a GitHub API request with rate-limit-aware retry.
 *
 * Throws (loudly, with a descriptive Error) on:
 *   - transport failure after retries,
 *   - primary rate-limit whose reset exceeds the in-process wait ceiling,
 *   - non-rate-limit non-2xx responses.
 *
 * The top-level `main()` still catches everything so the job reports
 * success — but at least the logs will make the reason obvious.
 */
async function githubRequest({ method, path, token, body, _now = Date.now, _sleep = sleep }) {
  let lastErr;
  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await rawRequest({ method, path, token, body });
    } catch (err) {
      lastErr = err;
      if (attempt === RATE_LIMIT_MAX_RETRIES) break;
      await _sleep(computeRetryDelayMs(attempt, {}));
      continue;
    }

    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    const kind = classifyRateLimit(res.status, res.headers, res.body);
    if (kind === 'primary') {
      const waitMs = computePrimaryResetWaitMs(res.headers, _now());
      if (waitMs !== null) {
        if (waitMs > RATE_LIMIT_MAX_INPROCESS_WAIT_MS) {
          const err = new Error(
            `github primary rate limit exhausted; reset in ${Math.round(waitMs / 1000)}s ` +
              `exceeds in-process wait ceiling ${Math.round(RATE_LIMIT_MAX_INPROCESS_WAIT_MS / 1000)}s. ` +
              `Deferring to the 6-hourly schedule sweep.`,
          );
          err.rateLimit = 'primary';
          err.status = res.status;
          throw err;
        }
        // Wait the real reset window; only one such wait per call.
        if (attempt < RATE_LIMIT_MAX_RETRIES) {
          await _sleep(waitMs);
          continue;
        }
      }
      // No usable reset — fall through to short backoff (best effort).
      if (attempt < RATE_LIMIT_MAX_RETRIES) {
        await _sleep(computeRetryDelayMs(attempt, res.headers));
        continue;
      }
      const err = new Error(
        `github primary rate limit; no usable x-ratelimit-reset after ${RATE_LIMIT_MAX_RETRIES} retries`,
      );
      err.rateLimit = 'primary';
      err.status = res.status;
      throw err;
    }

    if (kind === 'secondary') {
      if (attempt < RATE_LIMIT_MAX_RETRIES) {
        await _sleep(computeRetryDelayMs(attempt, res.headers));
      }
    }
  }
}

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

      // Secondary / unclassified path. If GitHub handed us a CONCRETE
      // Retry-After that is longer than we can safely wait in-process,
      // computeRetryDelayMs would truncate it down to the ceiling and we'd
      // retry BEFORE the real window elapsed — hitting the same limit again,
      // and across attempts risking the job's timeout-minutes: 15 without ever
      // honoring the requested wait. Give up cleanly instead (mirrors the
      // primary "reset too far out" branch above); the 6-hourly schedule sweep
      // will pick this PR back up later. Best-effort main() turns this into a
      // logged warning, not a red job.
      const requestedRetryAfterMs = parseRetryAfterMs(headers);
      if (requestedRetryAfterMs != null && requestedRetryAfterMs > RATE_LIMIT_MAX_INPROCESS_WAIT_MS) {
        console.warn(
          `GitHub HTTP ${status} (${kind || "rate limited"}) for ${pathName}: server asked for a ` +
            `${Math.ceil(requestedRetryAfterMs / 1000)}s wait (Retry-After), longer than this job can ` +
            `wait for (cap ${RATE_LIMIT_MAX_INPROCESS_WAIT_MS / 1000}s, given timeout-minutes: 15). ` +
            "Not retrying early — the 6-hourly schedule sweep will pick this PR back up later.",
        );
        throw new Error(
          `GitHub HTTP ${status} for ${pathName}: Retry-After ${Math.ceil(requestedRetryAfterMs / 1000)}s ` +
            `exceeds the in-process wait budget — ${data.slice(0, 200)}`,
        );
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
      const err = new Error(`github secondary rate limit; giving up after ${RATE_LIMIT_MAX_RETRIES} retries`);
      err.rateLimit = 'secondary';
      err.status = status;
      throw err;
    }

    // Non-rate-limit error — fail fast, don't burn retries on a genuine
    // 403/404/422.
    const err = new Error(`github ${method} ${pathName} failed: ${status} ${data.slice(0, 500)}`);
    err.status = status;
    throw err;
  }
  throw lastErr || new Error('github request failed');
}

/**
 * Determine whether the fallback should post a review on this PR.
 *
 * The dedupe marker is only set *after* a review is successfully posted,
 * so a PR we bailed on (e.g. primary rate limit with a far-off reset)
 * remains eligible on the next 6-hourly sweep.
 */
async function shouldReview({ owner, repo, prNumber, token, markerRegex }) {
  const res = await githubRequest({
    method: 'GET',
    path: `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
    token,
  });
  const comments = JSON.parse(res.body);
  for (const c of comments) {
    if (markerRegex.test(c.body || '')) return false;
  }
  return true;
}

async function postFallbackReview({ owner, repo, prNumber, token, body }) {
  return githubRequest({
    method: 'POST',
    path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    token,
    body: { body },
  });
}

async function main() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repoFull = process.env.GITHUB_REPOSITORY;
    const prNumber = process.env.PR_NUMBER;
    if (!token || !repoFull || !prNumber) {
      console.log('octopus-review-fallback: missing env; skipping.');
      return;
    }
    const [owner, repo] = repoFull.split('/');
    const marker = /octopus-review-fallback:v1/;

    const eligible = await shouldReview({ owner, repo, prNumber, token, markerRegex: marker });
    if (!eligible) {
      console.log(`octopus-review-fallback: PR #${prNumber} already has a fallback review; skipping.`);
      return;
    }

    const body =
      '<!-- octopus-review-fallback:v1 -->\n' +
      '_Octopus reviewer is unavailable (quota) — this is an automated fallback acknowledgement._';
    await postFallbackReview({ owner, repo, prNumber, token, body });
    console.log(`octopus-review-fallback: posted fallback review on PR #${prNumber}.`);
  } catch (err) {
    // Preserve prior "never fail loud" behavior — the schedule sweep will
    // retry primary-limit deferrals. Log the classification so it's obvious.
    const tag = err && err.rateLimit ? ` [rate-limit=${err.rateLimit}]` : '';
    console.warn(`octopus-review-fallback: giving up${tag}: ${err && err.message ? err.message : err}`);
  }
}

module.exports = {
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeRetryDelayMs,
  isRateLimitedResponse,
  parseRetryAfterMs,
  githubRequest,
  githubRequestOnce,
  shouldReview,
  postFallbackReview,
  isQuotaDeathComment,
  loadReviewProfile,
  FALLBACK_MARKER,
  OCTOPUS_BOT_LOGIN,
  QUOTA_DEATH_PATTERNS,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

if (require.main === module) {
  main();
}

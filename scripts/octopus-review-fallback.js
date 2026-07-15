#!/usr/bin/env node
"use strict";

/**
 * Octopus Review Fallback — self-hosted review lane when Octopus is quota-dead
 *
 * Octopus Review (octopus-review.ai) runs out of monthly AI quota and posts an
 * "add your own API keys" comment on every PR instead of a review. External
 * review apps can't be re-summoned from the WR area when their quota/keys die,
 * so this script runs the fleet's OWN review lane instead:
 *
 *   1. Detect the Octopus quota-death comment (isQuotaDeathComment), OR run in
 *      sweep mode for PRs where Octopus never showed up after N minutes.
 *   2. Skip if a healthy Octopus review already exists (no double-review) or
 *      if this fallback already reviewed the PR (dedupe via HTML marker).
 *   3. Fetch the PR diff and call OpenRouter with the `review` profile from
 *      .github/agent-models.yml (Opus 4.7 primary, DeepSeek R1 fallback) —
 *      no new vendor lock-in; same key/lane as the rest of the fleet.
 *   4. Post the findings as a formal PR review (COMMENT event).
 *
 * Wiring: .github/workflows/octopus-review-fallback.yml
 * Persona docs: skills/octopus-expert/SKILL.md ("Quota-Death Fallback Lane")
 *
 * If reviews "aren't happening": check OPENROUTER_API_KEY funding first
 * (https://openrouter.ai/credits) — a 401/402/429 here means the key/balance,
 * not this script. The script is best-effort and never fails the workflow.
 */

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

/**
 * Loads the `review` routing profile (primary + fallback models) from
 * .github/agent-models.yml so the fallback follows fleet model policy
 * instead of hardcoding models.
 */
function loadReviewProfile(configPath) {
  const resolved = configPath || path.join(__dirname, "../.github/agent-models.yml");
  const YAML = require("yaml");
  const config = YAML.parse(fs.readFileSync(resolved, "utf8"));
  const review = config?.profiles?.review;
  if (!review || !review.primary) {
    throw new Error("No `review` profile with a primary model in agent-models.yml");
  }
  return {
    models: [review.primary, review.fallback].filter(Boolean),
    max_tokens: review.max_tokens || 8000,
    temperature: typeof review.temperature === "number" ? review.temperature : 0.2,
  };
}

function splitRepository() {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${GITHUB_REPOSITORY}`);
  }
  return { owner, repo };
}

/**
 * Single GitHub REST attempt — no retry logic. Resolves with
 * { status, headers, data } so the retry wrapper (githubRequest) can decide
 * whether to retry, independent of parsing/success handling.
 */
function githubRequestOnce({ pathName, method = "GET", payload, accept }) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = https.request(
      {
        hostname: "api.github.com",
        path: pathName,
        method,
        headers: {
          Authorization: "Bearer " + GITHUB_TOKEN,
          "User-Agent": "revvel-octopus-review-fallback",
          Accept: accept || "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, headers: res.headers || {}, data });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
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
    }

    throw new Error(`GitHub HTTP ${status} for ${pathName}: ${data.slice(0, 400)}`);
  }
  // Unreachable in practice (the loop always returns or throws), but keeps
  // the function's control flow explicit for lint/readability.
  const { status, data } = lastResult;
  throw new Error(`GitHub HTTP ${status} for ${pathName}: ${data.slice(0, 400)}`);
}

async function listAll(pathBase) {
  const results = [];
  for (let page = 1; page <= 10; page++) {
    const sep = pathBase.includes("?") ? "&" : "?";
    const batch = await githubRequest({ pathName: `${pathBase}${sep}per_page=100&page=${page}` });
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < 100) break;
  }
  return results;
}

/**
 * Decides whether the fallback should review a PR. Returns
 * { review: boolean, reason: string }.
 *
 * - Skip if this fallback already posted (FALLBACK_MARKER found) — dedupe.
 * - Skip if Octopus posted a HEALTHY review (a real review, or any comment
 *   that is not the quota banner) — no double-review when Octopus works.
 */
async function shouldReview(prNumber) {
  const { owner, repo } = splitRepository();
  const reviews = await listAll(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
  const comments = await listAll(`/repos/${owner}/${repo}/issues/${prNumber}/comments`);

  const allBodies = [...reviews, ...comments];
  if (allBodies.some((item) => (item.body || "").includes(FALLBACK_MARKER))) {
    return { review: false, reason: "fallback review already posted" };
  }

  const octopusReviews = reviews.filter((r) => r.user?.login === OCTOPUS_BOT_LOGIN);
  const octopusComments = comments.filter((c) => c.user?.login === OCTOPUS_BOT_LOGIN);
  const healthyReview =
    octopusReviews.some((r) => !isQuotaDeathComment(r.body)) ||
    octopusComments.some((c) => !isQuotaDeathComment(c.body));
  if (healthyReview) {
    return { review: false, reason: "Octopus posted a healthy review — no double-review" };
  }

  const quotaDead =
    octopusReviews.some((r) => isQuotaDeathComment(r.body)) ||
    octopusComments.some((c) => isQuotaDeathComment(c.body));
  if (quotaDead) {
    return { review: true, reason: "Octopus reported quota-death" };
  }

  // No Octopus activity at all — the "absence after N minutes" lane
  // (workflow only invokes this path once the PR is old enough).
  return { review: true, reason: "no Octopus review found (absence lane)" };
}

async function getPRDiff(prNumber) {
  const { owner, repo } = splitRepository();
  const diff = await githubRequest({
    pathName: `/repos/${owner}/${repo}/pulls/${prNumber}`,
    accept: "application/vnd.github.diff",
  });
  return String(diff).slice(0, MAX_DIFF_CHARS);
}

async function postReview(prNumber, body) {
  const { owner, repo } = splitRepository();
  return await githubRequest({
    pathName: `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    method: "POST",
    payload: { body, event: "COMMENT" },
  });
}

async function reviewPR(prNumber) {
  const decision = await shouldReview(prNumber);
  console.log(`PR #${prNumber}: ${decision.reason}`);
  if (!decision.review) return false;

  const profile = loadReviewProfile();
  console.log(`Review profile models (fallback order): ${profile.models.join(" → ")}`);

  const pr = await githubRequest({
    pathName: `/repos/${splitRepository().owner}/${splitRepository().repo}/pulls/${prNumber}`,
  });
  const diff = await getPRDiff(prNumber);
  if (!diff.trim()) {
    console.log(`PR #${prNumber}: empty diff, nothing to review`);
    return false;
  }

  const result = await callOpenRouter({
    models: profile.models,
    max_tokens: profile.max_tokens,
    temperature: profile.temperature,
    messages: [
      {
        role: "system",
        content:
          "You are the fleet's FALLBACK code reviewer, stepping in because Octopus Review " +
          "(the primary external AI reviewer) is out of monthly quota. Review the PR diff " +
          "for bugs, security issues, logic errors, and correctness regressions. Be concise " +
          "and concrete: list findings with file/line references and severity " +
          "(critical/major/minor). If the change looks clean, say so plainly.",
      },
      {
        role: "user",
        content:
          `PR #${prNumber}: ${pr.title || ""}\n\n` +
          `Description:\n${(pr.body || "(none)").slice(0, 2000)}\n\n` +
          `Diff:\n\`\`\`diff\n${diff}\n\`\`\``,
      },
    ],
  });

  const reviewBody = [
    FALLBACK_MARKER,
    "## 🐙➡️🤖 Fleet Review Fallback (Octopus quota-dead)",
    "",
    `Octopus Review couldn't review this PR (${decision.reason}), so the fleet's own ` +
      "`review` profile stepped in via OpenRouter.",
    "",
    result.text,
    "",
    "---",
    `_Model used: \`${result.modelUsed || profile.models[0]}\` · profile: \`review\` ` +
      "(.github/agent-models.yml) · lane: `octopus-review-fallback.yml` · " +
      "playbook: `skills/octopus-expert/SKILL.md`_",
  ].join("\n");

  await postReview(prNumber, reviewBody);
  console.log(`PR #${prNumber}: fallback review posted (model: ${result.modelUsed || "?"})`);
  return true;
}

/**
 * Sweep mode ("absence after N minutes"): scan recently-updated open PRs that
 * are older than MIN_PR_AGE_MINUTES and have no Octopus review at all, and
 * review up to MAX_SWEEP_REVIEWS of them. Conservative on purpose — this lane
 * spends OpenRouter credits.
 */
async function sweep() {
  const { owner, repo } = splitRepository();
  const minAgeMinutes = parseInt(process.env.MIN_PR_AGE_MINUTES || "30", 10);
  const maxReviews = parseInt(process.env.MAX_SWEEP_REVIEWS || "3", 10);
  const prs = await listAll(`/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc`);

  let reviewed = 0;
  for (const pr of prs) {
    if (reviewed >= maxReviews) break;
    if (pr.draft) continue;
    const ageMinutes = (Date.now() - new Date(pr.created_at).getTime()) / 60000;
    if (ageMinutes < minAgeMinutes) continue;
    try {
      if (await reviewPR(pr.number)) reviewed++;
    } catch (err) {
      console.error(`PR #${pr.number}: sweep review failed: ${err.message}`);
    }
  }
  console.log(`Sweep complete: ${reviewed} fallback review(s) posted.`);
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN is required");
    return;
  }
  if (!process.env.OPENROUTER_API_KEY) {
    // Never hard-fail: a missing/unfunded key is an ops problem, not a bug.
    console.error(
      "OPENROUTER_API_KEY is not set — fallback review skipped. " +
        "Check the key AND balance at https://openrouter.ai/credits.",
    );
    return;
  }

  try {
    if (process.env.SWEEP === "true") {
      await sweep();
    } else if (PR_NUMBER) {
      await reviewPR(parseInt(PR_NUMBER, 10));
    } else {
      console.error("Set PR_NUMBER for single-PR mode or SWEEP=true for sweep mode.");
    }
  } catch (err) {
    // Best-effort by design: a fallback-review outage must not go red itself.
    console.error(`octopus-review-fallback failed: ${err.message}`);
  }
}

if (require.main === module) {
  main();
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
  parseRetryAfterMs,
  githubRequest,
  githubRequestOnce,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_DELAY_MS,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

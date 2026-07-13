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
// observed tripping GitHub's secondary/abuse rate limit ("API rate limit
// exceeded for installation", HTTP 403) on the very first REST call of a
// run that otherwise correctly matched the quota-death comment — and
// because the whole script runs inside a top-level try/catch that never
// rethrows (by design: a fallback outage must not go red itself), that
// 403 was silently swallowed and the job still reported success, with NO
// review ever posted. Retrying with backoff turns that transient,
// installation-wide rate limit into a short wait instead of a silent
// no-op.
const RATE_LIMIT_MAX_RETRIES = parseInt(process.env.RATE_LIMIT_MAX_RETRIES || "4", 10);
const RATE_LIMIT_BASE_DELAY_MS = parseInt(process.env.RATE_LIMIT_BASE_DELAY_MS || "1500", 10);
const RATE_LIMIT_MAX_DELAY_MS = parseInt(process.env.RATE_LIMIT_MAX_DELAY_MS || "20000", 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True when a GitHub REST response looks like a rate-limit rejection worth
 * retrying: HTTP 429, or HTTP 403 whose body is GitHub's primary/secondary
 * rate-limit message (as opposed to a genuine permissions 403, which should
 * fail fast, not retry).
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
 * Computes the backoff delay (ms) before retry attempt `attempt` (1-based).
 * Prefers the server's `Retry-After` header (seconds) when present, else an
 * exponential backoff from RATE_LIMIT_BASE_DELAY_MS, capped at
 * RATE_LIMIT_MAX_DELAY_MS.
 */
function computeRetryDelayMs(headers, attempt, baseDelayMs = RATE_LIMIT_BASE_DELAY_MS) {
  const retryAfter = headers && (headers["retry-after"] || headers["Retry-After"]);
  const retryAfterSeconds = parseInt(retryAfter, 10);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, RATE_LIMIT_MAX_DELAY_MS);
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
 * Retries with backoff on rate-limit responses (see RATE_LIMIT_MAX_RETRIES
 * doc comment above) — a burst of fan-out runs sharing one installation's
 * rate-limit budget is expected and should be waited out, not treated as a
 * permanent failure.
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

    if (isRateLimitedResponse(status, data) && attempt <= RATE_LIMIT_MAX_RETRIES) {
      const delayMs = computeRetryDelayMs(headers, attempt);
      console.warn(
        `GitHub HTTP ${status} (rate limited) for ${pathName} — retry ${attempt}/${RATE_LIMIT_MAX_RETRIES} in ${delayMs}ms`,
      );
      await sleep(delayMs);
      continue;
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
  computeRetryDelayMs,
  githubRequest,
  githubRequestOnce,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_DELAY_MS,
};

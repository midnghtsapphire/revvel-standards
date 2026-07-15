#!/usr/bin/env node
"use strict";

/**
 * Dragnet CI Autofix
 *
 * When a check suite fails on a PR, this script:
 *   1. Confirms the PR is eligible (not a self-heal branch, not already handled).
 *   2. Fetches the failing job logs from GitHub Actions (up to MAX_LOG_CHARS).
 *   3. Fetches the PR diff (up to MAX_DIFF_CHARS).
 *   4. Calls OpenRouter (code_patch profile — Opus 4.8) to diagnose the root
 *      cause and produce a unified-diff patch that fixes it.
 *   5. Posts a pinned analysis comment on the PR with the root cause, proposed
 *      fix, and a link to the failing run.
 *   6. Dispatches self-heal-pr.yml (via workflow_dispatch) with the patch so
 *      the fix lands in a new PR automatically, goes through CI, and gets a
 *      code review before merging.
 *
 * Environment variables (set by dragnet-ci-autofix.yml):
 *   GITHUB_TOKEN        — read access: PRs, check runs, actions logs
 *   GH_TOKEN            — write access: post comments + trigger workflows
 *                         (must be ADMIN_GITHUB_TOKEN so dispatch fires downstream)
 *   GITHUB_REPOSITORY   — owner/repo  (e.g. midnghtsapphire/revvel-standards)
 *   PR_NUMBER           — the PR number whose checks failed
 *   CHECK_SUITE_URL     — URL to the failing check suite page (linked in comment)
 *   OPENROUTER_API_KEY  — for AI analysis via OpenRouter
 *
 * SECURITY:
 *   - All caller-supplied strings are passed through env vars — never interpolated
 *     into shell commands.
 *   - GH_TOKEN is consumed only via Authorization headers in HTTPS calls.
 *     It is never written to disk or echoed to stdout.
 *
 * LOOP PREVENTION:
 *   - Skips PRs whose head branch starts with "self-heal/".
 *   - Skips if the PR title contains "[dragnet-skip]" or "[skip-ci]".
 *   - Dedupe marker (AUTOFIX_MARKER) prevents re-running for the same PR when
 *     subsequent suites also fail after the first autofix was dispatched.
 *
 * If OPENROUTER_API_KEY is absent the script posts a plain "checks failed"
 * fallback comment and exits 0 (so the workflow job stays green).
 */

const https = require("https");
const { routedChat } = require("./openrouter-routing.js");

// ─── Environment ─────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const GH_DISPATCH_TOKEN = process.env.GH_TOKEN || GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const PR_NUMBER = parseInt(process.env.PR_NUMBER || "0", 10);
const CHECK_SUITE_URL = process.env.CHECK_SUITE_URL || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || "main";

// ─── Tuning ──────────────────────────────────────────────────────────────────

const MAX_LOG_CHARS = 8000;   // per-job log snippet sent to the model
const MAX_DIFF_CHARS = 15000; // PR diff sent to the model
const MAX_FAILED_JOBS = 3;    // only look at the first N failed jobs for brevity

// Dedupe marker — if this appears anywhere in PR comments, a previous run
// already dispatched a fix for the same PR; skip silently.
const AUTOFIX_MARKER = "<!-- dragnet-ci-autofix -->";

const GITHUB_HOST = "api.github.com";
const SELF_HEAL_WORKFLOW = "self-heal-pr.yml";

// ─── Low-level helpers ────────────────────────────────────────────────────────

function splitRepository(repo) {
  const [owner, name] = (repo || GITHUB_REPOSITORY).split("/");
  if (!owner || !name) throw new Error(`Invalid GITHUB_REPOSITORY: ${repo}`);
  return { owner, repo: name };
}

function ghHeaders(token) {
  return {
    Authorization: "Bearer " + token,
    "User-Agent": "dragnet-ci-autofix",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function requestJson({ hostname, pathName, method, headers = {}, payload }) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = https.request(
      {
        hostname,
        path: pathName,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          const status = res.statusCode || 0;
          let parsed = {};
          try { parsed = data ? JSON.parse(data) : {}; } catch (_) { /* ok */ }
          if (status < 200 || status >= 300) {
            const msg = parsed?.message || data || "unknown error";
            reject(new Error(`GitHub API HTTP ${status}: ${msg}`));
            return;
          }
          resolve(parsed);
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * GET helper — follows the exact same pattern as requestJson but for simple
 * plain-text responses (e.g. action run logs which are not JSON).
 */
function requestText({ hostname, pathName, headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path: pathName, method: "GET", headers },
      (res) => {
        // GitHub log downloads redirect to a presigned S3 URL.
        if (res.statusCode === 302 && res.headers.location) {
          const loc = new URL(res.headers.location);
          requestText({ hostname: loc.hostname, pathName: loc.pathname + loc.search, headers: {} })
            .then(resolve).catch(reject);
          return;
        }
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if ((res.statusCode || 0) >= 400) {
            reject(new Error(`HTTP ${res.statusCode} fetching log`));
            return;
          }
          resolve(data);
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────

async function getPR(prNumber) {
  const { owner, repo } = splitRepository();
  return requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/pulls/${prNumber}`,
    method: "GET",
    headers: ghHeaders(GITHUB_TOKEN),
  });
}

async function getPRDiff(prNumber) {
  const { owner, repo } = splitRepository();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: GITHUB_HOST,
        path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
        method: "GET",
        headers: {
          ...ghHeaders(GITHUB_TOKEN),
          Accept: "application/vnd.github.diff",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function getCheckRunsForPR(prNumber) {
  const pr = await getPR(prNumber);
  const headSha = pr.head?.sha;
  if (!headSha) return [];
  const { owner, repo } = splitRepository();
  const result = await requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/commits/${headSha}/check-runs?per_page=100`,
    method: "GET",
    headers: ghHeaders(GITHUB_TOKEN),
  });
  return result.check_runs || [];
}

/**
 * Fetches the log text for a single Actions job, trimmed to MAX_LOG_CHARS
 * (last N chars — the tail is where failures surface).
 *
 * If log fetching fails for any reason we return an empty string rather than
 * throwing, so a transient log-access error doesn't abort the whole run.
 */
async function getJobLog(jobId) {
  const { owner, repo } = splitRepository();
  try {
    // Step 1: get the redirect URL for the log download.
    const logUrl = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: GITHUB_HOST,
          path: `/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`,
          method: "GET",
          headers: ghHeaders(GITHUB_TOKEN),
        },
        (res) => {
          if (res.statusCode === 302 && res.headers.location) {
            resolve(res.headers.location);
          } else if (res.statusCode === 200) {
            // Some installations return the log directly.
            let buf = "";
            res.on("data", (c) => { buf += c; });
            res.on("end", () => resolve(`data:${buf}`));
          } else {
            res.resume(); // drain
            reject(new Error(`Log redirect returned ${res.statusCode}`));
          }
        },
      );
      req.on("error", reject);
      req.end();
    });

    let raw;
    if (logUrl.startsWith("data:")) {
      raw = logUrl.slice(5);
    } else {
      const u = new URL(logUrl);
      raw = await requestText({
        hostname: u.hostname,
        pathName: u.pathname + u.search,
      });
    }
    // Return the TAIL — failures are at the end of the log.
    if (raw.length > MAX_LOG_CHARS) {
      return `…(truncated — showing last ${MAX_LOG_CHARS} chars)\n` + raw.slice(-MAX_LOG_CHARS);
    }
    return raw;
  } catch (err) {
    console.warn(`⚠️  Could not fetch log for job ${jobId}: ${err.message}`);
    return "";
  }
}

async function listPRComments(prNumber) {
  const { owner, repo } = splitRepository();
  const result = await requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
    method: "GET",
    headers: ghHeaders(GITHUB_TOKEN),
  });
  return Array.isArray(result) ? result : [];
}

async function postComment(prNumber, body) {
  const { owner, repo } = splitRepository();
  return requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    method: "POST",
    headers: ghHeaders(GH_DISPATCH_TOKEN),
    payload: { body },
  });
}

async function updateComment(commentId, body) {
  const { owner, repo } = splitRepository();
  return requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/issues/comments/${commentId}`,
    method: "PATCH",
    headers: ghHeaders(GH_DISPATCH_TOKEN),
    payload: { body },
  });
}

/**
 * Trigger self-heal-pr.yml via workflow_dispatch.
 * Requires GH_DISPATCH_TOKEN to have repo:write scope so the dispatch fires
 * downstream workflows (GITHUB_TOKEN cannot do this — see CLAUDE.md §3).
 */
async function dispatchSelfHealPR({ fixDescription, fixType, patchContent, branchSuffix, issueNumber }) {
  const { owner, repo } = splitRepository();
  return requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(SELF_HEAL_WORKFLOW)}/dispatches`,
    method: "POST",
    headers: ghHeaders(GH_DISPATCH_TOKEN),
    payload: {
      ref: DEFAULT_BRANCH,
      inputs: {
        fix_description: String(fixDescription).slice(0, 255),
        fix_type: fixType || "workflow",
        patch_content: patchContent || "",
        branch_suffix: branchSuffix || "ci-autofix",
        issue_number: issueNumber ? String(issueNumber) : "",
      },
    },
  });
}

// ─── AI analysis ─────────────────────────────────────────────────────────────

/**
 * Build the analysis prompt and call OpenRouter.
 * Returns { rootCause, patch } where patch may be empty if the model cannot
 * produce one (e.g. build environment misconfiguration outside the diff).
 */
async function analyzeFailure({ prTitle, prDiff, failedJobs }) {
  const jobSummaries = failedJobs
    .map((j) => `### Job: ${j.name}\nConclusion: ${j.conclusion}\n\n\`\`\`\n${j.log}\n\`\`\``)
    .join("\n\n");

  const trimmedDiff = prDiff.length > MAX_DIFF_CHARS
    ? prDiff.slice(0, MAX_DIFF_CHARS) + "\n…(diff truncated)"
    : prDiff;

  const systemPrompt = [
    "You are the Dragnet CI Autofix agent for the revvel-standards monorepo.",
    "Your only job: diagnose why the CI checks failed and produce a minimal, correct patch.",
    "",
    "Output format (strict — nothing before or after):",
    "## Root Cause",
    "<2–4 sentence plain-English explanation of WHY the checks failed>",
    "",
    "## Fix",
    "<one-paragraph description of what the fix does and which files it touches>",
    "",
    "## Patch",
    "```diff",
    "<valid unified diff — or leave blank if the failure cannot be fixed by a code change in the PR>",
    "```",
    "",
    "Rules:",
    "- The patch must apply cleanly to the files shown in the PR diff.",
    "- Only touch lines that are directly responsible for the failure.",
    "- Do not add unrelated refactors, comments, or style fixes.",
    "- If the failure is a transient infra issue (network, runner out-of-disk, etc.) output an empty patch section.",
    "- Do not include secrets, credentials, or tokens.",
    "- Use standard unified diff headers (--- a/file, +++ b/file, @@ ... @@).",
  ].join("\n");

  const userPrompt = [
    `PR title: ${prTitle}`,
    "",
    "## Failing job logs",
    jobSummaries,
    "",
    "## PR diff (what changed)",
    trimmedDiff || "(diff not available)",
  ].join("\n");

  // Use code_patch profile: Opus 4.8 primary, Opus 4.7 fallback — see agent-models.yml.
  const response = await routedChat({
    profile: "code_patch",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 8000,
    temperature: 0.2,
    apiKey: OPENROUTER_API_KEY,
    appTitle: "Dragnet CI Autofix",
    httpReferer: `https://github.com/${GITHUB_REPOSITORY}`,
  });

  const rootCauseMatch = response.match(/##\s*Root Cause\s*\n([\s\S]*?)(?=##\s*Fix|$)/i);
  const patchMatch = response.match(/```diff\s*\n([\s\S]*?)```/i);

  return {
    rootCause: rootCauseMatch ? rootCauseMatch[1].trim() : response.slice(0, 600).trim(),
    patch: patchMatch ? patchMatch[1].trim() : "",
    fullResponse: response,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!PR_NUMBER) {
    console.log("PR_NUMBER not set — nothing to do.");
    process.exit(0);
  }

  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN is required.");
    process.exit(1);
  }

  console.log(`\n🔍 Dragnet CI Autofix — PR #${PR_NUMBER} in ${GITHUB_REPOSITORY}`);

  // ── Fetch PR metadata ──────────────────────────────────────────────────────
  let pr;
  try {
    pr = await getPR(PR_NUMBER);
  } catch (err) {
    console.error(`Could not fetch PR #${PR_NUMBER}: ${err.message}`);
    process.exit(1);
  }

  const headBranch = pr.head?.ref || "";
  const prTitle = pr.title || `PR #${PR_NUMBER}`;

  // Loop prevention: skip self-heal PRs to avoid infinite fix cycles.
  if (headBranch.startsWith("self-heal/")) {
    console.log(`Skipping self-heal branch (${headBranch}) — loop prevention.`);
    process.exit(0);
  }

  // Skip-signal in title.
  if (prTitle.includes("[dragnet-skip]") || prTitle.includes("[skip-ci]")) {
    console.log(`Skipping — PR title contains skip signal.`);
    process.exit(0);
  }

  // ── Dedupe: skip if we already handled this PR ─────────────────────────────
  let existingCommentId = null;
  try {
    const comments = await listPRComments(PR_NUMBER);
    const existing = comments.find((c) => c.body && c.body.includes(AUTOFIX_MARKER));
    if (existing) {
      // Update the existing comment to reflect the latest run rather than
      // posting a duplicate. Store the id for the update step below.
      existingCommentId = existing.id;
      console.log(`Existing autofix comment found (id: ${existingCommentId}) — will update in place.`);
    }
  } catch (err) {
    console.warn(`Could not list PR comments: ${err.message}`);
  }

  // ── Collect failing check runs ─────────────────────────────────────────────
  let failedJobs = [];
  try {
    const checkRuns = await getCheckRunsForPR(PR_NUMBER);
    const failed = checkRuns
      .filter((cr) => cr.conclusion === "failure" || cr.conclusion === "timed_out")
      .slice(0, MAX_FAILED_JOBS);

    console.log(`Found ${failed.length} failed check run(s).`);

    for (const cr of failed) {
      // Check runs backed by Actions jobs expose a details_url containing
      // the job id: .../actions/runs/<run_id>/jobs/<job_id>
      const jobIdMatch = (cr.details_url || "").match(/\/jobs\/(\d+)/);
      const log = jobIdMatch ? await getJobLog(jobIdMatch[1]) : "";
      failedJobs.push({ name: cr.name, conclusion: cr.conclusion, log });
    }
  } catch (err) {
    console.warn(`Could not fetch check runs: ${err.message}`);
  }

  if (failedJobs.length === 0) {
    console.log("No failed check runs found — nothing to fix.");
    process.exit(0);
  }

  // ── Fetch PR diff ──────────────────────────────────────────────────────────
  let prDiff = "";
  try {
    prDiff = await getPRDiff(PR_NUMBER);
  } catch (err) {
    console.warn(`Could not fetch PR diff: ${err.message}`);
  }

  // ── Post "working on it" placeholder comment ───────────────────────────────
  const workingBody = [
    AUTOFIX_MARKER,
    "## 🤖 Dragnet CI Autofix — Analyzing failure…",
    "",
    `**PR:** #${PR_NUMBER} — ${prTitle}`,
    `**Failed jobs:** ${failedJobs.map((j) => `\`${j.name}\``).join(", ")}`,
    CHECK_SUITE_URL ? `**Check suite:** ${CHECK_SUITE_URL}` : "",
    "",
    "_Analysis in progress — this comment will be updated with the root cause and fix._",
  ].filter(Boolean).join("\n");

  try {
    if (existingCommentId) {
      await updateComment(existingCommentId, workingBody);
    } else {
      const newComment = await postComment(PR_NUMBER, workingBody);
      existingCommentId = newComment.id;
    }
  } catch (err) {
    console.warn(`Could not post placeholder comment: ${err.message}`);
  }

  // ── AI analysis ─────────────────────────────────────────────────────────────
  if (!OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY not set — skipping AI analysis; posting fallback comment.");
    const fallbackBody = [
      AUTOFIX_MARKER,
      "## ❌ CI Checks Failed",
      "",
      `**PR:** #${PR_NUMBER} — ${prTitle}`,
      `**Failed jobs:** ${failedJobs.map((j) => `\`${j.name}\``).join(", ")}`,
      CHECK_SUITE_URL ? `**Logs:** ${CHECK_SUITE_URL}` : "",
      "",
      "_AI analysis unavailable (OPENROUTER_API_KEY not configured). Review the logs above manually._",
    ].filter(Boolean).join("\n");
    try {
      if (existingCommentId) await updateComment(existingCommentId, fallbackBody);
      else await postComment(PR_NUMBER, fallbackBody);
    } catch (_) { /* best-effort */ }
    process.exit(0);
  }

  let analysis;
  try {
    analysis = await analyzeFailure({ prTitle, prDiff, failedJobs });
    console.log(`\n📋 Root cause identified:\n${analysis.rootCause}\n`);
    console.log(`\n🔧 Patch produced: ${analysis.patch ? `${analysis.patch.split("\n").length} lines` : "(none)"}`);
  } catch (err) {
    console.error(`AI analysis failed: ${err.message}`);
    const errorBody = [
      AUTOFIX_MARKER,
      "## ❌ CI Checks Failed — Analysis Error",
      "",
      `**PR:** #${PR_NUMBER} — ${prTitle}`,
      `**Failed jobs:** ${failedJobs.map((j) => `\`${j.name}\``).join(", ")}`,
      "",
      `_AI analysis encountered an error: ${err.message}_`,
      "_Please review the failing check logs manually._",
      CHECK_SUITE_URL ? `\n**Logs:** ${CHECK_SUITE_URL}` : "",
    ].filter(Boolean).join("\n");
    try {
      if (existingCommentId) await updateComment(existingCommentId, errorBody);
      else await postComment(PR_NUMBER, errorBody);
    } catch (_) { /* best-effort */ }
    process.exit(0); // non-fatal so the workflow stays green
  }

  // ── Post final analysis comment ───────────────────────────────────────────
  const hasPatch = Boolean(analysis.patch && analysis.patch.trim().length > 10);
  const finalBody = [
    AUTOFIX_MARKER,
    `## ${hasPatch ? "🔧" : "🔍"} Dragnet CI Autofix — ${hasPatch ? "Fix dispatched" : "Analysis complete"}`,
    "",
    `**PR:** #${PR_NUMBER} — ${prTitle}`,
    `**Failed jobs:** ${failedJobs.map((j) => `\`${j.name}\``).join(", ")}`,
    CHECK_SUITE_URL ? `**Check suite:** ${CHECK_SUITE_URL}` : "",
    "",
    "### Root Cause",
    "",
    analysis.rootCause,
    "",
    hasPatch
      ? [
          "### Fix",
          "",
          "A self-heal PR has been dispatched to implement the fix automatically. It will",
          "appear shortly at `self-heal/…` and will go through CI + code review before merging.",
          "",
          "<details><summary>View proposed patch</summary>",
          "",
          "```diff",
          analysis.patch,
          "```",
          "",
          "</details>",
        ].join("\n")
      : [
          "### Next Step",
          "",
          "The failure does not appear to be addressable by a code-only patch (e.g. transient",
          "infra issue or external service outage). Please review the logs above and re-run",
          "the failing checks once the underlying issue is resolved.",
        ].join("\n"),
    "",
    "_Automated by [Dragnet CI Autofix](.github/workflows/dragnet-ci-autofix.yml)_",
  ].filter((l) => l !== null && l !== undefined).join("\n");

  try {
    if (existingCommentId) {
      await updateComment(existingCommentId, finalBody);
    } else {
      await postComment(PR_NUMBER, finalBody);
    }
    console.log("✅ Analysis comment posted on PR.");
  } catch (err) {
    console.warn(`Could not post analysis comment: ${err.message}`);
  }

  // ── Dispatch self-heal-pr if we have a patch ──────────────────────────────
  if (!hasPatch) {
    console.log("No patch produced — skipping self-heal dispatch.");
    process.exit(0);
  }

  const fixDescription = `Fix CI failure on PR #${PR_NUMBER}: ${prTitle.slice(0, 100)}`;
  try {
    await dispatchSelfHealPR({
      fixDescription,
      fixType: "workflow",
      patchContent: analysis.patch,
      branchSuffix: `ci-autofix-pr${PR_NUMBER}`,
      issueNumber: "",
    });
    console.log(`✅ Dispatched self-heal-pr.yml to implement the fix.`);
  } catch (err) {
    // Log but don't exit non-zero — the analysis comment is already posted and
    // dispatch failure is transient (token scope issue, rate-limit, etc.).
    console.error(`Could not dispatch self-heal-pr.yml: ${err.message}`);
    console.error("Check that GH_TOKEN has repo:write scope (ADMIN_GITHUB_TOKEN).");
  }

  console.log("\n✅ Dragnet CI Autofix complete.");
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});

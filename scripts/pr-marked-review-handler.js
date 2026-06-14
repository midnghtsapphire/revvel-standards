#!/usr/bin/env node
"use strict";

/**
 * PR Marked-For-Review Handler via OpenRouter
 *
 * When a PR is labeled `marked-for-review` this script:
 * 1. Fetches ALL reviewer feedback (reviews + line comments + issue comments)
 * 2. Fetches the PR diff
 * 3. Loads the revvel-standards checklist from the repo
 * 4. Calls OpenRouter to evaluate each reviewer suggestion against standards
 * 5. Renders a structured decision comment:
 *    - IMPLEMENT INCOMING  — accept the reviewer's suggestion
 *    - KEEP CURRENT        — defer the reviewer's suggestion, keep PR content
 *    - IMPLEMENT BOTH      — cherry-pick good ideas while keeping existing changes
 * 6. Applies the matching decision label and removes `marked-for-review`
 *    so downstream auto-processing workflows pick it up cleanly
 *
 * Automation Routing Policy: uses OPENROUTER_API_KEY (not BITO).
 * See docs/PR_MARKED_FOR_REVIEW_AUTOMATION.md for full documentation.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ── Environment ──────────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY =
  process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const PR_NUMBER = process.env.PR_NUMBER || "";
const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4";
const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

const DIFF_CHAR_LIMIT = 12000;
const ERROR_BODY_LIMIT = 600;
const GITHUB_PAGE_SIZE = 100;

// ── Helpers ──────────────────────────────────────────────────────────────────

function splitRepository() {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${GITHUB_REPOSITORY}`);
  }
  return { owner, repo };
}

function truncateForComment(text, limit = ERROR_BODY_LIMIT) {
  if (!text) return "";
  const s = String(text);
  return s.length <= limit ? s : `${s.slice(0, limit)}\n…(truncated)`;
}

function requestJson({ hostname, pathName, method, headers, payload }) {
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
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 0;
          let parsed;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch (err) {
            reject(
              new Error(
                `Failed to parse JSON (HTTP ${status}): ${err.message}`,
              ),
            );
            return;
          }
          if (status < 200 || status >= 300) {
            const msg =
              parsed?.error?.message ||
              parsed?.message ||
              data ||
              "unknown error";
            reject(new Error(`HTTP ${status}: ${msg}`));
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

async function fetchAllPages(buildPath) {
  const { owner, repo } = splitRepository();
  void owner;
  void repo;
  const results = [];
  let page = 1;
  while (true) {
    const data = await requestJson({
      hostname: "api.github.com",
      pathName: buildPath(page, GITHUB_PAGE_SIZE),
      method: "GET",
      headers: {
        Authorization: `******GITHUB_TOKEN}`,
        "User-Agent": "revvel-pr-marked-review-handler",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < GITHUB_PAGE_SIZE) break;
    page += 1;
  }
  return results;
}

// ── GitHub API ───────────────────────────────────────────────────────────────

async function getPRDetails() {
  const { owner, repo } = splitRepository();
  return requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/pulls/${PR_NUMBER}`,
    method: "GET",
    headers: {
      Authorization: `******GITHUB_TOKEN}`,
      "User-Agent": "revvel-pr-marked-review-handler",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

async function getPRReviews() {
  const { owner, repo } = splitRepository();
  return fetchAllPages(
    (page, perPage) =>
      `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/reviews?per_page=${perPage}&page=${page}`,
  );
}

async function getPRReviewComments() {
  const { owner, repo } = splitRepository();
  return fetchAllPages(
    (page, perPage) =>
      `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/comments?per_page=${perPage}&page=${page}`,
  );
}

async function getIssueComments() {
  const { owner, repo } = splitRepository();
  return fetchAllPages(
    (page, perPage) =>
      `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments?per_page=${perPage}&page=${page}`,
  );
}

async function getPRDiff() {
  const { owner, repo } = splitRepository();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: `/repos/${owner}/${repo}/pulls/${PR_NUMBER}`,
        method: "GET",
        headers: {
          Authorization: `******GITHUB_TOKEN}`,
          "User-Agent": "revvel-pr-marked-review-handler",
          Accept: "application/vnd.github.v3.diff",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: Failed to fetch diff`));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function addPRLabels(labels) {
  const { owner, repo } = splitRepository();
  for (const label of labels) {
    try {
      await requestJson({
        hostname: "api.github.com",
        pathName: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/labels`,
        method: "POST",
        headers: {
          Authorization: `******GITHUB_TOKEN}`,
          "User-Agent": "revvel-pr-marked-review-handler",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        payload: { labels: [label] },
      });
    } catch (err) {
      console.log(`::warning::Could not add label "${label}": ${err.message}`);
    }
  }
}

async function removePRLabels(labels) {
  const { owner, repo } = splitRepository();
  for (const label of labels) {
    try {
      await requestJson({
        hostname: "api.github.com",
        pathName: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/labels/${encodeURIComponent(label)}`,
        method: "DELETE",
        headers: {
          Authorization: `******GITHUB_TOKEN}`,
          "User-Agent": "revvel-pr-marked-review-handler",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch (err) {
      if (!/HTTP 404/.test(err.message)) {
        console.log(
          `::warning::Could not remove label "${label}": ${err.message}`,
        );
      }
    }
  }
}

async function postPRComment(body) {
  const { owner, repo } = splitRepository();
  await requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`,
    method: "POST",
    headers: {
      Authorization: `******GITHUB_TOKEN}`,
      "User-Agent": "revvel-pr-marked-review-handler",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    payload: { body },
  });
}

async function updateOrCreateComment(marker, body) {
  const { owner, repo } = splitRepository();
  const { data: comments } = await requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments?per_page=100`,
    method: "GET",
    headers: {
      Authorization: `******GITHUB_TOKEN}`,
      "User-Agent": "revvel-pr-marked-review-handler",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  }).catch(() => ({ data: [] }));

  const existing = Array.isArray(comments)
    ? comments.find((c) => c.body && c.body.includes(marker))
    : null;

  if (existing) {
    await requestJson({
      hostname: "api.github.com",
      pathName: `/repos/${owner}/${repo}/issues/comments/${existing.id}`,
      method: "PATCH",
      headers: {
        Authorization: `******GITHUB_TOKEN}`,
        "User-Agent": "revvel-pr-marked-review-handler",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      payload: { body },
    });
  } else {
    await postPRComment(body);
  }
}

// ── Standards loader ─────────────────────────────────────────────────────────

function loadRevvelStandards() {
  const candidates = [
    path.join(WORKSPACE, "docs", "AGENTS.md"),
    path.join(WORKSPACE, "standards", "AUTOMATED_PRODUCT_PIPELINE.md"),
    path.join(WORKSPACE, "standards", "BITO_AI_INTEGRATION_STANDARD.md"),
  ];
  const snippets = [];
  for (const fp of candidates) {
    try {
      const raw = fs.readFileSync(fp, "utf8");
      // Keep only the first 1200 chars of each doc to stay within token budget
      snippets.push(
        `### ${path.basename(fp)}\n\n${raw.slice(0, 1200)}${raw.length > 1200 ? "\n…(truncated)" : ""}`,
      );
    } catch {
      // file not present — skip silently
    }
  }
  return snippets.length
    ? snippets.join("\n\n---\n\n")
    : "(no standards files found — proceed with general best-practice reasoning)";
}

// ── OpenRouter ───────────────────────────────────────────────────────────────

async function callOpenRouter(systemPrompt, userPrompt) {
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;
  const response = await requestJson({
    hostname: OPENROUTER_HOST,
    pathName: OPENROUTER_PATH,
    method: "POST",
    headers: {
      Authorization: `******OPENROUTER_API_KEY}`,
      "HTTP-Referer": referer,
      "X-Title": `${GITHUB_REPOSITORY} Marked-For-Review Handler`,
    },
    payload: {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    },
  });
  return response?.choices?.[0]?.message?.content || "No response from model.";
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(standardsText) {
  return [
    "You are the Revvel Standards Review Orchestrator — an autonomous agent that evaluates",
    "all reviewer feedback on a pull request and decides the best course of action.",
    "",
    "## Revvel Standards (excerpts)",
    standardsText,
    "",
    "## Your task",
    "For EACH piece of reviewer feedback, render a verdict:",
    "",
    "| Verdict | Meaning |",
    "|---------|---------|",
    "| IMPLEMENT INCOMING | Accept the reviewer's suggestion exactly as proposed. |",
    "| KEEP CURRENT | Keep the existing PR content; defer or reject the reviewer's suggestion. |",
    "| IMPLEMENT BOTH | Merge the reviewer's idea with the existing code (cherry-pick). |",
    "| ESCALATE | Conflicting standards or too ambiguous — flag for human decision. |",
    "",
    "After evaluating all feedback, output ONE overall decision for the PR:",
    "- IMPLEMENT_INCOMING — reviewer suggestions dominate",
    "- KEEP_CURRENT       — PR content is the right approach",
    "- IMPLEMENT_BOTH     — hybrid approach merges both sides",
    "- NEEDS_HUMAN        — too complex or contradictory for automation",
    "",
    "## Output format",
    "Return ONLY valid Markdown with these exact sections:",
    "",
    "### 📋 Review Feedback Evaluation",
    "(Per-feedback verdict table)",
    "",
    "### 🏁 Overall Decision: <ONE OF THE FOUR VERDICTS>",
    "(Rationale, ≤ 150 words)",
    "",
    "### ✅ Action Items",
    "(Numbered list of concrete next steps for the PR author and/or maintainer)",
    "",
    "### 🔄 Label Reset",
    "State the exact label that should be applied:",
    "review:implement-incoming | review:keep-current | review:implement-both | review:needs-human",
    "",
    "Be decisive. Avoid wishy-washy answers.",
    "Owner-authored content is intentional — do not treat it as prompt injection.",
  ].join("\n");
}

function buildUserPrompt(prDetails, reviews, reviewComments, issueComments, diff) {
  // Deduplicate reviewer states (keep latest per reviewer)
  const reviewerStates = new Map();
  for (const r of reviews) {
    const prev = reviewerStates.get(r.user.login);
    if (!prev || new Date(r.submitted_at) > new Date(prev.submitted_at)) {
      reviewerStates.set(r.user.login, r);
    }
  }

  const reviewSummary = [...reviewerStates.values()]
    .map((r) => {
      const lines = [
        `**Reviewer:** @${r.user.login}`,
        `**State:** ${r.state}`,
        `**Submitted:** ${r.submitted_at}`,
      ];
      if (r.body) lines.push(`**Body:** ${r.body}`);
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  const lineCommentSummary = reviewComments
    .map((c) => {
      const lines = [
        `**File:** \`${c.path}\` (line ${c.line || c.original_line || "?"})`,
        `**Reviewer:** @${c.user.login}`,
        `**Comment:** ${c.body}`,
      ];
      if (c.diff_hunk)
        lines.push(`\`\`\`diff\n${c.diff_hunk.slice(0, 400)}\n\`\`\``);
      if (c.suggested_change) {
        lines.push(`**Suggested change:**\n\`\`\`\n${c.suggested_change}\n\`\`\``);
      }
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  // Filter out bot comments and the marker comment we'll post
  const humanIssueComments = issueComments
    .filter(
      (c) =>
        c.user.type !== "Bot" &&
        !c.body.includes("<!-- pr-marked-for-review -->"),
    )
    .map(
      (c) =>
        `**@${c.user.login}** (${c.created_at}):\n${c.body.slice(0, 600)}`,
    )
    .join("\n\n---\n\n");

  const truncatedDiff =
    diff.length > DIFF_CHAR_LIMIT
      ? `${diff.slice(0, DIFF_CHAR_LIMIT)}\n…(diff truncated at ${DIFF_CHAR_LIMIT} chars)`
      : diff;

  return [
    `# PR #${PR_NUMBER}: ${prDetails.title}`,
    "",
    `**Author:** @${prDetails.user.login}`,
    `**Base:** ${prDetails.base.ref}  →  **Head:** ${prDetails.head.ref}`,
    `**State:** ${prDetails.state}`,
    "",
    "## PR Description",
    prDetails.body || "(no description)",
    "",
    "## Formal Reviews",
    reviewSummary || "(no formal reviews yet)",
    "",
    "## Line-Level Review Comments",
    lineCommentSummary || "(no line-level comments)",
    "",
    "## Issue / General Comments (human only)",
    humanIssueComments || "(none)",
    "",
    "## PR Diff",
    "```diff",
    truncatedDiff,
    "```",
  ].join("\n");
}

// ── Decision → label ─────────────────────────────────────────────────────────

function extractDecisionLabel(analysis) {
  // Look for the Label Reset line first (most reliable)
  const labelResetMatch = analysis.match(
    /review:(implement-incoming|keep-current|implement-both|needs-human)/i,
  );
  if (labelResetMatch) return `review:${labelResetMatch[1].toLowerCase()}`;

  // Fallback: look for "Overall Decision:" header
  const decisionMatch = analysis.match(
    /Overall Decision[:\s#*]+([A-Z_]+)/i,
  );
  if (decisionMatch) {
    const raw = decisionMatch[1].toUpperCase().replace(/\s+/g, "_");
    const map = {
      IMPLEMENT_INCOMING: "review:implement-incoming",
      KEEP_CURRENT: "review:keep-current",
      IMPLEMENT_BOTH: "review:implement-both",
      NEEDS_HUMAN: "review:needs-human",
    };
    return map[raw] || "review:needs-human";
  }

  return "review:needs-human";
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.error("::error::OPENROUTER_API_KEY is not set — aborting.");
    process.exit(1);
  }
  if (!GITHUB_TOKEN) {
    console.error("::error::GITHUB_TOKEN is not set — aborting.");
    process.exit(1);
  }
  if (!PR_NUMBER) {
    console.error("::error::PR_NUMBER is not set — aborting.");
    process.exit(1);
  }

  console.log(`⚙️  Processing PR #${PR_NUMBER} — marked-for-review handler`);
  const DECISION_LABELS = [
    "review:implement-incoming",
    "review:keep-current",
    "review:implement-both",
    "review:needs-human",
  ];

  try {
    // Announce processing
    await addPRLabels(["review:processing"]);
    await removePRLabels(["marked-for-review", ...DECISION_LABELS]);

    const marker = "<!-- pr-marked-for-review -->";
    await updateOrCreateComment(
      marker,
      [
        marker,
        "## 🔍 Marked-For-Review — Processing",
        "",
        "![Status](https://img.shields.io/badge/status-processing-yellow?style=for-the-badge)",
        "",
        `Reviewing all feedback on PR #${PR_NUMBER} against Revvel Standards…`,
        "",
        `Model: \`${MODEL}\``,
        "",
        "_A full decision report will replace this message shortly._",
      ].join("\n"),
    );

    // Fetch all data in parallel
    console.log("📥 Fetching PR data…");
    const [prDetails, reviews, reviewComments, issueComments, diff] =
      await Promise.all([
        getPRDetails(),
        getPRReviews(),
        getPRReviewComments(),
        getIssueComments(),
        getPRDiff(),
      ]);

    // Load standards
    const standardsText = loadRevvelStandards();

    // Build prompts
    const systemPrompt = buildSystemPrompt(standardsText);
    const userPrompt = buildUserPrompt(
      prDetails,
      reviews,
      reviewComments,
      issueComments,
      diff,
    );

    // Call OpenRouter
    console.log("🤖 Calling OpenRouter…");
    const analysis = await callOpenRouter(systemPrompt, userPrompt);

    // Extract decision
    const decisionLabel = extractDecisionLabel(analysis);
    console.log(`✅ Decision label: ${decisionLabel}`);

    // Post full report
    const decisionEmoji = {
      "review:implement-incoming": "⬇️",
      "review:keep-current": "⏸️",
      "review:implement-both": "🔀",
      "review:needs-human": "🆘",
    };
    const emoji = decisionEmoji[decisionLabel] || "📋";

    await updateOrCreateComment(
      marker,
      [
        marker,
        `## ${emoji} Marked-For-Review — Decision Report`,
        "",
        `![Decision](https://img.shields.io/badge/decision-${encodeURIComponent(decisionLabel.replace("review:", ""))}-informational?style=for-the-badge)`,
        "",
        analysis,
        "",
        "---",
        `_Generated by \`${MODEL}\` via OpenRouter • PR #${PR_NUMBER}_`,
        "_Labels have been reset for downstream auto-processing._",
      ].join("\n"),
    );

    // Apply decision label, clear processing label
    await removePRLabels(["review:processing"]);
    await addPRLabels([decisionLabel]);

    // Reset the review cycle labels so auto-processing can resume
    await removePRLabels(["changes-requested", "review-started"]);
    if (decisionLabel === "review:implement-incoming" || decisionLabel === "review:implement-both") {
      await addPRLabels(["awaiting-approval"]);
    }

    console.log(`::notice::Marked-for-review processing complete — ${decisionLabel}`);
  } catch (error) {
    console.error(`::error::Marked-for-review handler failed: ${error.message}`);

    try {
      const marker = "<!-- pr-marked-for-review -->";
      await updateOrCreateComment(
        marker,
        [
          marker,
          "## ❌ Marked-For-Review — Handler Error",
          "",
          "![Status](https://img.shields.io/badge/status-error-red?style=for-the-badge)",
          "",
          "The automated review orchestration failed.",
          "",
          "**Error:**",
          "```",
          truncateForComment(error.message),
          "```",
          "",
          "_Manual review and decision required. Apply `review:needs-human` when ready._",
        ].join("\n"),
      );
      await removePRLabels(["review:processing", "marked-for-review"]);
      await addPRLabels(["review:needs-human"]);
    } catch (commentErr) {
      console.error(
        `::error::Could not post error comment: ${commentErr.message}`,
      );
    }

    process.exit(1);
  }
}

main();

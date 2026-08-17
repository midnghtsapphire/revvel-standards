#!/usr/bin/env node
"use strict";

/**
 * PR Review Request Handler via OpenRouter
 * 
 * When a PR receives "changes-requested" review status, this script:
 * 1. Fetches all review comments and feedback
 * 2. Analyzes the PR diff and context
 * 3. Calls OpenRouter to generate fixes
 * 4. Posts analysis and recommendations
 * 5. Updates PR labels and status
 * 
 * Implements the Automation Routing Policy (OpenRouter via OPENROUTER_API_KEY).
 * See docs/PR_REVIEW_REQUEST_AUTOMATION.md for full process documentation.
 */

const https = require("https");

// Environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const PR_NUMBER = process.env.PR_NUMBER || "";
const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4";

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

// Error handling constants
const ERROR_BODY_LIMIT = 600;

// GitHub REST API pagination — use the maximum page size to minimize requests
const GITHUB_PAGE_SIZE = 100;

function splitRepository() {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${GITHUB_REPOSITORY}`);
  }
  return { owner, repo };
}

async function fetchAllPages(buildPath) {
  const results = [];
  let page = 1;
  // Loop until a page returns fewer than the requested page size, indicating the last page
  while (true) {
    const data = await requestJson({
      hostname: "api.github.com",
      pathName: buildPath(page, GITHUB_PAGE_SIZE),
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "revvel-pr-review-request-handler",
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

function truncateForComment(text, limit = ERROR_BODY_LIMIT) {
  if (!text) return "";
  const str = String(text);
  if (str.length <= limit) return str;
  return `${str.slice(0, limit)}\n…(truncated)`;
}

/**
 * Makes an HTTPS request and returns parsed JSON
 */
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
          } catch (error) {
            reject(new Error(`Failed to parse response JSON (${status}): ${error.message}`));
            return;
          }
          if (status < 200 || status >= 300) {
            const message = parsed?.error?.message || parsed?.message || data || "unknown error";
            reject(new Error(`HTTP ${status}: ${message}`));
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
 * Fetches PR details from GitHub API
 */
async function getPRDetails() {
  const { owner, repo } = splitRepository();
  return await requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/pulls/${PR_NUMBER}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "revvel-pr-review-request-handler",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/**
 * Fetches all reviews for the PR (paginated)
 */
async function getPRReviews() {
  const { owner, repo } = splitRepository();
  return await fetchAllPages(
    (page, perPage) =>
      `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/reviews?per_page=${perPage}&page=${page}`,
  );
}

/**
 * Fetches review comments (line-level comments) for the PR (paginated)
 */
async function getPRReviewComments() {
  const { owner, repo } = splitRepository();
  return await fetchAllPages(
    (page, perPage) =>
      `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/comments?per_page=${perPage}&page=${page}`,
  );
}

/**
 * Fetches the PR diff
 */
async function getPRDiff() {
  const { owner, repo } = splitRepository();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: `/repos/${owner}/${repo}/pulls/${PR_NUMBER}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "revvel-pr-review-request-handler",
          Accept: "application/vnd.github.v3.diff",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
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

/**
 * Calls OpenRouter API with PR context and review feedback
 */
async function callOpenRouter(systemPrompt, userPrompt) {
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;
  const response = await requestJson({
    hostname: OPENROUTER_HOST,
    pathName: OPENROUTER_PATH,
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": referer,
      "X-Title": `${GITHUB_REPOSITORY} PR Review Request Handler`,
    },
    payload: {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    },
  });

  return response?.choices?.[0]?.message?.content || "No response from model.";
}

/**
 * Posts a comment on the PR
 */
async function postPRComment(commentBody) {
  const { owner, repo } = splitRepository();
  await requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "revvel-pr-review-request-handler",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    payload: { body: commentBody },
  });
}

/**
 * Adds labels to the PR
 */
async function addPRLabels(labels) {
  const { owner, repo } = splitRepository();
  for (const label of labels) {
    try {
      await requestJson({
        hostname: "api.github.com",
        pathName: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/labels`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "revvel-pr-review-request-handler",
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

/**
 * Removes labels from the PR
 */
async function removePRLabels(labels) {
  const { owner, repo } = splitRepository();
  for (const label of labels) {
    try {
      await requestJson({
        hostname: "api.github.com",
        pathName: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/labels/${encodeURIComponent(label)}`,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "revvel-pr-review-request-handler",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch (err) {
      // 404 is expected when label doesn't exist
      if (!/HTTP 404/.test(err.message)) {
        console.log(`::warning::Could not remove label "${label}": ${err.message}`);
      }
    }
  }
}

/**
 * Builds the system prompt for OpenRouter
 */
function buildSystemPrompt() {
  return [
    "You are an expert code reviewer and automated fix generator for the Revvel Standards repository.",
    "",
    "Your task is to analyze PR review feedback where changes have been requested, and provide:",
    "1. A clear understanding of what reviewers are asking for",
    "2. Specific, actionable fixes to address each concern",
    "3. Code snippets or patches when appropriate",
    "4. An implementation plan prioritized by importance",
    "",
    "Focus on:",
    "- Security vulnerabilities and critical bugs (P0)",
    "- Code quality and maintainability issues (P1)",
    "- Style and documentation improvements (P2)",
    "",
    "Return your response in clear Markdown with these sections:",
    "## Review Feedback Summary",
    "Brief overview of what reviewers requested",
    "",
    "## Priority Issues (P0 - Critical)",
    "List critical issues that must be fixed before merge",
    "",
    "## Important Issues (P1 - High Priority)",
    "List important improvements requested",
    "",
    "## Minor Issues (P2 - Nice to Have)",
    "List style, documentation, or minor improvements",
    "",
    "## Implementation Plan",
    "Step-by-step plan to address all issues, with code snippets where helpful",
    "",
    "## Recommended Next Steps",
    "What should happen next (auto-fix, human review, etc.)",
  ].join("\n");
}

/**
 * Builds the user prompt with PR context
 */
function buildUserPrompt(prDetails, reviews, reviewComments, diff) {
  const changesRequestedReviews = reviews.filter((r) => r.state === "CHANGES_REQUESTED");

  const reviewSummary = changesRequestedReviews
    .map((review) => {
      return [
        `**Reviewer:** @${review.user.login}`,
        `**Submitted:** ${review.submitted_at}`,
        review.body ? `**Comment:** ${review.body}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  const commentSummary = reviewComments
    .map((comment) => {
      return [
        `**File:** \`${comment.path}\` (line ${comment.line || comment.original_line})`,
        `**Reviewer:** @${comment.user.login}`,
        `**Comment:** ${comment.body}`,
        comment.diff_hunk ? `\`\`\`diff\n${comment.diff_hunk}\n\`\`\`` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  // Truncate diff if too large (keep first 10000 chars)
  const truncatedDiff = diff.length > 10000 ? diff.slice(0, 10000) + "\n...(diff truncated)" : diff;

  return [
    `# PR #${PR_NUMBER}: ${prDetails.title}`,
    "",
    `**Author:** @${prDetails.user.login}`,
    `**Base branch:** ${prDetails.base.ref}`,
    `**Head branch:** ${prDetails.head.ref}`,
    "",
    "## PR Description",
    prDetails.body || "(No description provided)",
    "",
    "## Review Feedback (Changes Requested)",
    reviewSummary || "(No review-level comments)",
    "",
    "## Line-Level Review Comments",
    commentSummary || "(No line-level comments)",
    "",
    "## PR Diff",
    "```diff",
    truncatedDiff,
    "```",
  ].join("\n");
}

/**
 * Main execution
 */
async function main() {
  if (!OPENROUTER_API_KEY) {
    console.log("::error::OPENROUTER_API_KEY is not set. Cannot proceed.");
    process.exit(1);
  }

  if (!GITHUB_TOKEN) {
    console.log("::error::GITHUB_TOKEN is not set. Cannot proceed.");
    process.exit(1);
  }

  if (!PR_NUMBER) {
    console.log("::error::PR_NUMBER is not set. Cannot proceed.");
    process.exit(1);
  }

  console.log(`Processing PR #${PR_NUMBER} for review request handling...`);

  try {
    // Add in-progress label
    await addPRLabels(["review-fix:in-progress", "openrouter", "auto-fix"]);

    // Post initial comment
    await postPRComment(
      "🤖 **OpenRouter Review Request Handler**\n\n" +
        "Analyzing review feedback and generating fixes...\n\n" +
        `PR: #${PR_NUMBER}\n` +
        `Model: \`${MODEL}\`\n\n` +
        "_This is an automated response. A detailed analysis will be posted shortly._",
    );

    // Fetch PR data
    console.log("Fetching PR details...");
    const prDetails = await getPRDetails();

    console.log("Fetching PR reviews...");
    const reviews = await getPRReviews();

    console.log("Fetching PR review comments...");
    const reviewComments = await getPRReviewComments();

    console.log("Fetching PR diff...");
    const diff = await getPRDiff();

    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(prDetails, reviews, reviewComments, diff);

    // Call OpenRouter
    console.log("Calling OpenRouter for analysis...");
    const analysis = await callOpenRouter(systemPrompt, userPrompt);

    // Post analysis comment
    const analysisComment = [
      "## 🔍 OpenRouter Review Analysis",
      "",
      analysis,
      "",
      "---",
      "",
      "**Next Steps:**",
      "1. Review the analysis and implementation plan above",
      "2. Apply the recommended fixes to your branch",
      "3. Push updates to this PR",
      "4. Request re-review from reviewers",
      "",
      `_Analysis generated by ${MODEL} via OpenRouter_`,
    ].join("\n");

    await postPRComment(analysisComment);

    // Update labels
    await removePRLabels(["review-fix:in-progress"]);
    await addPRLabels(["review-fix:complete"]);

    console.log("::notice::Review request handling complete!");
  } catch (error) {
    console.error(`::error::Failed to process review request: ${error.message}`);

    // Post error comment
    try {
      await postPRComment(
        "❌ **OpenRouter Review Request Handler — Error**\n\n" +
          "Failed to analyze review feedback.\n\n" +
          "**Error:**\n```\n" +
          truncateForComment(error.message) +
          "\n```\n\n" +
          "_Manual review required. Please address reviewer feedback manually._",
      );

      // Update labels
      await removePRLabels(["review-fix:in-progress"]);
      await addPRLabels(["review-fix:failed", "needs-human"]);
    } catch (commentError) {
      console.error(`::error::Could not post error comment: ${commentError.message}`);
    }

    process.exit(1);
  }
}

main();

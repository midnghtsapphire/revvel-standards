#!/usr/bin/env node
"use strict";

/**
 * PR Auto Review via OpenRouter
 * 
 * When a PR needs review (has "awaiting-approval" label), this script:
 * 1. Fetches PR details, files changed, and diff
 * 2. Calls OpenRouter to perform automated code review
 * 3. Creates review comments on specific lines (inline comments)
 * 4. Submits a formal GitHub review with overall assessment
 * 
 * This implements the "click Add your review and Submit your review" automation
 * requested in the issue.
 * 
 * Implements the Automation Routing Policy (OpenRouter via OPENROUTER_API_KEY).
 * See docs/PR_AUTO_REVIEW_AUTOMATION.md for full process documentation.
 */

const https = require("https");

// Environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const PR_NUMBER = process.env.PR_NUMBER || "";
const PR_HEAD_REPO = process.env.PR_HEAD_REPO || "";
const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4";

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

// Constants
const ERROR_BODY_LIMIT = 600;
const GITHUB_PAGE_SIZE = 100;
const MAX_DIFF_SIZE = parseInt(process.env.MAX_DIFF_SIZE || "30000", 10); // Increased from 15KB to 30KB
const MAX_FILES_TO_FETCH = parseInt(process.env.MAX_FILES_TO_FETCH || "100", 10);
const MAX_INLINE_COMMENTS = 10; // GitHub API limit
const OPENROUTER_RATE_LIMIT_DELAY = 2000; // 2 second delay before API call for basic rate limiting

function splitRepository() {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${GITHUB_REPOSITORY}`);
  }
  return { owner, repo };
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
      "User-Agent": "revvel-pr-auto-review",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/**
 * Fetches files changed in the PR with pagination support
 */
async function getPRFiles() {
  const { owner, repo } = splitRepository();
  const allFiles = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && allFiles.length < MAX_FILES_TO_FETCH) {
    const files = await requestJson({
      hostname: "api.github.com",
      pathName: `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/files?per_page=${GITHUB_PAGE_SIZE}&page=${page}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "revvel-pr-auto-review",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    
    if (!files || files.length === 0) {
      hasMore = false;
    } else {
      // Only add files up to the limit
      const remainingSlots = MAX_FILES_TO_FETCH - allFiles.length;
      const filesToAdd = files.slice(0, remainingSlots);
      allFiles.push(...filesToAdd);
      
      // Stop if we've reached the limit or received fewer files than requested
      if (allFiles.length >= MAX_FILES_TO_FETCH || files.length < GITHUB_PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }
  
  return allFiles;
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
          "User-Agent": "revvel-pr-auto-review",
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
 * Calls OpenRouter API to perform code review with rate limiting
 */
async function callOpenRouter(systemPrompt, userPrompt) {
  // Basic rate limiting: wait before making API call
  await new Promise(resolve => setTimeout(resolve, OPENROUTER_RATE_LIMIT_DELAY));
  
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;
  const response = await requestJson({
    hostname: OPENROUTER_HOST,
    pathName: OPENROUTER_PATH,
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": referer,
      "X-Title": `${GITHUB_REPOSITORY} PR Auto Review`,
    },
    payload: {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
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
      "User-Agent": "revvel-pr-auto-review",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    payload: { body: commentBody },
  });
}

/**
 * Submits a formal GitHub review with comments
 * 
 * @param {Object} reviewData
 * @param {string} reviewData.body - Overall review comment
 * @param {string} reviewData.event - Review event: APPROVE, REQUEST_CHANGES, or COMMENT
 * @param {Array} reviewData.comments - Array of inline review comments
 */
async function submitPRReview(reviewData) {
  const { owner, repo } = splitRepository();
  const { body, event, comments = [] } = reviewData;

  // Get the current commit SHA for the review
  const prDetails = await getPRDetails();
  const commitId = prDetails.head.sha;

  const payload = {
    body,
    event,
    commit_id: commitId,
  };

  // Add inline comments if provided
  if (comments.length > 0) {
    payload.comments = comments.map(comment => ({
      path: comment.path,
      line: comment.line,
      body: comment.body,
    }));
  }

  return await requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/reviews`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "revvel-pr-auto-review",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    payload,
  });
}

/**
 * Builds the system prompt for OpenRouter
 */
function buildSystemPrompt() {
  return [
    "You are an expert code reviewer for the Revvel Standards repository.",
    "",
    "Your task is to perform a comprehensive code review of the PR changes. You will:",
    "1. Analyze the code for bugs, security issues, and logic errors",
    "2. Check code quality, maintainability, and adherence to best practices",
    "3. Review documentation, tests, and overall implementation approach",
    "4. Provide specific, actionable feedback",
    "",
    "Return your review in the following JSON format:",
    "{",
    '  "overall_assessment": "APPROVE | REQUEST_CHANGES | COMMENT",',
    '  "summary": "Brief summary of your overall findings",',
    '  "inline_comments": [',
    "    {",
    '      "file": "path/to/file.js",',
    '      "line": 42,',
    '      "comment": "Specific feedback about this line"',
    "    }",
    "  ],",
    '  "general_feedback": [',
    '    "General observation or suggestion that doesn\'t apply to a specific line"',
    "  ]",
    "}",
    "",
    "Guidelines:",
    "- Use APPROVE if changes are good and no issues found",
    "- Use REQUEST_CHANGES if there are critical bugs, security issues, or major problems",
    "- Use COMMENT if you have suggestions but no blocking issues",
    "- Limit inline_comments to the most important issues (max 10)",
    "- Be constructive and helpful in your feedback",
    "- Focus on substantive issues, not minor style preferences",
    "",
    "Return ONLY valid JSON, no markdown formatting or additional text.",
  ].join("\n");
}

/**
 * Builds the user prompt with PR context
 */
function buildUserPrompt(prDetails, files, diff) {
  // Truncate diff if too large
  const truncatedDiff = diff.length > MAX_DIFF_SIZE 
    ? diff.slice(0, MAX_DIFF_SIZE) + "\n...(diff truncated for length)" 
    : diff;

  const filesList = files
    .map(f => `- \`${f.filename}\` (${f.status}, +${f.additions}/-${f.deletions})`)
    .join("\n");

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
    "## Files Changed",
    filesList,
    "",
    "## Full Diff",
    "```diff",
    truncatedDiff,
    "```",
    "",
    "Please review the above changes and provide your assessment in JSON format.",
  ].join("\n");
}

/**
 * Parse OpenRouter response and extract review data with validation
 */
function parseReviewResponse(response) {
  try {
    // Try to extract JSON from the response
    // Sometimes the model might wrap it in markdown code blocks
    let jsonText = response.trim();
    
    // Remove markdown code fences if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(jsonText);
    
    // Validate required fields
    if (!parsed.overall_assessment || !['APPROVE', 'REQUEST_CHANGES', 'COMMENT'].includes(parsed.overall_assessment)) {
      console.warn(`Invalid overall_assessment: ${parsed.overall_assessment}. Defaulting to COMMENT.`);
      parsed.overall_assessment = 'COMMENT';
    }
    
    // Validate inline comments have required fields
    const validInlineComments = (parsed.inline_comments || [])
      .filter(c => {
        if (!c.file || !c.line || !c.comment) {
          console.warn(`Skipping invalid inline comment - missing required fields:`, c);
          return false;
        }
        if (typeof c.line !== 'number' || c.line <= 0) {
          console.warn(`Skipping invalid inline comment - invalid line number:`, c);
          return false;
        }
        return true;
      })
      .slice(0, MAX_INLINE_COMMENTS); // Limit to avoid API errors
    
    return {
      event: parsed.overall_assessment,
      summary: parsed.summary || "Automated code review completed.",
      inlineComments: validInlineComments,
      generalFeedback: parsed.general_feedback || [],
    };
  } catch (error) {
    console.warn(`Failed to parse review response as JSON: ${error.message}`);
    console.warn("Response was:", response.substring(0, 500));
    
    // Improved fallback: extract useful information from unparseable response
    const fallbackSummary = "Automated code review completed, but response format was unexpected. Review the full feedback below.";
    const feedbackLines = response.split('\n').filter(line => line.trim());
    
    return {
      event: "COMMENT",
      summary: fallbackSummary,
      inlineComments: [],
      generalFeedback: feedbackLines.length > 0 ? feedbackLines : [response.substring(0, 1000)],
    };
  }
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
  
  // Security check: Validate PR is from same repository
  if (PR_HEAD_REPO && PR_HEAD_REPO !== GITHUB_REPOSITORY) {
    console.log(`::warning::PR is from fork (${PR_HEAD_REPO}). Skipping automated review for security.`);
    process.exit(0);
  }

  console.log(`Performing automated review for PR #${PR_NUMBER}...`);
  console.log(`Configuration: MAX_DIFF_SIZE=${MAX_DIFF_SIZE}, MAX_FILES=${MAX_FILES_TO_FETCH}`);

  try {
    // Post initial comment
    await postPRComment(
      "🤖 **Automated Code Review Starting**\n\n" +
        "OpenRouter is analyzing this PR and will submit a review shortly...\n\n" +
        `Model: \`${MODEL}\`\n\n` +
        "_This is an automated review via OpenRouter._",
    );

    // Fetch PR data
    console.log("Fetching PR details...");
    const prDetails = await getPRDetails();

    console.log("Fetching PR files...");
    const files = await getPRFiles();
    console.log(`Fetched ${files.length} files`);
    
    if (files.length >= MAX_FILES_TO_FETCH) {
      console.warn(`Warning: PR has at least ${MAX_FILES_TO_FETCH} files. Review may be incomplete.`);
    }

    console.log("Fetching PR diff...");
    const diff = await getPRDiff();
    console.log(`Diff size: ${diff.length} characters`);

    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(prDetails, files, diff);

    // Call OpenRouter for review
    console.log("Calling OpenRouter for code review...");
    const reviewResponse = await callOpenRouter(systemPrompt, userPrompt);

    // Parse the review response
    const review = parseReviewResponse(reviewResponse);

    console.log(`Review event: ${review.event}`);
    console.log(`Inline comments: ${review.inlineComments.length}`);

    // Build the review body
    const reviewBodyParts = [
      "## 🔍 Automated Code Review",
      "",
      review.summary,
    ];

    if (review.generalFeedback.length > 0) {
      reviewBodyParts.push("");
      reviewBodyParts.push("### General Feedback");
      reviewBodyParts.push("");
      review.generalFeedback.forEach(feedback => {
        reviewBodyParts.push(`- ${feedback}`);
      });
    }
    
    if (files.length >= MAX_FILES_TO_FETCH) {
      reviewBodyParts.push("");
      reviewBodyParts.push(`⚠️ **Note**: This PR changes ${files.length}+ files. Review may not cover all files.`);
    }

    reviewBodyParts.push("");
    reviewBodyParts.push("---");
    reviewBodyParts.push(`_Automated review generated by ${MODEL} via OpenRouter_`);

    const reviewBody = reviewBodyParts.join("\n");

    // Prepare inline comments (map to GitHub format with validation)
    const githubComments = review.inlineComments
      .filter(c => c.file && c.line && c.comment)
      .map(c => ({
        path: c.file,
        line: parseInt(c.line, 10),
        body: c.comment,
      }))
      .filter(c => !isNaN(c.line) && c.line > 0)
      .slice(0, MAX_INLINE_COMMENTS);

    console.log(`Submitting ${githubComments.length} inline comments`);

    // Submit the review
    console.log("Submitting review to GitHub...");
    await submitPRReview({
      body: reviewBody,
      event: review.event,
      comments: githubComments,
    });

    console.log("::notice::Automated code review submitted successfully!");
  } catch (error) {
    console.error(`::error::Failed to perform automated review: ${error.message}`);
    
    // Check for rate limiting errors
    const isRateLimit = error.message.includes('429') || error.message.toLowerCase().includes('rate limit');
    const errorType = isRateLimit ? 'Rate Limit' : 'Error';

    // Post error comment
    try {
      const errorComment = isRateLimit 
        ? "⚠️ **Automated Code Review — Rate Limit**\n\n" +
          "OpenRouter API rate limit exceeded. The review will be retried automatically.\n\n" +
          "If this persists, please request manual review."
        : "❌ **Automated Code Review — Error**\n\n" +
          "Failed to complete automated code review.\n\n" +
          "**Error:**\n```\n" +
          truncateForComment(error.message) +
          "\n```\n\n" +
          "_Manual review required._";
      
      await postPRComment(errorComment);
    } catch (commentError) {
      console.error(`::error::Could not post error comment: ${commentError.message}`);
    }

    process.exit(isRateLimit ? 0 : 1); // Exit 0 for rate limits (workflow will retry)
  }
}

main();

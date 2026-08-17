#!/usr/bin/env node
/**
 * Composite action entrypoint.
 *
 * Reads the PR diff from env, runs the review engine (Groq when keyed),
 * and posts a single issue comment on the pull request via the GitHub API.
 *
 * Why a comment (not a formal review request): fewer permission edge-cases
 * on forks, and the body already includes the full markdown report.
 */
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function log(level, msg) {
  const wanted = (process.env.LOG_LEVEL || "INFO").toUpperCase();
  const order = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };
  if ((order[level] || 20) >= (order[wanted] || 20)) {
    console.log(`[groq-code-review] ${level}: ${msg}`);
  }
}

async function main() {
  const diff = process.env.PULL_REQUEST_DIFF || "";
  const token = process.env.GITHUB_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const prNumber = process.env.PR_NUMBER || "";

  if (!token || !repo || !prNumber) {
    throw new Error("githubToken, githubRepository, and githubPullRequestNumber are required");
  }
  if (!diff.trim()) {
    log("WARN", "Empty pullRequestDiff — posting empty-diff notice");
  }

  const productRunner = join(process.cwd(), ".action-exec.mjs");
  writeFileSync(
    productRunner,
    `
import { reviewPullRequestDiff } from './lib/review-engine.ts';
import { buildGithubReviewBody } from './lib/export.ts';

const diff = process.env.PULL_REQUEST_DIFF || '';
const result = await reviewPullRequestDiff(diff, {
  chunkSize: Number(process.env.CHUNK_SIZE || 4000),
  model: process.env.GROQ_MODEL,
  temperature: Number(process.env.TEMPERATURE || 0.2),
  maxNewTokens: Number(process.env.MAX_NEW_TOKENS || 512),
  topP: Number(process.env.TOP_P || 0.95),
  apiKey: process.env.GROQ_API_KEY || '',
});
const body = buildGithubReviewBody(result);
const commit = process.env.GIT_COMMIT || '';
const footer = commit ? '\\n\\n_Commit: ' + commit + '_' : '';
process.stdout.write(JSON.stringify({ body: body + footer, stats: result.stats }));
`,
  );

  const exec = spawnSync(
    process.execPath,
    ["--import", "tsx", productRunner],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  try {
    unlinkSync(productRunner);
  } catch {
    // ignore cleanup failures
  }

  if (exec.status !== 0) {
    log("ERROR", exec.stderr || exec.stdout || "review failed");
    await postComment(
      token,
      repo,
      prNumber,
      "### 🤖 Groq Code Review\n\nReview engine failed. Check Action logs. Local/Groq credentials and diff size are the usual culprits.",
    );
    process.exit(exec.status || 1);
  }

  let payload;
  try {
    payload = JSON.parse(exec.stdout);
  } catch {
    throw new Error("Failed to parse review engine output");
  }

  log("INFO", `findings=${payload.stats?.findingCount ?? "?"} provider=${payload.stats?.provider}`);
  await postComment(token, repo, prNumber, payload.body);
  log("INFO", "Posted PR comment");
}

async function postComment(token, repo, prNumber, body) {
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "revvel-groq-code-review",
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub comment failed ${res.status}: ${text.slice(0, 300)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

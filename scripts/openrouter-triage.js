#!/usr/bin/env node
"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";
const ISSUE_NUMBER = process.env.ISSUE_NUMBER || "";
const ISSUE_TITLE = process.env.ISSUE_TITLE || "";
const ISSUE_BODY = process.env.ISSUE_BODY || "";
const EVENT_KIND = process.env.EVENT_KIND || "issue";
const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4";

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

function parseLabelNamesFromYaml(labelsFilePath) {
  try {
    const raw = fs.readFileSync(labelsFilePath, "utf8");
    const matches = raw.match(/^\s*-\s+name:\s+"?([^"\n]+)"?\s*$/gm) || [];
    return matches
      .map((line) => line.replace(/^\s*-\s+name:\s+"?/, "").replace(/"?\s*$/, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildSystemPrompt(labelNames) {
  const labelList = labelNames.length > 0 ? labelNames.join(", ") : "(label list unavailable)";
  return [
    "You are the first-line triage assistant for the Revvel Standards repository.",
    "Classify the incoming item, suggest labels from the approved label set, recommend immediate next actions, and clearly flag whether human attention is required.",
    "Only suggest labels from this canonical `.github/labels.yml` set:",
    labelList,
    "Return concise Markdown with these sections:",
    "1) Classification",
    "2) Suggested Labels (with short rationale)",
    "3) Next Actions",
    "4) Human Attention (Yes/No + reason)",
    "If `no-triage` should apply, explicitly say so.",
  ].join("\n");
}

function buildUserPrompt({ eventKind, issueNumber, title, body }) {
  return [
    `Repository: ${GITHUB_REPOSITORY}`,
    `Event kind: ${eventKind}`,
    `Number: #${issueNumber}`,
    `Title: ${title || "(no title)"}`,
    "Body:",
    body && body.trim().length > 0 ? body : "(no body provided)",
  ].join("\n\n");
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

async function callOpenRouter(systemPrompt, userPrompt) {
  const referer = `https://github.com/${GITHUB_REPOSITORY}`;
  const response = await requestJson({
    hostname: OPENROUTER_HOST,
    pathName: OPENROUTER_PATH,
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": referer,
      "X-Title": `${GITHUB_REPOSITORY} OpenRouter Triage`,
    },
    payload: {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    },
  });

  return response?.choices?.[0]?.message?.content || "No triage output returned by model.";
}

async function postGitHubComment(commentBody) {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${GITHUB_REPOSITORY}`);
  }

  await requestJson({
    hostname: "api.github.com",
    pathName: `/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "revvel-openrouter-triage-script",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    payload: { body: commentBody },
  });
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.log("::warning::OPENROUTER_API_KEY is not set. Skipping OpenRouter triage.");
    process.exit(0);
  }

  if (!GITHUB_TOKEN) {
    console.error("ERROR: GITHUB_TOKEN is required.");
    process.exit(1);
  }
  if (!ISSUE_NUMBER) {
    console.error("ERROR: ISSUE_NUMBER is required.");
    process.exit(1);
  }

  const labelNames = parseLabelNamesFromYaml(path.resolve(process.cwd(), ".github/labels.yml"));
  const systemPrompt = buildSystemPrompt(labelNames);
  const userPrompt = buildUserPrompt({
    eventKind: EVENT_KIND,
    issueNumber: ISSUE_NUMBER,
    title: ISSUE_TITLE,
    body: ISSUE_BODY,
  });

  const triage = await callOpenRouter(systemPrompt, userPrompt);
  const commentBody = [
    "🤖 **OpenRouter Triage**",
    "",
    `Model: \`${MODEL}\``,
    `Event: \`${EVENT_KIND}\` · Item: #${ISSUE_NUMBER}`,
    "",
    triage,
  ].join("\n");

  await postGitHubComment(commentBody);
  console.log(`Posted triage comment to #${ISSUE_NUMBER}.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`OpenRouter triage failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildSystemPrompt,
  buildUserPrompt,
  parseLabelNamesFromYaml,
};

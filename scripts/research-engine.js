#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { assertCloudAllowed } = require("./llm-spend-gate");
const https = require("https");
const path = require("path");

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";
const GITHUB_HOST = "api.github.com";
const GITHUB_PAGE_SIZE = 100;
const DEFAULT_REPOSITORY = "midnghtsapphire/revvel-standards";
const ERROR_BODY_LIMIT = 900;
// Stay under GitHub's ~65k comment limit with headroom for headings/metadata so
// the findings comment posts reliably and remains consumable by wr-pr-creation.
const MAX_FINDINGS_COMMENT_LENGTH = 60000;

// Ralph loop: max iterations and minimum confidence threshold before re-research is skipped.
const RALPH_LOOP_MAX_ITERATIONS = 3;
const RALPH_LOOP_MIN_CONFIDENCE = 60;

const MODEL_TRIAD = [
  "anthropic/claude-sonnet-4",
  "google/gemini-2.5-pro",
  "openai/gpt-4.1",
];

const SYNTHESIS_MODEL = process.env.RESEARCH_SYNTHESIS_MODEL || "anthropic/claude-opus-4";

const MASTER_CHECKLIST = [
  "Scope the WR and extract the commercial question being answered.",
  "Split research into independent specialist lanes with named agents.",
  "Run each lane through OpenRouter model triangulation or a configured MAS provider.",
  "Require evidence, citations, confidence, and explicit unknowns from every lane.",
  "Synthesize marketing, SEO, competitors, audience, chatter, factual validation, delivery, and revenue into one packet.",
  "Create a code-review packet that asks review agents for comments and automatic-fix commits.",
  "Apply research lifecycle labels so stuck items are visible.",
  "Write a durable Markdown artifact and link it back to the WR or PR.",
];

const LANE_DEFINITIONS = [
  {
    id: "market-positioning",
    name: "Market Positioning",
    agent: "Echo",
    roleLabel: "research:marketing",
    purpose: "Identify positioning, channels, hooks, offers, and go-to-market proof.",
    checklist: [
      "Define the target buyer and the urgent pain.",
      "Identify best current marketing angles in the market.",
      "Explain why this audience is worth pursuing now.",
      "Name the channels, hooks, and first conversion events.",
      "List evidence needed before spend or public claims.",
    ],
  },
  {
    id: "seo-demand",
    name: "SEO Demand",
    agent: "Noimos",
    roleLabel: "research:seo",
    purpose: "Map search intent, keywords, content angles, and landing-page requirements.",
    checklist: [
      "List buyer-intent keyword clusters.",
      "Separate informational, comparison, and transactional intent.",
      "Recommend landing-page title, meta description, and FAQ angles.",
      "Flag claims that require source validation.",
      "Suggest internal-link and content-support targets.",
    ],
  },
  {
    id: "competitor-intel",
    name: "Competitor Intelligence",
    agent: "Iris",
    roleLabel: "research:competitors",
    purpose: "Compare competitors, GitHub repositories, star momentum, pricing, reviews, and moat gaps.",
    checklist: [
      "List direct competitors, OSS repos, and adjacent substitutes.",
      "Capture GitHub stars, recency, and project momentum when applicable.",
      "Compare pricing, onboarding, integrations, and reviews.",
      "Identify gaps Revvel can exploit.",
      "Call out saturated spaces and weak moats.",
    ],
  },
  {
    id: "audience-chatter",
    name: "Audience and Chatter",
    agent: "Scout",
    roleLabel: "research:chatter",
    purpose: "Summarize social chatter, forum complaints, objections, language, and unmet needs.",
    checklist: [
      "Identify where the audience talks about the pain.",
      "Capture exact phrases, objections, and buying triggers.",
      "Separate loud complaints from payable problems.",
      "Explain emotional urgency and switching barriers.",
      "Name communities or channels to monitor next.",
    ],
  },
  {
    id: "factual-validation",
    name: "Factual Validation",
    agent: "Mirror",
    roleLabel: "research:facts",
    purpose: "Check factual claims, source quality, contradictions, and hallucination risk.",
    checklist: [
      "Extract the claims that drive the recommendation.",
      "Mark each claim as supported, weak, contradicted, or unknown.",
      "Require URLs or document references for facts and numbers.",
      "Flag unverifiable metrics before they reach a PR or landing page.",
      "Summarize confidence and evidence gaps.",
    ],
  },
  {
    id: "technical-delivery",
    name: "Technical Delivery",
    agent: "Forge",
    roleLabel: "research:technical",
    purpose: "Convert research into implementable requirements, acceptance gates, and system risks.",
    checklist: [
      "Name the files, workflows, scripts, MCPs, or services likely affected.",
      "Define the acceptance gates and test evidence required.",
      "Identify auth, secret, data, and deployment implications.",
      "Recommend the narrowest complete implementation surface.",
      "Surface integration risks for the code agents.",
    ],
  },
  {
    id: "revenue-mechanics",
    name: "Revenue Mechanics",
    agent: "Ledger",
    roleLabel: "research:revenue",
    purpose: "Turn research into pricing, monetization, funnel, and conversion hypotheses.",
    checklist: [
      "Select the sellable shape: PDF, skill, MCP, CLI, API, app, extension, or service.",
      "Recommend pricing and first paid tier.",
      "Define the fastest path to a paid transaction.",
      "Identify affiliate, Polar.sh, Gumroad, LemonSqueezy, or Stripe hooks.",
      "List metrics that prove revenue traction.",
    ],
  },
  {
    id: "review-autofix",
    name: "Research Review and Auto-Fix",
    agent: "Aria",
    roleLabel: "research:reviewer",
    purpose: "Review the research packet like a code-review agent and produce fix-ready comments.",
    checklist: [
      "Review the packet for unsupported claims and missing evidence.",
      "Flag missing tests, labels, workflows, or docs before code starts.",
      "For every issue, offer an automatic fix plan with file paths and commit message.",
      "Separate blocking findings from advisory improvements.",
      "Recommend labels for the PR review state.",
    ],
  },
  {
    id: "repo-web-search",
    name: "Repository Review and Web Search Fallback",
    agent: "Scout-Web",
    roleLabel: "research:repo-web",
    purpose: "Review any GitHub repository referenced in the query. If it is unavailable, unmaintained, or inadequate, search for alternative tools, libraries, and competitor APIs that solve the same problem.",
    checklist: [
      "Extract all GitHub repository URLs from the query and review each one (stars, last commit, license, purpose, open issues).",
      "If the primary repository is unavailable, abandoned, or not a fit, name the tool/library and search for alternatives online.",
      "List at least three direct competitors, substitute libraries, or commercial APIs that solve the same problem.",
      "For each alternative capture: GitHub stars or npm downloads, last-commit date, license, pricing, and a one-sentence differentiation.",
      "Select the best alternative based on maintenance activity, community adoption, license compatibility, and feature parity with the original.",
      "Explain WHY each alternative was ranked as it was — do not present bare conclusions.",
      "State a confidence score (0–100) for your primary recommendation at the end of your response.",
    ],
  },
];

function truncateForComment(text, limit = ERROR_BODY_LIMIT) {
  if (!text) return "";
  const str = String(text);
  if (str.length <= limit) return str;
  return `${str.slice(0, limit)}\n...(truncated)`;
}

function slugify(value) {
  return String(value || "research")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "research";
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Extracts a 0–100 confidence score from a model-generated text block.
 * Looks for patterns like "Confidence: 75", "confidence score: 80/100", "80%".
 * Returns null when no parsable score is found.
 */
function extractConfidenceScore(content) {
  if (!content) return null;
  const patterns = [
    /confidence[:\s]+(\d{1,3})\s*(?:\/\s*100|%|out of 100)?/i,
    /confidence score[:\s]+(\d{1,3})/i,
    /\bscore[:\s]+(\d{1,3})\s*(?:\/\s*100|%)?/i,
  ];
  for (const re of patterns) {
    const match = content.match(re);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) return score;
    }
  }
  return null;
}

function parseDepth(value) {
  const normalized = String(value || "triangulated").toLowerCase();
  if (["standard", "single"].includes(normalized)) return "standard";
  if (["swarm", "mas"].includes(normalized)) return "swarm";
  return "triangulated";
}

function splitRepository(repository) {
  const [owner, repo] = String(repository || DEFAULT_REPOSITORY).split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository: ${repository}`);
  }
  return { owner, repo };
}

function defaultOutputFile({ issueNumber, query }) {
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = issueNumber ? `issue-${issueNumber}` : slugify(query).slice(0, 48);
  return `docs/research-engine/${stamp}-${suffix}.md`;
}

function getOptionsFromEnv(env = process.env) {
  const query = env.RESEARCH_QUERY || env.QUESTION || "";
  const issueNumber = env.ISSUE_NUMBER || "";
  const prNumber = env.PR_NUMBER || "";
  return {
    apiKey: env.OPENROUTER_API_KEY || "",
    githubToken: env.GITHUB_TOKEN || "",
    repository: env.GITHUB_REPOSITORY || env.WR_DEFAULT_REPO || DEFAULT_REPOSITORY,
    issueNumber,
    prNumber,
    query,
    issueTitle: env.ISSUE_TITLE || "",
    issueBody: env.ISSUE_BODY || "",
    outputFile: env.OUTPUT_FILE || defaultOutputFile({ issueNumber, query: query || env.ISSUE_TITLE }),
    depth: parseDepth(env.RESEARCH_DEPTH),
    extraContext: env.RESEARCH_CONTEXT || "",
    dryRun: env.DRY_RUN === "true",
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
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 0;
          let parsed = {};
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

async function callOpenRouter({ apiKey, repository, model, systemPrompt, userPrompt, maxTokens = 3500 }) {
  // Spend gate (#17850): refuse unless someone deliberately allowed it.
  assertCloudAllowed("research-engine");
  const response = await requestJson({
    hostname: OPENROUTER_HOST,
    pathName: OPENROUTER_PATH,
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": `https://github.com/${repository || DEFAULT_REPOSITORY}`,
      "X-Title": "Revvel Research Engine",
    },
    payload: {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.15,
      max_tokens: maxTokens,
    },
  });

  return response?.choices?.[0]?.message?.content || "";
}

async function fetchIssueContext({ githubToken, repository, issueNumber }) {
  if (!githubToken || !issueNumber) return null;
  const { owner, repo } = splitRepository(repository);
  return await requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/issues/${issueNumber}`,
    method: "GET",
    headers: githubHeaders(githubToken, "revvel-research-engine"),
  });
}

function githubHeaders(githubToken, userAgent) {
  return {
    Authorization: `Bearer ${githubToken}`,
    "User-Agent": userAgent,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function addLabels({ githubToken, repository, number, labels }) {
  if (!githubToken || !number || labels.length === 0) return;
  const { owner, repo } = splitRepository(repository);
  await requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/issues/${number}/labels`,
    method: "POST",
    headers: githubHeaders(githubToken, "revvel-research-engine"),
    payload: { labels },
  });
}

async function removeLabels({ githubToken, repository, number, labels }) {
  if (!githubToken || !number || labels.length === 0) return;
  const { owner, repo } = splitRepository(repository);
  for (const label of labels) {
    try {
      await requestJson({
        hostname: GITHUB_HOST,
        pathName: `/repos/${owner}/${repo}/issues/${number}/labels/${encodeURIComponent(label)}`,
        method: "DELETE",
        headers: githubHeaders(githubToken, "revvel-research-engine"),
      });
    } catch (error) {
      if (!/HTTP 404/.test(error.message)) {
        console.log(`::warning::Could not remove label "${label}": ${error.message}`);
      }
    }
  }
}

async function postComment({ githubToken, repository, number, body }) {
  if (!githubToken || !number || !body) return;
  const { owner, repo } = splitRepository(repository);
  await requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/issues/${number}/comments`,
    method: "POST",
    headers: githubHeaders(githubToken, "revvel-research-engine"),
    payload: { body },
  });
}

async function listPullRequestsForIssue({ githubToken, repository, issueNumber }) {
  if (!githubToken || !issueNumber) return [];
  const { owner, repo } = splitRepository(repository);
  const pulls = await requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/pulls?state=open&per_page=${GITHUB_PAGE_SIZE}`,
    method: "GET",
    headers: githubHeaders(githubToken, "revvel-research-engine"),
  });
  const needle = new RegExp(`(?:#|issues/)${issueNumber}(?:\\b|$)`);
  return Array.isArray(pulls)
    ? pulls.filter((pr) => needle.test(`${pr.title || ""}\n${pr.body || ""}\n${pr.head?.ref || ""}`))
    : [];
}

async function dispatchWorkflow({ githubToken, repository, workflowId, ref, inputs }) {
  if (!githubToken) return;
  const { owner, repo } = splitRepository(repository);
  await requestJson({
    hostname: GITHUB_HOST,
    pathName: `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowId)}/dispatches`,
    method: "POST",
    headers: githubHeaders(githubToken, "revvel-research-engine"),
    payload: { ref, inputs },
  });
}

function buildLaneSystemPrompt(lane) {
  return [
    `You are ${lane.agent}, the Revvel ${lane.name} research agent.`,
    `Purpose: ${lane.purpose}`,
    "Return concise Markdown with evidence. Do not invent metrics.",
    "Every claim that depends on external facts must include a URL, repo name, or document reference.",
    "If live data is unavailable, say exactly what could not be verified and what tool/API should verify it.",
    "Include these sections: Findings, Evidence, Risks, Recommended Actions, Automatic Fix Hooks.",
  ].join("\n");
}

function buildLaneUserPrompt(lane, context) {
  return [
    `Research query: ${context.query}`,
    "",
    context.issueTitle ? `Issue title: ${context.issueTitle}` : "",
    context.issueBody ? `Issue body:\n${context.issueBody}` : "",
    context.extraContext ? `Additional context:\n${context.extraContext}` : "",
    "",
    `Lane checklist for ${lane.name}:`,
    ...lane.checklist.map((item) => `- ${item}`),
    "",
    "Output requirements:",
    "- Cite sources or explicitly mark unknowns.",
    "- Include labels that should be applied if this lane finds risk.",
    "- Include at least one automatic-fix hook when the finding can be resolved by code, docs, labels, or workflow changes.",
  ]
    .filter(Boolean)
    .join("\n");
}

function selectModels(depth) {
  if (depth === "standard") return [MODEL_TRIAD[0]];
  return MODEL_TRIAD;
}

async function runLane(lane, context, caller = callOpenRouter) {
  const models = selectModels(context.depth);
  const attempts = await Promise.all(
    models.map(async (model) => {
      try {
        const content = await caller({
          apiKey: context.apiKey,
          repository: context.repository,
          model,
          systemPrompt: buildLaneSystemPrompt(lane),
          userPrompt: buildLaneUserPrompt(lane, context),
        });
        return { model, ok: true, content };
      } catch (error) {
        return { model, ok: false, error: error.message };
      }
    }),
  );

  const successes = attempts.filter((attempt) => attempt.ok && attempt.content.trim());
  const combinedContent = successes.map((attempt) => `### ${attempt.model}\n\n${attempt.content}`).join("\n\n");
  // Extract confidence score from the combined model output for this lane.
  const confidenceScore = extractConfidenceScore(combinedContent);
  return {
    id: lane.id,
    name: lane.name,
    agent: lane.agent,
    roleLabel: lane.roleLabel,
    checklist: lane.checklist,
    status: successes.length > 0 ? "complete" : "failed",
    attempts,
    content: combinedContent,
    confidenceScore,
  };
}

function buildSynthesisPrompt(context, laneReports) {
  const laneText = laneReports
    .map((report) => {
      const failed = report.attempts
        .filter((attempt) => !attempt.ok)
        .map((attempt) => `- ${attempt.model}: ${attempt.error}`)
        .join("\n");
      const scoreNote = report.confidenceScore !== null && report.confidenceScore !== undefined
        ? `Confidence score: ${report.confidenceScore}/100`
        : "";
      return [
        `## ${report.name} (${report.agent})`,
        `Status: ${report.status}${scoreNote ? ` | ${scoreNote}` : ""}`,
        report.content || "No successful model output.",
        failed ? `\nFailed attempts:\n${failed}` : "",
      ].join("\n\n");
    })
    .join("\n\n---\n\n");

  // Include per-iteration confidence summary when iterationHistory is provided.
  const iterationNote = context.iterationHistory && context.iterationHistory.length > 1
    ? [
      "",
      `**Ralph Loop iterations completed:** ${context.iterationHistory.length}`,
      "The confidence scores below represent the best result from all iterations.",
      ...context.iterationHistory.map((iter, i) => {
        const scores = iter.filter((r) => r.confidenceScore !== null && r.confidenceScore !== undefined);
        const avg = scores.length
          ? Math.round(scores.reduce((sum, r) => sum + r.confidenceScore, 0) / scores.length)
          : "n/a";
        return `- Iteration ${i + 1}: avg confidence ${avg}${typeof avg === "number" ? "/100" : ""}`;
      }),
    ].join("\n")
    : "";

  return [
    `Research query: ${context.query}`,
    iterationNote,
    "",
    "Synthesize the lane reports into one WR-ready research packet.",
    "Required sections:",
    "1. Executive Decision",
    "2. Audience We Are Going After and Why",
    "3. Marketing and SEO Plan",
    "4. Competitor and GitHub Star Intelligence",
    "5. Chatter and Demand Signals",
    "6. Factual Validation and Evidence Gaps",
    "7. Build Requirements and Acceptance Gates",
    "8. Code Review Agent Packet",
    "9. Automatic Fix and Commit Queue",
    "10. Labels to Apply",
    "11. Repository Review and Best Alternative",
    "12. Confidence Score Summary",
    "",
    "For the Code Review Agent Packet, write comments that Bito AI, OpenRouter review, Coderabbit, and Ralph Loop can act on. Every blocking finding must include an automatic fix plan and a commit message.",
    "",
    // Mirrors the competitor-pricing rule in wr/WR_TEMPLATE_FULL.md; keep both in sync.
    // Parity is enforced by tests/research-engine.test.js ("keeps the competitor-pricing
    // rule in sync with wr/WR_TEMPLATE_FULL.md"), which fails if either wording drifts.
    "For Competitor and GitHub Star Intelligence, the competitor/pricing table must list actual prices (e.g. \"$99-299/month\"), not vague labels like \"Paid tiers\". If a competitor's price is unknown, write \"Pricing data pending — competitive benchmark research required.\" Do not ship incomplete competitive intelligence.",
    "Citation rule: every statistic, percentage, growth rate, or market-size claim must include a",
    "direct source link. If a number is not sourced, omit it or explicitly label it as an estimate",
    "(e.g. \"internal estimate\", \"observed anecdotally — unverified\") and use a range instead of a",
    "precise figure. Never present bare percentages (e.g. \"73% of teams\", \"40% YoY\") without attribution.",
    "",
    "For Confidence Score Summary, aggregate the per-lane confidence scores from all iterations. Select the best-scoring idea from the combined data and explain your reasoning. Discard low-confidence (< 60) findings unless they are the only data available.",
    "",
    laneText,
  ].join("\n");
}

async function synthesizeResearch(context, laneReports, caller = callOpenRouter) {
  try {
    return await caller({
      apiKey: context.apiKey,
      repository: context.repository,
      model: SYNTHESIS_MODEL,
      systemPrompt: "You are Sage, the Revvel research orchestrator synthesizer. Produce complete, sourced, action-ready Markdown.",
      userPrompt: buildSynthesisPrompt(context, laneReports),
      maxTokens: 6000,
    });
  } catch (error) {
    const fallback = laneReports
      .map((report) => `## ${report.name}\n\n${report.content || `Failed: ${report.attempts.map((a) => a.error).filter(Boolean).join("; ")}`}`)
      .join("\n\n---\n\n");
    return [
      "## Executive Decision",
      "Synthesis model failed, so this packet contains the raw lane reports for review.",
      "",
      "## Code Review Agent Packet",
      `Synthesis error: ${error.message}`,
      "",
      fallback,
    ].join("\n");
  }
}

function formatChecklist(items, checked = true) {
  return items.map((item) => `- [${checked ? "x" : " "}] ${item}`).join("\n");
}

function formatLaneAudit(laneReports) {
  return laneReports
    .map((report) => {
      const attempts = report.attempts
        .map((attempt) => {
          if (attempt.ok) return `- ${attempt.model}: success`;
          return `- ${attempt.model}: failed - ${attempt.error}`;
        })
        .join("\n");
      return [
        `### ${report.name} (${report.agent})`,
        "",
        `**Status:** ${report.status}`,
        `**Label:** \`${report.roleLabel}\``,
        "",
        "**Checklist:**",
        formatChecklist(report.checklist, report.status === "complete"),
        "",
        "**Model attempts:**",
        attempts,
      ].join("\n");
    })
    .join("\n\n");
}

function buildReviewRequestComment({ outputFile, laneReports, includeCoderTrigger = false }) {
  const laneLabels = laneReports.map((report) => `\`${report.roleLabel}\``).join(", ");
  return [
    "<!-- revvel-research-engine-review-request -->",
    "## Research Engine Review Request",
    "",
    `Research packet: \`${outputFile}\``,
    `Lane labels: ${laneLabels}`,
    // On issues the coder auto-advances from the `wr:research-complete` label, so
    // the comment omits the trigger phrase to avoid a duplicate run. On PRs the
    // `issues: labeled` event does not apply, so the phrase is the trigger there.
    ...(includeCoderTrigger
      ? ["", "Research Findings: research is complete — the OpenRouter coding agent is cleared to implement this packet."]
      : []),
    "",
    "Code-review agents must review the research before implementation proceeds.",
    "",
    "Review checklist:",
    "- [ ] Bito AI or equivalent persistent-memory reviewer checks the packet against repo standards.",
    "- [ ] OpenRouter review checks factual validation, gaps, and implementation risk.",
    "- [ ] Coderabbit or line-level review checks any PR changes created from this packet.",
    "- [ ] Every blocking issue includes an automatic-fix plan and a commit message.",
    "- [ ] Ralph Loop or review-fix automation is ready to apply safe fixes after `changes-requested`.",
  ].join("\n");
}

function buildFindingsComment({ outputFile, synthesis }) {
  return [
    "<!-- revvel-research-findings -->",
    "## Research Findings",
    "",
    `Source packet: \`${outputFile}\``,
    "",
    truncateForComment(synthesis, MAX_FINDINGS_COMMENT_LENGTH).trim(),
  ].join("\n");
}

function formatDocument({ context, synthesis, laneReports, status }) {
  const date = new Date().toISOString();
  const lines = [
    `# Research Engine Packet: ${context.query.slice(0, 90)}${context.query.length > 90 ? "..." : ""}`,
    "",
    "**Version:** 1.0.0",
    `**Generated:** ${date}`,
    `**Status:** ${status}`,
    "**Engine:** `scripts/research-engine.js`",
    `**Depth:** ${context.depth}`,
    context.issueNumber ? `**Issue:** #${context.issueNumber}` : "",
    context.prNumber ? `**PR:** #${context.prNumber}` : "",
    "",
    "---",
    "",
    "## Master Research Checklist",
    "",
    formatChecklist(MASTER_CHECKLIST, status === "complete"),
    "",
    "## Lane Audit",
    "",
    formatLaneAudit(laneReports),
    "",
    "## Synthesis",
    "",
    synthesis,
    "",
    "## Code Review Handoff",
    "",
    buildReviewRequestComment({ outputFile: context.outputFile, laneReports }).replace("<!-- revvel-research-engine-review-request -->\n", ""),
    "",
    "---",
    "",
    "This packet is generated by the Revvel Research Engine. Treat it as an evidence-gated WR input, not as a substitute for code review.",
    "",
  ];
  return lines.filter((line) => line !== null && line !== undefined).join("\n");
}

function buildMissingKeyReport(context) {
  const laneReports = LANE_DEFINITIONS.map((lane) => ({
    id: lane.id,
    name: lane.name,
    agent: lane.agent,
    roleLabel: lane.roleLabel,
    checklist: lane.checklist,
    status: "blocked",
    attempts: MODEL_TRIAD.map((model) => ({
      model,
      ok: false,
      error: "OPENROUTER_API_KEY is not configured",
    })),
    content: "",
  }));
  const synthesis = [
    "## Executive Decision",
    "",
    "The research engine could not call OpenRouter because `OPENROUTER_API_KEY` is not configured for this runtime.",
    "",
    "## Infrastructure Classification",
    "",
    "This is an infrastructure blocker: the engine is present, but the repository or local session lacks the OpenRouter secret required to execute model lanes.",
    "",
    "## Exact Human Action",
    "",
    "Set `OPENROUTER_API_KEY` under GitHub repository Actions secrets or provide it in the local environment, then rerun the Research Engine Orchestrator workflow.",
    "",
    "## Labels to Apply",
    "",
    "- `openrouter:needs-key`",
    "- `research:blocked`",
    "- `needs-human`",
  ].join("\n");
  return { laneReports, synthesis };
}

async function hydrateContext(options) {
  const context = { ...options };
  if (options.issueNumber && options.githubToken && (!options.issueTitle || !options.issueBody)) {
    try {
      const issue = await fetchIssueContext(options);
      context.issueTitle = context.issueTitle || issue.title || "";
      context.issueBody = context.issueBody || issue.body || "";
    } catch (error) {
      console.log(`::warning::Could not fetch issue #${options.issueNumber}: ${error.message}`);
    }
  }
  context.query = context.query || context.issueTitle || "Revvel research request";
  context.outputFile = context.outputFile || defaultOutputFile(context);
  return context;
}

async function updateStartState(context) {
  const labels = [
    "research-engine",
    "research:orchestrating",
    "deep-research",
    "role:orchestrator",
    ...LANE_DEFINITIONS.map((lane) => lane.roleLabel),
  ];
  if (context.issueNumber) {
    try {
      await addLabels({
        githubToken: context.githubToken,
        repository: context.repository,
        number: context.issueNumber,
        labels,
      });
    } catch (error) {
      console.log(`::warning::Could not apply start-state labels to #${context.issueNumber}: ${error.message}`);
    }
  }
}

async function updateCompleteState(context, laneReports, status) {
  if (!context.githubToken) return;
  const targetNumber = context.prNumber || context.issueNumber;
  if (!targetNumber) return;

  const labelsToAdd =
    status === "complete"
      ? ["research:complete", "wr:research-complete", "research:review-needed", "bito-ai", "awaiting-review"]
      : ["research:blocked", "openrouter:needs-key", "needs-human"];

  try {
    await addLabels({
      githubToken: context.githubToken,
      repository: context.repository,
      number: targetNumber,
      labels: labelsToAdd,
    });
  } catch (error) {
    console.log(`::warning::Could not apply complete-state labels to #${targetNumber}: ${error.message}`);
  }
  await removeLabels({
    githubToken: context.githubToken,
    repository: context.repository,
    number: targetNumber,
    labels: ["research:orchestrating"],
  });

  try {
    await postComment({
      githubToken: context.githubToken,
      repository: context.repository,
      number: targetNumber,
      body: buildReviewRequestComment({
        outputFile: context.outputFile,
        laneReports,
        includeCoderTrigger: Boolean(context.prNumber),
      }),
    });
  } catch (error) {
    console.log(`::warning::Could not post research review comment on #${targetNumber}: ${error.message}`);
  }

  if (status === "complete" && context.issueNumber) {
    // Only issues need this fallback. wr-pr-creation reads issue comments when it
    // builds the WR document; PR review automation already reads the packet/review
    // comment path and does not need a duplicate findings payload.
    try {
      await postComment({
        githubToken: context.githubToken,
        repository: context.repository,
        number: context.issueNumber,
        body: buildFindingsComment({
          outputFile: context.outputFile,
          synthesis: context.synthesis || "",
        }),
      });
    } catch (error) {
      console.log(`::warning::Could not post research findings comment on #${context.issueNumber}: ${error.message}`);
    }
  }
}

async function requestPrReviews(context) {
  if (!context.githubToken || !context.prNumber) return;
  const ref = process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || "main";
  try {
    await dispatchWorkflow({
      githubToken: context.githubToken,
      repository: context.repository,
      workflowId: "bito-ai.yml",
      ref,
      inputs: { pr_number: String(context.prNumber) },
    });
  } catch (error) {
    console.log(`::warning::Could not dispatch BITO review: ${error.message}`);
  }
}

async function findAndRequestLinkedPrReviews(
  context,
  {
    listPrs = listPullRequestsForIssue,
    applyLabels = addLabels,
    applyComment = postComment,
  } = {},
) {
  if (!context.githubToken || !context.issueNumber || context.prNumber) return;
  const prs = await listPrs(context).catch((error) => {
    console.log(`::warning::Could not list linked PRs: ${error.message}`);
    return [];
  });
  const results = await Promise.allSettled(
    prs.slice(0, 3).map(async (pr) => {
      await applyLabels({
        githubToken: context.githubToken,
        repository: context.repository,
        number: pr.number,
        labels: ["research:review-needed", "bito-ai", "awaiting-review", "auto-fix"],
      });
      await applyComment({
        githubToken: context.githubToken,
        repository: context.repository,
        number: pr.number,
        body: buildReviewRequestComment({
          outputFile: context.outputFile,
          laneReports: LANE_DEFINITIONS,
          includeCoderTrigger: true,
        }),
      });
    }),
  );
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      console.log(
        `::warning::Could not request review for linked PR #${prs[i].number}: ${results[i].reason?.message ?? results[i].reason}`,
      );
    }
  }
}

function writeDocument(outputFile, document) {
  const outputPath = path.resolve(process.cwd(), outputFile);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, document, "utf8");
  return outputPath;
}

/**
 * Determines which lanes need a retry based on failure status or low confidence.
 * Returns the subset of LANE_DEFINITIONS that should be re-researched.
 */
function checkLanesNeedRetry(laneReports) {
  return LANE_DEFINITIONS.filter((def) => {
    const report = laneReports.find((r) => r.id === def.id);
    if (!report) return true; // missing — always retry
    if (report.status !== "complete") return true; // failed — retry
    // Low confidence: re-run unless confidence is at or above threshold.
    if (report.confidenceScore !== null && report.confidenceScore !== undefined) {
      return report.confidenceScore < RALPH_LOOP_MIN_CONFIDENCE;
    }
    // No parsable score — treat as needing retry only for the repo-web-search lane,
    // since that lane explicitly asks for a score in its checklist.
    return report.id === "repo-web-search";
  });
}

/**
 * Merges a new set of lane reports into the accumulated best set.
 * For each lane, the report with the higher confidence score wins;
 * if scores are unavailable or equal, the newer (retry) result takes precedence.
 */
function mergeLaneReports(accumulated, fresh) {
  const merged = [...accumulated];
  for (const freshReport of fresh) {
    const idx = merged.findIndex((r) => r.id === freshReport.id);
    if (idx === -1) {
      merged.push(freshReport);
      continue;
    }
    const existing = merged[idx];
    const existingScore = existing.confidenceScore ?? -1;
    const freshScore = freshReport.confidenceScore ?? -1;
    // Fresh result wins unless existing score is strictly higher.
    if (freshScore >= existingScore || freshReport.status === "complete") {
      merged[idx] = freshReport;
    }
  }
  return merged;
}

/**
 * Ralph loop: runs research lanes iteratively until all WR fields are covered
 * (all lanes complete with confidence >= RALPH_LOOP_MIN_CONFIDENCE) or until
 * RALPH_LOOP_MAX_ITERATIONS is reached.
 *
 * Each iteration re-runs only the lanes that failed or returned low confidence,
 * then merges results and feeds iteration history into the synthesis prompt.
 *
 * Skipped in dry-run mode to preserve test determinism.
 */
async function runRalphLoop(context, caller = callOpenRouter) {
  // First pass — run all lanes.
  let laneReports = await Promise.all(
    LANE_DEFINITIONS.map((lane) => runLane(lane, context, caller)),
  );

  // Iteration history records each pass for the synthesis prompt.
  const iterationHistory = [laneReports];

  // Ralph loop — disabled in dryRun so tests remain deterministic.
  if (!context.dryRun) {
    for (let iter = 1; iter < RALPH_LOOP_MAX_ITERATIONS; iter++) {
      const retryLanes = checkLanesNeedRetry(laneReports);
      if (retryLanes.length === 0) break; // all lanes complete with good confidence

      console.log(
        `::notice::Ralph loop iteration ${iter + 1}/${RALPH_LOOP_MAX_ITERATIONS} — retrying ${retryLanes.length} lane(s): ${retryLanes.map((l) => l.id).join(", ")}`,
      );

      const freshReports = await Promise.all(
        retryLanes.map((lane) => runLane(lane, context, caller)),
      );

      laneReports = mergeLaneReports(laneReports, freshReports);
      iterationHistory.push(freshReports);
    }
  }

  // Attach iteration history to context so buildSynthesisPrompt can include it.
  context.iterationHistory = iterationHistory;

  return laneReports;
}

async function runResearchEngine(options, caller = callOpenRouter) {
  const context = await hydrateContext(options);
  await updateStartState(context);

  let laneReports;
  let synthesis;
  let status;

  if (!context.apiKey) {
    const blocked = buildMissingKeyReport(context);
    laneReports = blocked.laneReports;
    synthesis = blocked.synthesis;
    status = "blocked";
  } else {
    laneReports = await runRalphLoop(context, caller);
    synthesis = await synthesizeResearch(context, laneReports, caller);
    status = laneReports.some((report) => report.status === "complete") ? "complete" : "blocked";
  }

  const document = formatDocument({ context, synthesis, laneReports, status });
  const outputPath = writeDocument(context.outputFile, document);
  context.synthesis = synthesis;

  if (!context.dryRun) {
    await updateCompleteState(context, laneReports, status);
    if (status === "complete") {
      await requestPrReviews(context);
      await findAndRequestLinkedPrReviews(context);
    }
  }

  return { context, laneReports, synthesis, status, outputPath, document };
}

async function main() {
  const options = getOptionsFromEnv();
  console.log("Revvel Research Engine");
  console.log(`Repository: ${options.repository}`);
  console.log(`Query: ${options.query || options.issueTitle || "(issue-derived)"}`);
  console.log(`Depth: ${options.depth}`);
  console.log(`Output: ${options.outputFile}`);

  const result = await runResearchEngine(options);
  console.log(`Status: ${result.status}`);
  console.log(`Wrote: ${result.outputPath}`);
  if (result.status !== "complete") {
    console.log("Research engine finished with a visible blocked packet.");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Research engine failed: ${truncateForComment(error.stack || error.message)}`);
    process.exit(1);
  });
}

module.exports = {
  LANE_DEFINITIONS,
  MASTER_CHECKLIST,
  MODEL_TRIAD,
  RALPH_LOOP_MAX_ITERATIONS,
  RALPH_LOOP_MIN_CONFIDENCE,
  buildLaneSystemPrompt,
  buildLaneUserPrompt,
  buildFindingsComment,
  buildMissingKeyReport,
  buildReviewRequestComment,
  buildSynthesisPrompt,
  checkLanesNeedRetry,
  defaultOutputFile,
  extractConfidenceScore,
  findAndRequestLinkedPrReviews,
  formatDocument,
  getOptionsFromEnv,
  mergeLaneReports,
  parseDepth,
  runLane,
  runRalphLoop,
  runResearchEngine,
  selectModels,
  slugify,
  truncateForComment,
};

#!/usr/bin/env node
"use strict";

/**
 * Revvel layered research engine.
 *
 * The engine runs a WR-grade research flow:
 * 1. optional retrieval from search/crawl providers
 * 2. named domain agents with model consensus through OpenRouter
 * 3. synthesis into a single research brief
 * 4. review agents that critique the brief
 * 5. an automatic rewrite pass that applies the review comments
 */

const fs = require("fs");
const https = require("https");
const path = require("path");

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";
const DEFAULT_SYNTHESIS_MODEL = "anthropic/claude-opus-4";
const DEFAULT_REVIEW_MODEL = "anthropic/claude-sonnet-4";
const DEFAULT_CONSENSUS_MODELS = [
  "anthropic/claude-sonnet-4",
  "openai/gpt-4.1",
  "google/gemini-2.5-pro",
];

const MASTER_CHECKLIST = [
  "Question is decomposed into focused, non-overlapping research areas",
  "Live retrieval providers are used when their credentials are present",
  "Each research area is assigned to a named specialist agent",
  "Each specialist returns findings, risks, sources, unknowns, and recommended action",
  "OpenRouter consensus uses multiple models before synthesis",
  "Marketing, SEO, competitors, target audience, and chatter are first-class sections",
  "Code-review-style agents review the research output",
  "Review comments are applied in an automatic rewrite before commit",
  "The final document includes evidence, confidence, and next actions",
];

const AGENT_DEFINITIONS = [
  {
    id: "source-map",
    name: "Iris",
    label: "research:source-map",
    area: "Official sources, docs, repos, APIs, standards, and citations",
    searchQuery: (question) => `${question} official documentation API reference GitHub standard`,
    checklist: [
      "Identify primary official sources",
      "Find relevant GitHub repos, standards, docs, APIs, and changelogs",
      "Separate confirmed facts from model inference",
      "Capture source URLs or document names for every major fact",
    ],
  },
  {
    id: "competitors",
    name: "Atlas",
    label: "research:competitors",
    area: "Competitors, alternatives, market positioning, and gaps",
    searchQuery: (question) => `${question} competitors alternatives comparison pricing reviews`,
    checklist: [
      "List direct and adjacent competitors",
      "Compare positioning, pricing, and feature gaps",
      "Identify what competitors do well and where users complain",
      "Recommend a defensible angle Revvel can own",
    ],
  },
  {
    id: "marketing-seo",
    name: "Echo",
    label: "research:marketing-seo",
    area: "Marketing, SEO, keywords, offer framing, and domain signals",
    searchQuery: (question) => `${question} SEO keywords marketing funnel audience search demand`,
    checklist: [
      "Identify high-intent keywords and search phrases",
      "Map the strongest marketing angles currently used",
      "Name content, landing-page, and ad hooks",
      "Recommend domain or naming signals when relevant",
    ],
  },
  {
    id: "audience",
    name: "Lumen",
    label: "research:audience",
    area: "Target audience, buyer intent, payability, and why this audience matters",
    searchQuery: (question) => `${question} target audience buyer intent problems pain points`,
    checklist: [
      "Define the primary user or buyer segment",
      "Explain why the audience cares enough to act or pay",
      "List objections, constraints, and urgency triggers",
      "Connect audience needs to product or WR acceptance criteria",
    ],
  },
  {
    id: "chatter",
    name: "Scout",
    label: "research:chatter",
    area: "Community chatter, social proof, forums, reviews, and complaints",
    searchQuery: (question) => `${question} reddit forum reviews complaints discussion chatter`,
    checklist: [
      "Summarize what real users and builders complain about",
      "Capture repeated pain points and language users use",
      "Separate durable signals from hype",
      "Translate chatter into product and messaging recommendations",
    ],
  },
  {
    id: "security-compliance",
    name: "Shield",
    label: "research:security-compliance",
    area: "Security, privacy, credential handling, compliance, and abuse risks",
    searchQuery: (question) => `${question} security privacy compliance risk CVE best practices`,
    checklist: [
      "Identify security and privacy risks",
      "Name required credential, auth, and data-protection controls",
      "Flag compliance concerns without blocking reversible work",
      "Recommend safe defaults and review gates",
    ],
  },
  {
    id: "cost-revenue",
    name: "Ledger",
    label: "research:cost-revenue",
    area: "Cost, operating burden, lead economics, pricing, and revenue path",
    searchQuery: (question) => `${question} pricing cost revenue lead economics operations`,
    checklist: [
      "Estimate direct tool and runtime costs when sources allow",
      "Identify hidden operational burden and scaling limits",
      "Describe payability and revenue paths",
      "Recommend a low-waste implementation shape",
    ],
  },
  {
    id: "implementation",
    name: "Forge",
    label: "research:implementation",
    area: "Implementation plan, automation hooks, labels, workflows, and acceptance gates",
    searchQuery: (question) => `${question} implementation architecture automation GitHub Actions agents`,
    checklist: [
      "Define the concrete components to change",
      "Map labels, workflows, scripts, and docs",
      "Identify tests and review gates",
      "Give exact next actions that a coding agent can execute",
    ],
  },
];

const REVIEW_AGENT_DEFINITIONS = [
  {
    id: "research-integrity",
    name: "Mirror",
    label: "research:review",
    area: "Evidence quality, source integrity, contradictions, and confidence",
  },
  {
    id: "code-review-readiness",
    name: "Aria",
    label: "research:review",
    area: "Whether the research is actionable enough for code-review agents and auto-fix loops",
  },
  {
    id: "security-review",
    name: "Cipher",
    label: "research:review",
    area: "Security, secret handling, abuse resistance, and compliance gaps",
  },
  {
    id: "growth-review",
    name: "Quill",
    label: "research:review",
    area: "Marketing, SEO, audience, competitor, and chatter completeness",
  },
];

function envValue(env, key) {
  return env[key] || "";
}

function splitCsv(value, fallback) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function nowDate() {
  return new Date().toISOString().split("T")[0];
}

function requestJson({ hostname, pathName, method = "POST", headers = {}, payload }) {
  return new Promise((resolve, reject) => {
    const body = payload === undefined ? "" : JSON.stringify(payload);
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
          const status = res.statusCode || 200;
          let parsed = {};
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch (error) {
            reject(new Error(`Failed to parse JSON response (${status}): ${error.message}\nRaw: ${data}`));
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

function getEnabledProviders(env = process.env) {
  return {
    openrouter: Boolean(envValue(env, "OPENROUTER_API_KEY")),
    tavily: Boolean(envValue(env, "TAVILY_API_KEY")),
    firecrawl: Boolean(envValue(env, "FIRECRAWL_API_KEY")),
    perplexity: Boolean(envValue(env, "PERPLEXITY_API_KEY")),
  };
}

async function callOpenRouter(model, systemPrompt, userPrompt, options = {}) {
  const env = options.env || process.env;
  const apiKey = options.apiKey || envValue(env, "OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required.");
  }

  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens || 4000,
  };

  if (options.structuredOutput) {
    payload.response_format = {
      type: "json_schema",
      json_schema: {
        name: "revvel_research_agent_report",
        strict: false,
        schema: {
          type: "object",
          additionalProperties: true,
          properties: {
            agent: { type: "string" },
            confidence: { type: "string" },
            findings: { type: "array", items: { type: "object", additionalProperties: true } },
            risks: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } },
            unknowns: { type: "array", items: { type: "string" } },
            sources: { type: "array", items: { type: "string" } },
          },
        },
      },
    };
  }

  let response;
  try {
    response = await requestJson({
      hostname: OPENROUTER_HOST,
      pathName: OPENROUTER_PATH,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/midnghtsapphire/revvel-standards",
        "X-Title": "Revvel Search Research Engine",
      },
      payload,
    });
  } catch (error) {
    const canRetryWithoutStructuredOutput =
      options.structuredOutput && /response_format|structured|schema|parameter|unsupported/i.test(error.message);
    if (!canRetryWithoutStructuredOutput) throw error;
    const fallbackPayload = { ...payload };
    delete fallbackPayload.response_format;
    response = await requestJson({
      hostname: OPENROUTER_HOST,
      pathName: OPENROUTER_PATH,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/midnghtsapphire/revvel-standards",
        "X-Title": "Revvel Search Research Engine",
      },
      payload: fallbackPayload,
    });
  }

  if (response.error) {
    throw new Error(`OpenRouter error: ${response.error.message || "Unknown error"}`);
  }
  return response?.choices?.[0]?.message?.content || "";
}

async function callTavily(query, env = process.env) {
  const apiKey = envValue(env, "TAVILY_API_KEY");
  if (!apiKey) return [];
  const response = await requestJson({
    hostname: "api.tavily.com",
    pathName: "/search",
    payload: {
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 5,
    },
  });
  const results = Array.isArray(response.results) ? response.results : [];
  return results.map((result) => ({
    provider: "tavily",
    title: result.title || result.url || "Tavily result",
    url: result.url || "",
    snippet: result.content || result.raw_content || "",
  }));
}

async function callFirecrawl(query, env = process.env) {
  const apiKey = envValue(env, "FIRECRAWL_API_KEY");
  if (!apiKey) return [];
  const response = await requestJson({
    hostname: "api.firecrawl.dev",
    pathName: "/v1/search",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    payload: {
      query,
      limit: 5,
    },
  });
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((result) => ({
    provider: "firecrawl",
    title: result.title || result.url || "Firecrawl result",
    url: result.url || "",
    snippet: result.description || result.markdown || result.content || "",
  }));
}

async function callPerplexity(query, env = process.env) {
  const apiKey = envValue(env, "PERPLEXITY_API_KEY");
  if (!apiKey) return [];
  const response = await requestJson({
    hostname: "api.perplexity.ai",
    pathName: "/chat/completions",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    payload: {
      model: envValue(env, "PERPLEXITY_MODEL") || "sonar-pro",
      messages: [
        {
          role: "system",
          content: "Return a concise research answer with source URLs where possible.",
        },
        {
          role: "user",
          content: query,
        },
      ],
    },
  });
  const content = response?.choices?.[0]?.message?.content || "";
  return content
    ? [{ provider: "perplexity", title: "Perplexity live research", url: "", snippet: content }]
    : [];
}

async function gatherEvidence(question, agent, env = process.env) {
  const query = agent.searchQuery(question);
  const providers = [
    () => callTavily(query, env),
    () => callFirecrawl(query, env),
    () => callPerplexity(query, env),
  ];

  const settled = await Promise.allSettled(providers.map((provider) => provider()));
  const evidence = [];
  const errors = [];
  for (const item of settled) {
    if (item.status === "fulfilled") {
      evidence.push(...item.value);
    } else {
      errors.push(item.reason.message);
    }
  }
  return { query, evidence, errors };
}

function evidenceToPrompt(evidence) {
  if (!evidence || evidence.length === 0) {
    return "No live retrieval evidence was available for this agent. Use existing knowledge carefully and mark unsupported claims as unknown.";
  }
  return evidence
    .map((item, index) => {
      return [
        `Source ${index + 1}: ${item.title}`,
        item.url ? `URL: ${item.url}` : "",
        item.snippet ? `Snippet: ${String(item.snippet).slice(0, 1200)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function extractJsonObject(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    // Continue to balanced-object extraction below.
  }

  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch (_) {
          return null;
        }
      }
    }
  }
  return null;
}

function normalizeReport({ agent, model, raw, evidence, error }) {
  const parsed = extractJsonObject(raw);
  const base = {
    agent: agent.id,
    agent_name: agent.name,
    area: agent.area,
    model,
    confidence: error ? "low" : "medium",
    checklist: agent.checklist,
    findings: [],
    risks: [],
    recommended_actions: [],
    unknowns: [],
    sources: evidence.map((item) => item.url || item.title).filter(Boolean),
    raw_text: raw || "",
  };
  if (error) {
    return {
      ...base,
      risks: [`Agent model failed: ${error}`],
      unknowns: ["This agent needs rerun or manual review because its model call failed."],
    };
  }
  if (!parsed) {
    return {
      ...base,
      findings: raw ? [{ finding: raw.slice(0, 2000), source: "model response", relevance: "medium" }] : [],
    };
  }
  return {
    ...base,
    confidence: parsed.confidence || base.confidence,
    findings: Array.isArray(parsed.findings) ? parsed.findings : base.findings,
    risks: Array.isArray(parsed.risks) ? parsed.risks : base.risks,
    recommended_actions: Array.isArray(parsed.recommended_actions)
      ? parsed.recommended_actions
      : Array.isArray(parsed.actions)
        ? parsed.actions
        : base.recommended_actions,
    unknowns: Array.isArray(parsed.unknowns) ? parsed.unknowns : base.unknowns,
    sources: [
      ...base.sources,
      ...(Array.isArray(parsed.sources) ? parsed.sources : []),
    ].filter(Boolean),
    raw_text: raw || "",
  };
}

function buildAgentSystemPrompt(agent) {
  return [
    `You are ${agent.name}, a Revvel specialist research agent.`,
    `Research area: ${agent.area}.`,
    "Use the provided live evidence first. If the evidence is thin, say so.",
    "Do not invent citations. Every source must be a URL or document name from the evidence or a clearly named known official source.",
    "Return JSON only with keys: agent, confidence, findings, risks, recommended_actions, unknowns, sources.",
    "Each finding object must include: finding, source, relevance.",
  ].join("\n");
}

function buildAgentUserPrompt(question, agent, evidenceBundle) {
  return [
    `Question: ${question}`,
    "",
    `Agent checklist for ${agent.name}:`,
    ...agent.checklist.map((item) => `- ${item}`),
    "",
    `Search query used: ${evidenceBundle.query}`,
    "",
    "Live evidence:",
    evidenceToPrompt(evidenceBundle.evidence),
    "",
    "Return a WR-ready JSON report for this research area.",
  ].join("\n");
}

async function runAgent(agent, question, options = {}) {
  const env = options.env || process.env;
  const modelLimit = Number(envValue(env, "RESEARCH_MAX_MODELS_PER_AGENT") || "3");
  const models = splitCsv(envValue(env, "RESEARCH_CONSENSUS_MODELS"), DEFAULT_CONSENSUS_MODELS).slice(0, modelLimit);
  const evidenceBundle = await gatherEvidence(question, agent, env);
  const systemPrompt = buildAgentSystemPrompt(agent);
  const userPrompt = buildAgentUserPrompt(question, agent, evidenceBundle);

  const settled = await Promise.allSettled(
    models.map(async (model) => {
      const raw = await callOpenRouter(model, systemPrompt, userPrompt, {
        env,
        structuredOutput: true,
        temperature: 0.1,
      });
      return normalizeReport({ agent, model, raw, evidence: evidenceBundle.evidence });
    }),
  );

  const reports = settled.map((item, index) => {
    if (item.status === "fulfilled") return item.value;
    console.warn(`Agent ${agent.id} model ${models[index]} failed: ${item.reason.message}`);
    return normalizeReport({
      agent,
      model: models[index],
      raw: "",
      evidence: evidenceBundle.evidence,
      error: item.reason.message,
    });
  });

  return {
    agent: agent.id,
    name: agent.name,
    label: agent.label,
    area: agent.area,
    checklist: agent.checklist,
    query: evidenceBundle.query,
    evidence: evidenceBundle.evidence,
    providerErrors: evidenceBundle.errors,
    reports,
  };
}

function buildSynthesisPrompt(question, agentResults) {
  return [
    `Question: ${question}`,
    "",
    "Master checklist:",
    ...MASTER_CHECKLIST.map((item) => `- ${item}`),
    "",
    "Agent results JSON:",
    JSON.stringify(agentResults, null, 2),
    "",
    "Synthesize into a WR-ready Markdown brief with these sections:",
    "1. Executive Summary",
    "2. Recommendation",
    "3. Master Checklist Status",
    "4. Agent Findings by Area",
    "5. Marketing, SEO, Competitors, Audience, and Chatter",
    "6. Security, Compliance, and Credential Notes",
    "7. Cost, Revenue, and Operating Burden",
    "8. Implementation Actions and Acceptance Gates",
    "9. Contradictions, Unknowns, and Confidence",
    "10. Sources",
    "",
    "Be direct. If evidence is missing, mark it as missing instead of guessing.",
  ].join("\n");
}

async function synthesize(question, agentResults, env = process.env) {
  const model = envValue(env, "RESEARCH_SYNTHESIS_MODEL") || DEFAULT_SYNTHESIS_MODEL;
  return callOpenRouter(
    model,
    "You are Sage, the Revvel research synthesizer. Merge agent reports into one concise, actionable research brief.",
    buildSynthesisPrompt(question, agentResults),
    { env, temperature: 0.1, maxTokens: 6000 },
  );
}

function buildReviewPrompt(question, synthesis, reviewer) {
  return [
    `Question: ${question}`,
    "",
    `Reviewer: ${reviewer.name}`,
    `Review area: ${reviewer.area}`,
    "",
    "Research brief to review:",
    synthesis,
    "",
    "Return Markdown with:",
    "- Findings",
    "- Required fixes",
    "- Auto-fix recommendations",
    "- Commit-ready wording or section edits where applicable",
  ].join("\n");
}

async function reviewSynthesis(question, synthesis, env = process.env) {
  const model = envValue(env, "RESEARCH_REVIEW_MODEL") || DEFAULT_REVIEW_MODEL;
  const settled = await Promise.allSettled(
    REVIEW_AGENT_DEFINITIONS.map(async (reviewer) => {
      const content = await callOpenRouter(
        model,
        "You are a Revvel code-review-style research reviewer. Find gaps, offer automatic fixes, and never block without a fix path.",
        buildReviewPrompt(question, synthesis, reviewer),
        { env, temperature: 0.1, maxTokens: 2500 },
      );
      return { ...reviewer, model, content };
    }),
  );
  return settled.map((item, index) => {
    if (item.status === "fulfilled") return item.value;
    return {
      ...REVIEW_AGENT_DEFINITIONS[index],
      model,
      content: `Review agent failed: ${item.reason.message}`,
    };
  });
}

async function applyReviewFixes(question, synthesis, reviews, env = process.env) {
  const model = envValue(env, "RESEARCH_FIX_MODEL") || envValue(env, "RESEARCH_SYNTHESIS_MODEL") || DEFAULT_SYNTHESIS_MODEL;
  const prompt = [
    `Question: ${question}`,
    "",
    "Original research brief:",
    synthesis,
    "",
    "Review comments:",
    JSON.stringify(reviews, null, 2),
    "",
    "Rewrite the research brief by applying every valid review comment.",
    "Keep claims source-grounded. Preserve Markdown structure.",
    "Add a section named 'Review Fixes Applied' listing the concrete edits made.",
  ].join("\n");
  return callOpenRouter(
    model,
    "You are Forge, the automatic fix agent. Apply reviewer feedback directly to the research artifact.",
    prompt,
    { env, temperature: 0.1, maxTokens: 7000 },
  );
}

function renderProviderReadiness(providers) {
  const entries = [
    ["OpenRouter", providers.openrouter, "required orchestrator and model consensus"],
    ["Tavily", providers.tavily, "optional live web search"],
    ["Firecrawl", providers.firecrawl, "optional crawl/search extraction"],
    ["Perplexity", providers.perplexity, "optional cited answer layer"],
  ];
  return entries
    .map(([name, enabled, note]) => `| ${name} | ${enabled ? "enabled" : "not configured"} | ${note} |`)
    .join("\n");
}

function renderAgentRoster() {
  return AGENT_DEFINITIONS
    .map((agent) => `| ${agent.name} | \`${agent.id}\` | ${agent.area} | \`${agent.label}\` |`)
    .join("\n");
}

function renderChecklist(items) {
  return items.map((item) => `- [x] ${item}`).join("\n");
}

function renderAgentChecklists() {
  return AGENT_DEFINITIONS
    .map((agent) => {
      return [
        `### ${agent.name} - ${agent.area}`,
        "",
        renderChecklist(agent.checklist),
      ].join("\n");
    })
    .join("\n\n");
}

function renderReviewSummary(reviews) {
  return reviews
    .map((review) => {
      return [
        `### ${review.name} - ${review.area}`,
        "",
        review.content,
      ].join("\n");
    })
    .join("\n\n");
}

function formatDocument({ question, synthesis, fixedSynthesis, reviews, providers, date }) {
  const finalBrief = fixedSynthesis || synthesis;
  return `# Research Engine Report: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}

**Version:** 2.0.0
**Date:** ${date}
**Status:** Layered WR research output
**Author:** Revvel Search Research Engine
**Generated by:** \`scripts/research-engine.js\`
**Related Standard:** \`docs/Master_Inventory/AI_RESEARCH_MODULE_STANDARD.md\`

---

## Provider Readiness

| Provider | Status | Role |
|---|---|---|
${renderProviderReadiness(providers)}

## Research Agent Roster

| Agent | ID | Area | Label |
|---|---|---|---|
${renderAgentRoster()}

## Master Checklist

${renderChecklist(MASTER_CHECKLIST)}

## Agent Checklists

${renderAgentChecklists()}

---

${finalBrief}

---

## Code-Review-Style Research Reviews

${renderReviewSummary(reviews)}

---

*This document was generated by the Revvel layered search-research engine using optional live retrieval, OpenRouter model consensus, synthesis, reviewer agents, and an automatic fix pass.*
`;
}

async function runResearchEngine(options = {}) {
  const env = options.env || process.env;
  const question = options.question || envValue(env, "QUESTION");
  const outputFile = options.outputFile || envValue(env, "OUTPUT_FILE");
  if (!question) throw new Error("QUESTION environment variable is required.");
  if (!outputFile) throw new Error("OUTPUT_FILE environment variable is required.");
  if (!envValue(env, "OPENROUTER_API_KEY")) {
    throw new Error("OPENROUTER_API_KEY environment variable is required.");
  }

  const date = options.date || nowDate();
  const providers = getEnabledProviders(env);
  console.log("Revvel Search Research Engine");
  console.log(`Question: ${question}`);
  console.log(`Output: ${outputFile}`);
  console.log(`Agents: ${AGENT_DEFINITIONS.length}`);

  const agentResults = await Promise.all(
    AGENT_DEFINITIONS.map(async (agent) => {
      console.log(`-> ${agent.name} (${agent.id})`);
      return runAgent(agent, question, { env });
    }),
  );

  console.log("Synthesizing agent reports...");
  let synthesis = "";
  try {
    synthesis = await synthesize(question, agentResults, env);
  } catch (error) {
    console.warn(`Synthesis failed: ${error.message}`);
    synthesis = [
      "## Raw Agent Reports",
      "",
      "Synthesis failed, so raw reports are included for review.",
      "",
      "```json",
      JSON.stringify(agentResults, null, 2),
      "```",
    ].join("\n");
  }

  console.log("Running research review agents...");
  const reviews = await reviewSynthesis(question, synthesis, env);

  let fixedSynthesis = "";
  try {
    console.log("Applying review fixes...");
    fixedSynthesis = await applyReviewFixes(question, synthesis, reviews, env);
  } catch (error) {
    console.warn(`Automatic research fix pass failed: ${error.message}`);
  }

  const document = formatDocument({
    question,
    synthesis,
    fixedSynthesis,
    reviews,
    providers,
    date,
  });

  const outputPath = path.resolve(process.cwd(), outputFile);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, document, "utf8");
  console.log(`Research document written to ${outputPath}`);
  return {
    outputPath,
    document,
    agentResults,
    reviews,
    providers,
  };
}

async function main() {
  await runResearchEngine();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}

module.exports = {
  AGENT_DEFINITIONS,
  MASTER_CHECKLIST,
  REVIEW_AGENT_DEFINITIONS,
  applyReviewFixes,
  callFirecrawl,
  callOpenRouter,
  callPerplexity,
  callTavily,
  extractJsonObject,
  formatDocument,
  gatherEvidence,
  getEnabledProviders,
  main,
  normalizeReport,
  requestJson,
  reviewSynthesis,
  runAgent,
  runResearchEngine,
  synthesize,
};

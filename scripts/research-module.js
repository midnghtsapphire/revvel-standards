#!/usr/bin/env node
"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const MODEL = "google/gemini-2.5-pro";

const OPENROUTER_BASE = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";
const TITLE_MAX_LENGTH = 80;

function getRequiredEnvVar(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set ${name} before running scripts/research-module.js.`
    );
  }

  return value.trim();
}

const OPENROUTER_API_KEY = getRequiredEnvVar('OPENROUTER_API_KEY');
const QUESTION = getRequiredEnvVar('QUESTION');
const OUTPUT_FILE = getRequiredEnvVar('OUTPUT_FILE');

const AGENTS = {
  competitive: {
    model: MODEL,
    name: "Competitive Intelligence Agent",
    prompt: `You are a competitive intelligence analyst. For the given topic/domain:
1. Identify top 5-10 direct competitors and incumbents
2. Analyze current usage patterns - who is using these solutions today and how?
3. Frame the core problem each competitor solves and their positioning
4. Identify gaps, weaknesses, and unmet needs in the market
5. For life insurance lead vertical specifically: map carrier partnerships, lead aggregators, and distribution channels

Return structured analysis with sources.`,
  },
  cost: {
    model: MODEL,
    name: "Cost & Lead Economics Agent",
    prompt: `You are a unit economics analyst specializing in lead generation markets, especially life insurance.
Analyze:
1. CPL (cost per lead) ranges across tiers: shared, semi-exclusive, exclusive, real-time, aged
2. Conversion rates from lead -> contact -> quote -> bind, by channel
3. Agent/carrier payout per bound policy, average premium, commission %, chargeback risk
4. LTV math: target ROAS for buyers, breakeven CPL, scaling ceilings
5. Infrastructure costs: traffic acquisition (Google/Meta/SEO), telephony, compliance (TCPA/Jornaya/Trusted Form), CRM
6. Lead economics waterfall: from $X ad spend -> Y leads -> Z bound policies -> $W revenue

Return quantified ranges with citations.`,
  },
  community: {
    model: MODEL,
    name: "Community Chatter & Sentiment Agent",
    prompt: `You are a community/sentiment researcher. Mine Reddit, X/Twitter, HackerNews, niche forums, YouTube comments, Trustpilot, BBB, and industry slack/discord communities for:
1. User sentiment about existing solutions - complaints, praise, switching triggers
2. Recurring pain points and feature requests
3. Insider/agent chatter about lead quality, vendor reputation, and emerging tactics
4. Consumer-side sentiment about life insurance shopping experience
5. Notable threads, quotes (verbatim), and engagement signals

Return organized by source with direct quotes and links.`,
  },
  technical: {
    model: MODEL,
    name: "Technical Feasibility Agent",
    prompt: `You are a technical architect. Assess:
1. Required tech stack and build complexity
2. Compliance requirements (TCPA, state insurance regulations, data privacy)
3. Key integrations (carrier APIs, rating engines, lead delivery, CRM)
4. Defensible technical moats (data, models, distribution)
5. Time-to-MVP and time-to-scale estimates

Return pragmatic build plan.`,
  },
  market_size: {
    model: MODEL,
    name: "Market Sizing Agent",
    prompt: `You are a market sizing analyst. Provide:
1. TAM/SAM/SOM with explicit methodology
2. Growth rates and key tailwinds/headwinds
3. Segment breakdown (term, whole, final expense, IUL, etc. if life insurance)
4. Geographic and demographic distribution
5. Capture timeline and realistic 3-year revenue scenarios

Return with citations.`,
  },
  marketing_seo: {
    model: MODEL,
    name: "Marketing, SEO & Domain Value Agent",
    prompt: `You are a marketing and SEO strategist. Analyze:
1. Top organic and paid search terms in the vertical (volume, CPC, intent, difficulty)
2. Current marketing playbooks competitors use (SEO content, PPC, social, affiliate, influencer, direct mail, TV)
3. High-value domain signals: exact-match domains, premium .com candidates, brandable names with SEO upside
4. Content gaps and rankable angles for fast organic traction
5. Acquisition channel economics: estimated CAC by channel and scalability
6. SERP composition and dominant publishers to displace or partner with

Return keyword tables, domain shortlist, and channel plan.`,
  },
};

const SYNTHESIZER = {
  model: MODEL,
  name: "Research Synthesizer",
  prompt: `You are the lead research synthesizer. You will receive outputs from 6 specialist agents:
- Competitive Intelligence
- Cost & Lead Economics
- Community Chatter & Sentiment
- Technical Feasibility
- Market Sizing
- Marketing, SEO & Domain Value

Produce a final report in this EXACT format:

# Research Report: {topic}

## 1. Executive Summary
## 2. Market Sizing (TAM/SAM/SOM)
## 3. Competitive Landscape & Current Usage
## 4. Cost Analysis & Lead Economics
   - CPL waterfall
   - Conversion funnel
   - Unit economics & breakeven
## 5. Marketing/SEO & High-Value Domains
   - Top keywords
   - Channel strategy
   - Domain shortlist
## 6. Community Chatter & User Sentiment
   - Pain points
   - Verbatim quotes
   - Sentiment trends
## 7. Technical Feasibility & Compliance
## 8. Strategic Recommendation
   - Go / No-Go
   - 90-day plan
   - Path to $10k/mo -> $100k/mo -> $10M
## 9. Risks & Open Questions
## 10. Sources

Be specific, quantitative, and actionable. Cite sources inline.`,
};

function resolveApiKey(apiKey) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY environment variable is required.");
  }
  return key;
}

function callOpenRouter(model, systemPrompt, userPrompt, apiKey) {
  const resolvedApiKey = resolveApiKey(apiKey);
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const options = {
      hostname: OPENROUTER_BASE,
      path: OPENROUTER_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: `Bearer ${resolvedApiKey}`,
        "HTTP-Referer": "https://github.com/midnghtsapphire",
        "X-Title": "Revvel Research Module",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const statusCode = typeof res.statusCode === "number" ? res.statusCode : 200;
        const isSuccess = statusCode >= 200 && statusCode < 300;

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (err) {
          reject(new Error(`Failed to parse OpenRouter response: ${err.message}\nRaw: ${data}`));
          return;
        }

        if (!isSuccess) {
          const errorMessage = parsed?.error?.message || `HTTP ${statusCode}`;
          reject(new Error(`OpenRouter request failed (${statusCode}): ${errorMessage}`));
          return;
        }

        if (parsed.error) {
          reject(new Error(`OpenRouter error: ${parsed.error.message || "Unknown error"}`));
          return;
        }

        resolve(parsed.choices?.[0]?.message?.content ?? "");
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function buildSubAgents(question) {
  return Object.values(AGENTS).map((agent) => ({
    name: agent.name,
    model: agent.model,
    systemPrompt: agent.prompt,
    userPrompt: buildTopicPrompt(question),
  }));
}

function buildTopicPrompt(topic) {
  return `Research topic: ${topic}`;
}

function buildSynthesizerPrompt(question, reports) {
  const reportsText = formatAgentReports(reports);
  return `Topic: ${question}\n\nAgent outputs:\n\n${reportsText}`;
}

function formatAgentReports(reports) {
  return reports
    .map((r) => `=== ${r.name.toUpperCase()} AGENT REPORT ===\n${r.content}`)
    .join("\n\n");
}

function formatDocument(question, synthesis, date) {
  return `# Research: ${question.slice(0, TITLE_MAX_LENGTH)}${question.length > TITLE_MAX_LENGTH ? "..." : ""}

**Version:** 1.0.0
**Date:** ${date}
**Status:** Research Document
**Author:** Revvel AI Research Module (multi-agent synthesis)
**Generated by:** \`scripts/research-module.js\`
**Related Standard:** \`AI_RESEARCH_MODULE_STANDARD.md\`

---

${synthesis}

---

*This document was generated by the Revvel AI Research Module using 6 specialized sub-agents via OpenRouter.*
*Review and validate findings before acting on recommendations.*
`;
}

async function runAgent(agent, topic, apiKey) {
  const output = await callOpenRouter(agent.model, agent.prompt, buildTopicPrompt(topic), apiKey);
  return { name: agent.name, content: output };
}

async function runResearch(topic, apiKey, options = {}) {
  const { tolerateAgentFailures = false, onAgentFailure, onSynthesisFailure } = options;
  const agents = Object.values(AGENTS);
  const settledResults = await Promise.allSettled(
    agents.map((agent) => runAgent(agent, topic, apiKey))
  );

  const firstFailure = settledResults.find((result) => result.status === "rejected");
  if (firstFailure && !tolerateAgentFailures) {
    throw firstFailure.reason;
  }

  const results = settledResults.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const agent = agents[index];
    const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
    if (onAgentFailure) {
      onAgentFailure(agent, error);
    }
    return { name: agent.name, content: `Agent failed: ${error.message}` };
  });

  const synthesisInput = buildSynthesizerPrompt(topic, results);
  let report;
  try {
    report = await callOpenRouter(SYNTHESIZER.model, SYNTHESIZER.prompt, synthesisInput, apiKey);
  } catch (err) {
    if (onSynthesisFailure) {
      onSynthesisFailure(err);
    }
    report = formatAgentReports(results);
  }

  return { topic, agents: results, report };
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.error("ERROR: OPENROUTER_API_KEY environment variable is required.");
    process.exit(1);
  }
  if (!QUESTION) {
    console.error("ERROR: QUESTION environment variable is required.");
    process.exit(1);
  }
  if (!OUTPUT_FILE) {
    console.error("ERROR: OUTPUT_FILE environment variable is required.");
    process.exit(1);
  }

  const date = new Date().toISOString().split("T")[0];
  const research = await runResearch(QUESTION, OPENROUTER_API_KEY, {
    tolerateAgentFailures: true,
    onAgentFailure: (agent, err) => {
      console.warn(`  ⚠️  [${agent.name}] Failed: ${err.message}`);
    },
    onSynthesisFailure: (err) => {
      console.error(`❌ Synthesis failed: ${err.message}`);
    },
  });

  const document = formatDocument(QUESTION, research.report, date);
  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, document, "utf8");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = {
  AGENTS,
  SYNTHESIZER,
  MODEL,
  callOpenRouter,
  buildSubAgents,
  buildSynthesizerPrompt,
  formatDocument,
  formatAgentReports,
  runAgent,
  runResearch,
  main,
};

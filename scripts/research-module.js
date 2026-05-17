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
        const statusCode = typeof res.statusCode === "number" ? res.statusCode : null;
        if (statusCode === null) {
          reject(
            new Error(
              "OpenRouter response missing HTTP status code. This may indicate an invalid response object or mock configuration."
            )
          );
          return;
        }
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
  return [
    {
      name: "spec",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a technical specification researcher. Your job is to research official documentation, " +
        "GitHub repos, and API references. Be precise, cite sources where possible, and focus on what " +
        "the official documentation actually says — not community opinions.",
      userPrompt:
        `Research official documentation and specifications for the following question:\n\n${question}\n\n` +
        "Provide your findings in plain text with clear sections: Key Facts, Limitations, Official Recommendations, Sources.",
    },
    {
      name: "competitive",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a competitive analysis expert. Your job is to identify alternatives, compare trade-offs, " +
        "and provide an objective assessment of the pros and cons of different approaches. Be balanced. Discovery involves what is being used now and what problem we are solving.",
      userPrompt:
        `Compare the main options and alternatives for:\n\n${question}\n\n` +
        "Provide: Options Available, Pros of Each, Cons of Each, Best Use Case for Each, What is being used now, What problem we are solving.",
    },
    {
      name: "security",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a security and compliance expert. Your job is to identify security risks, compliance " +
        "implications, and best practices. Flag anything that could expose credentials, data, or systems.",
      userPrompt:
        `Analyze the security and compliance implications of:\n\n${question}\n\n` +
        "Provide: Key Risks, Mitigations, Compliance Considerations, Security Best Practices.",
    },
    {
      name: "cost",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a cost and operations analyst. Your job is to estimate costs, operational burden, " +
        "and scaling characteristics of different approaches. Be specific with numbers where possible. Consider lead economics where applicable.",
      userPrompt:
        `Analyze the cost and operational factors for:\n\n${question}\n\n` +
        "Provide: Cost Estimates, Operational Complexity, Scaling Considerations, Hidden Costs, How much per lead and why some are worth more.",
    },
    {
      name: "community",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a community knowledge aggregator. Your job is to summarize what practitioners, " +
        "developers, and the broader community say about this topic based on your training knowledge. " +
        "Focus on real-world experience, chatter for life insurance leads and what's not liked, not marketing copy.",
      userPrompt:
        `Summarize real-world community experience, practitioner knowledge, and chatter about:\n\n${question}\n\n` +
        "Provide: Common Pain Points, What Works Well, Common Pitfalls, Practitioner Tips, Chatter about leads and what's not liked.",
    },
    {
      name: "marketing_seo",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a marketing and SEO expert. Your job is to provide better search to our research. Check most searched life insurance words and terms, best marketing being used now and how this would improve in our app, and facts and stats to determine a high value domain name.",
      userPrompt:
        `Analyze the marketing and SEO factors for:\n\n${question}\n\n` +
        "Provide: Most searched words and terms, Best marketing being used now, How it improves the app, Facts and stats to determine a high value domain name.",
    },
  ];
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

  return (
    `You are a research synthesizer. You have received reports from 6 specialized research agents on the following question:\n\n` +
    `QUESTION: ${question}\n\n` +
    `${reportsText}\n\n` +
    `Your job is to synthesize all reports into a single comprehensive research document.\n\n` +
    `Format the output as a Markdown document with these sections:\n` +
    `1. Executive Summary (2-3 sentences answering the question directly)\n` +
    `2. Recommendation (clear, actionable recommendation with reasoning)\n` +
    `3. Options Compared (table or list comparing main options)\n` +
    `4. Security Considerations\n` +
    `5. Cost Analysis & Lead Economics\n` +
    `6. Implementation Roadmap (phases with action items)\n` +
    `7. Marketing, SEO & High Value Domains\n` +
    `8. Community Chatter & User Sentiment\n` +
    `9. Open Questions (things that need human decision)\n` +
    `10. Sources and References\n\n` +
    `Be specific. Include concrete steps, commands, or code snippets where helpful. Flag any contradictions between agents.`
  );
}

function normalizeRejectionReason(reason) {
  if (reason instanceof Error) {
    return reason;
  }
  if (reason && typeof reason === "object") {
    return new Error(JSON.stringify(reason));
  }
  return new Error(String(reason));
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
  let results;
  if (!tolerateAgentFailures) {
    results = await Promise.all(agents.map((agent) => runAgent(agent, topic, apiKey)));
  } else {
    const settledResults = await Promise.allSettled(
      agents.map((agent) => runAgent(agent, topic, apiKey))
    );

    results = settledResults.map((result, index) => {
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
  }
    }
    return { name: agent.name, content: `Agent failed: ${error.message}` };
  });

  const synthesisInput = buildSynthesizerPrompt(topic, results);
  const synthesisSystemPrompt = SYNTHESIZER.prompt.replaceAll("{topic}", topic);
  let report;
  try {
    report = await callOpenRouter(
      SYNTHESIZER.model,
      synthesisSystemPrompt,
      synthesisInput,
      apiKey
  // Synthesize
  console.log(`\n🧠 Synthesizing with google/gemini-2.5-pro...`);
  const synthPrompt = buildSynthesizerPrompt(QUESTION, reports);
  let synthesis;
  try {
    synthesis = await callOpenRouter(
      "google/gemini-2.5-pro",
      "You are an expert research synthesizer. Produce clear, structured, actionable documentation.",
      synthPrompt
    );
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

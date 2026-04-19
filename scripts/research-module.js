#!/usr/bin/env node
/**
 * Revvel AI Research Module
 *
 * Runs 5 specialized sub-agents in parallel via OpenRouter, then synthesizes
 * results into a structured Revvel Standard research document.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... QUESTION="your question" OUTPUT_FILE="docs/MY_RESEARCH.md" node scripts/research-module.js
 *
 * Or via GitHub Actions workflow: .github/workflows/research-module.yml
 *
 * See: AI_RESEARCH_MODULE_STANDARD.md
 */

"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const QUESTION = process.env.QUESTION;
const OUTPUT_FILE = process.env.OUTPUT_FILE;

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

const OPENROUTER_BASE = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

// ---------------------------------------------------------------------------
// HTTP helper (no external deps — uses Node built-in https)
// ---------------------------------------------------------------------------

function callOpenRouter(model, systemPrompt, userPrompt) {
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
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://github.com/midnghtsapphire",
        "X-Title": "Revvel Research Module",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`OpenRouter error: ${parsed.error.message || "Unknown error"}`));
            return;
          }
          const content = parsed.choices?.[0]?.message?.content ?? "";
          resolve(content);
        } catch (err) {
          reject(new Error(`Failed to parse OpenRouter response: ${err.message}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Sub-agent definitions (see AI_RESEARCH_MODULE_STANDARD.md §3.2)
// ---------------------------------------------------------------------------

function buildSubAgents(question) {
  return [
    {
      name: "spec",
      model: "anthropic/claude-sonnet-4",
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
      model: "openai/gpt-4.1",
      systemPrompt:
        "You are a competitive analysis expert. Your job is to identify alternatives, compare trade-offs, " +
        "and provide an objective assessment of the pros and cons of different approaches. Be balanced.",
      userPrompt:
        `Compare the main options and alternatives for:\n\n${question}\n\n` +
        "Provide: Options Available, Pros of Each, Cons of Each, Best Use Case for Each.",
    },
    {
      name: "security",
      model: "anthropic/claude-opus-4",
      systemPrompt:
        "You are a security and compliance expert. Your job is to identify security risks, compliance " +
        "implications, and best practices. Flag anything that could expose credentials, data, or systems.",
      userPrompt:
        `Analyze the security and compliance implications of:\n\n${question}\n\n` +
        "Provide: Key Risks, Mitigations, Compliance Considerations, Security Best Practices.",
    },
    {
      name: "cost",
      model: "openai/gpt-4o-mini",
      systemPrompt:
        "You are a cost and operations analyst. Your job is to estimate costs, operational burden, " +
        "and scaling characteristics of different approaches. Be specific with numbers where possible.",
      userPrompt:
        `Analyze the cost and operational factors for:\n\n${question}\n\n` +
        "Provide: Cost Estimates, Operational Complexity, Scaling Considerations, Hidden Costs.",
    },
    {
      name: "community",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a community knowledge aggregator. Your job is to summarize what practitioners, " +
        "developers, and the broader community say about this topic based on your training knowledge. " +
        "Focus on real-world experience, not marketing copy.",
      userPrompt:
        `Summarize real-world community experience and practitioner knowledge about:\n\n${question}\n\n` +
        "Provide: Common Pain Points, What Works Well, Common Pitfalls, Practitioner Tips.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Synthesizer
// ---------------------------------------------------------------------------

function buildSynthesizerPrompt(question, reports) {
  const reportsText = reports
    .map((r) => `=== ${r.name.toUpperCase()} AGENT REPORT ===\n${r.content}`)
    .join("\n\n");

  return (
    `You are a research synthesizer. You have received reports from 5 specialized research agents on the following question:\n\n` +
    `QUESTION: ${question}\n\n` +
    `${reportsText}\n\n` +
    `Your job is to synthesize all reports into a single comprehensive research document.\n\n` +
    `Format the output as a Markdown document with these sections:\n` +
    `1. Executive Summary (2-3 sentences answering the question directly)\n` +
    `2. Recommendation (clear, actionable recommendation with reasoning)\n` +
    `3. Options Compared (table or list comparing main options)\n` +
    `4. Security Considerations\n` +
    `5. Cost Analysis\n` +
    `6. Implementation Roadmap (phases with action items)\n` +
    `7. Open Questions (things that need human decision)\n` +
    `8. Sources and References\n\n` +
    `Be specific. Include concrete steps, commands, or code snippets where helpful. Flag any contradictions between agents.`
  );
}

// ---------------------------------------------------------------------------
// Document formatter
// ---------------------------------------------------------------------------

function formatDocument(question, synthesis, date) {
  return `# Research: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}

**Version:** 1.0.0
**Date:** ${date}
**Status:** Research Document
**Author:** Revvel AI Research Module (multi-agent synthesis)
**Generated by:** \`scripts/research-module.js\`
**Related Standard:** \`AI_RESEARCH_MODULE_STANDARD.md\`

---

${synthesis}

---

*This document was generated by the Revvel AI Research Module using 5 specialized sub-agents via OpenRouter.*
*Review and validate findings before acting on recommendations.*
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const date = new Date().toISOString().split("T")[0];
  console.log(`\n🔬 Revvel AI Research Module`);
  console.log(`📋 Question: ${QUESTION}`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`📅 Date: ${date}\n`);

  const subAgents = buildSubAgents(QUESTION);

  // Run all sub-agents in parallel
  console.log(`⚡ Running ${subAgents.length} sub-agents in parallel...`);
  const startTime = Date.now();

  const agentPromises = subAgents.map(async (agent) => {
    console.log(`  → [${agent.name}] Starting (${agent.model})...`);
    try {
      const content = await callOpenRouter(agent.model, agent.systemPrompt, agent.userPrompt);
      console.log(`  ✅ [${agent.name}] Complete`);
      return { name: agent.name, content };
    } catch (err) {
      console.warn(`  ⚠️  [${agent.name}] Failed: ${err.message}`);
      return { name: agent.name, content: `Agent failed: ${err.message}` };
    }
  });

  const reports = await Promise.all(agentPromises);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ All sub-agents complete in ${elapsed}s`);

  // Synthesize
  console.log(`\n🧠 Synthesizing with claude-opus-4...`);
  const synthPrompt = buildSynthesizerPrompt(QUESTION, reports);
  let synthesis;
  try {
    synthesis = await callOpenRouter(
      "anthropic/claude-opus-4",
      "You are an expert research synthesizer. Produce clear, structured, actionable documentation.",
      synthPrompt
    );
    console.log(`✅ Synthesis complete`);
  } catch (err) {
    console.error(`❌ Synthesis failed: ${err.message}`);
    // Fall back to raw reports if synthesis fails
    synthesis = reports.map((r) => `## ${r.name}\n\n${r.content}`).join("\n\n---\n\n");
  }

  // Write output
  const document = formatDocument(QUESTION, synthesis, date);
  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, document, "utf8");
  console.log(`\n📄 Research document written to: ${outputPath}`);
  console.log(`   ${document.length.toLocaleString()} characters`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

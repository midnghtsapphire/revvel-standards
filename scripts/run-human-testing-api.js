#!/usr/bin/env node
/**
 * Revvel Human Testing API
 *
 * Simulates human behavioral testing of a target URL by dispatching
 * S.H.I.F.T.-aligned AI agents via OpenRouter. Each agent evaluates a
 * distinct dimension of the user experience (functional, accessibility,
 * neurodivergent usability, error resilience, and performance perception),
 * then a synthesizer aggregates all findings into a structured test report.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... TARGET_URL="https://yourapp.com" OUTPUT_FILE="docs/human-test-report.md" node scripts/run-human-testing-api.js
 *
 * Optional env vars:
 *   TEST_SCENARIOS   — Comma-separated list of scenarios to test (default: all)
 *   APP_NAME         — Human-readable application name for the report
 *
 * Or via GitHub Actions workflow: .github/workflows/run-human-testing-api.yml
 *
 * See: TESTING_STANDARD.md §11
 */

"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TARGET_URL = process.env.TARGET_URL;
const OUTPUT_FILE = process.env.OUTPUT_FILE;
const TEST_SCENARIOS = process.env.TEST_SCENARIOS || "all";
const APP_NAME = process.env.APP_NAME || TARGET_URL;

if (!OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY environment variable is required.");
  process.exit(1);
}
if (!TARGET_URL) {
  console.error("ERROR: TARGET_URL environment variable is required.");
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
        "X-Title": "Revvel Human Testing API",
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => { chunks.push(chunk); });
      res.on("end", () => {
        const data = Buffer.concat(chunks).toString();
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
// S.H.I.F.T. Test Agents (see TESTING_STANDARD.md §11 and SHIFT_TESTING_STANDARD.md)
// ---------------------------------------------------------------------------

function buildTestAgents(targetUrl, appName, scenarios) {
  const scenarioList = scenarios === "all"
    ? "all standard S.H.I.F.T. scenarios"
    : scenarios;

  return [
    {
      name: "functional",
      model: "anthropic/claude-sonnet-4",
      systemPrompt:
        "You are a human QA tester evaluating web applications for functional correctness. " +
        "Your job is to reason through what a real human would experience when navigating to a URL " +
        "and performing key user journeys. Evaluate based on standard usability heuristics, " +
        "expected page load behavior, API contract compliance, and error-free rendering. " +
        "Be specific about which journeys pass, which fail, and why.",
      userPrompt:
        `Perform a human-simulated functional evaluation of: ${targetUrl}\n` +
        `Application: ${appName}\n` +
        `Scenarios to evaluate: ${scenarioList}\n\n` +
        "Evaluate the following mandatory journeys and report PASS / FAIL / UNKNOWN for each:\n" +
        "1. Page loads without JavaScript console errors\n" +
        "2. Main navigation is reachable and functional\n" +
        "3. Authentication flow (sign up / sign in / sign out) completes without errors\n" +
        "4. Core happy-path user journey completes end-to-end\n" +
        "5. Form submissions succeed with valid data and reject invalid data\n" +
        "6. API responses arrive within 3 seconds on a standard connection\n\n" +
        "Format your report as:\n" +
        "Journey | Status | Observations\n" +
        "Followed by a 'Key Findings' section with actionable notes.",
    },
    {
      name: "accessibility",
      model: "anthropic/claude-sonnet-4",
      systemPrompt:
        "You are a WCAG 2.2 AA accessibility auditor and neuro-inclusive design expert. " +
        "Your job is to evaluate whether a web application is usable by people with cognitive, " +
        "motor, and visual impairments, with particular attention to neurodivergent users (ADHD, autism). " +
        "Apply S.H.I.F.T. neuro-inclusive principles: predictability, sensory control, calm microcopy, " +
        "and contrast compliance.",
      userPrompt:
        `Evaluate the accessibility and neuro-inclusive design of: ${targetUrl}\n` +
        `Application: ${appName}\n\n` +
        "Check the following S.H.I.F.T. accessibility requirements:\n" +
        "1. Predictability — Navigation elements remain in fixed DOM locations\n" +
        "2. Sensory Control — Animation/motion disable toggle exists and works\n" +
        "3. Contrast & Halation — No pure black (#000) on pure white (#FFF) for body text\n" +
        "4. Calm Microcopy — Error states use reassuring language (not 'FATAL ERROR 500')\n" +
        "5. Keyboard Navigation — All interactive elements reachable via keyboard alone\n" +
        "6. Screen Reader — ARIA labels and landmark roles present on all key regions\n" +
        "7. Focus Management — Focus is visible and logical throughout the page\n\n" +
        "Report PASS / FAIL / NEEDS_REVIEW for each item with specific observations.",
    },
    {
      name: "resilience",
      model: "anthropic/claude-opus-4",
      systemPrompt:
        "You are a chaos engineering and fault-tolerance expert who specializes in testing how " +
        "web applications behave under degraded conditions. Your job is to reason through how " +
        "a real human user would experience the application when external APIs fail, network " +
        "is slow, or data is missing. Apply S.H.I.F.T. 'Bad Day' testing principles.",
      userPrompt:
        `Evaluate the fault tolerance and degraded-state behavior of: ${targetUrl}\n` +
        `Application: ${appName}\n\n` +
        "Assess the following resilience scenarios (reason from known patterns if direct access is unavailable):\n" +
        "1. External API outage — Does the UI degrade gracefully (soft failure) or crash (hard failure)?\n" +
        "2. Empty data state — Does the page show meaningful empty state or a broken layout?\n" +
        "3. Slow network (3G simulation) — Are loading states visible and non-anxiety-inducing?\n" +
        "4. Mid-task navigation away — Is in-progress work saved or warned about?\n" +
        "5. Session expiry — Does the app redirect to login gracefully, preserving the user's context?\n" +
        "6. Invalid URL / 404 — Is the 404 page helpful or generic?\n\n" +
        "For each scenario: RESILIENT / FRAGILE / UNKNOWN, with reasoning and improvement suggestions.",
    },
    {
      name: "behavioral",
      model: "google/gemini-2.5-pro",
      systemPrompt:
        "You are a behavioral UX researcher applying the S.H.I.F.T. (Self-Healing Intent-Focused Tasks) " +
        "framework to evaluate whether an AI system or web application fulfills the user's actual intent, " +
        "not just their literal request. Evaluate across the five S.H.I.F.T. dimensions: " +
        "Memory, Reflection, Planning, Action, and System Reliability.",
      userPrompt:
        `Perform a S.H.I.F.T. behavioral validation for: ${targetUrl}\n` +
        `Application: ${appName}\n\n` +
        "Evaluate each of the five S.H.I.F.T. dimensions:\n" +
        "1. Memory — Does the system remember user preferences and past context across sessions?\n" +
        "2. Reflection — Does the system identify the user's true priority, not just the stated request?\n" +
        "3. Planning — Are multi-step workflows broken into achievable steps without cognitive overload?\n" +
        "4. Action — Are actions executed without hidden side effects or irreversible consequences without confirmation?\n" +
        "5. System Reliability — Does the system handle external data accurately without fabrication?\n\n" +
        "Score each dimension: STRONG / ADEQUATE / NEEDS_WORK / NOT_APPLICABLE\n" +
        "Include the 'Conflict Resolution' scenario: Would this system surface a critical personal dependency " +
        "BEFORE proceeding with a lower-priority work task?",
    },
    {
      name: "performance",
      model: "openai/gpt-4o-mini",
      systemPrompt:
        "You are a web performance expert evaluating user-perceived performance of web applications. " +
        "Your job is to assess Core Web Vitals, loading experience, and performance budget compliance " +
        "against Revvel's mandatory Lighthouse CI thresholds. Be specific about likely bottlenecks " +
        "based on the application type and technology stack.",
      userPrompt:
        `Evaluate the performance profile and Lighthouse compliance of: ${targetUrl}\n` +
        `Application: ${appName}\n\n` +
        "Assess against Revvel mandatory Lighthouse CI thresholds:\n" +
        "| Category | Required | Notes |\n" +
        "|---|---|---|\n" +
        "| Performance | ≥ 90 | Simulated 4G connection |\n" +
        "| Accessibility | ≥ 95 | WCAG 2.2 AA |\n" +
        "| Best Practices | ≥ 90 | HTTPS, no deprecated APIs |\n" +
        "| SEO | ≥ 95 | Meta tags, structured data |\n\n" +
        "Also evaluate:\n" +
        "- Largest Contentful Paint (LCP) — should be < 2.5s\n" +
        "- Cumulative Layout Shift (CLS) — should be < 0.1\n" +
        "- First Input Delay / INP — should be < 200ms\n" +
        "- Time to First Byte (TTFB) — should be < 800ms\n\n" +
        "Provide estimated scores, likely bottlenecks, and top 3 recommended optimizations.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Synthesizer
// ---------------------------------------------------------------------------

function buildSynthesizerPrompt(targetUrl, appName, reports) {
  const reportsText = reports
    .map((r) => `=== ${r.name.toUpperCase()} AGENT REPORT ===\n${r.content}`)
    .join("\n\n");

  return (
    `You are the Revvel Human Testing API synthesizer. You have received reports from 5 specialized ` +
    `S.H.I.F.T. testing agents evaluating: ${appName} (${targetUrl})\n\n` +
    `${reportsText}\n\n` +
    `Synthesize all agent reports into a single structured Human Testing Report.\n\n` +
    `Format the output as Markdown with these sections:\n` +
    `1. Executive Summary — Overall PASS / FAIL / NEEDS_WORK verdict with 2-3 sentence rationale\n` +
    `2. Overall Score — Score card table (Functional, Accessibility, Resilience, Behavioral, Performance)\n` +
    `3. Critical Blockers — P0 issues that must be fixed before production (if any)\n` +
    `4. S.H.I.F.T. Compliance — Detailed findings per dimension (Memory/Reflection/Planning/Action/Reliability)\n` +
    `5. Accessibility & Neuro-Inclusive Design — Detailed findings with specific element recommendations\n` +
    `6. Resilience & Error Handling — Detailed findings with recommended self-healing improvements\n` +
    `7. Performance Budget Compliance — Lighthouse scores vs. thresholds, bottleneck analysis\n` +
    `8. Recommended Fixes — Prioritized action list (P0 Critical, P1 Important, P2 Nice-to-have)\n` +
    `9. Re-test Checklist — Specific items to verify after fixes are applied\n\n` +
    `Be specific and actionable. Flag any contradictions between agent reports.`
  );
}

// ---------------------------------------------------------------------------
// Document formatter
// ---------------------------------------------------------------------------

function formatDocument(targetUrl, appName, synthesis, date) {
  return `# Human Testing Report: ${appName}

**Version:** 1.0.0
**Date:** ${date}
**Target URL:** ${targetUrl}
**Status:** Test Report
**Author:** Revvel Human Testing API (S.H.I.F.T. multi-agent evaluation)
**Generated by:** \`scripts/run-human-testing-api.js\`
**Related Standard:** \`TESTING_STANDARD.md §11\`

---

${synthesis}

---

*This report was generated by the Revvel Human Testing API using 5 specialized S.H.I.F.T. testing agents.*
*All findings should be reviewed and validated by a human before acting on recommendations.*
*Re-run this report after applying fixes to verify improvement.*
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const date = new Date().toISOString().split("T")[0];
  console.log(`\n🧪 Revvel Human Testing API`);
  console.log(`🎯 Target: ${TARGET_URL}`);
  console.log(`📋 App: ${APP_NAME}`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`📅 Date: ${date}\n`);

  const testAgents = buildTestAgents(TARGET_URL, APP_NAME, TEST_SCENARIOS);

  // Run all agents in parallel
  console.log(`⚡ Running ${testAgents.length} S.H.I.F.T. test agents in parallel...`);
  const startTime = Date.now();

  const agentPromises = testAgents.map(async (agent) => {
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
  console.log(`\n✅ All test agents complete in ${elapsed}s`);

  // Synthesize
  console.log(`\n🧠 Synthesizing with claude-opus-4...`);
  const synthPrompt = buildSynthesizerPrompt(TARGET_URL, APP_NAME, reports);
  let synthesis;
  try {
    synthesis = await callOpenRouter(
      "anthropic/claude-opus-4",
      "You are an expert QA lead synthesizing behavioral test reports into actionable findings.",
      synthPrompt
    );
    console.log(`✅ Synthesis complete`);
  } catch (err) {
    console.error(`❌ Synthesis failed: ${err.message}`);
    // Fall back to raw reports if synthesis fails
    synthesis = reports.map((r) => `## ${r.name}\n\n${r.content}`).join("\n\n---\n\n");
  }

  // Write output
  const document = formatDocument(TARGET_URL, APP_NAME, synthesis, date);
  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, document, "utf8");
  console.log(`\n📄 Human test report written to: ${outputPath}`);
  console.log(`   ${document.length.toLocaleString()} characters`);
}

if (require.main === module) {
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
}

if (typeof module !== "undefined" && module.exports) { module.exports = { main, callOpenRouter }; }

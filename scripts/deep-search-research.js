#!/usr/bin/env node
"use strict";

/**
 * Deep Search Research Script
 *
 * Runs a deep R&D research request using the Sonnet 3.5 + OpenRouter Fusion
 * routing profile, driven by Audrey's master R&D prompt (DOE Screening, TRIZ,
 * MEErP, LCA, BNAT frameworks).
 *
 * Extracted from deep-search-research.yml to keep the workflow YAML valid.
 *
 * Environment:
 *   OPENROUTER_API_KEY  - Required: OpenRouter API key (funded account)
 *   ISSUE_NUMBER        - Optional: GitHub issue number to post results to
 *   RESEARCH_QUERY      - The research question / WR title
 *   PROFILE             - Routing profile name (default: deep_search)
 *   GH_TOKEN            - Optional: GitHub token for posting issue comments
 *   REPO                - Repository in owner/repo format for issue comments
 */

const fs = require("fs");
const https = require("https");
const { callOpenRouter, ROUTING_PROFILES } = require("./openrouter-routing");

const PROFILE_NAME = process.env.PROFILE || "deep_search";

const profile =
  ROUTING_PROFILES[PROFILE_NAME] ||
  ROUTING_PROFILES.deep_search || {
    description:
      "Deep R&D research using DOE Screening, TRIZ, MEErP, LCA, and BNAT frameworks",
    models: ["anthropic/claude-sonnet-4.6", "openrouter/fusion"],
  };

const models = profile.models;

const SYSTEM_PROMPT = `You are an autonomous Lead Systems Engineer, Market Analyst, and R&D Director. You are conducting deep R&D research using rigorous engineering frameworks.

NEVER accept the initial idea at face value. Your goal is to deconstruct the root problem, research the current state-of-the-art, and determine if the idea should be refined, repurposed, or completely pivoted.

Walk through these frameworks:

**Phase 1: Core Problem Deconstruction & Market Assessment**
- Strip away the specific proposed solution. What is the fundamental problem?
- What is the current Best Available Technology (BAT) solving this?
- What emerging trends and paradigm shifts are disrupting this space?

**Phase 2: TRIZ (Theory of Inventive Problem Solving)**
- Identify contradictions in the idea
- Find existing COTS components or cross-industry solutions that can be repurposed

**Phase 3: DOE 5-Point Screening Analysis**
1. Technological Feasibility - Is it viable based on current science?
2. Practicability - Can it be manufactured/installed/serviced at scale?
3. Utility Impacts - Does it negatively impact user experience?
4. Safety - Any adverse health or environmental impacts?
5. Proprietary Roadblocks - Does it rely on un-usable proprietary tech?

**Phase 4: Life Cycle Assessment (LCA)**
- Cradle-to-grave environmental impact
- Resource depletion, energy efficiency, EoL recyclability
- Sustainable material alternatives

**Phase 5: BNAT (Best Not Yet Available Technology)**
- Identify cutting-edge lab research, patents, and early development
- If initial idea is obsolete, discard and explain the better paradigm

**Phase 6: Repository Review and Competitor Web Search**
- If the query references a GitHub repository, review it: stars, last commit, license, maintainer activity, open issues.
- If the repository is unavailable, unmaintained, or insufficient, search the internet by tool/library name for alternatives.
- List at least three competing tools, libraries, or commercial APIs. For each include: GitHub stars or npm downloads, pricing, license, last release date.
- Select the best alternative with a scored rationale (cite each differentiator).
- State a confidence score (0–100) for your primary recommendation.

**Phase 7: Final Verdict & Actionable Blueprint**
- Refine, Repurpose, or Pivot?
- Bill of Materials (BOM) and Cost-Benefit Analysis
- Specific steps, components, and execution risks

Output your research in structured markdown with clear headers for each phase.`;

async function postGitHubComment(issueNumber, repo, body) {
  const token = process.env.GH_TOKEN;
  if (!token || !issueNumber || !repo) return;

  const [owner, repoName] = repo.split("/");
  const payload = JSON.stringify({ body });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: `/repos/${owner}/${repoName}/issues/${issueNumber}/comments`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "revvel-deep-search",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`GitHub comment failed: ${res.statusCode}`));
        }
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const query = process.env.RESEARCH_QUERY;
  if (!query) {
    console.error("RESEARCH_QUERY environment variable is required");
    process.exit(1);
  }

  const issueNumber = process.env.ISSUE_NUMBER;
  const repo = process.env.REPO;

  // Detect GitHub repo URL(s) in the query so Phase 6 gets a targeted hint.
  const repoUrlMatch = query.match(/https?:\/\/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
  const repoUrlHint = repoUrlMatch
    ? `\n\nPrimary GitHub repository to review in Phase 6: ${repoUrlMatch[0]}\nIf this repository is unavailable or unmaintained, perform a full web search for the tool name "${repoUrlMatch[1].split("/").pop()}" to identify the best alternative.`
    : "";

  console.log("Deep Search Research");
  console.log("=".repeat(50));
  console.log(`Profile: ${PROFILE_NAME} (${profile.description})`);
  console.log(`Models: ${models.join(" → ")}`);
  console.log(`Query: ${query}`);
  if (repoUrlHint) console.log("Repository detected — Phase 6 competitor search enabled.");
  console.log("");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Research this issue/request:\n\n${query}${repoUrlHint}\n\nProvide a comprehensive deep research report following all 7 phases above.`,
    },
  ];

  let result;
  try {
    result = await callOpenRouter({
      models,
      messages,
      temperature: 0.7,
      max_tokens: 8000,
    });
  } catch (err) {
    console.error("Research failed:", err.message);
    process.exit(1);
  }

  const resultText = result.text;

  console.log("\n=== RESEARCH RESULTS ===\n");
  console.log(resultText);
  console.log("\n=== END RESULTS ===\n");

  // Save to temp file for the workflow to read
  fs.writeFileSync("/tmp/deep-research-results.md", resultText, "utf8");
  console.log("Results saved to /tmp/deep-research-results.md");

  // Post to GitHub issue if configured
  if (issueNumber && repo) {
    const commentBody = `## 🔬 Deep R&D Research Results

> Using **${models.join(" + ")}** with DOE Screening, TRIZ, MEErP, LCA, BNAT, and Competitor Web Search frameworks.

${resultText}

---
*Research powered by Deep Search with R&D Engineering Framework*`;

    try {
      await postGitHubComment(issueNumber, repo, commentBody);
      console.log(`Posted research results to issue #${issueNumber}`);
    } catch (err) {
      // Non-fatal — results were already printed and saved to file
      console.warn(`Warning: could not post to issue: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

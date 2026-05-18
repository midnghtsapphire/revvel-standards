#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const perplexityResearch = require("../scripts/perplexity-research-issue.js");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`FAIL: ${name}`);
    console.log(error.stack || error.message);
    failed += 1;
  }
}

async function run() {
  await test("builds a complete WR research prompt", () => {
    const prompt = perplexityResearch.buildResearchPrompt({
      number: 123,
      title: "Need a no-key Perplexity handoff",
      body: "Research this fork and wire it into the repo.",
      labels: ["wr:research"],
      comments: [
        {
          author: { login: "midnghtsapphire" },
          body: "Use the fork instead of an API key.",
        },
      ],
    });

    assert.ok(prompt.includes("## Diagnosis"));
    assert.ok(prompt.includes("Source URLs"));
    assert.ok(prompt.includes("Need a no-key Perplexity handoff"));
    assert.ok(prompt.includes("Use the fork instead of an API key."));
  });

  await test("normalizes mocked no-key provider output with audit footer", async () => {
    const research = await perplexityResearch.callPerplexity("research query", undefined, {
      runner: async () => ({
        provider: "helallao/perplexity-ai",
        mode: "labs",
        model: "sonar",
        answer: "## Diagnosis\nMocked source-backed answer.",
      }),
    });

    assert.ok(research.includes("Mocked source-backed answer."));
    assert.ok(research.includes("no official Perplexity API key used"));
    assert.ok(research.includes("helallao/perplexity-ai"));
  });

  await test("parses the last JSON line from noisy Python output", () => {
    const parsed = perplexityResearch.parseLastJsonLine(
      'dependency log line\n{"answer":"ok","provider":"helallao/perplexity-ai"}\n',
    );
    assert.strictEqual(parsed.answer, "ok");
  });

  await test("script and workflow do not require PERPLEXITY_API_KEY", () => {
    const root = path.resolve(__dirname, "..");
    const script = fs.readFileSync(
      path.join(root, "scripts", "perplexity-research-issue.js"),
      "utf8",
    );
    const workflow = fs.readFileSync(
      path.join(root, ".github", "workflows", "perplexity-research-agent.yml"),
      "utf8",
    );
    const gatekeeper = fs.readFileSync(
      path.join(root, ".github", "workflows", "credential-gatekeeper.yml"),
      "utf8",
    );
    const mcpConfig = fs.readFileSync(path.join(root, ".mcp.json"), "utf8");

    assert.ok(!script.includes("process.env.PERPLEXITY_API_KEY"));
    assert.ok(!workflow.includes("secrets.PERPLEXITY_API_KEY"));
    assert.ok(!gatekeeper.includes("secret: 'PERPLEXITY_API_KEY'"));
    assert.ok(workflow.includes("git+https://github.com/helallao/perplexity-ai.git@main"));
    assert.ok(mcpConfig.includes('"perplexity-no-key"'));
  });
}

run()
  .catch((error) => {
    console.error(error);
    failed += 1;
  })
  .finally(() => {
    console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });

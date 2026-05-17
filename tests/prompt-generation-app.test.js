#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const {
  COMPETITORS,
  RESEARCH_SOURCES,
  buildChecklist,
  generatePromptPacket,
  scoreOpportunity
} = require(path.join(__dirname, "..", "products", "prompt-generation-app", "lib", "prompt-generator.js"));

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("includes market, competitor, and internal source evidence", () => {
  assert.ok(RESEARCH_SOURCES.some((source) => source.id === "research-and-markets-2026"));
  assert.ok(RESEARCH_SOURCES.some((source) => source.id === "promptbase-marketplace"));
  assert.ok(RESEARCH_SOURCES.some((source) => source.id === "oz-prompt-library"));
  assert.ok(COMPETITORS.length >= 5);
});

test("builds a complete due-diligence checklist", () => {
  const checklist = buildChecklist();
  const ids = checklist.map((item) => item.id);
  assert.deepStrictEqual(ids, [
    "problem",
    "internal-search",
    "market-facts",
    "competitors",
    "chatter",
    "legal-osint",
    "offer",
    "review"
  ]);
  assert.ok(checklist.every((item) => item.status === "complete"));
});

test("generates packet with all prompt types and export markdown", () => {
  const packet = generatePromptPacket({
    idea: "Build a prompt generator for research-backed PRs",
    audience: "founders and agencies",
    outputType: "app",
    channel: "agency",
    monetizationGoal: "$99 monthly prompt workspace",
    constraints: "Public sources only",
    researchDepth: "market, SEO, competitors, chatter"
  });

  assert.match(packet.problemSolved, /source-backed prompt packets/);
  assert.match(packet.differentiation, /due-diligence prompt generator/);
  assert.match(packet.prompts.master, /Treat the user's raw idea as hearsay/);
  assert.match(packet.prompts.research, /legal, public, non-credentialed sources/);
  assert.match(packet.prompts.builder, /Visible research checklist/);
  assert.match(packet.prompts.reviewer, /unsupported claims/);
  assert.match(packet.markdown, /# Prompt Research Packet/);
  assert.match(packet.markdown, /## Sources/);
});

test("scores generic prompt libraries as more red-ocean than specialized packets", () => {
  const generic = scoreOpportunity({
    idea: "Create a prompt library marketplace",
    audience: "everyone",
    outputType: "app",
    monetizationGoal: "paid prompt sales"
  });

  const specialized = scoreOpportunity({
    idea: "Create a research-backed prompt app for founders",
    audience: "small business founders",
    outputType: "mcp",
    monetizationGoal: "$499 setup service"
  });

  assert.ok(generic.redOcean > specialized.redOcean);
  assert.ok(specialized.blueOcean > generic.blueOcean);
});

test("normalizes empty inputs into a usable packet", () => {
  const packet = generatePromptPacket({
    idea: "",
    audience: "",
    outputType: "unknown",
    channel: "unknown",
    monetizationGoal: "",
    constraints: "",
    researchDepth: ""
  });

  assert.strictEqual(packet.input.outputType, "app");
  assert.strictEqual(packet.input.channel, "unknown");
  assert.ok(packet.channels.length > 0);
  assert.match(packet.markdown, /Create a prompt-generation app for Revvel work requests/);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

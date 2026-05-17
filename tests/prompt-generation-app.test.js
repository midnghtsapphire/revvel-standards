'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const {
  generatePromptPacket,
  packetToMarkdown,
} = require(path.join('..', 'products', 'prompt-generation-app', 'lib', 'prompt-generator.js'));

function run(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
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

console.log('prompt-generation-app');

run('throws on missing idea', () => {
  assert.throws(() => generatePromptPacket({}));
  assert.throws(() => generatePromptPacket({ idea: '   ' }));
});

run('generates packet with all sections', () => {
  const p = generatePromptPacket({ idea: 'OSINT tool for tracking competitor pricing', audience: 'founders' });
  assert.equal(p.idea, 'OSINT tool for tracking competitor pricing');
  assert.equal(p.audience, 'founders');
  assert.ok(p.marketFacts.length >= 3);
  assert.ok(p.competitorGaps.length >= 3);
  assert.ok(p.legalBoundaries.length >= 3);
  assert.ok(p.implementationPrompts.length >= 3);
  assert.ok(p.reviewerPrompts.length >= 3);
  assert.ok(p.scores.blueOcean >= 0 && p.scores.blueOcean <= 100);
  assert.ok(p.scores.redOcean >= 0 && p.scores.redOcean <= 100);
});

run('every market fact has a source URL', () => {
  const p = generatePromptPacket({ idea: 'AI compliance audit tool' });
  p.marketFacts.forEach((f) => {
    assert.match(f.source, /^https?:\/\//);
    assert.ok(f.claim.length > 0);
  });
});

run('blue-ocean score boosts on niche keywords', () => {
  const niche = generatePromptPacket({ idea: 'AI OSINT compliance audit for vertical B2B' });
  const generic = generatePromptPacket({ idea: 'social chat todo note app' });
  assert.ok(niche.scores.blueOcean > generic.scores.blueOcean);
  assert.ok(generic.scores.redOcean > niche.scores.redOcean);
});

run('markdown export contains all section headers', () => {
  const p = generatePromptPacket({ idea: 'Polar.sh funding analytics for OSS maintainers' });
  const md = packetToMarkdown(p);
  assert.ok(md.includes('# Prompt Packet:'));
  assert.ok(md.includes('## Market Facts'));
  assert.ok(md.includes('## Competitor Gaps'));
  assert.ok(md.includes('## Legal / OSINT Boundaries'));
  assert.ok(md.includes('## Implementation Prompts'));
  assert.ok(md.includes('## Reviewer Prompts'));
});

run('deterministic output for same input', () => {
  const a = generatePromptPacket({ idea: 'same idea', audience: 'agencies' });
  const b = generatePromptPacket({ idea: 'same idea', audience: 'agencies' });
  assert.deepEqual(a, b);
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

#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const engine = require("../scripts/research-engine.js");

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
  const tests = [];

  function queue(name, fn) {
    tests.push({ name, fn });
  }

  queue("defines the full research lane set requested by the WR", () => {
    const laneIds = engine.LANE_DEFINITIONS.map((lane) => lane.id);
    for (const required of [
      "market-positioning",
      "seo-demand",
      "competitor-intel",
      "audience-chatter",
      "factual-validation",
      "technical-delivery",
      "revenue-mechanics",
      "review-autofix",
    ]) {
      assert.ok(laneIds.includes(required), `${required} lane missing`);
    }
    assert.ok(engine.MASTER_CHECKLIST.length >= 8);
  });

  queue("uses three OpenRouter models for triangulated research", () => {
    assert.deepStrictEqual(engine.selectModels("triangulated"), engine.MODEL_TRIAD);
    assert.strictEqual(engine.selectModels("standard").length, 1);
    assert.strictEqual(engine.parseDepth("swarm"), "swarm");
  });

  queue("builds lane prompts with checklist and automatic-fix requirements", () => {
    const lane = engine.LANE_DEFINITIONS.find((item) => item.id === "review-autofix");
    const prompt = engine.buildLaneUserPrompt(lane, {
      query: "Research engine PR",
      issueTitle: "Need a whole engine",
      issueBody: "Marketing, SEO, competitors, audience, chatter",
      extraContext: "",
    });
    assert.ok(prompt.includes("Lane checklist"));
    assert.ok(prompt.includes("automatic-fix hook"));
    assert.ok(prompt.includes("Recommend"));
  });

  queue("review comment carries the coder trigger phrase only for PRs", () => {
    const lanes = engine.LANE_DEFINITIONS;
    const issueComment = engine.buildReviewRequestComment({ outputFile: "/tmp/x.md", laneReports: lanes });
    const prComment = engine.buildReviewRequestComment({ outputFile: "/tmp/x.md", laneReports: lanes, includeCoderTrigger: true });
    // Issues auto-advance via the wr:research-complete label, so the comment must
    // NOT also carry the phrase (would double-fire the coder). PRs need the phrase.
    assert.ok(!issueComment.includes("Research Findings:"), "issue comment must omit the coder trigger phrase");
    assert.ok(prComment.includes("Research Findings:"), "PR comment must include the coder trigger phrase");
  });

  queue("findings comment carries synthesis so WR generation can proceed without a committed packet", () => {
    const comment = engine.buildFindingsComment({
      outputFile: "docs/research-engine/run-123.md",
      synthesis: "## Executive Summary\n\nActionable findings live here.",
    });
    assert.ok(comment.includes("## Research Findings"));
    assert.ok(comment.includes("docs/research-engine/run-123.md"));
    assert.ok(comment.includes("## Executive Summary"));
    assert.ok(comment.includes("Actionable findings live here."));
  });

  queue("formats missing-key packets as visible infrastructure blockers", () => {
    const packet = engine.buildMissingKeyReport({
      query: "research",
      outputFile: "docs/research-engine/research.md",
    });
    assert.strictEqual(packet.laneReports.length, engine.LANE_DEFINITIONS.length);
    assert.ok(packet.synthesis.includes("OPENROUTER_API_KEY"));
    assert.ok(packet.synthesis.includes("infrastructure blocker"));
  });

  queue("runs the engine offline with mocked model calls and writes output", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "research-engine-"));
    const outputFile = path.join(tmpDir, "packet.md");
    const calls = [];
    const result = await engine.runResearchEngine(
      {
        apiKey: "test-key",
        githubToken: "",
        repository: "midnghtsapphire/revvel-standards",
        issueNumber: "",
        prNumber: "",
        query: "Build a research engine",
        issueTitle: "",
        issueBody: "",
        outputFile,
        depth: "standard",
        extraContext: "",
        dryRun: true,
      },
      async ({ model, systemPrompt, userPrompt }) => {
        calls.push({ model, systemPrompt, userPrompt });
        return `Mocked ${model} output with source https://example.com/${calls.length}`;
      },
    );
    assert.strictEqual(result.status, "complete");
    assert.ok(fs.existsSync(outputFile));
    const output = fs.readFileSync(outputFile, "utf8");
    assert.ok(output.includes("Research Engine Packet"));
    assert.ok(output.includes("Code Review Handoff"));
    assert.ok(output.includes("Mocked"));
    assert.strictEqual(calls.length, engine.LANE_DEFINITIONS.length + 1);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  queue("findAndRequestLinkedPrReviews processes all linked PRs concurrently", async () => {
    const labelCalls = [];
    const commentCalls = [];
    const prs = [{ number: 1 }, { number: 2 }, { number: 3 }];
    const context = {
      githubToken: "token",
      issueNumber: "42",
      prNumber: "",
      repository: "owner/repo",
      outputFile: "out.md",
    };
    await engine.findAndRequestLinkedPrReviews(context, {
      listPrs: async () => prs,
      applyLabels: async (args) => labelCalls.push(args),
      applyComment: async (args) => commentCalls.push(args),
    });
    assert.strictEqual(labelCalls.length, 3, "should call addLabels for each PR");
    assert.strictEqual(commentCalls.length, 3, "should call postComment for each PR");
    assert.deepStrictEqual(
      labelCalls.map((c) => c.number).sort((a, b) => a - b),
      [1, 2, 3],
    );
  });

  queue("findAndRequestLinkedPrReviews is skipped when context.prNumber is set", async () => {
    let listCalled = false;
    await engine.findAndRequestLinkedPrReviews(
      { githubToken: "token", issueNumber: "42", prNumber: "10", repository: "owner/repo", outputFile: "out.md" },
      { listPrs: async () => { listCalled = true; return []; } },
    );
    assert.strictEqual(listCalled, false, "should not list PRs when prNumber is set");
  });

  queue("findAndRequestLinkedPrReviews continues and logs when one PR write fails", async () => {
    const commentCalls = [];
    const warnings = [];
    const origLog = console.log;
    console.log = (msg) => { if (String(msg).startsWith("::warning::")) warnings.push(msg); };
    try {
      await engine.findAndRequestLinkedPrReviews(
        {
          githubToken: "token",
          issueNumber: "42",
          prNumber: "",
          repository: "owner/repo",
          outputFile: "out.md",
        },
        {
          listPrs: async () => [{ number: 1 }, { number: 2 }],
          applyLabels: async ({ number }) => {
            if (number === 1) throw new Error("label write failed");
          },
          applyComment: async (args) => commentCalls.push(args),
        },
      );
    } finally {
      console.log = origLog;
    }
    assert.strictEqual(commentCalls.length, 1, "successful PR should still get a comment");
    assert.strictEqual(commentCalls[0].number, 2, "the successful comment should be for PR #2");
    assert.strictEqual(warnings.length, 1, "failed PR should emit a warning");
    assert.ok(warnings[0].includes("#1"), "warning should identify the failed PR number");
  });

  for (const item of tests) {
    await test(item.name, item.fn);
  }

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

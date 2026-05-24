#!/usr/bin/env node
"use strict";

/**
 * Unit tests for scripts/llm.js — the no-key-first, OpenRouter-backup helper.
 * Uses the injectable seams (_noKey/_openRouter) so no live calls are made.
 */

const assert = require("assert");
const { ask, DEFAULT_FALLBACK_MODELS } = require("../scripts/llm");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
}

async function run() {
  await test("exports ask and a Perplexity-first fallback chain", () => {
    assert.strictEqual(typeof ask, "function");
    assert.ok(Array.isArray(DEFAULT_FALLBACK_MODELS));
    assert.strictEqual(DEFAULT_FALLBACK_MODELS[0], "perplexity/sonar-pro");
  });

  await test("uses the free no-key lane when it succeeds", async () => {
    const seen = [];
    const res = await ask("hello", {
      silent: true,
      _noKey: async (p) => { seen.push(p); return "no-key answer"; },
      _openRouter: async () => { throw new Error("should not be called"); },
    });
    assert.strictEqual(res.lane, "no-key-perplexity");
    assert.strictEqual(res.text, "no-key answer");
    assert.strictEqual(seen.length, 1);
  });

  await test("prepends the system instruction to the no-key prompt", async () => {
    let captured = "";
    await ask("question", {
      system: "be terse",
      silent: true,
      _noKey: async (p) => { captured = p; return "ok"; },
    });
    assert.ok(captured.includes("be terse"));
    assert.ok(captured.includes("question"));
  });

  await test("falls back to OpenRouter when the no-key lane fails", async () => {
    const res = await ask("hello", {
      silent: true,
      _noKey: async () => { throw new Error("rate limited"); },
      _openRouter: async ({ models, messages }) => {
        assert.deepStrictEqual(models, DEFAULT_FALLBACK_MODELS);
        assert.strictEqual(messages[messages.length - 1].content, "hello");
        return { text: "openrouter answer", modelUsed: "anthropic/claude-sonnet-4", requestedModels: models };
      },
    });
    assert.strictEqual(res.lane, "openrouter");
    assert.strictEqual(res.text, "openrouter answer");
    assert.strictEqual(res.modelUsed, "anthropic/claude-sonnet-4");
  });

  await test("preferNoKey:false skips the no-key lane entirely", async () => {
    let noKeyCalled = false;
    const res = await ask("hello", {
      preferNoKey: false,
      silent: true,
      _noKey: async () => { noKeyCalled = true; return "x"; },
      _openRouter: async () => ({ text: "or", modelUsed: "m" }),
    });
    assert.strictEqual(noKeyCalled, false);
    assert.strictEqual(res.lane, "openrouter");
  });

  await test("rejects an empty prompt", async () => {
    await assert.rejects(() => ask("", { silent: true }), /non-empty string prompt/);
  });

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.log(`FAIL: test runner\n    ${error.stack || error.message}`);
  process.exit(1);
});

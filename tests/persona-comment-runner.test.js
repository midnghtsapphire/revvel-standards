#!/usr/bin/env node
"use strict";

/**
 * Unit tests for scripts/persona-comment-runner.js — the comment trigger parser.
 * Pure parsing; no live calls.
 */

const assert = require("assert");
const { parsePersonaCommand } = require("../scripts/persona-comment-runner");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
}

test("parses @professor mention with a task", () => {
  const cmd = parsePersonaCommand("@professor what is the TAM for self-hosted AI chat?");
  assert.strictEqual(cmd.handle, "professor");
  assert.strictEqual(cmd.task, "what is the TAM for self-hosted AI chat?");
});

test("parses other persona mentions", () => {
  assert.strictEqual(parsePersonaCommand("@oaudrey triage this").handle, "oaudrey");
  assert.strictEqual(parsePersonaCommand("@mindmappr outline a plan").handle, "mindmappr");
  assert.strictEqual(parsePersonaCommand("@openrouter route this").handle, "openrouter");
});

test("parses the /persona <name> <task> form", () => {
  const cmd = parsePersonaCommand("/persona professor research the OSINT market");
  assert.strictEqual(cmd.handle, "professor");
  assert.strictEqual(cmd.task, "research the OSINT market");
});

test("is case-insensitive on the handle", () => {
  assert.strictEqual(parsePersonaCommand("@Professor hello").handle, "professor");
  assert.strictEqual(parsePersonaCommand("/persona MindMappr go").handle, "mindmappr");
});

test("falls back to the full body as task when only a mention is present", () => {
  const cmd = parsePersonaCommand("@professor");
  assert.strictEqual(cmd.handle, "professor");
  assert.strictEqual(cmd.task, "@professor");
});

test("returns null when there is no persona trigger", () => {
  assert.strictEqual(parsePersonaCommand("just a normal comment"), null);
  assert.strictEqual(parsePersonaCommand("/persona nobody do x"), null);
  assert.strictEqual(parsePersonaCommand(""), null);
  assert.strictEqual(parsePersonaCommand(null), null);
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

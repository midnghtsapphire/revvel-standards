#!/usr/bin/env node
"use strict";

/**
 * Regression tests for wr/scripts/wr-lint.mjs.
 *
 * Focus: rule 7 (false-completion checklist) must treat the GitHub issue-form
 * "_No response_" blank-field artifact as a forbidden placeholder, so checked
 * acknowledgements no longer pass lint while long-form WR fields are empty
 * (issue #15080). The linter is an ESM CLI that calls process.exit, so we
 * exercise it as a subprocess against temp fixtures rather than importing it.
 */

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LINTER = path.join(__dirname, "..", "wr", "scripts", "wr-lint.mjs");

function runLint(markdown) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wr-lint-"));
  const file = path.join(dir, "wr.md");
  fs.writeFileSync(file, markdown, "utf8");
  try {
    const res = spawnSync(process.execPath, [LINTER, file], { encoding: "utf8" });
    return { status: res.status, stdout: res.stdout || "" };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const CHECKED_ACK = [
  "## Acknowledgements",
  "- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.",
  "- [x] The PR should reflect the WR's required bundle and definition of done.",
].join("\n");

test("flags checked acknowledgements when fields are blank (_No response_)", () => {
  const md = [
    "# WR: Add discoverability layers",
    "",
    "**Summary:** _No response_",
    "",
    "## Definition of Done",
    "",
    "_No response_",
    "",
    CHECKED_ACK,
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 1, "expected non-zero exit for false-completion");
  assert.match(stdout, /2 \[x\] item\(s\)/);
  assert.match(stdout, /false-completion signal/);
});

test("flags _No response_ with no space after a field-label colon", () => {
  const md = [
    "# WR: Add discoverability layers",
    "",
    "**Summary:**_No response_",
    "",
    CHECKED_ACK,
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 1, "punctuation-adjacent _No response_ must trip rule 7");
  assert.match(stdout, /false-completion signal/);
});

test("passes when the same checklist has genuinely filled fields", () => {
  const md = [
    "# WR: Add discoverability layers",
    "",
    "**Summary:** Add REMINDERS scaffold and fix the dual-trigger bug.",
    "",
    "## Definition of Done",
    "",
    "The functional change is implemented and referenced docs are updated.",
    "",
    CHECKED_ACK,
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 0, `expected clean exit, got output:\n${stdout}`);
  assert.match(stdout, /All clean/);
});

test("does not flag _No response_ inside a fenced code block", () => {
  const md = [
    "# WR: Document the blank-field artifact",
    "",
    "GitHub renders unfilled optional fields like this:",
    "",
    "```",
    "**Summary:** _No response_",
    "```",
    "",
    CHECKED_ACK,
    "",
  ].join("\n");
  const { status } = runLint(md);
  assert.strictEqual(status, 0, "code-fenced _No response_ must not trip rule 7");
});

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
    const res = spawnSync(process.execPath, [LINTER, file], {
      encoding: "utf8",
    });
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
  assert.strictEqual(
    status,
    1,
    "punctuation-adjacent _No response_ must trip rule 7",
  );
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
  assert.strictEqual(
    status,
    0,
    "code-fenced _No response_ must not trip rule 7",
  );
});

// Rule 4 (template/type mismatch) must treat the DRAGNET fix persona
// (/dragnet and its fix aliases) as a BASIC short-form WR, so a product
// section in a dragnet-fix WR is flagged as the wrong template. Other persona
// slash commands stay FULL long-form and keep their product sections (#15122).
test("flags product section in a /dragnet fix WR (BASIC short-form persona)", () => {
  const md = [
    "# WR: /dragnet assignee label dragnet-assignee fix still long-form template",
    "",
    "## Executive Summary",
    "",
    "This should not appear in a bug-fix WR.",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    1,
    "dragnet-fix WR with a product section must fail rule 4",
  );
  assert.match(stdout, /wrong template; use WR_TEMPLATE_BASIC\.md/);
});

test("does not flag product section for a non-fix persona slash command (FULL long-form)", () => {
  const md = [
    "# WR: /scholar research the affiliate market opportunity",
    "",
    "## Executive Summary",
    "",
    "Long-form product research belongs in the FULL template.",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    0,
    `research persona WR must stay FULL, got:\n${stdout}`,
  );
});

// Rule 11: REVVEL-DISABLED archival comment validation
test("flags REVVEL-DISABLED block missing required metadata fields", () => {
  const md = [
    "# WR: Fix broken auth middleware",
    "",
    "Code was disabled to unblock CI.",
    "",
    "```js",
    "// REVVEL-DISABLED | AGENT: copilot | DATE: 2026-01-15 | STATUS: FAILED",
    "// REASON: middleware throws under Node 20",
    "// const authCheck = require('./auth');",
    "// REVVEL-DISABLED-END",
    "```",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    1,
    "REVVEL-DISABLED block missing MODEL: and WR: must fail rule 11",
  );
  assert.match(stdout, /REVVEL-DISABLED block missing required field/);
});

test("passes a well-formed REVVEL-DISABLED block with all required fields", () => {
  const md = [
    "# WR: Fix broken auth middleware",
    "",
    "Code was disabled to unblock CI.",
    "",
    "```js",
    "// REVVEL-DISABLED | AGENT: copilot | MODEL: claude-sonnet-4-5 | WR: #1234 | DATE: 2026-01-15 | STATUS: FAILED",
    "// REASON: middleware throws under Node 20; needs investigation",
    "// const authCheck = require('./auth');",
    "// REVVEL-DISABLED-END",
    "```",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    0,
    `well-formed REVVEL-DISABLED block must pass, got:\n${stdout}`,
  );
});

test("flags an unclosed REVVEL-DISABLED block", () => {
  const md = [
    "# WR: Fix broken auth middleware",
    "",
    "```js",
    "// REVVEL-DISABLED | AGENT: copilot | MODEL: claude-sonnet-4-5 | WR: #1234 | DATE: 2026-01-15 | STATUS: FAILED",
    "// REASON: unclosed block test",
    "// const authCheck = require('./auth');",
    "```",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    1,
    "unclosed REVVEL-DISABLED block must fail rule 11",
  );
  assert.match(stdout, /REVVEL-DISABLED block opened but never closed/);
});

// A prose MENTION of the token (no pipe-separated header) must not open a
// phantom block. WR_TEMPLATE_FULL.md's "Superseded Content" guidance comments
// reference REVVEL-DISABLED by name; before the opener regex required the
// canonical `REVVEL-DISABLED |` header shape, every FULL-template WR failed
// generation with "opened but never closed" (issue #15215 fallout).
test("does not treat a prose mention of REVVEL-DISABLED as a block opener", () => {
  const md = [
    "# WR: Ship the new widget",
    "",
    "## Superseded Content",
    "",
    "<!-- Per RVS-AGENT-001: replaced code must be commented out with a",
    "     REVVEL-DISABLED header rather than deleted. -->",
    "<!-- Archival status options: COMMENTED-OUT (code commented with REVVEL-DISABLED),",
    "     NOT-APPLICABLE (no code was removed). -->",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| Supersedes WR/issue | N/A |",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    0,
    `prose mention of REVVEL-DISABLED must not open a block, got:\n${stdout}`,
  );
});

// Rule 12: deferral placeholders must be flagged as a hard lint failure.
test("flags N/A — pending Jules refinement as a deferral placeholder", () => {
  const md = [
    "# WR: Improve affiliate link pipeline",
    "",
    "## Executive Summary",
    "",
    "N/A — pending Jules refinement",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 1, "pending Jules refinement must fail rule 12");
  assert.match(stdout, /deferral placeholder/);
  assert.match(stdout, /N\/A.*pending Jules refinement/i);
});

test("flags N/A — pending human review as a deferral placeholder", () => {
  const md = [
    "# WR: Improve affiliate link pipeline",
    "",
    "## Risks",
    "",
    "N/A — pending human review",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 1, "pending human review must fail rule 12");
  assert.match(stdout, /deferral placeholder/);
});

test("flags 'pending refinement' as a deferral placeholder", () => {
  const md = [
    "# WR: Improve affiliate link pipeline",
    "",
    "## Dependencies",
    "",
    "pending refinement",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 1, "pending refinement must fail rule 12");
  assert.match(stdout, /deferral placeholder/);
});

test("flags TBD as a deferral placeholder", () => {
  const md = [
    "# WR: New checkout widget",
    "",
    "## Monetization",
    "",
    "TBD",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 1, "TBD must fail rule 12");
  assert.match(stdout, /deferral placeholder/);
});

test("flags TODO as a deferral placeholder", () => {
  const md = [
    "# WR: New checkout widget",
    "",
    "## Recommendations",
    "",
    "TODO: fill this in",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(status, 1, "TODO must fail rule 12");
  assert.match(stdout, /deferral placeholder/);
});

test("does not flag deferral phrases inside a fenced code block", () => {
  const md = [
    "# WR: Document the lint rule",
    "",
    "Below is an example of a forbidden phrase (shown in a code block):",
    "",
    "```",
    "N/A — pending Jules refinement",
    "TBD",
    "TODO",
    "```",
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    0,
    `deferral phrases in fenced code must not trip rule 12, got:\n${stdout}`,
  );
});

test("deferral placeholder also triggers false-completion when checklist is checked", () => {
  const md = [
    "# WR: Add discoverability layers",
    "",
    "## Executive Summary",
    "",
    "N/A — pending Jules refinement",
    "",
    CHECKED_ACK,
    "",
  ].join("\n");
  const { status, stdout } = runLint(md);
  assert.strictEqual(
    status,
    1,
    "deferral placeholder + checked ack must fail both rule 7 and rule 12",
  );
  assert.match(stdout, /deferral placeholder/);
  assert.match(stdout, /false-completion signal/);
});

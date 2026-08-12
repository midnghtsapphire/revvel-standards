#!/usr/bin/env node
"use strict";

/**
 * Unit tests for scripts/persona-comment-runner.js — the comment trigger parser.
 * Pure parsing; no live calls.
 */

const assert = require("assert");
const {
  parsePersonaCommand,
  sanitizeMentions,
  isEmoticonBankRequest,
  isResearchRequest,
  renderEmoticonBankMarkdown,
  formatSummonFailureComment,
} = require("../scripts/persona-comment-runner");

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

test("parses /professor shortcut with a task", () => {
  const cmd = parsePersonaCommand("/professor what is the TAM for self-hosted AI chat?");
  assert.strictEqual(cmd.handle, "professor");
  assert.strictEqual(cmd.task, "what is the TAM for self-hosted AI chat?");
});

test("parses other persona shortcuts", () => {
  assert.strictEqual(parsePersonaCommand("/oaudrey triage this").handle, "oaudrey");
  assert.strictEqual(parsePersonaCommand("/mindmappr outline a plan").handle, "mindmappr");
  assert.strictEqual(parsePersonaCommand("/openrouter route this").handle, "openrouter");
});

test("parses emoji shortcuts for low-typing commands", () => {
  assert.strictEqual(parsePersonaCommand("/🧠 triage this").handle, "oaudrey");
  assert.strictEqual(parsePersonaCommand("/🎓 research this market").handle, "professor");
  assert.strictEqual(parsePersonaCommand("/🕵️ fix this CI error").handle, "dragnet");
  assert.strictEqual(parsePersonaCommand("/🔎 fix this CI error").handle, "dragnet");
  const emojiOnly = parsePersonaCommand("/🕵️");
  assert.strictEqual(emojiOnly.handle, "dragnet");
  assert.strictEqual(emojiOnly.task, "/🕵️");
});

test("parses the /persona <name> <task> form", () => {
  const cmd = parsePersonaCommand("/persona professor research the OSINT market");
  assert.strictEqual(cmd.handle, "professor");
  assert.strictEqual(cmd.task, "research the OSINT market");
});

test("is case-insensitive on the handle", () => {
  assert.strictEqual(parsePersonaCommand("/Professor hello").handle, "professor");
  assert.strictEqual(parsePersonaCommand("/persona MindMappr go").handle, "mindmappr");
});

test("does NOT trigger on an @name mention (avoids pinging real users)", () => {
  assert.strictEqual(parsePersonaCommand("@professor what is the TAM?"), null);
  assert.strictEqual(parsePersonaCommand("thanks @oaudrey"), null);
});

test("falls back to the full body as task when only a shortcut is present", () => {
  const cmd = parsePersonaCommand("/professor");
  assert.strictEqual(cmd.handle, "professor");
  assert.strictEqual(cmd.task, "/professor");
});

test("returns null when there is no persona trigger", () => {
  assert.strictEqual(parsePersonaCommand("just a normal comment"), null);
  assert.strictEqual(parsePersonaCommand("/persona nobody do x"), null);
  assert.strictEqual(parsePersonaCommand(""), null);
  assert.strictEqual(parsePersonaCommand(null), null);
});

test("detects an action verb (execution mode)", () => {
  assert.strictEqual(parsePersonaCommand("/oaudrey build a CSV exporter").action, "build");
  assert.strictEqual(parsePersonaCommand("/openrouter implement X").action, "implement");
  assert.strictEqual(parsePersonaCommand("/persona oaudrey create a landing page").action, "create");
  assert.strictEqual(parsePersonaCommand("/oaudrey Fix the parser").action, "fix");
});

test("a question is advisory (no action)", () => {
  assert.strictEqual(parsePersonaCommand("/professor what is the TAM?").action, null);
  assert.strictEqual(parsePersonaCommand("/oaudrey how should we route this?").action, null);
});

// Issue #15480: "/dragnet please do a fix" parsed as NO action because the
// verb regex was anchored at ^ — politeness prefixes must be skipped.
test("politeness prefixes still enter execution mode", () => {
  assert.strictEqual(parsePersonaCommand("/dragnet please do a fix").action, "do");
  assert.strictEqual(parsePersonaCommand("/dragnet can you fix the gate").action, "fix");
  assert.strictEqual(parsePersonaCommand("/oaudrey kindly build a CSV exporter").action, "build");
  assert.strictEqual(parsePersonaCommand("/dragnet Please Fix this error").action, "fix");
});

// Issue #15480: "/dragnet please research ... search loop ..." must route to
// the Research Engine search loop, not a one-shot advisory chat reply.
test("detects DRAGNET research / search-loop requests", () => {
  assert.strictEqual(
    isResearchRequest("please research use the search loop until every field is filled out in full detail?"),
    true
  );
  assert.strictEqual(isResearchRequest("research the OSINT market"), true);
  assert.strictEqual(isResearchRequest("please deep-research pricing chatter"), true);
  assert.strictEqual(isResearchRequest("run the search loop again"), true);
  assert.strictEqual(isResearchRequest("diagnose this workflow timeout"), false);
  assert.strictEqual(isResearchRequest("fix the CI gate"), false);
  assert.strictEqual(isResearchRequest(""), false);
});

test("execution verbs beat the research lane (fix the search loop bug is a fix)", () => {
  const cmd = parsePersonaCommand("/dragnet fix the search loop bug");
  assert.strictEqual(cmd.action, "fix"); // main() guards research lane on !action
});

test("detects DRAGNET emoticon bank requests", () => {
  assert.strictEqual(isEmoticonBankRequest("create an emoticonbank for me"), true);
  assert.strictEqual(isEmoticonBankRequest("show me an emoji bank"), true);
  assert.strictEqual(isEmoticonBankRequest("diagnose this workflow timeout"), false);
});

test("renders emoticon bank markdown with categorized picks", () => {
  const markdown = renderEmoticonBankMarkdown();
  assert.ok(markdown.includes("DRAGNET Emoticon Bank"));
  assert.ok(markdown.includes("**status:**"));
  assert.ok(markdown.includes("✅"));
});

test("sanitizeMentions defangs @mentions so a reply never pings a real user", () => {
  const out = sanitizeMentions("cc @TheProfessor and @mindmappr please");
  assert.ok(!/@[A-Za-z]/.test(out), "no bare @name should remain");
  assert.ok(out.includes("@​TheProfessor"), "mention is defanged with a zero-width space");
  // Visible text is unchanged once the zero-width space is stripped.
  assert.strictEqual(out.replace(/​/g, ""), "cc @TheProfessor and @mindmappr please");
});


test("formatSummonFailureComment surfaces handle + error (issue #16942 visible failure)", () => {
  const body = formatSummonFailureComment(
    "dragnet",
    new Error('Invalid character in header content ["Authorization"]')
  );
  assert.ok(body.includes("DRAGNET summon failed"));
  assert.ok(body.includes("Invalid character in header content"));
  assert.ok(body.includes("OPENROUTER_API_KEY"));
  // Must not embed a stack dump (function frames look like "at foo (file:line)").
  assert.ok(!/at\s+\S+\s+\(/.test(body));
});

test("formatSummonFailureComment accepts a bare string error", () => {
  const body = formatSummonFailureComment("professor", "boom");
  assert.ok(body.includes("PROFESSOR summon failed"));
  assert.ok(body.includes("boom"));
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

"use strict";

// Pure registry/parser/lifecycle tests. No xAI/OpenRouter calls or credentials.
const test = require("node:test");
const assert = require("node:assert/strict");
const { getPersona, buildMessages, instantiate } = require("../scripts/openrouter-personas");
const { parsePersonaCommand } = require("../scripts/persona-comment-runner");

const aliases = ["grokapi", "grok-api", "xai-api", "grok-demo", "grok-test"];

test("Grok API Navigator is a complete specialist on the existing routed lane", () => {
  const p = getPersona("grokapi");
  assert.equal(p.name, "Grok API Navigator");
  assert.equal(p.profile, "repo_surgery");
  assert.ok(p.description.length > 400);
  assert.ok(p.instructions.length > 2000);
  assert.match(p.instructions, /never merge your own work/i);
  assert.match(p.instructions, /do not claim.*automatically runs on Grok/i);
});

test("canonical name and provider-specific aliases resolve case-insensitively", () => {
  for (const alias of aliases) {
    assert.equal(getPersona(alias.toUpperCase()).handle, "grokapi");
  }
});

test("generic persona command resolves every Grok API alias", () => {
  for (const alias of aliases) {
    assert.deepEqual(parsePersonaCommand(`/persona ${alias} explain Grok streaming`), {
      handle: "grokapi", task: "explain Grok streaming", action: null,
    });
  }
});

test("execution verbs reuse the existing execution lane", () => {
  assert.equal(parsePersonaCommand("/persona grokapi create a tested API demo").action, "create");
});

test("provider keywords are explicit metadata, not generic or Groq aliases", () => {
  const p = getPersona("grokapi");
  assert.ok(p.triggerWords.includes("XAI_API_KEY"));
  assert.ok(p.triggerWords.includes("api.x.ai"));
  assert.ok(p.contextualTriggers.includes("Grok JSON schema"));
  for (const generic of ["api", "auth", "token", "groq", "grok"]) {
    assert.ok(!p.aliases.includes(generic));
    assert.ok(!p.triggerWords.some((word) => word.toLowerCase() === generic));
  }
  assert.equal(parsePersonaCommand("Grok API streaming returns HTTP 429"), null);
  assert.equal(parsePersonaCommand("/persona groq explain streaming"), null);
});

test("specialist instructions and caller task form distinct messages", () => {
  const messages = buildMessages(getPersona("grokapi"), "Explain Responses API storage");
  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.equal(messages[1].content, "Explain Responses API storage");
});

test("on-assignment registration is deferred and makes no provider request", async () => {
  const instance = await instantiate("grokapi", { mode: "on_assignment", silent: true });
  assert.equal(instance.persona, "grokapi");
  assert.equal(instance.instantiated, false);
  assert.equal(typeof instance.assign, "function");
});

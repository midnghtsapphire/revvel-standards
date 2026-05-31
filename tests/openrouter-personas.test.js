#!/usr/bin/env node
"use strict";

/**
 * Unit tests for openrouter-personas.js
 *
 * Covers persona registry shape, handle/mode resolution, message construction,
 * and instantiation lifecycle (eager vs on-assignment). Does not make live API
 * calls; runs that would hit OpenRouter are asserted to reject with a fake key.
 */

const {
  PERSONA_REGISTRY,
  INSTANTIATION_MODES,
  getPersonas,
  getPersona,
  normalizeMode,
  buildMessages,
  instantiate,
  instantiateFleet,
} = require("../scripts/openrouter-personas");

let testsPassed = 0;
let testsFailed = 0;

function assertEqual(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ ${testName}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual: ${JSON.stringify(actual)}`);
    testsFailed++;
  }
}

function assertTrue(condition, testName) {
  if (condition) {
    console.log(`✅ ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ ${testName}`);
    testsFailed++;
  }
}

function assertThrows(fn, testName) {
  try {
    fn();
    console.error(`❌ ${testName} - Expected to throw but didn't`);
    testsFailed++;
  } catch (err) {
    console.log(`✅ ${testName}`);
    testsPassed++;
  }
}

async function assertRejects(promise, testName) {
  try {
    await promise;
    console.error(`❌ ${testName} - Expected to reject but didn't`);
    testsFailed++;
  } catch (err) {
    console.log(`✅ ${testName}`);
    testsPassed++;
  }
}

async function runTests() {
  console.log("Running openrouter-personas.js tests...\n");

  // Registry shape
  console.log("Test Group: Persona Registry");
  assertEqual(
    Object.keys(getPersonas()).sort(),
    ["coder", "mindmappr", "oaudrey", "openrouter", "professor"],
    "Should register exactly the five named personas"
  );
  assertTrue(
    Object.values(PERSONA_REGISTRY).every(
      (p) => p.handle && p.name && p.role && p.instructions && (p.profile || p.models)
    ),
    "Every persona has handle, name, role, instructions, and a routing strategy"
  );
  assertTrue(
    Array.isArray(PERSONA_REGISTRY.professor.models) &&
      PERSONA_REGISTRY.professor.models[0] === "perplexity/sonar-pro",
    "The Professor pins the Perplexity Sonar model lane"
  );

  // Handle resolution
  console.log("\nTest Group: getPersona");
  assertEqual(getPersona("oaudrey").name, "oAudrey", "Resolves a plain handle");
  assertEqual(getPersona("@oAudrey").name, "oAudrey", "Resolves a handle with @ and mixed case");
  assertThrows(() => getPersona("nobody"), "Throws on unknown persona");
  assertThrows(() => getPersona(""), "Throws on empty handle");

  // Mode normalization
  console.log("\nTest Group: normalizeMode");
  assertEqual(normalizeMode("right away"), INSTANTIATION_MODES.EAGER, '"right away" -> eager');
  assertEqual(normalizeMode("eager"), INSTANTIATION_MODES.EAGER, '"eager" -> eager');
  assertEqual(normalizeMode("now"), INSTANTIATION_MODES.EAGER, '"now" -> eager');
  assertEqual(
    normalizeMode("on assignment"),
    INSTANTIATION_MODES.ON_ASSIGNMENT,
    '"on assignment" -> on_assignment'
  );
  assertEqual(
    normalizeMode(undefined),
    INSTANTIATION_MODES.ON_ASSIGNMENT,
    "Defaults to on_assignment"
  );
  assertThrows(() => normalizeMode("whenever"), "Throws on unknown mode");

  // Message construction
  console.log("\nTest Group: buildMessages");
  const messages = buildMessages(getPersona("mindmappr"), "Map out a launch plan");
  assertEqual(messages.length, 2, "Builds a two-message array");
  assertEqual(messages[0].role, "system", "First message is the system prompt");
  assertTrue(
    messages[0].content.includes("MindMappr"),
    "System prompt carries the persona instructions"
  );
  assertEqual(messages[1], { role: "user", content: "Map out a launch plan" }, "Second message is the task");

  // On-assignment with no task returns a deferred handle (no API call)
  console.log("\nTest Group: Instantiate — on assignment (deferred)");
  const deferred = await instantiate("oaudrey", { mode: "on assignment", silent: true });
  assertEqual(deferred.instantiated, false, "Deferred handle is not yet instantiated");
  assertEqual(deferred.mode, INSTANTIATION_MODES.ON_ASSIGNMENT, "Deferred handle reports on_assignment mode");
  assertTrue(typeof deferred.assign === "function", "Deferred handle exposes assign()");

  // Fleet registration (deferred, no API calls)
  console.log("\nTest Group: instantiateFleet (deferred)");
  const fleet = await instantiateFleet(undefined, { silent: true });
  assertEqual(fleet.length, 5, "Fleet registers all five personas by default");
  assertTrue(
    fleet.every((f) => f.instantiated === false && typeof f.assign === "function"),
    "Each fleet member is a deferred handle"
  );

  // Runs that would call OpenRouter should reject without a real key.
  // Use a fake key so the request is attempted and fails (not a missing-key short-circuit).
  console.log("\nTest Group: Instantiate — runs hit the router");
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key";

  await assertRejects(
    instantiate("oaudrey", { mode: "right away", silent: true }),
    "Eager instantiation attempts a router call (rejects with fake key)"
  );
  await assertRejects(
    instantiate("professor", { mode: "on assignment", task: "Research X", silent: true }),
    "On-assignment with a task attempts a router call (rejects with fake key)"
  );
  await assertRejects(
    deferred.assign("Triage the backlog", { silent: true }),
    "Deferred assign() attempts a router call (rejects with fake key)"
  );
  await assertRejects(
    instantiate("oaudrey", { mode: "on assignment", task: 123, silent: true }),
    "Rejects a non-string task"
  );

  if (originalApiKey) {
    process.env.OPENROUTER_API_KEY = originalApiKey;
  } else {
    delete process.env.OPENROUTER_API_KEY;
  }

  // Unknown persona rejects regardless of mode
  await assertRejects(
    instantiate("ghost", { mode: "right away", silent: true }),
    "Rejects unknown persona"
  );

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("Test Summary");
  console.log("=".repeat(80));
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log("=".repeat(80));

  if (testsFailed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error("Fatal test error:", err);
    process.exit(1);
  });
}

module.exports = { runTests };

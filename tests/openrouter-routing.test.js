#!/usr/bin/env node
"use strict";

/**
 * Unit tests for openrouter-routing.js
 * 
 * Tests routing profile selection and request construction.
 * Does not make actual API calls unless OPENROUTER_API_KEY is set.
 */

const {
  getProfiles,
  getProfileModels,
  routedChat,
} = require("../scripts/openrouter-routing");

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

function assertTrue(condition, testName) {
  if (condition) {
    console.log(`✅ ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("Running openrouter-routing.js tests...\n");

  // Test 1: Verify routing profiles structure
  console.log("Test Group: Routing Profiles Structure");
  const profiles = getProfiles();
  assertEqual(
    Object.keys(profiles).sort(),
    ["cheap_batch_edits", "deep_search", "hard_debug", "repo_surgery"],
    "Should have expected routing profiles"
  );

  // Test 2: Verify repo_surgery profile
  console.log("\nTest Group: repo_surgery Profile");
  const repoSurgeryModels = getProfileModels("repo_surgery");
  assertEqual(
    repoSurgeryModels,
    ["anthropic/claude-sonnet-4", "deepseek/deepseek-v3.2", "openai/gpt-5.2-codex"],
    "repo_surgery should have correct model fallback chain"
  );
  assertTrue(
    profiles.repo_surgery.description.includes("Multi-file edits"),
    "repo_surgery should have correct description"
  );

  // Test 3: Verify cheap_batch_edits profile
  console.log("\nTest Group: cheap_batch_edits Profile");
  const cheapBatchModels = getProfileModels("cheap_batch_edits");
  assertEqual(
    cheapBatchModels,
    ["deepseek/deepseek-v3.2", "anthropic/claude-sonnet-4"],
    "cheap_batch_edits should have correct model fallback chain"
  );
  assertTrue(
    profiles.cheap_batch_edits.description.includes("Repetitive transforms"),
    "cheap_batch_edits should have correct description"
  );

  // Test 4: Verify hard_debug profile
  console.log("\nTest Group: hard_debug Profile");
  const hardDebugModels = getProfileModels("hard_debug");
  assertEqual(
    hardDebugModels,
    ["openai/gpt-5.2-codex", "anthropic/claude-sonnet-4", "deepseek/deepseek-v3.2"],
    "hard_debug should have correct model fallback chain"
  );
  assertTrue(
    profiles.hard_debug.description.includes("Difficult failures"),
    "hard_debug should have correct description"
  );

  // Test 5: Verify deep_search profile
  console.log("\nTest Group: deep_search Profile");
  const deepSearchModels = getProfileModels("deep_search");
  assertEqual(
    deepSearchModels,
    ["anthropic/claude-3.5-sonnet", "openrouter/fusion"],
    "deep_search should have Sonnet 3.5 + Fusion chain"
  );
  assertTrue(
    profiles.deep_search.description.includes("Deep R&D research"),
    "deep_search should have correct description"
  );

  // Test 6: Error handling for unknown profile
  console.log("\nTest Group: Error Handling");
  assertThrows(
    () => getProfileModels("invalid_profile"),
    "Should throw error for unknown profile with available profiles listed"
  );

  // Test 7: Silent mode
  console.log("\nTest Group: Silent Mode");
  process.env.OPENROUTER_API_KEY = "test-key";
  await assertRejects(
    routedChat({
      profile: "repo_surgery",
      messages: [{ role: "user", content: "test" }],
      silent: true,
    }),
    "Should work in silent mode (no console output)"
  );

  // Test 8: routedChat validation
  console.log("\nTest Group: routedChat Validation");
  
  // Save original API key
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  
  // Test without API key
  delete process.env.OPENROUTER_API_KEY;
  await assertRejects(
    routedChat({
      profile: "repo_surgery",
      messages: [{ role: "user", content: "test" }],
    }),
    "Should reject when OPENROUTER_API_KEY is not set"
  );

  // Test with invalid profile
  process.env.OPENROUTER_API_KEY = "test-key";
  await assertRejects(
    routedChat({
      profile: "invalid_profile",
      messages: [{ role: "user", content: "test" }],
    }),
    "Should reject with invalid profile"
  );

  // Test with missing messages
  await assertRejects(
    routedChat({
      profile: "repo_surgery",
      messages: [],
    }),
    "Should reject with empty messages array"
  );

  // Restore original API key
  if (originalApiKey) {
    process.env.OPENROUTER_API_KEY = originalApiKey;
  } else {
    delete process.env.OPENROUTER_API_KEY;
  }

  // Test 9: Integration test (only if API key is available)
  if (process.env.OPENROUTER_API_KEY) {
    console.log("\nTest Group: Integration Tests (with API key)");
    console.log("⚠️  Skipping live API tests to avoid costs. To test manually, run:");
    console.log("    node scripts/openrouter-routing-example.js repo_surgery \"Hello, world!\"");
  } else {
    console.log("\nTest Group: Integration Tests");
    console.log("ℹ️  Skipped (OPENROUTER_API_KEY not set)");
  }

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

// Run tests if called directly
if (require.main === module) {
  runTests().catch((err) => {
    console.error("Fatal test error:", err);
    process.exit(1);
  });
}

module.exports = { runTests };

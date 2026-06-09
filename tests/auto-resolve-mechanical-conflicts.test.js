#!/usr/bin/env node
"use strict";

/**
 * Unit tests for scripts/auto-resolve-mechanical-conflicts.js
 * Tests conflict resolution logic for mechanical merge conflicts
 */

const assert = require("assert");
const {
  pickNewerRef,
  tryVersionBump,
  tryAdditive,
} = require("../scripts/auto-resolve-mechanical-conflicts.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

console.log("Running auto-resolve-mechanical-conflicts.js tests...\n");

// ─── pickNewerRef tests ────────────────────────────────────────────────────

console.log("Test Group: pickNewerRef (version comparison)");

test("pickNewerRef returns a when equal", () => {
  assert.strictEqual(pickNewerRef("v1.0.0", "v1.0.0"), "v1.0.0");
});

test("pickNewerRef picks higher major version", () => {
  assert.strictEqual(pickNewerRef("v1.0.0", "v2.0.0"), "v2.0.0");
  assert.strictEqual(pickNewerRef("v2.0.0", "v1.0.0"), "v2.0.0");
});

test("pickNewerRef picks higher minor version", () => {
  assert.strictEqual(pickNewerRef("v1.2.0", "v1.3.0"), "v1.3.0");
  assert.strictEqual(pickNewerRef("v1.3.0", "v1.2.0"), "v1.3.0");
});

test("pickNewerRef picks higher patch version", () => {
  assert.strictEqual(pickNewerRef("v1.0.1", "v1.0.2"), "v1.0.2");
  assert.strictEqual(pickNewerRef("v1.0.2", "v1.0.1"), "v1.0.2");
});

test("pickNewerRef handles missing v prefix", () => {
  assert.strictEqual(pickNewerRef("1.0.0", "2.0.0"), "2.0.0");
});

test("pickNewerRef handles partial semver (no patch)", () => {
  assert.strictEqual(pickNewerRef("v1.0", "v1.1"), "v1.1");
});

test("pickNewerRef handles 40-char SHA as newest", () => {
  const shaA = "a".repeat(40);
  const shaB = "b".repeat(40);
  // SHA wins over tag
  assert.strictEqual(pickNewerRef(shaA, "v1.0.0"), shaA);
  assert.strictEqual(pickNewerRef("v1.0.0", shaA), shaA);
  // Both SHAs -> null (undecidable)
  assert.strictEqual(pickNewerRef(shaA, shaB), null);
});

test("pickNewerRef returns null for non-comparable strings", () => {
  assert.strictEqual(pickNewerRef("main", "develop"), null);
  assert.strictEqual(pickNewerRef("abc", "def"), null);
});

test("pickNewerRef handles longer SHA prefix", () => {
  const shaShort = "abc123";
  const shaLong = "abc123def456789";
  // Neither is full 40-char, so they're compared as strings
  // But 40-char SHAs should return null when compared with each other
  assert.strictEqual(pickNewerRef(shaShort, shaLong), null);
});

// ─── tryVersionBump tests ──────────────────────────────────────────────────

console.log("\nTest Group: tryVersionBump (GitHub Actions version bump)");

test("tryVersionBump resolves single-line version bump", () => {
  const current = "    uses: actions/checkout@v4";
  const incoming = "    uses: actions/checkout@v5";
  const result = tryVersionBump(current, incoming);
  assert.strictEqual(result, "    uses: actions/checkout@v5\n");
});

test("tryVersionBump returns null for multi-line blocks", () => {
  const current = "    uses: actions/checkout@v4\n    timeout-minutes: 30";
  const incoming = "    uses: actions/checkout@v5";
  const result = tryVersionBump(current, incoming);
  assert.strictEqual(result, null);
});

test("tryVersionBump returns null for different actions", () => {
  const current = "    uses: actions/checkout@v4";
  const incoming = "    uses: actions/setup-node@v5";
  const result = tryVersionBump(current, incoming);
  assert.strictEqual(result, null);
});

test("tryVersionBump returns null for non-uses lines", () => {
  const current = "    run: npm test";
  const incoming = "    run: npm run build";
  const result = tryVersionBump(current, incoming);
  assert.strictEqual(result, null);
});

test("tryVersionBump keeps newer SHA when both are SHAs (returns null)", () => {
  const sha1 = "    uses: owner/repo@abc123def4567890123456789012345678";
  const sha2 = "    uses: owner/repo@xyz789abc1234567890123456789012345";
  const result = tryVersionBump(sha1, sha2);
  // SHA vs SHA is undecidable
  assert.strictEqual(result, null);
});

test("tryVersionBump handles whitespace variations", () => {
  const current = "  - uses: actions/checkout@v4";
  const incoming = "  - uses: actions/checkout@v5";
  const result = tryVersionBump(current, incoming);
  assert.ok(result !== null, "Should handle different indentation");
});

test("tryVersionBump picks higher semver", () => {
  const current = "    uses: owner/repo@v1.2.3";
  const incoming = "    uses: owner/repo@v2.0.0";
  const result = tryVersionBump(current, incoming);
  assert.ok(result.includes("v2.0.0"), "Should pick v2.0.0");
});

test("tryVersionBump handles refs without v prefix", () => {
  const current = "    uses: owner/repo@1.0.0";
  const incoming = "    uses: owner/repo@2.0.0";
  const result = tryVersionBump(current, incoming);
  assert.ok(result.includes("2.0.0"), "Should pick 2.0.0");
});

// ─── tryAdditive tests ────────────────────────────────────────────────────

console.log("\nTest Group: tryAdditive (additive line resolution)");

test("tryAdditive resolves markdown table rows (data only)", () => {
  // Note: When both sides have identical headers/separators, they overlap
  // and the function returns null (current behavior). This tests data-only rows.
  const current = "| a    | b    |\n| c    | d    |";
  const incoming = "| e    | f    |\n| g    | h    |";
  const result = tryAdditive(current, incoming);
  assert.ok(result !== null, "Should resolve additive table data rows");
  assert.ok(result.includes("| a    | b    |"), "Should include current");
  assert.ok(result.includes("| g    | h    |"), "Should include incoming");
});

test("tryAdditive resolves markdown list items", () => {
  const current = "- Item 1\n- Item 2";
  const incoming = "- Item 3\n- Item 4";
  const result = tryAdditive(current, incoming);
  assert.ok(result !== null, "Should resolve additive list items");
});

test("tryAdditive returns null when blocks are empty", () => {
  assert.strictEqual(tryAdditive("", ""), null);
  assert.strictEqual(tryAdditive("  ", "  "), null);
});

test("tryAdditive returns null for non-additive content", () => {
  const current = "foo = \"a\"";
  const incoming = "foo = \"b\"";
  const result = tryAdditive(current, incoming);
  assert.strictEqual(result, null, "Value swaps are not additive");
});

test("tryAdditive returns null when lines overlap", () => {
  const current = "- Item 1\n- Item 2";
  const incoming = "- Item 2\n- Item 3";
  const result = tryAdditive(current, incoming);
  assert.strictEqual(result, null, "Duplicate lines should not auto-resolve");
});

test("tryAdditive handles numbered lists", () => {
  const current = "1. First item\n2. Second item";
  const incoming = "3. Third item";
  const result = tryAdditive(current, incoming);
  assert.ok(result !== null, "Should handle numbered list items");
});

test("tryAdditive returns null when table headers/separators overlap", () => {
  // When table headers or separators are identical, they overlap and block auto-resolve
  const current = "|---|---|\n| a | b |";
  const incoming = "|---|---|\n| c | d |";
  const result = tryAdditive(current, incoming);
  // Headers/separators overlap, so this returns null (correct behavior)
  assert.strictEqual(result, null, "Identical headers/separators should block auto-resolve");
});

test("tryAdditive resolves pure data rows without headers", () => {
  // Tables without header/separator overlap can be resolved
  const current = "| a | b |\n| c | d |";
  const incoming = "| e | f |\n| g | h |";
  const result = tryAdditive(current, incoming);
  assert.ok(result !== null, "Pure data rows without overlap should resolve");
});

test("tryAdditive returns null when only one side is additive", () => {
  const current = "- List item";
  const incoming = "foo = \"value\"";
  const result = tryAdditive(current, incoming);
  assert.strictEqual(result, null, "Mixed content is not purely additive");
});

test("tryAdditive preserves order (current first, incoming after)", () => {
  const current = "* A\n* B";
  const incoming = "* C\n* D";
  const result = tryAdditive(current, incoming);
  assert.ok(result !== null);
  const aIndex = result.indexOf("A");
  const cIndex = result.indexOf("C");
  assert.ok(aIndex < cIndex, "Current should come before incoming");
});

// ─── Summary ─────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`Test Summary: ${passed} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
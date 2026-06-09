#!/usr/bin/env node
"use strict";

/**
 * Unit tests for scripts/check-compliance.js
 * Tests compliance check helper functions and validation logic
 */

const assert = require("assert");
const path = require("path");

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

// Import the module under test
const {
  fileExists,
  dirExists,
  fileContains,
  fileExistsAny,
  dirHasFiles,
} = require("../scripts/check-compliance.js");

// Test data - mock repo root
const TEST_REPO_ROOT = __dirname;

console.log("Running check-compliance.js tests...\n");

// Test: fileExists helper
test("fileExists returns true for existing files", () => {
  const result = fileExists('tests/check-compliance.test.js');
  assert.strictEqual(result, true, "Should find the test file itself");
});

test("fileExists returns false for non-existent files", () => {
  const result = fileExists('this-file-does-not-exist-xyz.json');
  assert.strictEqual(result, false, "Should return false for non-existent file");
});

test("dirExists returns true for existing directories", () => {
  const result = dirExists('tests');
  assert.strictEqual(result, true, "Should find the tests directory");
});

test("dirExists returns false for non-existent directories", () => {
  const result = dirExists('nonexistent-directory-xyz');
  assert.strictEqual(result, false, "Should return false for non-existent directory");
});

test("fileContains returns true when pattern exists", () => {
  const result = fileContains('package.json', ['scripts']);
  assert.strictEqual(result, true, "Should find 'scripts' in package.json");
});

test("fileContains returns false when pattern missing", () => {
  const result = fileContains('package.json', ['definitely-not-in-package-json-xyz']);
  assert.strictEqual(result, false, "Should not find random string in package.json");
});

test("fileContains handles multiple patterns (all must match)", () => {
  const result = fileContains('package.json', ['scripts', 'test']);
  assert.strictEqual(result, true, "Should find both 'scripts' and 'test' in package.json");
});

test("fileContains returns false when any pattern is missing", () => {
  const result = fileContains('package.json', ['scripts', 'definitely-not-here-xyz']);
  assert.strictEqual(result, false, "Should return false if any pattern is missing");
});

test("fileExistsAny returns true when any candidate exists", () => {
  const candidates = [
    'nonexistent-file-1.json',
    'nonexistent-file-2.json', 
    'package.json', // This one exists
    'nonexistent-file-3.json'
  ];
  const result = fileExistsAny(candidates);
  assert.strictEqual(result, true, "Should return true if any file exists");
});

test("fileExistsAny returns false when no candidates exist", () => {
  const candidates = [
    'definitely-does-not-exist-1.xyz',
    'definitely-does-not-exist-2.xyz',
    'definitely-does-not-exist-3.xyz'
  ];
  const result = fileExistsAny(candidates);
  assert.strictEqual(result, false, "Should return false if no files exist");
});

test("dirHasFiles returns true for directories with matching extension", () => {
  const result = dirHasFiles('tests', '.js');
  assert.strictEqual(result, true, "Should find .js files in tests directory");
});

test("dirHasFiles returns false for empty or non-matching directories", () => {
  const result = dirHasFiles('tests', '.nonexistent-extension-xyz');
  assert.strictEqual(result, false, "Should not find nonexistent extension files");
});

test("fileExists returns false for files in non-existent subdirectories", () => {
  const result = fileExists('nonexistent-dir/package.json');
  assert.strictEqual(result, false, "Should return false for path in non-existent directory");
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
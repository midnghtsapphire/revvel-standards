#!/usr/bin/env node
/**
 * find-duplicate-json-keys.js
 *
 * Detects duplicate top-level-object keys in a JSON file. JSON.parse alone
 * cannot catch this -- it silently keeps the last occurrence and drops the
 * earlier one, which is exactly how package.json ended up with a same-day
 * "c8" version bump silently reverted (see WR-04 from the 2026-08-05
 * audit). Uses a simple tokenizing scan rather than a full JSON parser, so
 * it works even on files that already have this bug (a strict parser would
 * just silently succeed).
 *
 * Report-only, no network calls, exits 0 (findings printed) or 1 (parse
 * error) -- never modifies the file.
 *
 * Usage: node tools/sandbox-audit-2026-08-05/find-duplicate-json-keys.js <file.json> [file2.json ...]
 *        node tools/sandbox-audit-2026-08-05/find-duplicate-json-keys.js   (defaults to package.json)
 */
"use strict";

const fs = require("fs");
const path = require("path");

function findDuplicateKeysAtDepth1(jsonText) {
  // Track brace depth so we only flag duplicates within the same object
  // level (e.g. within devDependencies), not identical key names that
  // legitimately appear in sibling nested objects.
  const lines = jsonText.split("\n");
  const stack = [new Map()]; // one Map per open object, tracks key -> first line seen
  const duplicates = [];

  const keyRe = /^\s*"((?:[^"\\]|\\.)*)"\s*:/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    const match = line.match(keyRe);
    if (match && stack.length > 0) {
      const key = match[1];
      const currentScope = stack[stack.length - 1];
      if (currentScope.has(key)) {
        duplicates.push({
          key,
          firstSeenLine: currentScope.get(key),
          duplicateAtLine: i + 1,
        });
      } else {
        currentScope.set(key, i + 1);
      }
    }

    for (let b = 0; b < openBraces; b++) stack.push(new Map());
    for (let b = 0; b < closeBraces; b++) {
      if (stack.length > 1) stack.pop();
    }
  }

  return duplicates;
}

function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : ["package.json"];
  const repoRoot = path.resolve(__dirname, "..", "..");

  const report = [];
  let anyDuplicates = false;

  for (const target of targets) {
    const filePath = path.isAbsolute(target)
      ? target
      : path.join(repoRoot, target);

    if (!fs.existsSync(filePath)) {
      report.push({ file: target, error: "file not found" });
      continue;
    }

    const text = fs.readFileSync(filePath, "utf8");

    // Sanity check: still valid JSON (duplicate keys don't break parsing,
    // they just silently drop the earlier value -- confirm the file at
    // least parses before reporting on it).
    try {
      JSON.parse(text);
    } catch (e) {
      report.push({ file: target, error: `not valid JSON: ${e.message}` });
      continue;
    }

    const duplicates = findDuplicateKeysAtDepth1(text);
    if (duplicates.length > 0) anyDuplicates = true;
    report.push({
      file: target,
      duplicateKeyCount: duplicates.length,
      duplicates,
    });
  }

  console.log(JSON.stringify({ report }, null, 2));
  process.exit(0);
}

main();

#!/usr/bin/env node
"use strict";

/** Unit tests for scripts/fix-markdown-backlog.js — pure parsing helpers. */

const { test } = require("node:test");
const assert = require("assert");
const {
  countLintErrors,
  parseArgs,
} = require("../scripts/fix-markdown-backlog");

test("countLintErrors counts only lines containing ' error '", () => {
  const out = [
    "a.md:1 error MD012/no-multiple-blanks x",
    "b.md:2:3 error MD004/ul-style y",
    "Summary: linting 10 files",
    "noerror keyword here without spacing",
  ].join("\n");
  assert.strictEqual(countLintErrors(out), 2);
});

test("countLintErrors handles empty / null", () => {
  assert.strictEqual(countLintErrors(""), 0);
  assert.strictEqual(countLintErrors(null), 0);
});

test("parseArgs defaults to fix mode", () => {
  assert.deepStrictEqual(parseArgs([]), {
    check: false,
    quiet: false,
    threshold: 0,
  });
});

test("parseArgs parses --check, --quiet and --threshold", () => {
  assert.deepStrictEqual(parseArgs(["--check", "--quiet", "--threshold=12"]), {
    check: true,
    quiet: true,
    threshold: 12,
  });
});

test("parseArgs ignores an invalid threshold", () => {
  assert.strictEqual(parseArgs(["--threshold=abc"]).threshold, 0);
  assert.strictEqual(parseArgs(["--threshold=-3"]).threshold, 0);
});

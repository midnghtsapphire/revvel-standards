#!/usr/bin/env node
"use strict";

/**
 * Regression tests for WR #16831 fleet-maintenance package targeting
 * midnghtsapphire/no-kill-shelter-business. Ensures the portable package stays complete.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const PKG = path.join(ROOT, "wr", "fleet-maintenance", "no-kill-shelter-business");
const WR_DOC = path.join(
  ROOT,
  "wr",
  "issues",
  "issue-16831-fleet-maintenance-midnghtsapphire-no-kill-shelter-business.md",
);

const REQUIRED = [
  "README.md",
  "CONTRIBUTING.md",
  "AGENTS.md",
  "CHANGELOG.md",
  "LICENSE",
  "APPLY.md",
  "package.json",
  "docs/OVERVIEW.md",
  "docs/README.md",
  "tests/repo-baseline.test.js",
  ".gitignore",
  ".github/workflows/ai-pr-review-openrouter.yml",
  ".github/workflows/jules-pr-reviewer.yml",
  ".github/workflows/semgrep.yml",
  ".github/workflows/codeql.yml",
];

test("fleet package directory exists", () => {
  assert.ok(fs.existsSync(PKG), `missing package at ${PKG}`);
});

test("fleet package contains required deliverables", () => {
  for (const rel of REQUIRED) {
    const full = path.join(PKG, rel);
    assert.ok(fs.existsSync(full), `missing ${rel}`);
    assert.ok(fs.statSync(full).size > 0, `empty ${rel}`);
  }
});

test("package has no scaffolding markers in primary docs", () => {
  for (const rel of ["README.md", "CONTRIBUTING.md", "docs/OVERVIEW.md"]) {
    const text = fs.readFileSync(path.join(PKG, rel), "utf8");
    // Flag placeholder lines, not prose that forbids them.
    assert.doesNotMatch(text, /(?:^|\n)\s*(?:\/\/|#)\s*TODO\b/i);
    assert.doesNotMatch(text, /(?:^|\n)\s*(?:\/\/|#)\s*FIXME\b/i);
    assert.doesNotMatch(text, /lorem ipsum/i);
    assert.doesNotMatch(text, /\bTBD: implement\b/i);
  }
});

test("WR research document exists and marks tasks complete", () => {
  assert.ok(fs.existsSync(WR_DOC), "missing WR issue document");
  const body = fs.readFileSync(WR_DOC, "utf8");
  assert.match(body, /fleet-maintenance:midnghtsapphire\/no-kill-shelter-business/);
  assert.match(body, /Marketing \/ SEO keywords/i);
  assert.match(body, /Monetization path/i);
  assert.match(body, /animavita\/animavita/);
  assert.match(body, /- \[x\] Update \/ refresh the docs/);
  assert.match(body, /- \[x\] Ensure the target repo has the standard review workflows/);
});

test("package baseline tests pass", () => {
  const result = spawnSync(
    process.execPath,
    ["--test", "tests/repo-baseline.test.js"],
    { cwd: PKG, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    0,
    `package tests failed:\n${result.stdout}\n${result.stderr}`,
  );
});

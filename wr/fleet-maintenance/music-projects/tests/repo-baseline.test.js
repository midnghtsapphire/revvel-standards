#!/usr/bin/env node
"use strict";

/**
 * Baseline structure tests for music-projects.
 * Ensures docs + full review jury stay present after fleet maintenance.
 * Node builtins only — no install required beyond npm's test runner.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const workflowsOnly = process.argv.includes("--workflows-only");

const REQUIRED_DOCS = [
  "README.md",
  "CONTRIBUTING.md",
  "AGENTS.md",
  "CHANGELOG.md",
  "docs/OVERVIEW.md",
  "docs/README.md",
  "package.json",
];

const REQUIRED_WORKFLOWS = [
  "ai-pr-review-openrouter.yml",
  "jules-pr-reviewer.yml",
  "semgrep.yml",
  "codeql.yml",
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/** Minimal YAML shape checks without a parser dependency. */
function assertWorkflowShape(name, raw) {
  assert.match(raw, /^name:\s*\S+/m, `${name} must declare name:`);
  // `on:` is reserved in YAML 1.1 and sometimes quoted; accept on: or "on":
  assert.match(raw, /^(on|"on"):/m, `${name} must declare on:`);
  assert.match(raw, /^jobs:/m, `${name} must declare jobs:`);
}

if (!workflowsOnly) {
  test("required docs and package manifest exist", () => {
    for (const rel of REQUIRED_DOCS) {
      assert.ok(exists(rel), `missing ${rel}`);
      assert.ok(read(rel).trim().length > 0, `empty ${rel}`);
    }
  });

  test("README documents the review jury and related live product", () => {
    const readme = read("README.md");
    assert.match(readme, /Live Deployment/i);
    assert.match(readme, /ai-pr-review-openrouter\.yml/);
    assert.match(readme, /codeql\.yml/);
    assert.match(readme, /semgrep\.yml/);
    assert.match(readme, /jules-pr-reviewer\.yml/);
    assert.match(readme, /music-video-creator/i);
  });

  test("AGENTS.md project context is music-projects, not marketplace scaffold", () => {
    const agents = read("AGENTS.md");
    const project = agents.split("## Project-Specific Context")[1] || "";
    assert.match(agents, /Music Projects/i);
    assert.match(project, /stem/i);
    assert.doesNotMatch(project, /session musician subscription/i);
    assert.doesNotMatch(project, /UI scaffolding complete with dark cinematic theme/i);
  });

  test("package.json exposes npm test", () => {
    const pkg = JSON.parse(read("package.json"));
    assert.equal(pkg.name, "music-projects");
    assert.ok(pkg.scripts && pkg.scripts.test, "scripts.test required");
  });
}

test("full review jury workflows exist and have required keys", () => {
  const dir = path.join(ROOT, ".github", "workflows");
  assert.ok(fs.existsSync(dir), "missing .github/workflows");

  for (const name of REQUIRED_WORKFLOWS) {
    const rel = path.join(".github", "workflows", name);
    assert.ok(exists(rel), `missing ${rel}`);
    assertWorkflowShape(name, read(rel));
  }
});

test("workflow triggers include pull_request for jury coverage", () => {
  for (const name of REQUIRED_WORKFLOWS) {
    const raw = read(path.join(".github", "workflows", name));
    assert.match(raw, /pull_request/, `${name} should trigger on pull_request`);
  }
});

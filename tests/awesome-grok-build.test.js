"use strict";

/**
 * Root regression suite for WR #16894 — wires DominikTobureto/awesome-grok-build
 * into revvel-standards as a production product + monorepo skill mirror.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PRODUCT = path.join(ROOT, "products", "awesome-grok-build");
const ENGINE = path.join(PRODUCT, "lib", "catalog-engine.js");

test("product directory ships required production files", () => {
  const required = [
    "package.json",
    "README.md",
    "vercel.json",
    "app/page.tsx",
    "app/layout.tsx",
    "app/api/skills/route.ts",
    "app/api/plan/route.ts",
    "lib/catalog-engine.js",
    "lib/catalog.json",
    "content/skills",
    "UPSTREAM_LICENSE",
    "tests/catalog-engine.test.js",
  ];
  for (const rel of required) {
    assert.ok(
      fs.existsSync(path.join(PRODUCT, rel)),
      `missing products/awesome-grok-build/${rel}`,
    );
  }
});

test("catalog engine loads and validates vendored skills", () => {
  const engine = require(ENGINE);
  const catalog = engine.getCatalog();
  assert.ok(catalog.skillCount >= 12);
  const validation = engine.validateSkillRecords(catalog.skills);
  assert.equal(validation.ok, true, validation.errors.join("\n"));

  const plan = engine.buildInstallPlan({ stack: "nextjs" });
  assert.ok(plan.skillCount >= 5);
  assert.match(plan.bash, /mkdir -p/);
});

test("root .grok/skills and templates/grok-build are wired", () => {
  const grokSkills = path.join(ROOT, ".grok", "skills");
  const templates = path.join(ROOT, "templates", "grok-build");
  assert.ok(fs.existsSync(grokSkills));
  assert.ok(fs.existsSync(path.join(grokSkills, "repo-health-check", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(templates, "AGENTS.fullstack.md")));
  assert.ok(fs.existsSync(path.join(templates, "grokignore.node")));
});

test("skills/awesome-grok-build vault entry exists with SKILL.md index", () => {
  const skillRoot = path.join(ROOT, "skills", "awesome-grok-build");
  assert.ok(fs.existsSync(path.join(skillRoot, "SKILL.md")));
  assert.ok(fs.existsSync(path.join(skillRoot, "repo-health-check", "SKILL.md")));
});

test("APP_REGISTRY documents the product", () => {
  const registry = fs.readFileSync(path.join(ROOT, "docs", "APP_REGISTRY.md"), "utf8");
  assert.match(registry, /awesome-grok-build/);
});

test("AGENTS.md assigns a dev port for the product", () => {
  const agents = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8");
  assert.match(agents, /awesome-grok-build/);
  assert.match(agents, /3012/);
});

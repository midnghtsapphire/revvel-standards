#!/usr/bin/env node
"use strict";

/**
 * Smoke tests for the additive Revvel engine-spine artifacts:
 *   - docs/inbox/TEMPLATE.revvel.md           (extended intake frontmatter)
 *   - docs/ENGINE_INVENTORY.md                (category → repo map)
 *   - docs/projects/life-insurance-lead-saas/BOM.revvel.md (lead-vendor BOM)
 *   - standards/PRESERVE_GOALS_AND_HISTORY.md (no-delete / goals-sacred)
 * Plus reuse of the existing orchestrator to confirm intake state generation,
 * router classification, and BOM generation still hold and preserve goals.
 */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const yaml = require("yaml");
const {
  deliverChannelFor,
  buildState,
  validateState,
  runEngineLoop,
} = require("../engines/runner-orchestrator/orchestrate");

const REPO_ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(m, "frontmatter block must be present");
  return yaml.parse(m[1]);
}

test("markdown/frontmatter parsing: TEMPLATE.revvel.md has extended fields", () => {
  const fm = parseFrontmatter(read("docs/inbox/TEMPLATE.revvel.md"));
  for (const key of [
    "revenue_target_monthly_usd",
    "goal_phase",
    "project_class",
    "output_type",
    "delivery_mode",
    "lifecycle_mode",
    "visibility",
    "budget",
    "tools",
    "compliance",
    "deployment",
    "status",
  ]) {
    assert.ok(key in fm, `TEMPLATE.revvel.md frontmatter missing: ${key}`);
  }
});

test("canonical TEMPLATE.md is preserved (not replaced)", () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, "docs/inbox/TEMPLATE.md")), "TEMPLATE.md must still exist");
});

test("ENGINE_INVENTORY.md maps the suggested engine categories", () => {
  const doc = read("docs/ENGINE_INVENTORY.md");
  for (const cat of [
    "intake",
    "shape-router",
    "bom",
    "orchestrator",
    "deploy-vercel",
    "deploy-supabase",
    "lead-metrics",
    "goal-score",
    "learning/archive",
  ]) {
    assert.ok(doc.includes(cat), `ENGINE_INVENTORY.md missing category: ${cat}`);
  }
});

test("BOM.revvel.md is additive and preserves goals + cites vendor URLs", () => {
  const bomPath = "docs/projects/life-insurance-lead-saas/BOM.revvel.md";
  const doc = read(bomPath);
  // Original BOM.md preserved alongside.
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, "docs/projects/life-insurance-lead-saas/BOM.md")),
    "original BOM.md must be preserved"
  );
  // Goal preserved by reference (not overwritten) — $10k phase-1 anchor.
  assert.ok(doc.includes("revenue_target_monthly_usd: 10000"), "must preserve $10k goal reference");
  assert.ok(/GOAL\.md/.test(doc), "must reference GOAL.md as source of truth");
  // Required vendor source URLs.
  for (const url of ["compulife", "trustedform", "scrublock", "jornaya", "batchdata", "openrouter.ai", "zapier.com"]) {
    assert.ok(doc.toLowerCase().includes(url), `BOM.revvel.md missing source for: ${url}`);
  }
  // Compliance gates present.
  assert.ok(/TCPA/i.test(doc) && /DNC/i.test(doc), "compliance gates (TCPA/DNC) must be listed");
});

test("PRESERVE_GOALS_AND_HISTORY standard states goals are sacred + no-delete", () => {
  const doc = read("standards/PRESERVE_GOALS_AND_HISTORY.md");
  assert.ok(/\$10M/.test(doc), "must mention the $10M directive");
  assert.ok(/no-?delete/i.test(doc), "must state no-delete rule");
  assert.ok(/additive/i.test(doc), "must prefer additive changes");
});

test("intake state generation preserves the revenue goal exactly", () => {
  const intake = {
    intake_id: "intake-spine-smoke",
    product_slug: "spine-smoke",
    revenue_target_monthly_usd: 7777,
    goal_phase: 2,
    output_type: "api-product",
  };
  const state = buildState(intake);
  assert.strictEqual(state.revenue_target_monthly_usd, 7777, "goal must pass through untouched");
  assert.strictEqual(state.goal_phase, 2);
  assert.ok(validateState(state).valid, "generated state must be schema-valid");
});

test("router classification: output_type → deliver channel", () => {
  assert.strictEqual(deliverChannelFor({ output_type: "api-product" }), "api");
  assert.strictEqual(deliverChannelFor({ output_type: "sellable-pdf" }), "pdf");
});

test("BOM generation halts with procurement BOM when credentials missing", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "spine-bom-"));
  const state = buildState({
    intake_id: "intake-bom-smoke",
    product_slug: "bom-smoke",
    revenue_target_monthly_usd: 1000,
    goal_phase: 1,
    output_type: "api-product",
  });
  const { status, bomPath } = runEngineLoop(state, { env: {}, bomDir: tmp });
  assert.strictEqual(status, "needs_procurement");
  assert.ok(bomPath && fs.existsSync(bomPath), "a BOM.md must be emitted on missing creds");
  fs.rmSync(tmp, { recursive: true, force: true });
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

#!/usr/bin/env node
"use strict";

/**
 * Unit tests for engines/runner-orchestrator/orchestrate.js.
 * Pure logic — state build, schema validation, deliver routing, CONTRACT rules.
 */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  deliverChannelFor,
  runnerTargetFor,
  parseIntake,
  buildState,
  validateState,
  orchestrate,
  runEngineLoop,
} = require("../engines/runner-orchestrator/orchestrate");

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

const baseIntake = {
  intake_id: "intake-demo",
  product_slug: "demo-product",
  revenue_target_monthly_usd: 2000,
  goal_phase: 1,
  output_type: "sellable-pdf",
};

test("maps output_type and shape to ship-to-market deliver channels", () => {
  assert.strictEqual(deliverChannelFor({ output_type: "sellable-pdf" }), "pdf");
  assert.strictEqual(deliverChannelFor({ output_type: "api-product" }), "api");
  assert.strictEqual(deliverChannelFor({ output_type: "cli-product" }), "cli");
  assert.strictEqual(deliverChannelFor({ output_type: "mcp-product" }), "mcp");
  assert.strictEqual(deliverChannelFor({ output_type: "production-app" }), "app");
  // shape takes precedence over output_type
  assert.strictEqual(deliverChannelFor({ output_type: "sellable-pdf", shape: "app" }), "app");
  // unknown -> safe docs default
  assert.strictEqual(deliverChannelFor({ output_type: "mystery" }), "docs");
});

test("runner targets are valid schema enum values", () => {
  const allowed = new Set(["github", "vercel", "supabase", "zapier", "make", "n8n", "gumloop", "cli", "browser", "polar"]);
  for (const ch of ["app", "api", "pdf", "cli", "mcp", "extension", "docs", "package"]) {
    assert.ok(allowed.has(runnerTargetFor(ch)), `${ch} -> ${runnerTargetFor(ch)} not a valid runner_target`);
  }
});

test("buildState produces a schema-valid state with revenue + goal preserved", () => {
  const state = buildState(baseIntake);
  assert.strictEqual(state.product_slug, "demo-product");
  assert.strictEqual(state.revenue_target_monthly_usd, 2000);
  assert.strictEqual(state.goal_phase, 1);
  assert.strictEqual(state.status, "routed");
  const { valid, errors } = validateState(state);
  assert.ok(valid, `state invalid: ${JSON.stringify(errors)}`);
});

test("the deliver step carries the routed channel", () => {
  const state = buildState({ ...baseIntake, output_type: "api-product" });
  const deliverStep = state.steps.find((s) => s.step_id.startsWith("deliver-"));
  assert.strictEqual(deliverStep.step_id, "deliver-api");
  assert.strictEqual(deliverStep.engine, "ship-to-market");
});

test("orchestrate refuses intake without a revenue target (CONTRACT Rule 4)", () => {
  assert.throws(
    () => orchestrate({ product_slug: "x", goal_phase: 1 }, { dryRun: true }),
    /Rule 4|revenue_target_monthly_usd/
  );
});

test("orchestrate refuses intake without a product_slug", () => {
  assert.throws(
    () => orchestrate({ revenue_target_monthly_usd: 500 }, { dryRun: true }),
    /product_slug/
  );
});

test("orchestrate returns the deliver label and a routed state (dry-run, no write)", () => {
  const result = orchestrate(baseIntake, { dryRun: true });
  assert.strictEqual(result.deliverLabel, "deliver:pdf");
  assert.strictEqual(result.status, "routed");
  assert.strictEqual(result.outPath, null);
});

test("orchestrate writes a schema-valid state.json when not dry-run", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "orch-"));
  const outPath = path.join(tmp, "state.json");
  const result = orchestrate(baseIntake, { outPath });
  assert.ok(fs.existsSync(outPath));
  const written = JSON.parse(fs.readFileSync(outPath, "utf8"));
  const { valid } = validateState(written);
  assert.ok(valid, "written state.json must be schema-valid");
  assert.strictEqual(result.deliverLabel, "deliver:pdf");
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("parseIntake reads JSON and coerces revenue/goal_phase", () => {
  const intake = parseIntake('{"product_slug":"p","revenue_target_monthly_usd":"1500","goal_phase":"2"}');
  assert.strictEqual(intake.revenue_target_monthly_usd, 1500);
  assert.strictEqual(intake.goal_phase, 2);
  assert.strictEqual(intake.intake_id, "intake-p");
});

test("engine loop chains research -> deliver -> done when the key is present", () => {
  const state = buildState({ ...baseIntake, output_type: "api-product" });
  const { status } = runEngineLoop(state, {
    env: { OPENROUTER_API_KEY: "test-key" },
    dryRun: true,
  });
  assert.strictEqual(status, "done");
  const research = state.steps.find((s) => s.step_id === "research");
  const deliver = state.steps.find((s) => s.step_id === "deliver-api");
  assert.strictEqual(research.status, "ok");
  assert.strictEqual(deliver.status, "ok");
  assert.deepStrictEqual(deliver.artifacts, ["deliver:api"]);
  assert.ok(validateState(state).valid, "state must stay schema-valid through the loop");
});

test("engine loop halts with a Procurement BOM when OPENROUTER_API_KEY is missing", () => {
  const state = buildState(baseIntake);
  const { status } = runEngineLoop(state, { env: {}, dryRun: true });
  assert.strictEqual(status, "needs_procurement");
  assert.ok(state.bom, "state.bom must be set on halt");
  assert.strictEqual(state.bom.items[0].name, "OpenRouter API key");
  const research = state.steps.find((s) => s.step_id === "research");
  assert.strictEqual(research.status, "needs_procurement");
  // Deliver must NOT have run.
  const deliver = state.steps.find((s) => s.step_id.startsWith("deliver-"));
  assert.strictEqual(deliver.status, "pending");
  assert.ok(validateState(state).valid, "halted state must be schema-valid");
});

test("engine loop writes BOM.md to disk when not dry-run", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "orch-bom-"));
  const state = buildState(baseIntake);
  const { bomPath } = runEngineLoop(state, { env: {}, bomDir: tmp });
  assert.ok(bomPath && fs.existsSync(bomPath), "BOM.md should be written");
  const bom = fs.readFileSync(bomPath, "utf8");
  assert.ok(bom.includes("Procurement BOM"));
  assert.ok(bom.includes("OpenRouter API key"));
  fs.rmSync(tmp, { recursive: true, force: true });
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

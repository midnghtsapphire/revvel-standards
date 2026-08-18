const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
const productDir = path.join(root, "products", "goap-swarm-console");
const enginePath = path.join(productDir, "lib", "goap-engine.js");

test("goap-swarm-console product files exist", () => {
  for (const rel of [
    "package.json",
    "README.md",
    "lib/goap-engine.js",
    "app/page.tsx",
    "app/api/plan/route.ts",
    "app/api/report/route.ts",
    "tests/goap-engine.test.js",
  ]) {
    assert.ok(fs.existsSync(path.join(productDir, rel)), `missing ${rel}`);
  }
});

test("goap engine plans repo-green and exports reports", () => {
  const engine = require(enginePath);
  const tick = engine.runSwarmTick({
    world: engine.DEFAULT_WORLD,
    goalId: "repo-green",
  });
  assert.equal(tick.plan.ok, true);
  assert.ok(tick.plan.plan.length >= 5);
  assert.ok(tick.swarm.assignments.length === tick.plan.plan.length);
  const md = engine.buildMarkdownReport(tick);
  assert.match(md, /GOAP Swarm Run Report/);
  assert.match(md, /Monetization/);
  const csv = engine.buildCsvExport(tick);
  assert.match(csv, /"action_id"/);
  const research = engine.getResearchEvaluation();
  assert.ok(research.bugsAndRisks.length >= 3);
  assert.ok(research.marketingKeywords.includes("goal oriented action planning"));
});

test("goap package declares port 3012 and test script", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(productDir, "package.json"), "utf8"));
  assert.equal(pkg.name, "goap-swarm-console");
  assert.match(pkg.scripts.dev, /3012/);
  assert.match(pkg.scripts.test, /test/);
});

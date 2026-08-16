/**
 * Root regression coverage for products/personal-assistant (WR-16432).
 * Asserts the shippable surface stays present and the offline multi-agent
 * pipeline keeps its PII-redaction + GitHub structure contracts.
 *
 * Runtime behavior is exercised by products/personal-assistant/tests.
 * This file intentionally avoids a root tsx dependency.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const productRoot = path.join(__dirname, "..", "products", "personal-assistant");

function read(relPath) {
  return fs.readFileSync(path.join(productRoot, relPath), "utf8");
}

describe("personal-assistant product surface", () => {
  it("ships required app, api, tests, and docs files", () => {
    const required = [
      "package.json",
      "README.md",
      "DEPLOYMENT_GUIDE.md",
      "GO_TO_MARKET.md",
      "CHANGELOG.md",
      "vercel.json",
      ".env.example",
      "app/page.tsx",
      "app/layout.tsx",
      "app/globals.css",
      "app/api/plan/route.ts",
      "app/data/pipeline.ts",
      "app/data/sources.ts",
      "tests/pipeline.test.ts",
    ];

    for (const relPath of required) {
      assert.ok(
        fs.existsSync(path.join(productRoot, relPath)),
        `missing products/personal-assistant/${relPath}`,
      );
    }
  });

  it("README documents live deployment and port 3012", () => {
    const readme = read("README.md");
    assert.match(readme, /## Live Deployment/);
    assert.match(readme, /3012/);
    assert.match(readme, /personal-assistant/);
    assert.match(readme, /runPipeline/);
  });

  it("package.json exposes test/dev/build on port 3012", () => {
    const pkg = JSON.parse(read("package.json"));
    assert.equal(pkg.name, "personal-assistant");
    assert.match(pkg.scripts.dev, /3012/);
    assert.match(pkg.scripts.start, /3012/);
    assert.equal(pkg.scripts.test, "tsx tests/pipeline.test.ts");
    assert.ok(pkg.scripts.build);
  });

  it("pipeline keeps multi-agent + PII redaction contracts", () => {
    const pipeline = read("app/data/pipeline.ts");
    assert.match(pipeline, /export function ingestFragments/);
    assert.match(pipeline, /export function redactFragment/);
    assert.match(pipeline, /export function classifyFragment/);
    assert.match(pipeline, /export function structureFiles/);
    assert.match(pipeline, /export function buildCommitPlan/);
    assert.match(pipeline, /export function runPipeline/);
    assert.match(pipeline, /\[REDACTED_EMAIL\]/);
    assert.match(pipeline, /\[REDACTED_PHONE\]/);
    assert.match(pipeline, /\[REDACTED_HANDLE\]/);
    assert.match(pipeline, /SAMPLE_FRAGMENTS/);
    assert.match(pipeline, /IngestAgent/);
    assert.match(pipeline, /PrivacyAgent/);
    assert.match(pipeline, /TriageAgent/);
    assert.match(pipeline, /StructureAgent/);
    assert.match(pipeline, /CommitPlanAgent/);
  });

  it("sources cover the WR connector set", () => {
    const sources = read("app/data/sources.ts");
    for (const id of ["gmail", "outlook", "yahoo", "keep", "drive", "sms", "notes"]) {
      assert.match(sources, new RegExp(`id: "${id}"`));
    }
    assert.match(sources, /CATEGORY_DIRECTORY/);
  });

  it("API route exposes GET and POST plan handlers", () => {
    const route = read("app/api/plan/route.ts");
    assert.match(route, /export async function POST/);
    assert.match(route, /export async function GET/);
    assert.match(route, /runPipeline/);
    assert.match(route, /SAMPLE_FRAGMENTS/);
  });

  it("UI wires sample corpus, exports, and Polar checkout fallback", () => {
    const page = read("app/page.tsx");
    assert.match(page, /Load sample corpus/);
    assert.match(page, /Download Markdown/);
    assert.match(page, /Download CSV/);
    assert.match(page, /NEXT_PUBLIC_POLAR_CHECKOUT_URL/);
    assert.match(page, /runPipeline/);
  });

  it("env example documents optional Polar checkout only (no secret values)", () => {
    const envExample = read(".env.example");
    assert.match(envExample, /NEXT_PUBLIC_POLAR_CHECKOUT_URL=/);
    assert.doesNotMatch(envExample, /sk_live|sk_test|ghp_[A-Za-z0-9]|OPENROUTER_API_KEY=\S+/);
  });
});

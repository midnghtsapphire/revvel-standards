const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { metalFindingsEngine } = require("../scripts/metal-findings-engine.js");

test("metalFindingsEngine", async (t) => {
  const tmpDir = fs.mkdtempSync("metal-findings-test-");
  const validFindingsPath = path.join(tmpDir, "valid-findings.json");
  const invalidFindingsPath = path.join(tmpDir, "invalid-findings.json");

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test("returns error if findings file not found", () => {
    const result = metalFindingsEngine({
      state: {},
      env: {},
      options: { findingsPath: path.join(tmpDir, "does-not-exist.json") }
    });

    assert.strictEqual(result.status, "failed");
    assert.match(result.error, /Findings file not found/);
  });

  await t.test("returns error on invalid json", () => {
    fs.writeFileSync(invalidFindingsPath, "{ bad json }");

    const result = metalFindingsEngine({
      state: {},
      env: {},
      options: { findingsPath: invalidFindingsPath }
    });

    assert.strictEqual(result.status, "failed");
    assert.match(result.error, /Invalid JSON/);
  });

  await t.test("returns error on invalid schema", () => {
    const invalidData = {
      intake_id: "intake-123",
      // missing product_slug
      status: "pending",
      findings: []
    };
    fs.writeFileSync(invalidFindingsPath, JSON.stringify(invalidData));

    const result = metalFindingsEngine({
      state: {},
      env: {},
      options: { findingsPath: invalidFindingsPath }
    });

    assert.strictEqual(result.status, "failed");
    assert.match(result.error, /Schema validation failed/);
  });

  await t.test("returns ok on valid schema", () => {
    const validData = {
      intake_id: "intake-123",
      product_slug: "test-product",
      status: "validated",
      findings: [
        {
          id: "f-001",
          type: "security",
          description: "Test finding",
          severity: "low"
        }
      ]
    };
    fs.writeFileSync(validFindingsPath, JSON.stringify(validData));

    const result = metalFindingsEngine({
      state: {},
      env: {},
      options: { findingsPath: validFindingsPath }
    });

    assert.strictEqual(result.status, "ok");
    assert.strictEqual(result.next_engine, "deliver");
    assert.deepStrictEqual(result.artifacts, [validFindingsPath]);
    assert.deepStrictEqual(result.evidence, ["Validated 1 findings for test-product"]);
  });
});
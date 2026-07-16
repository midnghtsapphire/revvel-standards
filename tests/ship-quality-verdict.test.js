"use strict";

// VEINS grounding gate seeded test (WR 14, Definition of Done item 1):
// "Ship Quality can no longer say PASS while `npm test` fails."
// The combiner in scripts/ship-quality-verdict.js is the single place the
// workflow computes its final verdict, so these assertions ARE the gate.

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { combineVerdict } = require("../scripts/ship-quality-verdict");

test("SEEDED: a red test suite can never PASS, whatever the LLM says", () => {
  assert.equal(
    combineVerdict({ testsResult: "fail", aiResult: "pass" }),
    "fail",
  );
  assert.equal(
    combineVerdict({ testsResult: "fail", aiResult: "warn" }),
    "fail",
  );
  assert.equal(
    combineVerdict({ testsResult: "fail", aiResult: "fail" }),
    "fail",
  );
  assert.equal(combineVerdict({ testsResult: "fail", aiResult: "" }), "fail");
});

test("ungrounded verdict (suite never ran) may WARN, never PASS", () => {
  assert.equal(combineVerdict({ testsResult: "", aiResult: "pass" }), "warn");
  assert.equal(
    combineVerdict({ testsResult: undefined, aiResult: "pass" }),
    "warn",
  );
  assert.equal(combineVerdict({ testsResult: "", aiResult: "" }), "warn");
  assert.equal(combineVerdict({ testsResult: "", aiResult: "fail" }), "fail");
});

test("a green suite lets the LLM keep pass or downgrade only", () => {
  assert.equal(
    combineVerdict({ testsResult: "pass", aiResult: "pass" }),
    "pass",
  );
  assert.equal(combineVerdict({ testsResult: "pass", aiResult: "" }), "pass");
  assert.equal(
    combineVerdict({ testsResult: "pass", aiResult: "warn" }),
    "warn",
  );
  assert.equal(
    combineVerdict({ testsResult: "pass", aiResult: "fail" }),
    "fail",
  );
});

test("ship-quality.yml actually runs npm test and the verdict combiner", () => {
  const wf = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "ship-quality.yml"),
    "utf8",
  );
  assert.ok(wf.includes("npm test"), "workflow must run the real test suite");
  assert.ok(
    wf.includes("scripts/ship-quality-verdict.js"),
    "workflow must compute the final verdict through the grounded combiner",
  );
  assert.ok(
    !/result\s*\|\|\s*'pass'/.test(wf),
    "workflow must not default a missing verdict to pass",
  );
});

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const sweep = require(
  path.join(__dirname, "..", "scripts", "wr-fill-sweep.js"),
);

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BLANK_WR = {
  number: 15665,
  title: "[WR] wire OpenHands PR review action",
  body: `### Output Type (required)

production-app

### PDF pipeline batch

None

### Summary

_No response_

### Objective

Wire in the OpenHands PR review GitHub Action so every PR is reviewed automatically. Ship the workflow file plus the required secret name registration.

### Required Bundle

_No response_
`,
  labels: [{ name: "work-request" }],
};

const FILLED_WR = {
  number: 15668,
  title: "[WR] enforce checkpoint gates",
  body: `### Output Type (required)

production-app

### PDF pipeline batch

Not applicable

### Summary

Enforce checkpoint gates on parallel Grids.

### Objective

Add a lint rule that refuses to open Grid PRs past Block 1 until the owner labels the previous block \`checkpoint-approved\`.

### Required Bundle

Rule enforcement script, unit tests, integration workflow, standards doc update.
`,
  labels: [{ name: "work-request" }, { name: "wr:fields-filled" }],
};

const UNKNOWN_BODY_WR = {
  number: 99999,
  title: "Some other issue",
  body: `## Not a WR\n\nJust some plain text.\n`,
  labels: [{ name: "work-request" }],
};

// ── Tests ────────────────────────────────────────────────────────────────────

test("needsFilling returns true when at least one field is blank", () => {
  assert.strictEqual(sweep.needsFilling(BLANK_WR), true);
});

test("needsFilling returns false when every known field has content", () => {
  assert.strictEqual(sweep.needsFilling(FILLED_WR), false);
});

test("needsFilling returns false when the body has no known WR headings", () => {
  // Sweep must not fill non-WR issues that happen to carry `work-request`
  // by accident — the parser recognises this by returning zero fields.
  assert.strictEqual(sweep.needsFilling(UNKNOWN_BODY_WR), false);
});

test("needsFilling handles empty body / missing body", () => {
  assert.strictEqual(
    sweep.needsFilling({ number: 1, title: "t", body: "" }),
    false,
  );
  assert.strictEqual(sweep.needsFilling({ number: 1, title: "t" }), false);
  assert.strictEqual(sweep.needsFilling(null), false);
});

test("needsFilling ignores whitespace-only blank markers", () => {
  const wr = {
    number: 2,
    title: "t",
    body: `### Output Type (required)\n\nproduction-app\n\n### Summary\n\n   \n`,
  };
  assert.strictEqual(sweep.needsFilling(wr), true);
});

test("needsFilling flags unticked Acknowledgements as a blank field", () => {
  const wr = {
    number: 3,
    title: "t",
    body: `### Output Type (required)\n\nproduction-app\n\n### Acknowledgements\n\n- [ ] item one\n- [ ] item two\n`,
  };
  assert.strictEqual(sweep.needsFilling(wr), true);
});

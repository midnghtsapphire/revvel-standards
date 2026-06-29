#!/usr/bin/env node
"use strict";

/** Unit tests for scripts/no-destroy-guard.js — pure diff-evaluation logic. */

const assert = require("assert");
const { evaluateDiff } = require("../scripts/no-destroy-guard");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS: ${name}`); passed++; }
  catch (e) { console.log(`FAIL: ${name}\n    ${e.stack || e.message}`); failed++; }
}

const opts = { protectedPrefixes: ["products/", "apps/"], maxDeleted: 400, allowDestroy: false };

test("flags deletion of an existing app file", () => {
  const r = evaluateDiff([{ path: "products/foo/src/app/page.tsx", added: "0", deleted: "120", status: "D" }], opts);
  assert.strictEqual(r.fail, true);
});

test("flags mass line removal under protected paths", () => {
  const r = evaluateDiff([{ path: "products/foo/page.tsx", added: "2", deleted: "900", status: "M" }], opts);
  assert.strictEqual(r.fail, true);
});

test("allows a normal small edit", () => {
  const r = evaluateDiff([{ path: "products/foo/page.tsx", added: "10", deleted: "4", status: "M" }], opts);
  assert.strictEqual(r.fail, false);
});

test("ignores deletions outside protected paths", () => {
  const r = evaluateDiff([{ path: "docs/old.md", added: "0", deleted: "5000", status: "D" }], opts);
  assert.strictEqual(r.fail, false);
});

test("ignores lockfile churn in protected paths", () => {
  const r = evaluateDiff([{ path: "products/foo/package-lock.json", added: "1", deleted: "900", status: "M" }], opts);
  assert.strictEqual(r.fail, false);
});

test("allow-destroy label overrides the guard", () => {
  const r = evaluateDiff(
    [{ path: "products/foo/page.tsx", added: "0", deleted: "9999", status: "D" }],
    { ...opts, allowDestroy: true }
  );
  assert.strictEqual(r.fail, false);
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

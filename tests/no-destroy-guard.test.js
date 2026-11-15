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

// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Owner global no-delete/no-bypass policy supersedes this legacy expected pass.
// test("ignores deletions outside protected paths", () => {
//   const r = evaluateDiff([{ path: "docs/old.md", added: "0", deleted: "5000", status: "D" }], opts);
//   assert.strictEqual(r.fail, false);
// });
// REVVEL-DISABLED-END


test("ignores lockfile churn in protected paths", () => {
  const r = evaluateDiff([{ path: "products/foo/package-lock.json", added: "1", deleted: "900", status: "M" }], opts);
  assert.strictEqual(r.fail, false);
});

// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Owner global no-delete/no-bypass policy supersedes this legacy expected pass.
// test("allow-destroy label overrides the guard", () => {
//   const r = evaluateDiff(
//     [{ path: "products/foo/page.tsx", added: "0", deleted: "9999", status: "D" }],
//     { ...opts, allowDestroy: true }
//   );
//   assert.strictEqual(r.fail, false);
// });
// REVVEL-DISABLED-END


test("blocks deletion outside protected paths", () => {
  assert.strictEqual(evaluateDiff([{ path: 'docs/old.md', added: '0', deleted: '1', status: 'D' }], opts).fail, true);
});

test("allow-destroy remains inert", () => {
  assert.strictEqual(evaluateDiff([{ path: 'products/foo/page.tsx', added: '0', deleted: '9999', status: 'D' }], { ...opts, allowDestroy: true }).fail, true);
});

test("global deletion budget includes unprotected paths and lockfiles", () => {
  assert.strictEqual(evaluateDiff([{ path: 'package-lock.json', added: '1', deleted: '1001', status: 'M' }], opts).fail, true);
});

test("whole-file replacement is detected globally", () => {
  assert.strictEqual(evaluateDiff([{ path: 'scripts/tool.js', added: '20', deleted: '20', beforeLines: 20, status: 'M' }], opts).fail, true);
});

test("invalid counts fail closed", () => {
  assert.throws(() => evaluateDiff([{ path: 'docs/old.md', added: '0', deleted: 'NaN', status: 'M' }], opts));
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

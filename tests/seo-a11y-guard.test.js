#!/usr/bin/env node
"use strict";

/** Unit tests for scripts/seo-a11y-guard.js — pure detection logic. */

const assert = require("assert");
const { evaluateSeoA11y } = require("../scripts/seo-a11y-guard");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS: ${name}`); passed++; }
  catch (e) { console.log(`FAIL: ${name}\n    ${e.stack || e.message}`); failed++; }
}

const opts = { protectedPrefixes: ["products/"], allowDebt: false };

test("flags <img> missing alt", () => {
  const r = evaluateSeoA11y(
    [{ path: "products/x/src/app/page.tsx", content: '<img src="/hero.png" />' }],
    opts
  );
  assert.strictEqual(r.fail, true);
  assert.ok(r.violations.some((v) => v.kind === "missing-alt"));
});

test("flags empty alt", () => {
  const r = evaluateSeoA11y(
    [{ path: "products/x/src/app/page.tsx", content: '<img src="/h.png" alt="" />' }],
    opts
  );
  assert.ok(r.violations.some((v) => v.kind === "empty-alt"));
});

test("flags junk filename even with alt", () => {
  const r = evaluateSeoA11y(
    [{ path: "products/x/src/app/page.tsx", content: '<img src="/IMG_1234.jpg" alt="leads" />' }],
    opts
  );
  assert.ok(r.violations.some((v) => v.kind === "junk-filename"));
});

test("passes good alt + descriptive filename", () => {
  const r = evaluateSeoA11y(
    [{
      path: "products/x/src/app/page.tsx",
      content:
        'export default function P(){ return <main><meta name="description" content="x"/><img src="/life-insurance-zip-90210.png" alt="Life insurance lead by zip" /></main> }',
    }],
    opts
  );
  assert.strictEqual(r.fail, false, `expected pass, got ${JSON.stringify(r.violations)}`);
});

test("flags page file missing meta description", () => {
  const r = evaluateSeoA11y(
    [{ path: "products/x/src/app/page.tsx", content: "export default function P(){ return <main/> }" }],
    opts
  );
  assert.ok(r.violations.some((v) => v.kind === "missing-meta-description"));
});

test("ignores files outside protected paths", () => {
  const r = evaluateSeoA11y(
    [{ path: "docs/old.md", content: '<img src="/IMG_1.jpg">' }],
    opts
  );
  assert.strictEqual(r.fail, false);
});

test("allow-seo-debt override passes", () => {
  const r = evaluateSeoA11y(
    [{ path: "products/x/src/app/page.tsx", content: '<img src="/IMG_1.jpg">' }],
    { ...opts, allowDebt: true }
  );
  assert.strictEqual(r.fail, false);
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

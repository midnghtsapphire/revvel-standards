#!/usr/bin/env node
"use strict";

/** Unit tests for scripts/fleet-maintenance.js — pure selection/rotation logic. */

const assert = require("assert");
const { selectRepos, isoWeek } = require("../scripts/fleet-maintenance");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS: ${name}`); passed++; }
  catch (e) { console.log(`FAIL: ${name}\n    ${e.stack || e.message}`); failed++; }
}

test("empty input -> empty", () => {
  assert.deepStrictEqual(selectRepos([], 1, 5), []);
  assert.deepStrictEqual(selectRepos(null, 1, 5), []);
});

test("max >= length returns all, sorted", () => {
  assert.deepStrictEqual(selectRepos(["c", "a", "b"], 3, 10), ["a", "b", "c"]);
});

test("caps at max and returns no duplicates within a run", () => {
  const out = selectRepos(["a", "b", "c", "d", "e"], 1, 2);
  assert.strictEqual(out.length, 2);
  assert.strictEqual(new Set(out).size, 2);
});

test("rotates across weeks to cover the fleet", () => {
  const repos = ["a", "b", "c", "d", "e"];
  const w1 = selectRepos(repos, 1, 2); // start (1*2)%5 = 2 -> c,d
  const w2 = selectRepos(repos, 2, 2); // start (2*2)%5 = 4 -> e,a
  assert.deepStrictEqual(w1, ["c", "d"]);
  assert.deepStrictEqual(w2, ["e", "a"]);
});

test("isoWeek returns a sane week number", () => {
  const w = isoWeek(new Date("2026-05-23T00:00:00Z"));
  assert.ok(w >= 1 && w <= 53, `got ${w}`);
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

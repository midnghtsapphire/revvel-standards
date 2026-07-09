#!/usr/bin/env node
"use strict";

/** Unit tests for scripts/fleet-maintenance.js. */

const assert = require("assert");
const {
  fileWorkRequest,
  hasOpenWorkRequest,
  isoWeek,
  selectRepos,
} = require("../scripts/fleet-maintenance");

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

test("hasOpenWorkRequest returns true when a matching open WR exists", () => {
  const found = hasOpenWorkRequest("midnghtsapphire/revvel-standards", "midnghtsapphire", "target", () => (
    JSON.stringify([{ number: 123 }])
  ));

  assert.strictEqual(found, true);
});

test("hasOpenWorkRequest returns false when no matching open WR exists", () => {
  const found = hasOpenWorkRequest("midnghtsapphire/revvel-standards", "midnghtsapphire", "target", () => "[]");

  assert.strictEqual(found, false);
});

test("hasOpenWorkRequest fails closed when gh issue list fails", () => {
  assert.throws(
    () => hasOpenWorkRequest("midnghtsapphire/revvel-standards", "midnghtsapphire", "target", () => {
      throw new Error("gh auth failed");
    }),
    /refusing to file a duplicate.*gh auth failed/
  );
});

test("hasOpenWorkRequest fails closed when gh returns malformed JSON", () => {
  assert.throws(
    () => hasOpenWorkRequest("midnghtsapphire/revvel-standards", "midnghtsapphire", "target", () => "{"),
    /refusing to file a duplicate/
  );
});

test("fileWorkRequest does not create an issue when open-WR lookup fails", () => {
  const calls = [];

  assert.throws(
    () => fileWorkRequest("midnghtsapphire/revvel-standards", "midnghtsapphire", "target", false, (args) => {
      calls.push(args);
      if (args[1] === "list") throw new Error("rate limit exceeded");
      if (args[1] === "create") return "https://github.com/example/issues/1\n";
      throw new Error(`unexpected gh call: ${args.join(" ")}`);
    }),
    /refusing to file a duplicate.*rate limit exceeded/
  );

  assert.strictEqual(calls.some((args) => args[1] === "create"), false);
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

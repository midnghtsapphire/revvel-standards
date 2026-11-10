import assert from "node:assert/strict";
import test from "node:test";
import { creditSummary } from "./course.ts";
import {
  CANON,
  RANDOM_CANON,
  bayesAfterMiss,
  podRandomSearch,
  proofsPass,
  runProofs,
  sum,
} from "./meridian-math.ts";

test("canonical proofs all pass", () => {
  const rows = runProofs();
  assert.equal(proofsPass(rows), true, rows.filter((r) => !r.pass).map((r) => r.id).join(","));
});

test("hand arithmetic matches exported expectation", () => {
  const post = bayesAfterMiss(CANON.prior, 0, 0.6);
  assert.ok(Math.abs(post[0] - 0.2 / 0.7) < 1e-12);
  assert.ok(Math.abs(post[1] - 0.3 / 0.7) < 1e-12);
  assert.ok(Math.abs(post[2] - 0.2 / 0.7) < 1e-12);
  assert.ok(Math.abs(sum(post) - 1) < 1e-12);
});

test("random search closed form", () => {
  const g = podRandomSearch(20, 5000, 100_000);
  assert.equal(g.coverage, RANDOM_CANON.expectedCoverage);
  assert.ok(Math.abs(g.pod - (1 - Math.E ** -1)) < 1e-12);
});

test("syllabus credit clock matches C.R.C.P. 250 50-minute hour", () => {
  const s = creditSummary();
  assert.equal(s.clockMinutes, 180);
  assert.equal(s.substantiveMinutes, 150);
  assert.equal(s.ethicsMinutes, 25);
  assert.equal(s.ediMinutes, 25);
  assert.equal(s.nonCreditMinutes, 30);
  assert.equal(s.generalCredits, 3);
  assert.equal(s.ethicsCredits, 0.5);
  assert.equal(s.ediCredits, 0.5);
  assert.equal(s.hours.length, 3);
});

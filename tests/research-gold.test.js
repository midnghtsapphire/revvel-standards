#!/usr/bin/env node
"use strict";

// WR #18341, PR 2: the research gold set and the benchmark wiring.
// Inline rows below are validator test inputs, not gold examples.

const { describe, test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  GOLD_FIXTURE,
  GOLD_TARGET,
  inspectEvaluationSet,
  inspectResearchGold,
  main: runBenchmark,
  validateGoldRow,
} = require("../scripts/pot-research/benchmark");
const builder = require("../products/rnd-research-fleet/eval/build-research-gold");

const repoRoot = path.join(__dirname, "..");
const goldPath = path.join(repoRoot, GOLD_FIXTURE);
const rows = () =>
  fs
    .readFileSync(goldPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

function tempRepoWithGold(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gold-"));
  const target = path.join(dir, GOLD_FIXTURE);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, mutate(rows()).map((row) => JSON.stringify(row)).join("\n") + "\n");
  return dir;
}

describe("research-gold-v1", () => {
  test("the committed fixture validates and the harness reports counts without a score", () => {
    const gold = inspectResearchGold(repoRoot);
    assert.strictEqual(gold.found, true);
    assert.deepStrictEqual(gold.errors, []);
    assert.strictEqual(gold.valid, true);
    assert.strictEqual(gold.count, rows().length);
    assert.ok(gold.count > 0);
    assert.strictEqual(gold.target, GOLD_TARGET);
    assert.strictEqual(gold.shortfall, Math.max(0, GOLD_TARGET - gold.count));
    assert.strictEqual(gold.meetsDependency, gold.count >= GOLD_TARGET);
    assert.strictEqual(
      Object.values(gold.bySource).reduce((a, b) => a + b, 0),
      gold.count,
    );

    const report = inspectEvaluationSet(repoRoot);
    assert.strictEqual(report.status, "NOT_MEASURED");
    assert.strictEqual(report.qualityDelta, null);
    assert.strictEqual(report.compared, false);
    assert.strictEqual(report.gold.count, gold.count);
    assert.strictEqual(runBenchmark(repoRoot), 0);
  });

  test("every row has unique id, full provenance and a pinned commit", () => {
    const seen = new Set();
    for (const row of rows()) {
      assert.ok(!seen.has(row.id), `duplicate ${row.id}`);
      seen.add(row.id);
      assert.match(row.source_sha, /^[0-9a-f]{40}$/);
      assert.match(row.source_blob_sha, /^[0-9a-f]{40}$/);
      assert.ok(row.source_repo.startsWith("midnghtsapphire/"));
      assert.ok(row.source_path && row.source_locator && row.domain && row.label);
      assert.ok(row.source_url.includes(row.source_sha) && row.source_url.endsWith(row.source_path));
      assert.strictEqual(row.difficulty, null, "difficulty is only recorded when the source states one");
    }
  });

  test("public rows carry hash-matching text and private rows carry none", () => {
    const all = rows();
    const publicRows = all.filter((row) => row.visibility === "public");
    const privateRows = all.filter((row) => row.visibility === "private");
    assert.strictEqual(publicRows.length + privateRows.length, all.length);
    for (const row of publicRows) {
      assert.strictEqual(builder.sha256(row.question), row.question_sha256);
      assert.strictEqual(builder.sha256(row.reference_answer), row.reference_sha256);
    }
    for (const row of privateRows) {
      assert.strictEqual(row.question, null);
      assert.strictEqual(row.reference_answer, null);
      assert.notStrictEqual(row.source_repo, "midnghtsapphire/risingaloha");
    }
  });

  test("the validator rejects broken rows", () => {
    const good = rows()[0];
    assert.deepStrictEqual(validateGoldRow({ ...good }, new Set()), []);
    const seen = new Set([good.id]);
    assert.ok(validateGoldRow({ ...good }, seen).some((error) => /duplicate id/.test(error)));
    assert.ok(validateGoldRow({ ...good, source_sha: "abc123" }, new Set()).some((e) => /source_sha/.test(e)));
    assert.ok(validateGoldRow({ ...good, source_url: "" }, new Set()).some((e) => /missing source_url/.test(e)));
    assert.ok(validateGoldRow({ ...good, visibility: "secret" }, new Set()).some((e) => /visibility/.test(e)));
    const publicRow = rows().find((row) => row.visibility === "public");
    assert.ok(validateGoldRow({ ...publicRow, reference_answer: "edited" }, new Set()).some((e) => /hash mismatch/.test(e)));
    const privateRow = rows().find((row) => row.visibility === "private");
    assert.ok(validateGoldRow({ ...privateRow, question: "leak" }, new Set()).some((e) => /must not carry text/.test(e)));
  });

  test("an invalid fixture makes the harness exit 2 and still reports no delta", () => {
    const dir = tempRepoWithGold((all) => all.map((row, i) => (i === 0 ? { ...row, source_sha: "nope" } : row)));
    const gold = inspectResearchGold(dir);
    assert.strictEqual(gold.valid, false);
    assert.strictEqual(gold.meetsDependency, false);
    const report = inspectEvaluationSet(dir);
    assert.strictEqual(report.qualityDelta, null);
    const originalWrite = process.stdout.write;
    process.stdout.write = () => true;
    try {
      assert.strictEqual(runBenchmark(dir), 2);
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  test("local full text attaches only when it matches the committed hashes", () => {
    const privateRow = rows().find((row) => row.visibility === "private");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gold-full-"));
    const bad = path.join(dir, "bad.jsonl");
    fs.writeFileSync(bad, JSON.stringify({ id: privateRow.id, question: "not the source text", reference_answer: "nor this" }) + "\n");
    const rejected = inspectResearchGold(repoRoot, { fullTextPath: bad });
    assert.strictEqual(rejected.valid, false);
    assert.strictEqual(rejected.fulltextVerified, 0);
    assert.ok(rejected.errors.some((e) => /does not match the committed hashes/.test(e)));
    const none = inspectResearchGold(repoRoot, { fullTextPath: path.join(dir, "absent.jsonl") });
    assert.strictEqual(none.valid, true);
    assert.strictEqual(none.fulltextVerified, 0);
  });

  test("the builder hashes blobs like git and refuses unpinned files", () => {
    assert.strictEqual(builder.gitBlobSha(Buffer.from("hello\n")), "ce013625030ba8dba906f756967f9e9ca394464a");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gold-src-"));
    const file = path.join(dir, "linear-a", "data", "ledger", "hypotheses.jsonl");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{}\n");
    assert.throws(() => builder.buildRows(dir), /does not match pinned/);
    const publicView = builder.toPublicRow({ visibility: "private", question: "q", reference_answer: "a" });
    assert.strictEqual(publicView.question, null);
    assert.strictEqual(publicView.reference_answer, null);
    assert.strictEqual(builder.toPublicRow({ visibility: "public", question: "q" }).question, "q");
  });
});

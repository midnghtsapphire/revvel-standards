import assert from "node:assert/strict";
import { chunkPullRequestDiff, estimateReviewUnits } from "../lib/chunk";

{
  assert.deepEqual(chunkPullRequestDiff(""), []);
  assert.deepEqual(chunkPullRequestDiff("   \n"), []);
}

{
  const single = "diff --git a/a.ts b/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n+hello\n";
  const chunks = chunkPullRequestDiff(single, 4000);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].index, 0);
  assert.ok(chunks[0].content.includes("+hello"));
  assert.ok(chunks[0].files.includes("a.ts") || chunks[0].label.includes("a.ts"));
}

{
  const fileA = [
    "diff --git a/one.ts b/one.ts",
    "+++ b/one.ts",
    "@@ -1 +1 @@",
    "+" + "A".repeat(200),
  ].join("\n");
  const fileB = [
    "diff --git a/two.ts b/two.ts",
    "+++ b/two.ts",
    "@@ -1 +1 @@",
    "+" + "B".repeat(200),
  ].join("\n");
  const packed = chunkPullRequestDiff(`${fileA}\n${fileB}`, 1000);
  assert.ok(packed.length >= 1);
  assert.ok(packed.every((c) => c.charCount <= 1000 + 50));
}

{
  const hugeLine = "+" + "X".repeat(50);
  const lines = ["diff --git a/big.ts b/big.ts", "+++ b/big.ts", "@@ -1 +1 @@"];
  for (let i = 0; i < 80; i += 1) lines.push(hugeLine);
  const oversized = chunkPullRequestDiff(lines.join("\n"), 600);
  assert.ok(oversized.length >= 2, "oversized single file must split");
  assert.ok(oversized.every((c) => c.content.length <= 600 + 80));
  // Overlap should keep continuity (not required exact, but parts labeled).
  assert.ok(oversized.some((c) => /part/i.test(c.label)));
}

{
  assert.equal(estimateReviewUnits(""), 1);
  assert.ok(estimateReviewUnits("diff --git a/x b/x\n+hi\n", 4000) >= 1);
}

console.log("✅ chunk tests passed");

import assert from "node:assert/strict";
import { parseGroqFindings } from "../lib/groq-client";
import { buildGithubReviewBody } from "../lib/export";
import { reviewDiffLocally } from "../lib/local-reviewer";
import { buildWorkflowSnippet, reviewPullRequestDiff } from "../lib/review-engine";

const DIRTY_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,10 @@
 export function login(user: string, pass: string) {
-  return check(user, pass);
+  const api_key = "sk-live-super-secret-value-12345";
+  console.log("login", user);
+  try { return check(user, pass); } catch (e) {}
+  // TODO: add MFA
+  element.innerHTML = user;
+  return null as any;
 }
`;

async function main() {
  {
    const findings = reviewDiffLocally(DIRTY_DIFF, 0);
    const rules = new Set(findings.map((f) => f.ruleId));
    assert.ok(rules.has("secret-api-key"), "must flag hardcoded secret");
    assert.ok(rules.has("console-log"), "must flag console.log");
    assert.ok(rules.has("empty-catch"), "must flag empty catch");
    assert.ok(rules.has("todo-fixme"), "must flag TODO");
    assert.ok(rules.has("dangerously-set-html") || rules.has("any-type"));
    assert.ok(findings.some((f) => f.severity === "critical"));
  }

  {
    assert.deepEqual(parseGroqFindings("NO_FINDINGS", 1), []);
    const rows = parseGroqFindings("- [critical] secret :: rotate key", 2);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].severity, "critical");
    assert.match(rows[0].title, /secret/i);
  }

  {
    const result = await reviewPullRequestDiff(DIRTY_DIFF, { forceLocal: true, chunkSize: 500 });
    assert.ok(result.stats.chunkCount >= 1);
    assert.ok(result.stats.findingCount >= 3);
    assert.equal(result.stats.provider, "local");
    assert.ok(result.markdown.includes("Groq Code Review Report"));
    assert.ok(result.summary.length > 10);
    const body = buildGithubReviewBody(result);
    assert.ok(body.includes("Groq Code Review"));
    assert.ok(body.includes("Top findings"));
  }

  {
    const empty = await reviewPullRequestDiff("", { forceLocal: true });
    assert.equal(empty.stats.chunkCount, 0);
    assert.equal(empty.stats.findingCount, 0);
    assert.match(empty.summary, /empty/i);
  }

  {
    const yaml = buildWorkflowSnippet({ model: "llama-3.3-70b-versatile", chunkSize: 4000 });
    assert.ok(yaml.includes("pull_request:"));
    assert.ok(yaml.includes("GROQ_API_KEY"));
    assert.ok(yaml.includes("pullRequestDiffChunkSize"));
    assert.ok(yaml.includes("llama-3.3-70b-versatile"));
  }

  console.log("✅ review-engine tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

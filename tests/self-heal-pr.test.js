#!/usr/bin/env node
"use strict";

/**
 * Unit tests for self-heal-pr.yml workflow logic
 *
 * Tests the key decision points:
 * 1. Input resolution (workflow_dispatch vs repository_dispatch payloads)
 * 2. Branch name generation
 * 3. Commit message building (with/without Closes trailer)
 * 4. PR title/body construction
 * 5. Branch suffix sanitisation
 * 6. Label selection (devin-review gating on DEVIN_API_KEY)
 */

const assert = require("assert");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    failed += 1;
  }
}

// ── Helpers mirroring workflow logic ─────────────────────────────────────────

/**
 * Resolve inputs from either event source.
 * Mirrors the "Resolve inputs" step in self-heal-pr.yml.
 */
function resolveInputs(wdInputs = {}, rdPayload = {}) {
  const description =
    wdInputs.fix_description || rdPayload.fix_description || "";
  const issue = wdInputs.issue_number || rdPayload.issue_number || "";
  const fixType = wdInputs.fix_type || rdPayload.fix_type || "workflow";
  const suffix = wdInputs.branch_suffix || rdPayload.branch_suffix || "";
  const patch = wdInputs.patch_content || rdPayload.patch_content || "";
  return { description, issue, fixType, suffix, patch };
}

/**
 * Sanitise branch suffix: lowercase, [a-z0-9-] only, max 40 chars.
 * Mirrors the sanitisation logic in the "Resolve inputs" step.
 */
function sanitiseSuffix(raw) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 40);
}

/**
 * Build the self-heal branch name.
 * Mirrors the "Create branch" step.
 */
function buildBranchName(date, fixType, suffix, runId) {
  const safeSuffix = suffix ? sanitiseSuffix(suffix) : "";
  if (safeSuffix) {
    return `self-heal/${date}-${fixType}-${safeSuffix}`;
  }
  return `self-heal/${date}-${fixType}-${runId}`;
}

/**
 * Build the commit message.
 * Mirrors the "Apply patch and commit" step.
 */
function buildCommitMessage(fixType, description, issue) {
  let msg = `fix(${fixType}): ${description} [self-heal]`;
  if (issue) {
    msg += `\n\nCloses #${issue}`;
  }
  return msg;
}

/**
 * Build the PR title.
 */
function buildPrTitle(fixType, description) {
  return `fix(${fixType}): ${description}`;
}

/**
 * Determine whether to add the devin-review label.
 * Mirrors the "Add devin-review label" step gate.
 */
function shouldAddDevinLabel(devinApiKey) {
  return Boolean(devinApiKey);
}

/**
 * Build base PR labels (always applied).
 */
function basePrLabels() {
  return ["self-heal", "auto-fix"];
}

/**
 * Build final PR label list, including devin-review when key is present.
 */
function buildPrLabels(devinApiKey) {
  const labels = basePrLabels();
  if (shouldAddDevinLabel(devinApiKey)) {
    labels.push("devin-review");
  }
  return labels;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("=== self-heal-pr.yml Unit Tests ===\n");

  // Input resolution — workflow_dispatch takes priority
  await test("resolveInputs: workflow_dispatch values preferred over repository_dispatch", () => {
    const result = resolveInputs(
      { fix_description: "WD fix", fix_type: "script", issue_number: "42" },
      { fix_description: "RD fix", fix_type: "config" },
    );
    assert.equal(result.description, "WD fix");
    assert.equal(result.fixType, "script");
    assert.equal(result.issue, "42");
  });

  await test("resolveInputs: falls back to repository_dispatch payload", () => {
    const result = resolveInputs(
      {},
      { fix_description: "RD fix", fix_type: "config", issue_number: "99" },
    );
    assert.equal(result.description, "RD fix");
    assert.equal(result.fixType, "config");
    assert.equal(result.issue, "99");
  });

  await test('resolveInputs: fix_type defaults to "workflow" when absent', () => {
    const result = resolveInputs({}, {});
    assert.equal(result.fixType, "workflow");
  });

  await test("resolveInputs: empty description resolves to empty string", () => {
    const result = resolveInputs({}, {});
    assert.equal(result.description, "");
  });

  // Branch suffix sanitisation
  await test("sanitiseSuffix: lowercases input", () => {
    assert.equal(sanitiseSuffix("MyFix"), "myfix");
  });

  await test("sanitiseSuffix: replaces invalid chars with hyphens", () => {
    assert.equal(sanitiseSuffix("fix/the bug!"), "fix-the-bug");
    // Leading/trailing hyphens are stripped
    assert.equal(sanitiseSuffix("!!!fix!!!"), "fix");
  });

  await test("sanitiseSuffix: truncates at 40 chars", () => {
    const long = "a".repeat(60);
    assert.equal(sanitiseSuffix(long).length, 40);
  });

  await test("sanitiseSuffix: empty string stays empty", () => {
    assert.equal(sanitiseSuffix(""), "");
  });

  await test("sanitiseSuffix: allows hyphens and digits", () => {
    assert.equal(sanitiseSuffix("fix-123-workflow"), "fix-123-workflow");
  });

  // Branch name generation
  await test("buildBranchName: includes self-heal/ prefix", () => {
    const name = buildBranchName("2026-07-13", "workflow", "", "run123");
    assert.ok(
      name.startsWith("self-heal/"),
      `expected self-heal/ prefix, got: ${name}`,
    );
  });

  await test("buildBranchName: uses suffix when provided", () => {
    const name = buildBranchName(
      "2026-07-13",
      "script",
      "fix-wr-lint",
      "run999",
    );
    assert.equal(name, "self-heal/2026-07-13-script-fix-wr-lint");
  });

  await test("buildBranchName: falls back to run ID when no suffix", () => {
    const name = buildBranchName("2026-07-13", "workflow", "", "run42");
    assert.equal(name, "self-heal/2026-07-13-workflow-run42");
  });

  await test("buildBranchName: fix_type is included in branch name", () => {
    for (const ft of ["workflow", "script", "config", "docs"]) {
      const name = buildBranchName("2026-07-13", ft, "", "run1");
      assert.ok(name.includes(ft), `expected branch to contain ${ft}`);
    }
  });

  // Commit message building
  await test("buildCommitMessage: conventional-commit format", () => {
    const msg = buildCommitMessage("workflow", "fix broken trigger", "");
    assert.equal(msg, "fix(workflow): fix broken trigger [self-heal]");
  });

  await test("buildCommitMessage: appends Closes trailer when issue provided", () => {
    const msg = buildCommitMessage("script", "repair wr-lint", "15765");
    assert.ok(msg.includes("Closes #15765"), `missing Closes trailer: ${msg}`);
  });

  await test("buildCommitMessage: no Closes trailer when issue is empty", () => {
    const msg = buildCommitMessage("config", "update label list", "");
    assert.ok(!msg.includes("Closes"), `unexpected Closes in: ${msg}`);
  });

  await test("buildCommitMessage: [self-heal] tag always present", () => {
    const msg = buildCommitMessage("docs", "update readme", "100");
    assert.ok(msg.includes("[self-heal]"), `missing [self-heal] tag: ${msg}`);
  });

  // PR title
  await test("buildPrTitle: follows conventional-commit format", () => {
    const title = buildPrTitle("workflow", "fix stuck-check trigger");
    assert.equal(title, "fix(workflow): fix stuck-check trigger");
  });

  // Label selection
  await test("basePrLabels: always includes self-heal and auto-fix", () => {
    const labels = basePrLabels();
    assert.ok(labels.includes("self-heal"));
    assert.ok(labels.includes("auto-fix"));
  });

  await test("shouldAddDevinLabel: returns true when key is set", () => {
    assert.ok(shouldAddDevinLabel("ghp_sometoken"));
  });

  await test("shouldAddDevinLabel: returns false when key is absent", () => {
    assert.ok(!shouldAddDevinLabel(""));
    assert.ok(!shouldAddDevinLabel(undefined));
  });

  await test("buildPrLabels: includes devin-review when key is configured", () => {
    const labels = buildPrLabels("ghp_somekey");
    assert.ok(labels.includes("devin-review"));
    assert.ok(labels.includes("self-heal"));
    assert.ok(labels.includes("auto-fix"));
  });

  await test("buildPrLabels: omits devin-review when key is absent", () => {
    const labels = buildPrLabels("");
    assert.ok(!labels.includes("devin-review"));
    assert.ok(labels.includes("self-heal"));
    assert.ok(labels.includes("auto-fix"));
  });

  // Integration: full fix metadata
  await test("full workflow metadata — dispatch + branch + commit + labels", () => {
    const inputs = resolveInputs(
      {
        fix_description: "fix workflow_run missing workflows list",
        fix_type: "workflow",
        issue_number: "15765",
        branch_suffix: "workflow-run-fix",
      },
      {},
    );
    const branch = buildBranchName(
      "2026-07-13",
      inputs.fixType,
      inputs.suffix,
      "run1",
    );
    const msg = buildCommitMessage(
      inputs.fixType,
      inputs.description,
      inputs.issue,
    );
    const title = buildPrTitle(inputs.fixType, inputs.description);
    const labels = buildPrLabels("ghp_token");

    assert.equal(inputs.description, "fix workflow_run missing workflows list");
    assert.equal(branch, "self-heal/2026-07-13-workflow-workflow-run-fix");
    assert.ok(msg.includes("Closes #15765"));
    assert.equal(
      title,
      "fix(workflow): fix workflow_run missing workflows list",
    );
    assert.ok(labels.includes("devin-review"));
  });

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log("❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("✅ All tests passed");
  }
})();

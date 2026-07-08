#!/usr/bin/env node
'use strict';

/**
 * Regression test: generate-wr.sh must strip leading multi-line HTML comments
 * from WR_TEMPLATE_FULL.md so the H1 lands on line 1.
 *
 * Covers the fix for #15307 — the awk comment-stripper must handle multi-line
 * <!-- --> blocks (not just single-line ones) so the linter does not reject
 * the output with "H1 is at line 7, expected line 1".
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATE_SH = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const WR_ISSUES_DIR = path.join(REPO_ROOT, 'wr', 'issues');

test('generate-wr.sh: H1 lands on line 1 (multi-line comment stripping)', () => {
  // Write a minimal body file
  const bodyFile = path.join(os.tmpdir(), 'wr-test-body.md');
  fs.writeFileSync(bodyFile, 'Test issue body for comment stripping regression.\n');

  const title = 'Comment Stripping Regression Test WR';
  const issueNum = 'test-comment-strip';

  const result = spawnSync('bash', [
    GENERATE_SH,
    '--issue', issueNum,
    '--title', title,
    '--body-file', bodyFile,
    '--class', 'full',
  ], { encoding: 'utf8', cwd: REPO_ROOT });

  // Clean up generated file regardless of outcome
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  const outFile = path.join(WR_ISSUES_DIR, `issue-${issueNum}-${slug}.md`);
  try {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  } catch (_) { /* ignore cleanup errors */ }
  fs.unlinkSync(bodyFile);

  assert.strictEqual(result.status, 0,
    `generate-wr.sh failed with exit code ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);

  assert.ok(
    !result.stderr.includes('H1 is at line'),
    `wr-lint reported H1 not at line 1 — multi-line comment stripping broken.\nstderr: ${result.stderr}`
"use strict";

/**
 * Regression tests for the multi-line HTML comment stripping in
 * wr/scripts/generate-wr.sh (issue #15215).
 *
 * The awk block at the top of the generator must strip BOTH single-line
 * (<!-- ... -->) and multi-line (<!-- ... \n ... -->) HTML comments that
 * appear before the # WR: H1 in WR_TEMPLATE_FULL.md, so the H1 always
 * lands on line 1 and wr-lint accepts the output.
 *
 * Previously only single-line comments were stripped; the third comment in
 * WR_TEMPLATE_FULL.md spans eight lines ("Source-packet convention"), which
 * caused the H1 to appear at line 9 and the lint gate to refuse the output.
 */

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const GENERATOR = path.join(__dirname, "..", "wr", "scripts", "generate-wr.sh");
const WR_DIR = path.join(__dirname, "..", "wr");

/**
 * Run generate-wr.sh with a custom template and return { status, stderr, outPath }.
 * We override TEMPLATE by temporarily symlinking it so the script picks it up.
 */
function runGenerator(templateContent, titleSlug) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gen-wr-test-"));
  const issuesDir = path.join(tmp, "issues");
  fs.mkdirSync(issuesDir, { recursive: true });

  // Write a minimal custom template to a temp file
  const templatePath = path.join(tmp, "WR_TEMPLATE_FULL.md");
  fs.writeFileSync(templatePath, templateContent, "utf8");

  // Write a minimal body file
  const bodyPath = path.join(tmp, "body.txt");
  fs.writeFileSync(bodyPath, "test body", "utf8");

  // Run the generator with HERE pointing at our tmp dir so it finds the template
  // and writes the output into tmp/issues/.  We set HERE via a wrapper that
  // redefines the directory at the top of the script.
  const result = spawnSync(
    "bash",
    [
      "-c",
      // Inject HERE override by prepending a variable assignment via env and
      // use a modified call: patch the script inline so TEMPLATE resolves to
      // our temp dir rather than the real wr/ directory.
      `HERE=${JSON.stringify(tmp)} bash ${JSON.stringify(GENERATOR)} ` +
        `--issue 99999 ` +
        `--title ${JSON.stringify(titleSlug)} ` +
        `--body-file ${JSON.stringify(bodyPath)} ` +
        `--class full`,
    ],
    { encoding: "utf8" }
  );

  let outPath = null;
  if (result.status === 0) {
    const files = fs.readdirSync(issuesDir);
    if (files.length) outPath = path.join(issuesDir, files[0]);
  }

  // Clean up
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}

  return { status: result.status, stderr: result.stderr || "", stdout: result.stdout || "", outPath };
}

/**
 * A minimal FULL-template skeleton used for testing. It intentionally starts
 * with a multi-line HTML comment (mimicking the real WR_TEMPLATE_FULL.md)
 * followed by a single-line comment, then the H1.
 */
const MULTI_LINE_COMMENT_TEMPLATE = `<!-- First single-line comment. -->
<!-- Second single-line comment. -->
<!-- Third comment spans
     multiple lines and ends here. -->
<!-- Fourth single-line comment. -->
# WR: {TITLE}

**Issue:** {ISSUE_REF}
**Repository:** {REPO}
**Created:** {DATE}
**Researcher:** {RESEARCHER}
**Research Date:** {RESEARCH_DATE}
**WR Status:** {STATUS}

## Issue Context

{ISSUE_BODY}

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | {STARS} |
| Open Issues | {OPEN_ISSUES} |
| Private | {IS_PRIVATE} |
| Archived | {IS_ARCHIVED} |

## Research Checklist

- [ ] Deep market research
- [ ] BOM
- [ ] Competitor analysis (table MUST list actual prices or \`Pricing data pending — competitive benchmark research required.\`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
{RESEARCH_FINDINGS}

## Executive Summary

{EXECUTIVE_SUMMARY}

## Step 1A — Product/Output Selections

{PRODUCT_SELECTIONS}

## Step 2 — Deep Web Research

{DEEP_WEB_RESEARCH}

## Step 3 — Requirements

{REQUIREMENTS}

## Recommendations

{RECOMMENDATIONS}

## Dependencies

| Field | Value |
| --- | --- |
| \`depends_on\` (prerequisite WRs) | {DEPENDS_ON} |
| Blocked by | {BLOCKED_BY} |
| Blocks (downstream WRs) | {BLOCKS} |

{DEPENDENCIES}

## Risks

{RISKS}
`;

test("single-line leading HTML comments are stripped (H1 on line 1)", () => {
  const singleLineOnly = `<!-- comment one -->
<!-- comment two -->
# WR: {TITLE}

**Issue:** {ISSUE_REF}
**Repository:** {REPO}
**Created:** {DATE}
**Researcher:** {RESEARCHER}
**Research Date:** {RESEARCH_DATE}
**WR Status:** {STATUS}

## Issue Context

{ISSUE_BODY}

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | {STARS} |
| Open Issues | {OPEN_ISSUES} |
| Private | {IS_PRIVATE} |
| Archived | {IS_ARCHIVED} |

## Research Checklist

- [ ] Deep market research
- [ ] Competitor analysis (table MUST list actual prices or \`Pricing data pending — competitive benchmark research required.\`)
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
{RESEARCH_FINDINGS}

## Executive Summary

{EXECUTIVE_SUMMARY}

## Step 1A — Product/Output Selections

{PRODUCT_SELECTIONS}

## Step 2 — Deep Web Research

{DEEP_WEB_RESEARCH}

## Step 3 — Requirements

{REQUIREMENTS}

## Recommendations

{RECOMMENDATIONS}

## Dependencies

| Field | Value |
| --- | --- |
| \`depends_on\` (prerequisite WRs) | {DEPENDS_ON} |
| Blocked by | {BLOCKED_BY} |
| Blocks (downstream WRs) | {BLOCKS} |

{DEPENDENCIES}

## Risks

{RISKS}
`;
  const { status, stderr } = runGenerator(singleLineOnly, "single-line comment test");
  assert.strictEqual(status, 0, `generator failed (single-line comments):\n${stderr}`);
});

test("multi-line leading HTML comment is stripped so H1 lands on line 1 (regression #15215)", () => {
  const { status, stderr } = runGenerator(
    MULTI_LINE_COMMENT_TEMPLATE,
    "multi-line comment regression test"
  );
  assert.strictEqual(
    status,
    0,
    `generator refused output — H1 likely not on line 1 due to un-stripped multi-line comment:\n${stderr}`
  );
});

test("real WR_TEMPLATE_FULL.md generates with H1 on line 1", () => {
  // This is the integration smoke-test: actually run the generator against the
  // live template that has the problematic multi-line Source-packet comment.
  const bodyPath = path.join(os.tmpdir(), "test-body-99998.txt");
  fs.writeFileSync(bodyPath, "https://example.com/spec.pdf", "utf8");

  const result = spawnSync(
    "bash",
    [
      GENERATOR,
      "--issue", "99998",
      "--title", "integration smoke test for H1 position",
      "--body-file", bodyPath,
      "--class", "full",
    ],
    { encoding: "utf8", cwd: path.join(__dirname, "..") }
  );

  // Clean up generated file
  const generatedPath = path.join(
    WR_DIR, "issues",
    "issue-99998-integration-smoke-test-for-h1-position.md"
  );
  try { fs.unlinkSync(generatedPath); } catch (_) {}
  try { fs.unlinkSync(bodyPath); } catch (_) {}

  assert.strictEqual(
    result.status,
    0,
    `generator rejected real WR_TEMPLATE_FULL.md output — multi-line comment stripping broken:\n${result.stderr}`
  );
});

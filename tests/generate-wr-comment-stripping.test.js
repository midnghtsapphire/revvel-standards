<<<<<<< HEAD
#!/usr/bin/env node
'use strict';

/**
 * Regression test: generate-wr.sh must strip ALL leading HTML comments
 * (both single-line and multi-line) before the H1 so that wr-lint sees
 * the `# WR:` header on line 1.
 *
 * Covers the fix for WR_TEMPLATE_FULL.md's multi-line Source-packet
 * convention comment that was causing H1-at-line-7 failures.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATE_WR = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const WR_LINT = path.join(REPO_ROOT, 'wr', 'scripts', 'wr-lint.mjs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

/**
 * Run generate-wr.sh with a given title and class, return the generated file
 * content (or null on failure).
 */
function runGenerator(issueNum, title, bodyText, wrClass) {
  const tmpBody = path.join(os.tmpdir(), `test-wr-body-${issueNum}.txt`);
  fs.writeFileSync(tmpBody, bodyText);

  const result = spawnSync(
    'bash',
    [
      GENERATE_WR,
      '--issue', String(issueNum),
      '--title', title,
      '--body-file', tmpBody,
      '--class', wrClass,
    ],
    { encoding: 'utf8', cwd: REPO_ROOT }
  );

  fs.unlinkSync(tmpBody);

  const dest = path.join(
    REPO_ROOT, 'wr', 'issues',
    `issue-${issueNum}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)}.md`
  );

  if (result.status !== 0) {
    return { ok: false, stderr: result.stderr, dest };
  }

  const content = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
  return { ok: true, content, dest };
}

// ---------------------------------------------------------------------------
// Test 1: FULL-class WR (multi-line leading comments) — H1 must be on line 1
// ---------------------------------------------------------------------------
test('FULL template: H1 lands on line 1 despite multi-line leading HTML comments', () => {
  const r = runGenerator(
    'test-mline',
    'test multiline comment strip',
    'https://example.com/reference',
    'full'
  );
  assert(r.ok, `Generator failed: ${r.stderr}`);
  assert(r.content, 'No output file created');

  const firstLine = r.content.split('\n')[0];
  assert(
    firstLine.startsWith('# WR:'),
    `Expected H1 on line 1, got: "${firstLine}"`
  );

  // Cleanup
  if (fs.existsSync(r.dest)) fs.unlinkSync(r.dest);
});

// ---------------------------------------------------------------------------
// Test 2: BASIC-class WR — H1 still on line 1
// ---------------------------------------------------------------------------
test('BASIC template: H1 lands on line 1', () => {
  const r = runGenerator(
    'test-basic',
    'test basic comment strip fix',
    'Some body text',
    'basic'
  );
  assert(r.ok, `Generator failed: ${r.stderr}`);
  assert(r.content, 'No output file created');

  const firstLine = r.content.split('\n')[0];
  assert(
    firstLine.startsWith('# WR:'),
    `Expected H1 on line 1, got: "${firstLine}"`
  );

  // Cleanup
  if (fs.existsSync(r.dest)) fs.unlinkSync(r.dest);
});

// ---------------------------------------------------------------------------
// Test 3: No raw {TOKEN} placeholders left in FULL-class output
// ---------------------------------------------------------------------------
test('FULL template: no unfilled {TOKEN} placeholders remain', () => {
  const r = runGenerator(
    'test-tokens',
    'test token substitution completeness',
    'https://example.com/source',
    'full'
  );
  assert(r.ok, `Generator failed: ${r.stderr}`);
  assert(r.content, 'No output file created');

  const rawTokens = r.content.match(/\{[A-Z_]+\}/g);
  assert(
    !rawTokens,
    `Unfilled tokens found: ${rawTokens ? rawTokens.join(', ') : 'none'}`
  );

  // Cleanup
  if (fs.existsSync(r.dest)) fs.unlinkSync(r.dest);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
=======
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
>>>>>>> origin/main

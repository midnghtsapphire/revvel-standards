#!/usr/bin/env node
'use strict';

/**
 * Regression test: generate-wr.sh must strip leading multi-line HTML comments
 * from WR_TEMPLATE_FULL.md so the H1 lands on line 1 and passes wr-lint.
 *
 * This exercises the in_comment state fix in generate-wr.sh (wr/scripts/).
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATE_WR = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const WR_ISSUES_DIR = path.join(REPO_ROOT, 'wr', 'issues');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATOR = path.join(REPO_ROOT, 'wr', 'scripts', 'generate-wr.sh');
const ISSUE_NUMBER = '999998';

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

// ---- helpers ----

/**
 * Run generate-wr.sh in a temp dir and return the generated file path.
 */
function runGenerator({ issue = 'test99', title, body = '', extraArgs = [] } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-wr-'));
  const bodyFile = path.join(tmpDir, 'body.txt');
  fs.writeFileSync(bodyFile, body);

  const result = spawnSync('bash', [
    GENERATE_WR,
    '--issue', String(issue),
    '--title', title,
    '--body-file', bodyFile,
    '--class', 'full',
    ...extraArgs,
  ], { encoding: 'utf8', cwd: REPO_ROOT });

  if (result.status !== 0) {
    const err = (result.stderr || '') + (result.stdout || '');
    throw new Error(`generate-wr.sh exited ${result.status}: ${err}`);
  }

  // find the generated file
  const files = fs.readdirSync(WR_ISSUES_DIR)
    .filter(f => f.startsWith(`issue-${issue}-`))
    .map(f => path.join(WR_ISSUES_DIR, f));

  if (files.length === 0) {
    throw new Error('No output file found in wr/issues/');
  }

  return { filePath: files[files.length - 1], tmpDir };
}

// ---- tests ----

test('WR_TEMPLATE_FULL has multi-line HTML comment before H1', () => {
  const fullTemplate = path.join(REPO_ROOT, 'wr', 'WR_TEMPLATE_FULL.md');
  const lines = fs.readFileSync(fullTemplate, 'utf8').split('\n');
  // There must be at least one multi-line HTML comment (opens on one line, closes on a later line)
  let inComment = false;
  let foundMultiLine = false;
  for (const line of lines) {
    if (!inComment && line.trim().startsWith('<!--') && !line.includes('-->')) {
      inComment = true;
    } else if (inComment && line.includes('-->')) {
      inComment = false;
      foundMultiLine = true;
      break;
    }
  }
  assert(foundMultiLine, 'WR_TEMPLATE_FULL.md should contain at least one multi-line HTML comment before the H1');
});

test('generate-wr.sh produces H1 on line 1 for FULL template', () => {
  const issueNum = `99001`;
  let filePath;
  try {
    ({ filePath } = runGenerator({
      issue: issueNum,
      title: 'Test PBM Therapy Bed App for app or tool',
      body: 'https://example.com/test.pdf',
    }));
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    assert(lines[0].startsWith('# WR:'), `Line 1 must start with '# WR:' but got: ${lines[0]}`);
  } finally {
    // clean up generated file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

test('generate-wr.sh strips all leading HTML comments before H1', () => {
  const issueNum = `99002`;
  let filePath;
  try {
    ({ filePath } = runGenerator({
      issue: issueNum,
      title: 'PhotoBioModulation Tool app',
      body: 'https://example.com/pbm.pdf',
    }));
    const content = fs.readFileSync(filePath, 'utf8');
    const firstNonBlank = content.split('\n').find(l => l.trim() !== '');
    assert(
      firstNonBlank && firstNonBlank.startsWith('# WR:'),
      `First non-blank line must be the H1. Got: ${firstNonBlank}`
    );
    // no HTML comment should appear before the H1
    const h1Line = content.indexOf('# WR:');
    const commentBefore = content.substring(0, h1Line);
    assert(!commentBefore.includes('<!--'), `No HTML comment should appear before the H1. Found: ${commentBefore}`);
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// ---- summary ----
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
    passed += 1;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.stack || err.message}`);
    failed += 1;
  }
}

function cleanupGeneratedFiles() {
  const issuesDir = path.join(REPO_ROOT, 'wr', 'issues');
  for (const name of fs.readdirSync(issuesDir)) {
    if (name.startsWith(`issue-${ISSUE_NUMBER}-`) && name.endsWith('.md')) {
      fs.unlinkSync(path.join(issuesDir, name));
    }
  }
}

test('generate-wr strips leading multi-line HTML comments so H1 is line 1', () => {
  cleanupGeneratedFiles();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-wr-test-'));
  const bodyFile = path.join(tmpDir, 'body.md');
  fs.writeFileSync(bodyFile, 'https://example.com/source\n', 'utf8');

  try {
    execFileSync(
      'bash',
      [
        GENERATOR,
        '--issue',
        ISSUE_NUMBER,
        '--title',
        'World First: Patient Receives High-Risk Therapy to Make Cells Young Again : ScienceAlert#tools #apps',
        '--body-file',
        bodyFile,
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );

    const issuesDir = path.join(REPO_ROOT, 'wr', 'issues');
    const generated = fs
      .readdirSync(issuesDir)
      .find((name) => name.startsWith(`issue-${ISSUE_NUMBER}-`) && name.endsWith('.md'));

    assert.ok(generated, 'expected generator to create a WR issue file');
    const content = fs.readFileSync(path.join(issuesDir, generated), 'utf8');
    assert.ok(content.startsWith('# WR:'), 'expected generated WR to start with H1 on line 1');
  } finally {
    cleanupGeneratedFiles();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${passed} test(s) passed`);
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

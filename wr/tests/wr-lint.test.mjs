// wr-lint.test.mjs — node:test suite for the WR/PR lint gate.
// Runs the lint script as a child process against the golden-good and
// golden-bad fixtures and asserts on exit code and emitted issue strings.
//
// Run locally: node --test wr/tests/wr-lint.test.mjs
// (or via the root `npm run test:wr` script).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const LINT = path.join(REPO, "wr", "scripts", "wr-lint.mjs");
const GOOD = path.join(__dirname, "fixtures", "golden-good");
const BAD = path.join(__dirname, "fixtures", "golden-bad");

function runLint(file) {
  const r = spawnSync(process.execPath, [LINT, file], { encoding: "utf8" });
  return { code: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function listMd(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));
}

test("golden-good: clean-basic-fix.md passes lint", () => {
  const r = runLint(path.join(GOOD, "clean-basic-fix.md"));
  assert.equal(r.code, 0, `expected exit 0, got ${r.code}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /All clean/);
});

test("golden-good: clean-full-research.md passes lint", () => {
  const r = runLint(path.join(GOOD, "clean-full-research.md"));
  assert.equal(r.code, 0, `expected exit 0, got ${r.code}\nstdout:\n${r.stdout}`);
});

test("golden-good: bracket-prose-false-positive.md passes (verifies allowlist rewrite)", () => {
  // Contains legitimate `[Closes #4998]`, `[TODO: refactor]`, `[RFC 2119]`
  // prose — none are template placeholders, so the lint MUST accept them.
  const r = runLint(path.join(GOOD, "bracket-prose-false-positive.md"));
  assert.equal(
    r.code,
    0,
    `expected exit 0 (bracket prose is not a template placeholder), got ${r.code}\nstdout:\n${r.stdout}`
  );
  assert.doesNotMatch(r.stdout, /\[Closes #4998\]/, "must not flag [Closes #4998] as a placeholder");
  assert.doesNotMatch(r.stdout, /\[TODO: refactor\]/, "must not flag [TODO: refactor] as a placeholder");
  assert.doesNotMatch(r.stdout, /\[RFC 2119\]/, "must not flag [RFC 2119] as a placeholder");
});

test("golden-bad: tokens-left.md fails with unsubstituted generator token(s)", () => {
  const r = runLint(path.join(BAD, "tokens-left.md"));
  assert.equal(r.code, 1, "expected exit 1");
  assert.match(r.stdout, /unsubstituted generator token\(s\)/);
  assert.match(r.stdout, /\{STARS\}/);
  assert.match(r.stdout, /\{OPEN_ISSUES\}/);
});

test("golden-bad: checklist-lying.md fails with false-completion signal", () => {
  const r = runLint(path.join(BAD, "checklist-lying.md"));
  assert.equal(r.code, 1, "expected exit 1");
  assert.match(r.stdout, /false-completion signal/);
  // Also flags the [Option 1] placeholder via the allowlist rule.
  assert.match(r.stdout, /\[Option 1\]/);
});

test("golden-bad: scaffolding-leak.md fails with template scaffolding comment", () => {
  const r = runLint(path.join(BAD, "scaffolding-leak.md"));
  assert.equal(r.code, 1, "expected exit 1");
  assert.match(r.stdout, /template scaffolding comment/);
});

test("generic UPPER_SNAKE token detector catches a never-seen-before token", () => {
  // Spec A.2: replace the fixed enum with /\{[A-Z_][A-Z0-9_]*\}/ so any
  // new generator token (e.g. {COMPLETELY_NEW_TOKEN_42}) is caught
  // without code changes.
  const tmp = path.join(BAD, ".tmp-novel-token.md");
  fs.writeFileSync(
    tmp,
    `# WR: Fix typo in docs\n\n**Issue:** #1\n\n## Issue Context\nProperty: {COMPLETELY_NEW_TOKEN_42}\n\n## Summary\nx\n`
  );
  try {
    const r = runLint(tmp);
    assert.equal(r.code, 1, "expected exit 1");
    assert.match(r.stdout, /\{COMPLETELY_NEW_TOKEN_42\}/);
    assert.match(r.stdout, /unsubstituted generator token/);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test("all golden-good fixtures pass lint", () => {
  for (const f of listMd(GOOD)) {
    const r = runLint(f);
    assert.equal(r.code, 0, `golden-good fixture must pass: ${path.basename(f)}\n${r.stdout}`);
  }
});

test("all golden-bad fixtures fail lint", () => {
  for (const f of listMd(BAD)) {
    const r = runLint(f);
    assert.equal(r.code, 1, `golden-bad fixture must fail: ${path.basename(f)}\n${r.stdout}`);
  }
});

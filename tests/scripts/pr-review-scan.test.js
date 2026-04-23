#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  scanDiff,
  parseAddedLines,
  renderCheckboxLine,
} = require('../../scripts/pr-review-scan.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// ─── parseAddedLines ──────────────────────────────────────────
test('parseAddedLines extracts added lines with correct line numbers', () => {
  const patch = [
    '@@ -1,3 +1,4 @@',
    ' context line',
    '-removed line',
    '+added line one',
    '+added line two',
    ' trailing context',
  ].join('\n');
  const added = parseAddedLines(patch);
  assert.deepStrictEqual(added, [
    { line: 2, text: 'added line one' },
    { line: 3, text: 'added line two' },
  ]);
});

test('parseAddedLines handles multiple hunks', () => {
  const patch = [
    '@@ -1,1 +1,2 @@',
    ' a',
    '+b',
    '@@ -10,1 +11,2 @@',
    ' x',
    '+y',
  ].join('\n');
  const added = parseAddedLines(patch);
  assert.deepStrictEqual(added.map(a => a.line), [2, 12]);
});

test('parseAddedLines returns [] for empty/undefined input', () => {
  assert.deepStrictEqual(parseAddedLines(''), []);
  assert.deepStrictEqual(parseAddedLines(null), []);
  assert.deepStrictEqual(parseAddedLines(undefined), []);
});

// ─── scanDiff: secrets ───────────────────────────────────────
test('scanDiff flags AWS access key', () => {
  const res = scanDiff([{
    filename: 'src/config.js',
    patch: '@@ -0,0 +1,1 @@\n+const k = "AKIAIOSFODNN7EXAMPLE";',
  }]);
  assert.strictEqual(res.checks.secrets.pass, false);
  assert.strictEqual(res.checks.secrets.findings.length, 1);
  assert.strictEqual(res.checks.secrets.findings[0].file, 'src/config.js');
});

test('scanDiff flags inline password assignment', () => {
  const res = scanDiff([{
    filename: 'src/db.js',
    patch: '@@ -0,0 +1,1 @@\n+const password = "hunter2hunter2";',
  }]);
  assert.strictEqual(res.checks.secrets.pass, false);
});

test('scanDiff does NOT flag password read from env', () => {
  const res = scanDiff([{
    filename: 'src/db.js',
    patch: '@@ -0,0 +1,1 @@\n+const password = process.env.DB_PASSWORD;',
  }]);
  assert.strictEqual(res.checks.secrets.pass, true);
});

// ─── scanDiff: dangerous eval ─────────────────────────────────
test('scanDiff flags eval()', () => {
  const res = scanDiff([{
    filename: 'src/a.js',
    patch: '@@ -0,0 +1,1 @@\n+const r = eval(userInput);',
  }]);
  assert.strictEqual(res.checks.dangerousEval.pass, false);
});

test('scanDiff flags new Function()', () => {
  const res = scanDiff([{
    filename: 'src/a.js',
    patch: '@@ -0,0 +1,1 @@\n+const f = new Function("return 1");',
  }]);
  assert.strictEqual(res.checks.dangerousEval.pass, false);
});

test('scanDiff flags dynamic require()', () => {
  const res = scanDiff([{
    filename: 'src/a.js',
    patch: '@@ -0,0 +1,1 @@\n+const mod = require(name);',
  }]);
  assert.strictEqual(res.checks.dangerousEval.pass, false);
});

test('scanDiff does NOT flag static require()', () => {
  const res = scanDiff([{
    filename: 'src/a.js',
    patch: '@@ -0,0 +1,1 @@\n+const mod = require("fs");',
  }]);
  assert.strictEqual(res.checks.dangerousEval.pass, true);
});

test('scanDiff does NOT flag static require() with internal whitespace', () => {
  // Regression: an earlier version of the regex back-tracked on the
  // \s* after `(` and wrongly flagged `require(  "fs")` as dynamic.
  const res = scanDiff([{
    filename: 'src/a.js',
    patch: '@@ -0,0 +1,2 @@\n+const a = require(  "fs");\n+const b = require(\t"path");',
  }]);
  assert.strictEqual(res.checks.dangerousEval.pass, true);
});

// ─── scanDiff: console.log leakage ───────────────────────────
test('scanDiff flags console.log of password', () => {
  const res = scanDiff([{
    filename: 'src/a.js',
    patch: '@@ -0,0 +1,1 @@\n+console.log("user password:", password);',
  }]);
  assert.strictEqual(res.checks.consoleLog.pass, false);
});

test('scanDiff does NOT flag benign console.log', () => {
  const res = scanDiff([{
    filename: 'src/a.js',
    patch: '@@ -0,0 +1,1 @@\n+console.log("hello world");',
  }]);
  assert.strictEqual(res.checks.consoleLog.pass, true);
});

// ─── scanDiff: raw SQL ───────────────────────────────────────
test('scanDiff flags template-literal SQL with interpolation', () => {
  const res = scanDiff([{
    filename: 'src/q.js',
    patch: '@@ -0,0 +1,1 @@\n+const q = `SELECT * FROM users WHERE id = ${userId}`;',
  }]);
  assert.strictEqual(res.checks.rawSql.pass, false);
});

test('scanDiff does NOT flag parameterised SQL', () => {
  const res = scanDiff([{
    filename: 'src/q.js',
    patch: '@@ -0,0 +1,1 @@\n+const q = "SELECT * FROM users WHERE id = $1";',
  }]);
  assert.strictEqual(res.checks.rawSql.pass, true);
});

// ─── scanDiff: scope ─────────────────────────────────────────
test('scanDiff ignores non-code files for code rules but scans all files for secrets', () => {
  const res = scanDiff([{
    filename: 'README.md',
    patch: '@@ -0,0 +1,2 @@\n+eval(x)\n+AKIAIOSFODNN7EXAMPLE',
  }]);
  // eval in markdown should be ignored (onlyCode rule)
  assert.strictEqual(res.checks.dangerousEval.pass, true);
  // secrets rule is not scoped to code files
  assert.strictEqual(res.checks.secrets.pass, false);
});

test('scanDiff returns all-pass for empty input', () => {
  const res = scanDiff([]);
  assert.strictEqual(res.checks.secrets.pass, true);
  assert.strictEqual(res.checks.dangerousEval.pass, true);
  assert.strictEqual(res.checks.consoleLog.pass, true);
  assert.strictEqual(res.checks.rawSql.pass, true);
});

test('scanDiff tolerates missing patch / malformed entries', () => {
  const res = scanDiff([
    { filename: 'a.js' },           // no patch
    null,                           // null entry
    { filename: 'b.js', patch: '' },
  ]);
  assert.strictEqual(res.checks.secrets.pass, true);
});

// ─── renderCheckboxLine ──────────────────────────────────────
test('renderCheckboxLine ticks passing items', () => {
  const line = renderCheckboxLine('No eval()', { pass: true, findings: [] });
  assert.strictEqual(line, '- [x] No eval()');
});

test('renderCheckboxLine flags failing items with findings', () => {
  const line = renderCheckboxLine('No eval()', {
    pass: false,
    findings: [{ file: 'a.js', line: 7, match: 'eval(x)' }],
  });
  assert.ok(line.startsWith('- [ ] ⚠️ No eval()'));
  assert.ok(line.includes('`a.js:7`'));
  assert.ok(line.includes('eval(x)'));
});

test('renderCheckboxLine caps findings list', () => {
  const findings = Array.from({ length: 10 }, (_, i) => ({
    file: 'a.js', line: i + 1, match: 'x',
  }));
  const line = renderCheckboxLine('Rule', { pass: false, findings }, { maxFindings: 3 });
  assert.ok(line.includes('…and 7 more'));
  assert.strictEqual(line.match(/`a\.js:/g).length, 3);
});

// ─── Summary ─────────────────────────────────────────────────
console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

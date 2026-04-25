#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { scanDiff, parseAddedLines, renderCheckboxLine } = require('../scripts/pr-review-scan.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// ── parseAddedLines ───────────────────────────────────────────

test('parseAddedLines returns empty array for null/undefined', () => {
  assert.deepStrictEqual(parseAddedLines(null), []);
  assert.deepStrictEqual(parseAddedLines(undefined), []);
  assert.deepStrictEqual(parseAddedLines(''), []);
});

test('parseAddedLines extracts added lines with correct line numbers', () => {
  const patch = [
    '@@ -0,0 +1,3 @@',
    '+line one',
    '+line two',
    '+line three',
  ].join('\n');
  const result = parseAddedLines(patch);
  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[0].line, 1);
  assert.strictEqual(result[0].text, 'line one');
  assert.strictEqual(result[2].line, 3);
});

test('parseAddedLines skips removed and context lines', () => {
  const patch = [
    '@@ -1,3 +1,3 @@',
    ' context',
    '-removed',
    '+added',
  ].join('\n');
  const result = parseAddedLines(patch);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].text, 'added');
  assert.strictEqual(result[0].line, 2);
});

// ── scanDiff — secrets ────────────────────────────────────────

test('scanDiff detects AWS access keys', () => {
  const files = [{
    filename: 'config.yml',
    patch: '@@ -0,0 +1 @@\n+aws_key: AKIAIOSFODNN7EXAMPLE',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.secrets.pass, false);
  assert.strictEqual(result.checks.secrets.findings.length, 1);
});

test('scanDiff detects GitHub tokens', () => {
  const files = [{
    filename: 'script.js',
    patch: '@@ -0,0 +1 @@\n+const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef012345";',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.secrets.pass, false);
});

test('scanDiff passes clean code', () => {
  const files = [{
    filename: 'app.js',
    patch: '@@ -0,0 +1 @@\n+const x = process.env.API_KEY;',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.secrets.pass, true);
  assert.strictEqual(result.checks.dangerousEval.pass, true);
  assert.strictEqual(result.checks.consoleLog.pass, true);
  assert.strictEqual(result.checks.rawSql.pass, true);
});

// ── scanDiff — dangerous eval ─────────────────────────────────

test('scanDiff detects eval()', () => {
  const files = [{
    filename: 'handler.js',
    patch: '@@ -0,0 +1 @@\n+const result = eval(userInput);',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.dangerousEval.pass, false);
});

test('scanDiff detects new Function()', () => {
  const files = [{
    filename: 'handler.ts',
    patch: '@@ -0,0 +1 @@\n+const fn = new Function(body);',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.dangerousEval.pass, false);
});

// ── scanDiff — console.log sensitive ──────────────────────────

test('scanDiff detects console.log with password', () => {
  const files = [{
    filename: 'auth.js',
    patch: '@@ -0,0 +1 @@\n+console.log("user password:", password);',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.consoleLog.pass, false);
});

test('scanDiff allows console.log without sensitive data', () => {
  const files = [{
    filename: 'app.js',
    patch: '@@ -0,0 +1 @@\n+console.log("server started on port", port);',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.consoleLog.pass, true);
});

// ── scanDiff — raw SQL ────────────────────────────────────────

test('scanDiff detects raw SQL with interpolation', () => {
  const files = [{
    filename: 'db.js',
    patch: '@@ -0,0 +1 @@\n+const q = `SELECT * FROM users WHERE id = ${userId}`;',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.rawSql.pass, false);
});

test('scanDiff allows parameterized SQL', () => {
  const files = [{
    filename: 'db.js',
    patch: '@@ -0,0 +1 @@\n+const q = "SELECT * FROM users WHERE id = $1";',
  }];
  const result = scanDiff(files);
  assert.strictEqual(result.checks.rawSql.pass, true);
});

// ── scanDiff — empty/invalid input ────────────────────────────

test('scanDiff handles empty array', () => {
  const result = scanDiff([]);
  assert.strictEqual(result.checks.secrets.pass, true);
});

test('scanDiff handles non-array input', () => {
  const result = scanDiff(null);
  assert.strictEqual(result.checks.secrets.pass, true);
});

// ── renderCheckboxLine ────────────────────────────────────────

test('renderCheckboxLine renders passing check', () => {
  const line = renderCheckboxLine('No secrets', { pass: true, findings: [] });
  assert.ok(line.includes('[x]'));
  assert.ok(line.includes('No secrets'));
});

test('renderCheckboxLine renders failing check with findings', () => {
  const line = renderCheckboxLine('No secrets', {
    pass: false,
    findings: [{ file: 'a.js', line: 1, match: 'AKIA...' }],
  });
  assert.ok(line.includes('a.js:1'));
});

// ── Summary ───────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

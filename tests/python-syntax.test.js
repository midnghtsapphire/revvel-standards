#!/usr/bin/env node
'use strict';

// Guard for the rule that every tracked Python file in this repo parses.
//
// The symptom, measured on this repo: three tracked .py files did not compile.
// Two of them are executed by scheduled GitHub Actions workflows --
// market-evaluator.yml, ai-architecture-market-evaluator.yml and
// automate-gumroad-artifacts.yml all run
// products/ai-architecture-framework/market_evaluator.py, two of them formerly
// on a daily cron. A daily job whose entry point has a SyntaxError burns
// Actions minutes every single day and can never upload an artifact. The file
// had three concatenated drafts and an unterminated triple-quote, so it had
// never run.
//
// Three assertions, all load-bearing:
//
//   0. The inventory is non-empty. Without this the other two pass vacuously.
//   1. Every tracked .py file compiles.
//   2. The checker rejects a file that does not compile.
//
// Assertion 2 is the one that makes this a control rather than a decoration.
// If scripts/check-python-syntax.py were broken -- wrong exit code, silent
// except, empty stdin treated as success -- assertions 0 and 1 would still
// pass and the guard would report green over a repo full of broken Python.
// That is exactly the failure this repo keeps re-finding (RVS-VERIFY-001,
// gotcha 9: "a marker nobody checks is decoration"), and it is how the
// original three failures survived. So this test feeds the checker known-bad
// input and requires it to fail.
//
// The interpreter is resolved through scripts/lib/python-bin.js rather than
// hardcoded. On Windows `python3` is a Microsoft Store stub that prints
// "Python was not found" and exits 0 -- a test spawning it directly would
// report success while checking nothing, which is the same defect family this
// guard exists to catch.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { pythonBinOrThrow } = require('../scripts/lib/python-bin.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join('scripts', 'check-python-syntax.py');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

// Read the inventory from git rather than walking the tree, so untracked local
// scratch files and virtualenvs cannot fail the build.
//
// execFileSync with an argument array, not execSync with a command string: a
// shell string would be interpreted by cmd.exe on Windows, which does not strip
// POSIX single quotes, so git would receive the literal `'*.py'` -- quotes
// included -- and match nothing. A zero-length inventory is exactly the vacuous
// pass assertion 0 exists to catch, and it would have been platform-dependent.
function trackedPythonFiles() {
  const out = execFileSync('git', ['ls-files', '--', '*.py'], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    maxBuffer: 16 * 1024 * 1024
  });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Run the checker with the given paths on stdin. Returns { status, stdout }.
function runChecker(paths, bin) {
  const res = spawnSync(bin, ['-X', 'utf8', CHECKER], {
    cwd: REPO_ROOT,
    input: paths.join('\n') + '\n',
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
  if (res.error) throw new Error(`could not spawn ${bin}: ${res.error.message}`);
  if (res.status === null) throw new Error(`${bin} terminated by signal ${res.signal}`);
  return { status: res.status, stdout: (res.stdout || '') + (res.stderr || '') };
}

const bin = pythonBinOrThrow('check that tracked Python files parse');
const files = trackedPythonFiles();

// --- 0. the inventory itself is a control ---------------------------------

test('the tracked Python inventory is non-empty', () => {
  assert(
    files.length > 0,
    "git ls-files returned no .py files -- is this a git checkout, and does scripts/check-python-syntax.py still exist?"
  );
  assert(
    fs.existsSync(path.join(REPO_ROOT, CHECKER)),
    `${CHECKER} is missing, so the other assertions in this file cannot run.`
  );
});

// --- 1. every tracked Python file compiles --------------------------------

test('every tracked Python file compiles', () => {
  const { status, stdout } = runChecker(files, bin);
  assert(
    status === 0,
    'Tracked Python files do not compile. A file with a SyntaxError that is\n' +
      'invoked by a workflow burns Actions minutes on every run and can never\n' +
      'produce an artifact.\n' +
      `Checker output:\n${stdout}`
  );
});

// --- 2. the checker actually rejects broken Python ------------------------
// Without this, assertions 0 and 1 are satisfied by a checker that always
// exits 0, and this whole file becomes decoration (gotcha 9).

test('the checker rejects a file that does not compile', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pysyntax-guard-'));
  const bad = path.join(dir, 'deliberately_broken.py');
  // An unterminated string literal: the same defect class as the three files
  // this guard was written for.
  fs.writeFileSync(bad, 'print("unterminated\n', 'utf8');

  try {
    const { status, stdout } = runChecker([bad], bin);

    // The checker prints "checked N files, M failed" on every run. If that
    // line is absent the checker did not execute at all -- it crashed, or it
    // has its own SyntaxError -- which is a different failure from "ran but
    // reported nothing", and sends whoever hits this to a different file.
    // Distinguishing them is the point of gotcha 6: report true state, not
    // just "the process came back non-zero".
    assert(
      /checked \d+ files/.test(stdout),
      'The checker never ran -- it produced no summary line. Check\n' +
        `${CHECKER} itself for a syntax or import error; the problem is in the\n` +
        'guard, not in the file it was given.\n' +
        `Checker output:\n${stdout}`
    );
    assert(
      status !== 0,
      'The checker exited 0 on a file with a SyntaxError. It is not detecting\n' +
        'anything, so assertion 1 above proves nothing.\n' +
        `Checker output:\n${stdout}`
    );
    assert(
      /deliberately_broken\.py/.test(stdout),
      'The checker failed but did not name the offending file, so a real\n' +
        'failure would not tell anyone which file to fix.\n' +
        `Checker output:\n${stdout}`
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('');
console.log(`${files.length} tracked Python files checked with ${bin}`);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

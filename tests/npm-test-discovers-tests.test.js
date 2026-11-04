#!/usr/bin/env node
'use strict';

// Guard for RVS-VERIFY-001 applied to the test gate itself.
//
// The symptom: on Windows, `npm test` printed "All tests passed successfully!"
// having executed zero JS tests. The script was
//
//     node --test 'tests/**/*.test.js'
//
// npm runs scripts through cmd.exe on Windows. cmd.exe does not treat the
// single quote as a quoting character, so node received the glob with the
// quote marks still attached, matched nothing, found no test files, and exited
// 0. GREEN_MAIN_STANDARD requires `npm test` to pass before pushing, so the
// gate every other guard in this repo sits behind was reporting a pass it had
// not earned.
//
// Three assertions below, because the bug had three parts:
//   1. no node --test argument may be wrapped in single quotes
//   2. every node --test argument must actually match test files
//   3. no node --test argument may be a bare directory (Node >= 23 resolves
//      it as a module path and throws ERR_MODULE_NOT_FOUND)
//
// Assertion 2 is the load-bearing one: it fails if a future glob is syntactically
// fine and still matches nothing.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIN_TEST_FILES = 100;

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

const scripts = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
).scripts;

/**
 * Every argument passed to `node --test` across all npm scripts, paired with
 * the script that supplies it. Stops at a shell operator so the second half of
 * `node --test X && bash Y` is not mistaken for a test target.
 */
function nodeTestArguments() {
  const found = [];
  for (const [name, body] of Object.entries(scripts)) {
    const index = body.indexOf('node --test');
    if (index === -1) continue;
    const rest = body.slice(index + 'node --test'.length);
    const upToOperator = rest.split(/&&|\|\||;|\|/)[0];
    for (const token of upToOperator.trim().split(/\s+/)) {
      if (!token) continue;
      if (token.startsWith('--')) continue; // node flags, not targets
      found.push({ script: name, raw: token });
    }
  }
  return found;
}

/**
 * What cmd.exe hands to node. It strips double quotes and leaves single quotes
 * in place, which is the whole bug.
 */
function asCmdExeDelivers(raw) {
  return raw.replace(/"/g, '');
}

const args = nodeTestArguments();

test('the npm scripts actually invoke node --test somewhere', () => {
  assert(args.length > 0, 'no node --test arguments found -- has the test gate been renamed?');
});

test('no node --test argument is wrapped in single quotes', () => {
  for (const { script, raw } of args) {
    assert(
      !raw.includes("'"),
      `npm script "${script}" passes ${raw} to node --test. cmd.exe keeps single quotes, so node matches nothing and the gate passes vacuously on Windows. Use escaped double quotes in package.json.`,
    );
  }
});

test('every node --test argument matches at least 100 test files', () => {
  for (const { script, raw } of args) {
    const pattern = asCmdExeDelivers(raw);
    let matches = [];
    try {
      matches = fs.globSync(pattern, { cwd: REPO_ROOT });
    } catch (error) {
      throw new Error(`npm script "${script}": globbing ${pattern} threw ${error.message}`);
    }
    assert(
      matches.length >= MIN_TEST_FILES,
      `npm script "${script}" passes ${raw} to node --test, which matches ${matches.length} files as cmd.exe delivers it (${pattern}). Expected at least ${MIN_TEST_FILES}. A test gate that discovers no tests exits 0 and reports success.`,
    );
  }
});

test('no node --test argument is a bare directory', () => {
  for (const { script, raw } of args) {
    const pattern = asCmdExeDelivers(raw);
    const candidate = path.join(REPO_ROOT, pattern);
    const isDirectory = fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
    assert(
      !isDirectory,
      `npm script "${script}" passes the directory ${pattern} to node --test. Node >= 23 resolves that as a module path and throws ERR_MODULE_NOT_FOUND. Pass a glob instead.`,
    );
  }
});

test('this test file is itself discovered by the gate it guards', () => {
  const self = path.relative(REPO_ROOT, __filename).split(path.sep).join('/');
  const discovered = new Set();
  for (const { raw } of args) {
    for (const match of fs.globSync(asCmdExeDelivers(raw), { cwd: REPO_ROOT })) {
      discovered.add(match.split(path.sep).join('/'));
    }
  }
  assert(
    discovered.has(self),
    `${self} is not matched by any node --test argument, so this guard would not run in CI`,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

#!/usr/bin/env node
'use strict';

// Guard for scripts/lib/python-bin.js and for the rule it exists to enforce:
// nothing in this repo spawns a hardcoded Python interpreter name.
//
// The symptom: on Windows with Python installed through the `py` launcher,
// `python3` and `python` sit on PATH as Microsoft Store stubs that exit 9009
// without running anything. So `command -v python3` succeeds and spawning it
// fails. Fifteen test files, five scripts, and the pre-commit gate hardcoded
// 'python3', so every Python-backed guard in the repo failed on a machine with
// a working Python 3.14 -- including tests/python-compiles.test.js, the gate
// that proves every tracked .py file parses.
//
// Assertion 3 is the load-bearing one. Assertions 1 and 2 only prove the
// resolver works today; 3 is what stops a new call site from reintroducing the
// literal and quietly breaking the gate again on someone's workstation.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const { pythonBin, hasPython, CANDIDATES } = require('../scripts/lib/python-bin.js');

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

// --- 1. the resolver returns something that actually runs -----------------

test('the resolver returns an interpreter that runs, or null', () => {
  const found = pythonBin();
  assert(
    found === null || typeof found === 'string',
    `expected a string or null, got ${typeof found}`,
  );
});

test('whatever the resolver returns, spawning it exits 0', () => {
  const found = pythonBin();
  if (found === null) {
    console.log('    (no Python on this machine -- nothing to spawn)');
    return;
  }
  const probe = spawnSync(found, ['-c', ''], { stdio: 'ignore' });
  assert(!probe.error, `spawning ${found} errored: ${probe.error && probe.error.message}`);
  assert(
    probe.status === 0,
    `the resolver returned ${found}, but spawning it exited ${probe.status}. `
      + 'On Windows status 9009 means a Microsoft Store stub was accepted -- the '
      + 'resolver must run candidates, not look them up.',
  );
});

test('the interpreter it returns can report a version', () => {
  const found = pythonBin();
  if (found === null) return;
  const result = spawnSync(found, ['-V'], { encoding: 'utf8' });
  const text = `${result.stdout || ''}${result.stderr || ''}`;
  assert(/Python \d+\.\d+/.test(text), `${found} -V did not report a version, got: ${text.trim()}`);
});

test('hasPython agrees with pythonBin', () => {
  assert(hasPython() === (pythonBin() !== null), 'hasPython and pythonBin disagree');
});

// --- 2. the PYTHON override wins ------------------------------------------

test('PYTHON overrides the probe and is not second-guessed', () => {
  const previous = process.env.PYTHON;
  try {
    process.env.PYTHON = 'some-interpreter-that-does-not-exist';
    assert(
      pythonBin({ refresh: true }) === 'some-interpreter-that-does-not-exist',
      'PYTHON was overridden or probed away; a caller who sets it must be trusted',
    );
  } finally {
    if (previous === undefined) delete process.env.PYTHON;
    else process.env.PYTHON = previous;
    pythonBin({ refresh: true });
  }
});

test('python3 is tried before py, so Linux and CI resolve on the first probe', () => {
  assert(
    CANDIDATES.indexOf('python3') < CANDIDATES.indexOf('py'),
    `candidate order is wrong: ${CANDIDATES.join(', ')}`,
  );
});

// --- 3. nothing hardcodes an interpreter name ------------------------------

// Any identifier that ends up spawning a process. Covers the injected-impl and
// custom-runner shapes too (execFileSyncImpl, runner), which is how three call
// sites hid from a narrower search.
const SPAWNERS = String.raw`spawn|spawnSync|execFile|execFileSync|execFileAsync|exec|execSync|runner|execFileSyncImpl`;
const HARDCODED = new RegExp(String.raw`(?:${SPAWNERS})\(\s*["'](?:python3?|py)["']`, 'g');

function jsFilesUnder(...dirs) {
  const found = [];
  for (const dir of dirs) {
    for (const entry of fs.globSync(`${dir}/**/*.js`, { cwd: REPO_ROOT })) {
      found.push(entry.split(path.sep).join('/'));
    }
  }
  return found;
}

test('no JS file in tests/ or scripts/ spawns a hardcoded interpreter name', () => {
  const offenders = [];
  for (const file of jsFilesUnder('tests', 'scripts')) {
    const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    for (const match of source.match(HARDCODED) || []) {
      offenders.push(`${file}: ${match.trim()}`);
    }
  }
  assert(
    offenders.length === 0,
    'these call sites hardcode an interpreter name instead of calling '
      + 'pythonBinOrThrow() from scripts/lib/python-bin.js. On Windows the name '
      + 'they pick resolves to a Microsoft Store stub that exits 9009:\n'
      + offenders.map((o) => `  ${o}`).join('\n'),
  );
});

// Shell comments are prose, and the gate's own comments quote the bug they
// fixed. The rule is about what executes, so comment lines are dropped first.
function executableShellLines(source) {
  return source
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

test('the pre-commit gate resolves Python by running it, not by looking it up', () => {
  const gatePath = path.join(REPO_ROOT, '.pre-commit-hooks', 'pre-review-gate.sh');
  const gate = executableShellLines(fs.readFileSync(gatePath, 'utf8'));
  assert(
    !/command -v python3/.test(gate),
    'pre-review-gate.sh guards on `command -v python3`. Existence on PATH is '
      + 'not capability: the Microsoft Store stub answers the lookup and then '
      + 'fails every invocation.',
  );
  assert(
    /\$PYBIN/.test(gate),
    'pre-review-gate.sh does not route its Python calls through $PYBIN',
  );
  // Only command position counts: python3 as the first word of a line, or
  // after `if` / `if !`. The gate's heredocs contain Python strings that
  // legitimately mention `python3 -m pip install pyyaml` as advice to a human.
  const directInvocation = gate
    .split('\n')
    .find((line) => /^\s*(?:if\s+!?\s*)?python3\s/.test(line));
  assert(
    directInvocation === undefined,
    `pre-review-gate.sh still invokes python3 directly: ${String(directInvocation).trim()}`,
  );
});

test('the gate runs Python in UTF-8 mode', () => {
  // Windows defaults stdout to cp1252. The gate prints a check mark on
  // success, so without -X utf8 it raised UnicodeEncodeError, exited 1, and
  // blocked YAML it had just validated as correct.
  const gate = fs.readFileSync(
    path.join(REPO_ROOT, '.pre-commit-hooks', 'pre-review-gate.sh'),
    'utf8',
  );
  const invocations = gate.match(/"\$PYBIN"[^\n]*/g) || [];
  assert(invocations.length > 0, 'no $PYBIN invocations found in the gate');
  for (const invocation of invocations) {
    assert(
      invocation.includes('-X utf8'),
      `gate invocation lacks -X utf8, so it will die on its own non-ASCII output on Windows: ${invocation.trim()}`,
    );
  }
});

test('the gate preserves a file’s line endings instead of rewriting them', () => {
  const gate = fs.readFileSync(
    path.join(REPO_ROOT, '.pre-commit-hooks', 'pre-review-gate.sh'),
    'utf8',
  );
  assert(
    !/open\(path, "w", encoding="utf-8"\) as fh/.test(gate),
    'the markdown fixer writes without newline="", so on Windows Python '
      + 'translates every LF to CRLF and the gate rewrites the line endings of '
      + 'every file it touches',
  );
  assert(
    /newline=""/.test(gate),
    'the markdown fixer does not disable line-ending translation',
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

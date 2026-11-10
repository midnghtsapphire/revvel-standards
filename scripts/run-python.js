#!/usr/bin/env node
// Run a Python script through the interpreter that actually works.
//
// Why this exists. `e7ab6155` ("fix(python): resolve the interpreter by running
// it, not by looking it up") replaced hardcoded `python3` across eleven test
// files, five scripts and the pre-commit gate with `scripts/lib/python-bin.js`.
// It missed two places: the `llm:doctor` and `llm:ask` npm scripts in
// package.json, which still read
//
//     "llm:doctor": "python3 scripts/local_llm.py doctor"
//
// On Windows with Python installed through the py launcher, `python3` is a
// Microsoft Store stub. It prints "Python was not found" and **exits 0**. So
// those two scripts have been reporting success while running nothing --
// the same defect family as `npm test || true`, and the one this repo keeps
// re-finding. A doctor command that passes without examining anything is worse
// than no doctor command, because it is trusted.
//
// npm scripts are shell strings, so they cannot call a JS function. This is the
// smallest wrapper that lets them reuse the resolver the rest of the repo
// already uses, rather than introducing a second way to find Python.
//
//     node scripts/run-python.js <script.py> [args...]
//
// It exits with the Python process's own exit code, so a failing Python script
// still fails the npm script. If no working interpreter is found,
// pythonBinOrThrow throws with the candidates it tried and this exits 1 --
// loudly, which is the entire point.

'use strict';

const { spawnSync } = require('node:child_process');
const { pythonBinOrThrow } = require('./lib/python-bin.js');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('run-python.js: no script given');
  console.error('usage: node scripts/run-python.js <script.py> [args...]');
  process.exit(2);
}

let bin;
try {
  bin = pythonBinOrThrow('run a Python script from an npm script');
} catch (err) {
  console.error('run-python.js: %s', err && err.message ? err.message : err);
  process.exit(1);
}

// -X utf8 matches the pre-commit gate's invocation, so output encoding does not
// depend on the console code page. Note that -I would imply -E and discard
// PYTHONIOENCODING, so it is deliberately not used here.
const res = spawnSync(bin, ['-X', 'utf8', ...args], { stdio: 'inherit' });

if (res.error) {
  console.error('run-python.js: could not spawn %s: %s', bin, res.error.message);
  process.exit(1);
}

// A process killed by a signal reports status null; treat that as failure
// rather than letting `null` coerce to 0 and pass.
if (res.status === null) {
  console.error('run-python.js: %s terminated by signal %s', bin, res.signal);
  process.exit(1);
}

process.exit(res.status);

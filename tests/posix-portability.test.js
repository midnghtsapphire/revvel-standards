#!/usr/bin/env node
'use strict';

// Guard for the rule that this repo's tests must run on Windows as well as on
// a POSIX shell.
//
// The symptom, three times over: a guard that passes in CI and fails on a
// Windows workstation, for a reason that has nothing to do with the thing the
// guard was written to check.
//
//   1. `npm test` invoked with a single-quoted glob -- cmd.exe does not strip
//      single quotes, so the glob never expanded.
//   2. tests/scripts/sync-flow-charts.test.js spawned
//      `REPO_ROOT="..." DRY_RUN=true node script.js`. The `VAR=value cmd`
//      prefix is ordinary sh and a parse error in cmd.exe, so all 8 sites
//      failed before the script under test ever ran.
//   3. tests/verify-bito-installation.test.js asserted
//      `stats.mode & fs.constants.S_IXUSR`. Windows has no POSIX execute bit,
//      S_IXUSR is undefined there, and `mode & undefined` is NaN -- so the
//      assertion could never pass, whatever the file's real permissions.
//
// Assertions 1 and 2 are the load-bearing ones: they are what stops a fourth
// instance from landing. Assertion 3 pins the two files that carried instances
// 2 and 3, so a revert is caught by name rather than only by pattern.
//
// Per RVS-VERIFY-001 (standards/VERIFY_THE_POSTCONDITION.md): this guard has a
// producer (the rules below) and a consumer (`npm test` running this file). It
// fails loudly on reintroduction rather than reporting a count nobody reads.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SELF = path.relative(REPO_ROOT, __filename).split(path.sep).join('/');

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

// Tracked .js files under tests/ and scripts/. Reading from git rather than
// walking the tree keeps node_modules and untracked scratch files out.
function trackedJsFiles() {
  const out = execSync('git ls-files -- "tests/**/*.js" "scripts/**/*.js"', {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    maxBuffer: 8 * 1024 * 1024
  });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== SELF);
}

// Strip line comments so a file's own documentary prose cannot trip a rule.
// Block comments are left alone: the patterns below need a spawn call or a
// property access, neither of which reads naturally inside /* */.
function codeLines(contents) {
  return contents
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
}

const files = trackedJsFiles();

// --- 1. no spawn passes a command string with a POSIX env-var prefix ------
// `VAR=value cmd` is sh syntax. On Windows the shell is cmd.exe, which reads
// the whole thing as a command name and fails. Pass env through the spawn
// call's own `env` option instead -- it works on every platform.

test('no test or script spawns a command with a POSIX env-var prefix', () => {
  const SPAWNERS = String.raw`execSync|execFileSync|exec|spawnSync|spawn`;
  const ENV_PREFIX = new RegExp(
    String.raw`(?:${SPAWNERS})\(\s*[` + '`' + String.raw`'"]\s*[A-Za-z_][A-Za-z0-9_]*=`,
    'g'
  );

  const offenders = [];
  for (const file of files) {
    const code = codeLines(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));
    const hits = code.match(ENV_PREFIX);
    if (hits) offenders.push(`${file} (${hits.length} site${hits.length === 1 ? '' : 's'})`);
  }

  assert(
    offenders.length === 0,
    'POSIX env-var prefix in a spawned command (parse error in cmd.exe).\n' +
      'Use the spawn call\'s env option instead:\n' +
      "  execSync(`node \"${'${script}'}\"`, { env: { ...process.env, VAR: 'x' } })\n" +
      'Offending files:\n  ' + offenders.join('\n  ')
  );
});

// --- 2. no POSIX permission-bit constant without a platform branch --------
// fs.constants.S_IXUSR / S_IXGRP / S_IXOTH are undefined on Windows, so any
// bitmask built from them is NaN and the assertion can never pass. A file may
// use them only if it also branches on process.platform.

test('no POSIX permission-bit constant is used without a platform branch', () => {
  const PERM_BIT = /fs\.constants\.S_I[RWX][UGO]/;

  const offenders = [];
  for (const file of files) {
    const code = codeLines(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));
    if (PERM_BIT.test(code) && !/process\.platform/.test(code)) {
      offenders.push(file);
    }
  }

  assert(
    offenders.length === 0,
    'POSIX permission bit used with no process.platform branch.\n' +
      'These constants are undefined on Windows, so the mask is NaN and the\n' +
      'check silently can never pass. Branch on process.platform, or assert on\n' +
      "git's recorded mode (git ls-files -s), which is identical everywhere.\n" +
      'Offending files:\n  ' + offenders.join('\n  ')
  );
});

// --- 3. the two files that carried the original instances stay fixed ------

test('the two previously broken files still pass on this platform', () => {
  const pinned = [
    'tests/scripts/sync-flow-charts.test.js',
    'tests/verify-bito-installation.test.js'
  ];

  for (const file of pinned) {
    const abs = path.join(REPO_ROOT, file);
    assert(fs.existsSync(abs), `${file} is missing -- was it renamed without updating this guard?`);

    let output;
    try {
      output = execSync(`node "${abs}"`, {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        timeout: 120000
      });
    } catch (error) {
      const combined = (error.stdout || '') + (error.stderr || '');
      throw new Error(`${file} exited non-zero on ${process.platform}:\n${combined}`);
    }

    assert(
      /0 failed/.test(output),
      `${file} reported failures on ${process.platform}:\n${output}`
    );
  }
});

console.log('');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

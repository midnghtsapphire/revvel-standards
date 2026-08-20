'use strict';

/**
 * Regression tests for the CircleCI `lint-and-test` job.
 *
 * WR #17746. `ci/circleci: lint-and-test` failed on EVERY pull request —
 * including docs-only ones (#17747) and a generated-dashboard one (#17744)
 * that touch no Python at all. The same commits ran `npm test` green on
 * GitHub Actions.
 *
 * Cause: `npm test` spawns `python3 -m flake8` via
 * scripts/flake8-baseline-gate.js, and the `cimg/node` executor cannot run it.
 * Not because python3 is absent — it is present — but because `ensurepip` is
 * not, which kills `python3 -m venv` and the gate's `pip install --user`
 * fallback alike. GitHub Actions runners ship a complete Python, so the two CI
 * systems disagreed about the same commit and the failure read as a flake.
 *
 * The first fix gated its apt install on `command -v python3`, found the
 * binary, skipped the install, and left the job exactly as broken. The guard
 * below pins the capability check that replaced it.
 *
 * These guards pin the fix so the job cannot silently lose its interpreter
 * again — including the pin drifting away from the gate's own fallback.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, '.circleci', 'config.yml');
const INSTALL_SH = path.join(ROOT, '.circleci', 'scripts', 'install-python-flake8.sh');
const GATE = path.join(ROOT, 'scripts', 'flake8-baseline-gate.js');

function lintAndTestSteps() {
  const doc = yaml.parse(fs.readFileSync(CONFIG, 'utf8'));
  const job = doc.jobs && doc.jobs['lint-and-test'];
  assert.ok(job, 'lint-and-test job must exist — CircleCI reports it as a check');
  return job.steps.map((s) => (typeof s === 'string' ? s : (s.run && s.run.command) || ''));
}

test('lint-and-test provides python before it runs the tests', () => {
  const commands = lintAndTestSteps();
  const install = commands.findIndex((c) => c.includes('install-python-flake8.sh'));
  const tests = commands.findIndex((c) => c.includes('run-tests.sh'));

  assert.ok(
    install > -1,
    'lint-and-test must install Python — `npm test` spawns `python3 -m flake8` '
      + 'through scripts/flake8-baseline-gate.js, and cimg/node ships no Python.',
  );
  assert.ok(tests > -1, 'lint-and-test must still run the test script');
  assert.ok(
    install < tests,
    'Python must be installed BEFORE run-tests.sh — installing after it is the '
      + 'same as not installing it at all.',
  );
});

test('the install script proves flake8 works rather than assuming it', () => {
  const raw = fs.readFileSync(INSTALL_SH, 'utf8');
  assert.match(raw, /set -euo pipefail/, 'must not swallow a failed install');
  // CLAUDE.md gotcha #6: exit 0 has to mean the postcondition holds. The gate
  // invokes exactly `python3 -m flake8`, so that is what must be verified —
  // checking `pip show flake8` or the venv path would pass while the gate
  // still could not resolve the interpreter.
  assert.match(
    raw,
    /python3 -m flake8 --version/,
    'the script must verify the exact invocation the gate makes',
  );
});

test('the python install is gated on capability, not on `command -v python3`', () => {
  const lines = fs.readFileSync(INSTALL_SH, 'utf8').split('\n');

  // The bug this pins: cimg/node HAS python3, so a `command -v python3` guard
  // finds it, skips the apt install, and `python3 -m venv` then dies with
  // "ensurepip is not available" — the job stays red and the fix looks applied.
  //
  // Assert the CONDITION that actually guards the install, not merely that the
  // string appears somewhere: a comment mentioning ensurepip would satisfy a
  // whole-file grep while the branch still tested the wrong thing.
  const aptLine = lines.findIndex((l) => /^\s*sudo apt-get update/.test(l));
  assert.ok(aptLine > -1, 'the script must install the missing package');

  let guard = -1;
  for (let i = aptLine; i >= 0; i -= 1) {
    if (/^\s*if\s/.test(lines[i])) { guard = i; break; }
  }
  assert.ok(guard > -1, 'the apt install must sit behind a conditional');

  assert.match(
    lines[guard],
    /ensurepip/,
    `the install is guarded by \`${lines[guard].trim()}\` — it must test for `
      + 'ensurepip, the precise precondition for `python3 -m venv`. Guarding on '
      + 'python3 merely existing passes on the exact image this script is for.',
  );
  assert.doesNotMatch(
    lines[guard],
    /command -v python3/,
    'python3 being present says nothing about whether venv can work',
  );

  // apt exiting 0 is not evidence that venv now works, so the postcondition
  // must be re-checked between the install and the thing that depends on it
  // (CLAUDE.md gotcha #6). Without this, a package rename upstream would fail
  // 20 lines later with a stack trace instead of one clear line here.
  const venvLine = lines.findIndex((l) => l.includes('python3 -m venv "$VENV"'));
  assert.ok(venvLine > aptLine, 'the venv must be built after the install');
  const between = lines.slice(aptLine, venvLine);
  assert.ok(
    between.some((l) => /import ensurepip/.test(l) && !/^\s*#/.test(l)),
    'after installing, re-assert ensurepip before relying on `python3 -m venv`',
  );
});

test('the venv is prepended to PATH for later steps, not just this one', () => {
  const raw = fs.readFileSync(INSTALL_SH, 'utf8');
  // Each CircleCI step is a fresh shell that sources $BASH_ENV. A plain
  // `export` would be lost before run-tests.sh ever starts.
  assert.match(
    raw,
    />>\s*"\$BASH_ENV"/,
    'PATH must be persisted through $BASH_ENV or the next step loses the venv',
  );
});

test('BASH_ENV is defaulted, not dereferenced bare under set -u', () => {
  const raw = fs.readFileSync(INSTALL_SH, 'utf8');
  // `set -u` plus an unset BASH_ENV aborts the script with "unbound variable",
  // turning a missing CircleCI convenience variable into a hard CI failure —
  // in the very step whose job is to stop CI failing for environment reasons.
  assert.match(
    raw,
    /BASH_ENV="\$\{BASH_ENV:-/,
    'BASH_ENV must be defaulted before use',
  );
});

test('the pinned flake8 matches the gate fallback pin (no split-brain versions)', () => {
  const shPin = fs.readFileSync(INSTALL_SH, 'utf8').match(/FLAKE8_VERSION="([^"]+)"/);
  const gatePin = fs.readFileSync(GATE, 'utf8').match(/flake8==([\d.]+)/);

  assert.ok(shPin, 'install script must pin an explicit flake8 version');
  assert.ok(gatePin, 'the gate must pin the flake8 it installs as a fallback');
  assert.equal(
    shPin[1],
    gatePin[1],
    'CircleCI and the gate fallback would install different flake8 versions, so '
      + 'the same code could pass one lane and fail the other on rule changes.',
  );
});

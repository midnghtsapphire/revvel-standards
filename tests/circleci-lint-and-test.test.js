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
 * scripts/flake8-baseline-gate.js, and the `cimg/node` executor carries no
 * Python. GitHub Actions runners bundle Python, so the two CI systems
 * disagreed about the same commit and the failure read as a flake.
 *
 * Reproduced before fixing: running the suite with a PATH containing no
 * `python3` fails exactly the two tests that spawn the gate, and no others.
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

#!/usr/bin/env node
'use strict';

// Resolves the Python interpreter to spawn, by running it.
//
// The symptom this exists for: on Windows with Python installed through the
// `py` launcher, `python3` and `python` both resolve to Microsoft Store
// *stubs* that sit on PATH, print
//
//   Python was not found; run without arguments to install from the
//   Microsoft Store...
//
// and exit 9009. So `command -v python3` succeeds, `which python3` succeeds,
// and spawning it fails. Fifteen test files and five scripts in this repo
// hardcoded 'python3', so every Python-backed guard failed on a machine that
// had Python 3.14 installed and working the whole time. Among them
// tests/python-compiles.test.js, the gate that proves every tracked .py file
// parses -- including packages/repaint_core/.
//
// The rule that follows: existence on PATH is not capability. Candidates are
// therefore *executed*, not looked up. That is also why this cannot be a
// constant -- `python3` is the right answer on CI and the wrong answer on a
// Windows workstation, and only running it tells you which.
//
// Order is deliberate: python3 first so Linux and CI resolve on the first try
// and pay one spawn, py last because it only exists on Windows.
//
// PYTHON=/path/to/python overrides everything and is not probed, so a caller
// who knows better is never second-guessed. Two test files already honoured
// that variable before this module existed; it is kept.

const { spawnSync } = require('node:child_process');

const CANDIDATES = ['python3', 'python', 'py'];

// A no-op program. Running it distinguishes a real interpreter from a stub
// that answers PATH lookups and nothing else.
const PROBE = ['-c', ''];

let cached;

function canRun(command) {
  let result;
  try {
    result = spawnSync(command, PROBE, { stdio: 'ignore' });
  } catch {
    return false;
  }
  return !result.error && result.status === 0;
}

/**
 * The interpreter to spawn, or null when none on this machine runs.
 *
 * Cached for the life of the process: 36 call sites should not pay 36 probe
 * spawns. Pass { refresh: true } to re-probe, which only tests need.
 *
 * @param {{ refresh?: boolean }} [options]
 * @returns {string|null}
 */
function pythonBin(options = {}) {
  if (!options.refresh && cached !== undefined) return cached;

  const override = process.env.PYTHON;
  if (override) {
    cached = override;
    return cached;
  }

  cached = CANDIDATES.find(canRun) ?? null;
  return cached;
}

/**
 * Same, but throws with a message that says what was tried and what to do.
 * For callers where no Python means the check cannot run at all, rather than
 * callers that legitimately degrade.
 *
 * @param {string} [purpose] what the interpreter is needed for
 * @returns {string}
 */
function pythonBinOrThrow(purpose) {
  const found = pythonBin();
  if (found) return found;
  const tail = purpose ? ` ${purpose} cannot run.` : '';
  throw new Error(
    `No working Python interpreter found.${tail}\n`
      + `Tried, by running each: ${CANDIDATES.join(', ')}.\n`
      + 'On Windows, python3 and python may exist on PATH as Microsoft Store '
      + 'stubs that exit 9009 without running anything -- install Python and '
      + 'use the py launcher, or set PYTHON to an interpreter path.',
  );
}

/** True when some interpreter on this machine runs. */
function hasPython() {
  return pythonBin() !== null;
}

module.exports = { pythonBin, pythonBinOrThrow, hasPython, CANDIDATES };

if (require.main === module) {
  const found = pythonBin();
  if (!found) {
    console.error('no working Python interpreter found');
    process.exit(1);
  }
  const version = spawnSync(found, ['-V'], { encoding: 'utf8' });
  console.log(`${found} -> ${(version.stdout || version.stderr || '').trim()}`);
}

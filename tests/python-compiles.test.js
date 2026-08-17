#!/usr/bin/env node
'use strict';

// Every tracked Python file must compile.
//
// This guard exists because three files in this repo did not compile at all,
// and nothing caught it for months:
//
//   products/ai-architecture-framework/cuda_mlops_wrapper.py  IndentationError
//   products/ai-architecture-framework/market_evaluator.py    unterminated string
//   scripts/validate_jsonl.py                                 unterminated string
//
// flake8 *did* report them, as E999 — and all three were then written into
// config/flake8-baseline.txt as accepted debt. The baseline gate has no notion
// of severity, so "this file cannot be parsed" ranked exactly the same as
// "missing whitespace after a comma", and the ratchet dutifully held the line
// at three unparseable files.
//
// A syntax error is not style debt. A file that does not compile cannot be
// imported, cannot be tested, and cannot run — `test_harness.py` sat green-ish
// for months only because the module it imports never loaded. This check is
// deliberately dependency-free (no flake8, no pip install) so it runs
// everywhere `npm test` runs, in milliseconds.
//
// QUARANTINE below is a ratchet, not an ignore list: it may only shrink. A
// file that starts compiling must be removed from it, or this test fails —
// which is what stops the list from quietly becoming permanent.

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

// Known-broken and awaiting reconstruction, not repair: both files interleave
// two versions of the same functions mid-statement, with conflicting APIs
// (ComputeDevice vs DeviceInfo; run(output_path) vs run(n)). No version in
// recent history compiles, so there is nothing to restore — deciding the
// intended shape is a product call. Tracked, visible, and shrink-only.
const QUARANTINE = new Set([
  'products/ai-architecture-framework/cuda_mlops_wrapper.py',
  'products/ai-architecture-framework/market_evaluator.py',
]);

function trackedPythonFiles() {
  const fs = require('node:fs');
  return execFileSync('git', ['ls-files', '*.py'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    // `git ls-files` also lists files staged for deletion, which are gone from
    // disk. Reading one would crash this check with ENOENT instead of
    // reporting a syntax error, so drop anything not actually present.
    .filter((f) => fs.existsSync(path.join(root, f)));
}

/** @returns {Map<string, string>} file -> syntax error message (only failures) */
function compileAll(files) {
  const script = [
    'import sys, json',
    'bad = {}',
    'for f in sys.argv[1:]:',
    '    try:',
    '        compile(open(f, encoding="utf-8", errors="replace").read(), f, "exec")',
    '    except SyntaxError as e:',
    '        bad[f] = f"{e.msg} (line {e.lineno})"',
    '    except Exception as e:',
    '        bad[f] = f"{type(e).__name__}: {e}"',
    'print(json.dumps(bad))',
  ].join('\n');

  const out = execFileSync('python3', ['-c', script, ...files], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return new Map(Object.entries(JSON.parse(out)));
}

test('every tracked Python file compiles', () => {
  const files = trackedPythonFiles();
  assert.ok(files.length > 50, `expected to find Python files, got ${files.length}`);

  const broken = compileAll(files);
  const unexpected = [...broken.keys()].filter((f) => !QUARANTINE.has(f));

  assert.deepEqual(
    unexpected,
    [],
    'these Python files do not compile — they cannot be imported, tested, or run:\n' +
      unexpected.map((f) => `  ${f}: ${broken.get(f)}`).join('\n')
  );
});

test('the quarantine only shrinks', () => {
  // If a quarantined file has been repaired, it must leave the list in the
  // same change. Otherwise the list outlives the problem and starts hiding
  // regressions again — the exact failure mode that produced it.
  const broken = compileAll(trackedPythonFiles());
  const repaired = [...QUARANTINE].filter((f) => !broken.has(f));

  assert.deepEqual(
    repaired,
    [],
    'these files now compile — delete them from QUARANTINE in this file:\n' +
      repaired.map((f) => `  ${f}`).join('\n')
  );
});

test('a syntax error is never acceptable as flake8 baseline debt', () => {
  // E999 is flake8 reporting that it could not parse the file. Recording that
  // in the baseline converts "broken" into "known and tolerated", which is how
  // all three files stayed broken. Any E999 entry must name a quarantined
  // file, and the quarantine is shrink-only per the test above.
  const fs = require('node:fs');
  const baseline = fs.readFileSync(path.join(root, 'config/flake8-baseline.txt'), 'utf8');

  const offenders = baseline
    .split('\n')
    .filter((line) => line.includes('::E999'))
    .map((line) => line.split('::')[0].trim())
    .filter((file) => !QUARANTINE.has(file));

  assert.deepEqual(
    offenders,
    [],
    'E999 means the file does not parse; fix it rather than baselining it:\n' +
      offenders.map((f) => `  ${f}`).join('\n')
  );
});

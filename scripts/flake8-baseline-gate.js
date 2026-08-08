#!/usr/bin/env node
'use strict';

/**
 * flake8 baseline ratchet gate (WR #15858).
 *
 * Why this exists:
 *   - DoD requires flake8 to fail CI when violations are detected.
 *   - The WR explicitly excludes fixing pre-existing flake8 debt.
 *   - GREEN_MAIN_STANDARD forbids leaving main permanently red.
 *
 * Contract:
 *   Run flake8 with the same select/exclude/limits as .flake8 /
 *   .github/workflows/python-flake8.yml, then compare path::CODE counts
 *   against config/flake8-baseline.txt.
 *
 *   - count > baseline  → fail (new debt)
 *   - count <= baseline → pass (debt held or reduced)
 *   - missing baseline file / flake8 crash → fail (tool must work)
 *
 * Update the baseline only by LOWERING counts after real cleanups.
 * Never raise a count to "make CI green."
 *
 * Usage:
 *   node scripts/flake8-baseline-gate.js
 *   node scripts/flake8-baseline-gate.js --print-baseline   # rewrite helper (stdout)
 *   node scripts/flake8-baseline-gate.js --fixture <dir>    # test helper
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE = path.join(ROOT, 'config', 'flake8-baseline.txt');

const FLAKE8_EXCLUDE =
  '.git,node_modules,venv,.venv,__pycache__,dist,build,.tox,.mypy_cache,.eggs,*.egg-info,.pytest_cache';

function requireArgValue(argv, index, flag) {
  if (index + 1 >= argv.length || String(argv[index + 1]).startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[index + 1];
}

function parseArgs(argv) {
  const out = { printBaseline: false, fixture: null, baseline: DEFAULT_BASELINE, target: '.' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--print-baseline') out.printBaseline = true;
    else if (a === '--fixture') {
      out.fixture = requireArgValue(argv, i, '--fixture');
      i += 1;
    } else if (a === '--baseline') {
      out.baseline = path.resolve(requireArgValue(argv, i, '--baseline'));
      i += 1;
    } else if (a === '--target') {
      out.target = requireArgValue(argv, i, '--target');
      i += 1;
    } else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function loadBaseline(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`baseline file missing: ${filePath}`);
  }
  const map = new Map();
  const text = fs.readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(.+::[A-Z]\d+)\s+(\d+)\s*$/);
    if (!m) {
      throw new Error(`invalid baseline line: ${raw}`);
    }
    map.set(m[1], Number(m[2]));
  }
  return map;
}

function ensureFlake8() {
  const check = spawnSync('python3', ['-m', 'flake8', '--version'], {
    encoding: 'utf8',
  });
  if (check.status === 0) return;
  const install = spawnSync(
    'python3',
    ['-m', 'pip', 'install', '--user', '-q', 'flake8==7.1.1'],
    { encoding: 'utf8' }
  );
  if (install.status !== 0) {
    throw new Error(
      `flake8 is not available and pip install failed:\n${install.stderr || install.stdout}`
    );
  }
}

function runFlake8(targetDir) {
  ensureFlake8();
  const args = [
    '-m',
    'flake8',
    '--select=E,W,F',
    '--max-line-length=120',
    '--max-complexity=15',
    `--exclude=${FLAKE8_EXCLUDE}`,
    '--format=%(path)s::%(code)s',
    '--exit-zero',
    targetDir,
  ];
  const res = spawnSync('python3', args, {
    encoding: 'utf8',
    cwd: ROOT,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  // --exit-zero should keep status 0; non-zero means flake8 itself broke.
  if (res.status !== 0) {
    throw new Error(
      `flake8 failed to execute (status ${res.status}):\n${res.stderr || res.stdout}`
    );
  }
  return res.stdout || '';
}

function normalizeRepoPath(filePath) {
  let p = String(filePath || '').trim();
  if (!p) return p;
  // flake8 may emit absolute paths when the target is absolute; baseline is repo-relative.
  const rootPrefix = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (p.startsWith(rootPrefix)) {
    p = p.slice(rootPrefix.length);
  } else if (p === ROOT) {
    p = '';
  }
  p = p.replace(/\\/g, '/');
  if (p.startsWith('./')) p = p.slice(2);
  return p;
}

function countViolations(flake8Stdout) {
  const counts = new Map();
  for (const raw of flake8Stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.lastIndexOf('::');
    if (idx <= 0) continue;
    const filePart = line.slice(0, idx);
    const codePart = line.slice(idx + 2);
    if (!/^[A-Z]\d+$/.test(codePart)) continue;
    const key = `${normalizeRepoPath(filePart)}::${codePart}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function formatBaseline(counts) {
  const keys = [...counts.keys()].sort();
  const lines = [
    '# flake8 baseline (path::CODE count). Generated for WR #15858.',
    '# Ratchet-only: CI fails when any path::CODE count exceeds the baseline.',
    '# Do not raise counts. Lowering counts (fixing debt) is always welcome.',
  ];
  for (const k of keys) lines.push(`${k} ${counts.get(k)}`);
  return `${lines.join('\n')}\n`;
}

function compareToBaseline(current, baseline) {
  const regressions = [];
  for (const [key, count] of current.entries()) {
    const allowed = baseline.get(key) || 0;
    if (count > allowed) {
      regressions.push({ key, count, allowed, delta: count - allowed });
    }
  }
  regressions.sort((a, b) => a.key.localeCompare(b.key));
  return regressions;
}

function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(
      'Usage: node scripts/flake8-baseline-gate.js [--print-baseline] [--fixture dir] [--baseline file]\n'
    );
    return 0;
  }

  // Prefer a repo-relative target so flake8 emits relative paths that match the baseline.
  const target = opts.fixture
    ? path.resolve(opts.fixture)
    : opts.target;

  const stdout = runFlake8(target);
  const current = countViolations(stdout);

  if (opts.printBaseline) {
    process.stdout.write(formatBaseline(current));
    return 0;
  }

  const baseline = loadBaseline(opts.baseline);
  const regressions = compareToBaseline(current, baseline);

  let totalCurrent = 0;
  for (const c of current.values()) totalCurrent += c;
  let totalBaseline = 0;
  for (const c of baseline.values()) totalBaseline += c;

  if (regressions.length === 0) {
    process.stdout.write(
      `flake8 baseline gate OK — ${totalCurrent} violation(s) (baseline cap ${totalBaseline}).\n`
    );
    return 0;
  }

  process.stderr.write(
    `flake8 baseline gate FAILED — ${regressions.length} path::CODE count(s) above baseline.\n`
  );
  process.stderr.write(
    'New debt is not allowed. Fix the new findings or (only after a real cleanup) lower the baseline.\n\n'
  );
  for (const r of regressions.slice(0, 50)) {
    process.stderr.write(
      `  ${r.key}: ${r.count} (baseline ${r.allowed}, +${r.delta})\n`
    );
  }
  if (regressions.length > 50) {
    process.stderr.write(`  ... and ${regressions.length - 50} more\n`);
  }
  process.stderr.write(
    '\nSee docs/PYTHON_FLAKE8_LINT.md for the developer workflow.\n'
  );
  return 1;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (err) {
    process.stderr.write(`flake8 baseline gate error: ${err.message || err}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  parseArgs,
  loadBaseline,
  countViolations,
  compareToBaseline,
  formatBaseline,
  normalizeRepoPath,
  main,
  FLAKE8_EXCLUDE,
  DEFAULT_BASELINE,
  ROOT,
};

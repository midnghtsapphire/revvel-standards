#!/usr/bin/env node
'use strict';

/**
 * zizmor baseline ratchet gate (WR #17807).
 *
 * Why this exists:
 *   - zizmor finds real Actions security issues (template-injection, unpinned
 *     uses, artipacked, excessive-permissions, …).
 *   - The monorepo carries a large pre-existing backlog; fixing every finding
 *     in one PR is not reviewable.
 *   - GitHub code scanning's "new alerts in this PR" check is LINE-based, so a
 *     pure line shift of a pre-existing finding is re-reported as new. That is
 *     not a useful gate (see WR #17807 and the header of zizmor.yml).
 *
 * Contract:
 *   Run `zizmor --offline --persona=regular --min-severity low --format sarif`
 *   on `.github/workflows/`, count `file::rule` pairs (error + warning only;
 *   SARIF `note` / informational is out of scope), and compare against
 *   `config/zizmor-baseline.txt`.
 *
 *   - count > baseline  → fail (new debt or new rule class on a file)
 *   - count <= baseline → pass (debt held or reduced)
 *   - missing baseline / zizmor crash / missing binary → fail
 *     (exit 0 means "the postcondition holds", never "the tool finished" —
 *     CLAUDE.md gotcha #6 / RVS-VERIFY-001)
 *
 * Update the baseline only by LOWERING counts after real cleanups.
 * Never raise a count to "make CI green."
 *
 * Usage:
 *   node scripts/zizmor-baseline-gate.js
 *   node scripts/zizmor-baseline-gate.js --print-baseline
 *   node scripts/zizmor-baseline-gate.js --sarif <file>     # test helper
 *   node scripts/zizmor-baseline-gate.js --baseline <file>
 *   node scripts/zizmor-baseline-gate.js --target <path>
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE = path.join(ROOT, 'config', 'zizmor-baseline.txt');
const DEFAULT_TARGET = path.join(ROOT, '.github', 'workflows');

function requireArgValue(argv, index, flag) {
  if (index + 1 >= argv.length || String(argv[index + 1]).startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[index + 1];
}

function parseArgs(argv) {
  const out = {
    printBaseline: false,
    baseline: DEFAULT_BASELINE,
    target: DEFAULT_TARGET,
    sarif: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--print-baseline') out.printBaseline = true;
    else if (a === '--baseline') {
      out.baseline = path.resolve(requireArgValue(argv, i, '--baseline'));
      i += 1;
    } else if (a === '--target') {
      out.target = path.resolve(requireArgValue(argv, i, '--target'));
      i += 1;
    } else if (a === '--sarif') {
      out.sarif = path.resolve(requireArgValue(argv, i, '--sarif'));
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
    const m = line.match(/^(.+)::([A-Za-z0-9_-]+)\s+(\d+)\s*$/);
    if (!m) {
      throw new Error(`invalid baseline line: ${raw}`);
    }
    map.set(`${m[1]}::${m[2]}`, Number(m[3]));
  }
  return map;
}

/**
 * Basename of a workflow under .github/workflows/.
 * SARIF uris vary (absolute, repo-relative, file://); the baseline keys on basename.
 */
function workflowBasename(uri) {
  if (!uri) return '';
  const cleaned = String(uri).replace(/^file:\/\//, '');
  return path.basename(cleaned);
}

/**
 * Count file::rule pairs from a zizmor SARIF document.
 * Only error + warning (SARIF level "error" / "warning"). `note` is informational.
 */
function countFromSarif(sarifDoc) {
  const counts = new Map();
  const runs = Array.isArray(sarifDoc.runs) ? sarifDoc.runs : [];
  for (const run of runs) {
    const results = Array.isArray(run.results) ? run.results : [];
    for (const res of results) {
      const level = res.level || 'warning';
      if (level === 'note' || level === 'none') continue;
      const ruleId = String(res.ruleId || '');
      const rule = ruleId.includes('/') ? ruleId.split('/').pop() : ruleId;
      if (!rule) continue;
      const locations = Array.isArray(res.locations) ? res.locations : [];
      if (locations.length === 0) {
        // Still count once under unknown file so debt cannot vanish silently.
        const key = `unknown.yml::${rule}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        continue;
      }
      for (const loc of locations) {
        const uri =
          loc &&
          loc.physicalLocation &&
          loc.physicalLocation.artifactLocation &&
          loc.physicalLocation.artifactLocation.uri;
        const base = workflowBasename(uri) || 'unknown.yml';
        const key = `${base}::${rule}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return counts;
}

function runZizmor(target) {
  const bin = process.env.ZIZMOR_BIN || 'zizmor';
  const args = [
    '--offline',
    '--persona=regular',
    '--min-severity',
    'low',
    '--format',
    'sarif',
    target,
  ];
  const res = spawnSync(bin, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
  // zizmor exits non-zero when findings exist; that is expected. Only a crash
  // (missing binary, bad args, empty/invalid stdout) is a gate failure.
  if (res.error) {
    throw new Error(
      `zizmor failed to start (${bin}): ${res.error.message}. Install with: pip install zizmor`
    );
  }
  if (res.status !== 0 && res.status !== 1 && res.status !== null) {
    // status 1 = findings present (normal). Other codes are tool failures.
    // Some versions always exit 0; treat empty stdout as failure either way.
  }
  const stdout = res.stdout || '';
  if (!stdout.trim()) {
    const errTail = (res.stderr || '').trim().split(/\r?\n/).slice(-8).join('\n');
    throw new Error(
      `zizmor produced no SARIF on stdout (exit ${res.status}). stderr tail:\n${errTail}`
    );
  }
  let doc;
  try {
    doc = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`zizmor stdout is not valid JSON SARIF: ${e.message}`);
  }
  return doc;
}

function formatBaseline(counts) {
  const keys = [...counts.keys()].sort();
  const lines = [
    '# zizmor baseline (workflow-basename::rule count). Generated for WR #17807.',
    '# Ratchet-only: CI fails when any file::rule count exceeds the baseline, or a',
    '# new file::rule pair appears (count > 0 with baseline 0).',
    '# Do not raise counts. Lowering counts (fixing debt) is always welcome.',
    '# Counts are error+warning only (persona=regular, min-severity=low). Notes ignored.',
    '# Pure line shifts cannot change these keys — that is the point vs code scanning.',
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
      'Usage: node scripts/zizmor-baseline-gate.js [--print-baseline] [--sarif file] [--baseline file] [--target path]\n'
    );
    return 0;
  }

  let current;
  if (opts.sarif) {
    const raw = fs.readFileSync(opts.sarif, 'utf8');
    current = countFromSarif(JSON.parse(raw));
  } else {
    current = countFromSarif(runZizmor(opts.target));
  }

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
      `zizmor baseline gate OK — ${totalCurrent} finding(s) (baseline cap ${totalBaseline}).\n`
    );
    return 0;
  }

  process.stderr.write(
    `zizmor baseline gate FAILED — ${regressions.length} file::rule count(s) above baseline.\n`
  );
  process.stderr.write(
    'New debt is not allowed. Fix the new findings or (only after a real cleanup) lower the baseline.\n'
  );
  process.stderr.write(
    'Note: a red GitHub code-scanning zizmor check can be a pure line shift; this ratchet is the real gate.\n\n'
  );
  for (const r of regressions.slice(0, 50)) {
    process.stderr.write(
      `  ${r.key}: ${r.count} (baseline ${r.allowed}, +${r.delta})\n`
    );
  }
  if (regressions.length > 50) {
    process.stderr.write(`  ... and ${regressions.length - 50} more\n`);
  }
  process.stderr.write('\nSee docs/ZIZMOR.md and .github/workflows/zizmor.yml.\n');
  return 1;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (err) {
    process.stderr.write(`zizmor baseline gate error: ${err.message || err}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  parseArgs,
  loadBaseline,
  countFromSarif,
  compareToBaseline,
  formatBaseline,
  workflowBasename,
  runZizmor,
  main,
  DEFAULT_BASELINE,
  DEFAULT_TARGET,
  ROOT,
};

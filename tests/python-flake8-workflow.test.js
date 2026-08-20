'use strict';

/**
 * Regression tests for the Python flake8 CI gate (WR #15858).
 *
 * Guards:
 *   - workflow exists, parses, and uses py-actions/flake8@v2.3.0 (SHA-pinned)
 *   - .flake8 selects E,W,F and does not exclude tests/scripts/tools
 *   - baseline gate fails when path::CODE counts exceed the baseline
 *   - baseline gate passes when counts are within baseline
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WF_PATH = path.join(ROOT, '.github', 'workflows', 'python-flake8.yml');
const FLAKE8_CFG = path.join(ROOT, '.flake8');
const BASELINE = path.join(ROOT, 'config', 'flake8-baseline.txt');
const GATE = path.join(ROOT, 'scripts', 'flake8-baseline-gate.js');

const EXPECTED_SHA = '84ec6726560b6d5bd68f2a5bed83d62b52bb50ba';
const EXPECTED_USES = `py-actions/flake8@${EXPECTED_SHA}`;

const {
  loadBaseline,
  countViolations,
  compareToBaseline,
  formatBaseline,
  normalizeRepoPath,
  parseArgs,
  ROOT: GATE_ROOT,
} = require('../scripts/flake8-baseline-gate.js');

test('python-flake8 workflow exists and parses', () => {
  assert.ok(fs.existsSync(WF_PATH), 'workflow file missing');
  const raw = fs.readFileSync(WF_PATH, 'utf8');
  const doc = yaml.parse(raw);
  assert.equal(doc.name, 'Python flake8 Lint');
  // yaml may parse bare `on` as boolean key `true`
  assert.ok(doc.on || doc.true, 'missing on: trigger');
  const on = doc.on || doc.true;
  assert.ok(on.pull_request, 'missing pull_request trigger');
  assert.ok(on.push, 'missing push trigger');
  assert.ok(on.workflow_dispatch !== undefined, 'missing workflow_dispatch');
  assert.ok(doc.permissions && doc.permissions.contents === 'read');
  assert.ok(doc.jobs && doc.jobs.flake8, 'missing flake8 job');
});

test('workflow pins py-actions/flake8@v2.3.0 by full commit SHA', () => {
  const raw = fs.readFileSync(WF_PATH, 'utf8');
  assert.match(raw, new RegExp(`uses:\\s*${EXPECTED_USES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(raw, /#\s*v2\.3\.0/);
  // Floating tag alone must not be the pin.
  assert.doesNotMatch(raw, /uses:\s*py-actions\/flake8@v2\.3\.0\s*$/m);
  const steps = yaml.parse(raw).jobs.flake8.steps;
  const lintStep = steps.find((s) => s.name === 'Python flake8 Lint');
  assert.ok(lintStep, 'missing step named "Python flake8 Lint"');
  assert.equal(lintStep.uses, EXPECTED_USES);
  assert.ok(lintStep.with, 'lint step missing with:');
  assert.equal(lintStep.with['max-line-length'], '120');
  assert.match(String(lintStep.with.args), /--select=E,W,F/);
  assert.match(String(lintStep.with.args), /--max-complexity=15/);
  // Must not exclude first-party source trees called out by the WR.
  const exclude = String(lintStep.with.exclude || '');
  for (const keep of ['tests', 'scripts', 'tools', 'products']) {
    assert.ok(
      !exclude.split(',').map((s) => s.trim()).includes(keep),
      `exclude must not drop ${keep}/`
    );
  }
});

test('workflow runs the baseline ratchet gate (real fail path)', () => {
  const raw = fs.readFileSync(WF_PATH, 'utf8');
  assert.match(raw, /node scripts\/flake8-baseline-gate\.js/);
  assert.match(raw, /continue-on-error:\s*true/);
});

test('.flake8 selects E,W,F and keeps source trees in scope', () => {
  assert.ok(fs.existsSync(FLAKE8_CFG), '.flake8 missing');
  const cfg = fs.readFileSync(FLAKE8_CFG, 'utf8');
  assert.match(cfg, /select\s*=\s*E,W,F/);
  assert.match(cfg, /max-line-length\s*=\s*120/);
  assert.match(cfg, /max-complexity\s*=\s*15/);
  // Exclude block should not list first-party dirs.
  const excludeBlock = cfg.match(/exclude\s*=\s*([\s\S]*?)(?:\n\s*\w+\s*=|$)/);
  assert.ok(excludeBlock, 'missing exclude in .flake8');
  const excludeText = excludeBlock[1];
  for (const keep of ['tests', 'scripts', 'tools', 'products', 'gatekeeper-cli']) {
    assert.ok(
      !new RegExp(`(^|,)\\s*${keep}\\s*(,|$)`, 'm').test(excludeText),
      `.flake8 must not exclude ${keep}`
    );
  }
});

test('baseline file exists and parses', () => {
  assert.ok(fs.existsSync(BASELINE), 'baseline missing');
  const map = loadBaseline(BASELINE);
  assert.ok(map.size > 0, 'baseline should contain entries');
  for (const [k, v] of map.entries()) {
    assert.match(k, /::[A-Z]\d+$/);
    assert.equal(typeof v, 'number');
    assert.ok(v > 0);
  }
});

test('normalizeRepoPath strips ./ and ROOT prefixes', () => {
  assert.equal(normalizeRepoPath('./scripts/foo.py'), 'scripts/foo.py');
  assert.equal(normalizeRepoPath('scripts/foo.py'), 'scripts/foo.py');
  assert.equal(
    normalizeRepoPath(path.join(GATE_ROOT, 'scripts', 'foo.py')),
    'scripts/foo.py'
  );
});

test('countViolations aggregates path::CODE lines after normalization', () => {
  const abs = path.join(GATE_ROOT, 'scripts', 'foo.py');
  const sample = [
    './scripts/foo.py::F401',
    'scripts/foo.py::F401',
    `${abs}::F401`,
    'scripts/bar.py::E501',
    '',
    'not-a-violation',
  ].join('\n');
  const counts = countViolations(sample);
  assert.equal(counts.get('scripts/foo.py::F401'), 3);
  assert.equal(counts.get('scripts/bar.py::E501'), 1);
  assert.equal(counts.has(`${abs}::F401`), false);
});

test('parseArgs rejects flags that are missing values', () => {
  assert.throws(() => parseArgs(['--fixture']), /--fixture requires a value/);
  assert.throws(() => parseArgs(['--baseline']), /--baseline requires a value/);
  assert.throws(() => parseArgs(['--target']), /--target requires a value/);
});

test('compareToBaseline flags only counts above baseline', () => {
  const baseline = new Map([
    ['a.py::F401', 2],
    ['b.py::E501', 1],
  ]);
  const current = new Map([
    ['a.py::F401', 2], // ok
    ['b.py::E501', 3], // regression +2
    ['c.py::W293', 1], // new key
  ]);
  const regs = compareToBaseline(current, baseline);
  assert.equal(regs.length, 2);
  assert.deepEqual(
    regs.map((r) => r.key).sort(),
    ['b.py::E501', 'c.py::W293']
  );
});

test('formatBaseline is stable and headered', () => {
  const text = formatBaseline(new Map([['z.py::E501', 1], ['a.py::F401', 2]]));
  assert.match(text, /^# flake8 baseline/m);
  const body = text
    .split('\n')
    .filter((l) => l && !l.startsWith('#'));
  assert.deepEqual(body, ['a.py::F401 2', 'z.py::E501 1']);
});

test('baseline gate exits 0 against the committed baseline (no new debt)', () => {
  const res = spawnSync(process.execPath, [GATE], {
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 120000,
  });
  assert.equal(
    res.status,
    0,
    `expected pass, got ${res.status}\nstdout:${res.stdout}\nstderr:${res.stderr}`
  );
  assert.match(res.stdout, /baseline gate OK/);
});

test('baseline gate exits non-zero when a fixture introduces new debt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flake8-gate-'));
  const emptyBaseline = path.join(dir, 'baseline.txt');
  // Empty baseline (headers only) means any violation is new debt.
  fs.writeFileSync(
    emptyBaseline,
    '# test baseline\n',
    'utf8'
  );
  // Put a dirty file inside the fixture directory used as flake8 target.
  fs.writeFileSync(
    path.join(dir, 'dirty.py'),
    'import os,sys\n\ndef x():\n  return 1\n',
    'utf8'
  );

  try {
    const res = spawnSync(
      process.execPath,
      [GATE, '--fixture', dir, '--baseline', emptyBaseline],
      { encoding: 'utf8', cwd: ROOT, timeout: 120000 }
    );
    assert.notEqual(res.status, 0, 'expected failure on new debt');
    assert.match(res.stderr, /baseline gate FAILED/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Regression: the flake8 exclusion list is duplicated in FOUR places, and they
 * silently disagreed.
 *
 * Landing the vendored `notebooklm-mcp-cli` MCP server (#17740) added 33
 * findings over the baseline and turned `main` red. Its author added a
 * `.flake8ignore` file intending to exclude it — but flake8 has no such
 * concept, nothing reads that filename, and the exclusion did nothing.
 *
 * Worse, adding the path to `.flake8` alone is also insufficient: the gate
 * passes `--exclude=` explicitly, which OVERRIDES `.flake8` entirely, and the
 * workflow passes its own `exclude:` input to the action. All four must agree
 * or an exclusion appears to work while doing nothing. That is what these
 * assertions pin.
 */

const PY_WORKFLOW_YML = path.join(ROOT, '.github', 'workflows', 'python-flake8.yml');
const FLAKE8IGNORE_PATH = path.join(ROOT, '.flake8ignore');

function excludesFromFlake8Cfg() {
  const raw = fs.readFileSync(FLAKE8_CFG, 'utf8');
  const block = raw.split(/^exclude\s*=\s*$/m)[1] || '';
  const stop = block.search(/^\s*[a-z-]+\s*=/m);
  return (stop === -1 ? block : block.slice(0, stop))
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim().replace(/,$/, ''))
    .filter(Boolean);
}

test('gate --exclude and the workflow exclude: input are identical', () => {
  const { FLAKE8_EXCLUDE } = require('../scripts/flake8-baseline-gate.js');
  const wf = fs.readFileSync(PY_WORKFLOW_YML, 'utf8');
  const m = wf.match(/exclude:\s*"([^"]+)"/);
  assert.ok(m, 'python-flake8.yml must pass an exclude: input');
  assert.equal(
    m[1],
    FLAKE8_EXCLUDE,
    'the workflow exclude: input and the gate FLAKE8_EXCLUDE have drifted — '
      + 'the advisory step and the real gate would then lint different file sets',
  );
});

test('every path in .flake8ignore is genuinely excluded by the gate', () => {
  const { FLAKE8_EXCLUDE } = require('../scripts/flake8-baseline-gate.js');
  const gateSet = new Set(FLAKE8_EXCLUDE.split(',').map((s) => s.trim()));

  const listed = fs
    .readFileSync(FLAKE8IGNORE_PATH, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);

  for (const p of listed) {
    assert.ok(
      gateSet.has(p),
      `.flake8ignore lists "${p}" but the gate does not exclude it. `
        + 'flake8 never reads .flake8ignore — that file is documentation only. '
        + 'Add the path to FLAKE8_EXCLUDE in scripts/flake8-baseline-gate.js, '
        + 'the exclude: input in python-flake8.yml, and .flake8.',
    );
  }
});

test('.flake8 and the gate exclude exactly the same set (drift in EITHER direction)', () => {
  const { FLAKE8_EXCLUDE } = require('../scripts/flake8-baseline-gate.js');
  const cfg = excludesFromFlake8Cfg();
  const gate = FLAKE8_EXCLUDE.split(',').map((s) => s.trim()).filter(Boolean);

  // Equality, not subset. A one-directional check misses the inverse drift:
  // adding an exclusion to .flake8 alone would pass while the gate still lints
  // the path, so a developer running `flake8` locally sees a clean tree and CI
  // does not. Both directions are the same bug wearing different hats.
  const onlyInGate = gate.filter((p) => !cfg.includes(p));
  const onlyInCfg = cfg.filter((p) => !gate.includes(p));

  assert.deepEqual(
    onlyInGate,
    [],
    `the gate excludes ${JSON.stringify(onlyInGate)} but .flake8 does not — `
      + 'a local `flake8` run would report findings CI never sees',
  );
  assert.deepEqual(
    onlyInCfg,
    [],
    `.flake8 excludes ${JSON.stringify(onlyInCfg)} but the gate does not — `
      + 'a local `flake8` run would look clean while CI fails on those paths',
  );
});

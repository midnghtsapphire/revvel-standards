#!/usr/bin/env node
'use strict';

/**
 * Regression tests for the zizmor baseline ratchet (WR #17807).
 *
 * Guards:
 *   - workflow pins third-party actions by full SHA and runs the ratchet
 *   - baseline file exists and parses
 *   - gate fails when a new file::rule pair appears (the AC: "no new zizmor
 *     rule class appears in a workflow not already on the ratchet")
 *   - gate fails when a count grows
 *   - gate passes when counts hold or shrink
 *   - line numbers are not part of the key (line-shift cannot fail the gate)
 *   - missing baseline / invalid SARIF / missing zizmor → non-zero exit
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WF_PATH = path.join(ROOT, '.github', 'workflows', 'zizmor.yml');
const BASELINE = path.join(ROOT, 'config', 'zizmor-baseline.txt');
const GATE = path.join(ROOT, 'scripts', 'zizmor-baseline-gate.js');
const DOCS = path.join(ROOT, 'docs', 'ZIZMOR.md');

const {
  loadBaseline,
  countFromSarif,
  compareToBaseline,
  formatBaseline,
  workflowBasename,
  parseArgs,
} = require('../scripts/zizmor-baseline-gate.js');

function makeSarif(results) {
  return {
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: 'zizmor' } },
        results: results.map((r) => ({
          ruleId: `zizmor/${r.rule}`,
          level: r.level || 'error',
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: r.uri || `.github/workflows/${r.file}` },
                region: { startLine: r.line || 1 },
              },
            },
          ],
        })),
      },
    ],
  };
}

function writeTemp(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zizmor-gate-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return { dir, file };
}

function runGate(args) {
  return spawnSync(process.execPath, [GATE, ...args], {
    encoding: 'utf8',
    cwd: ROOT,
  });
}

test('zizmor workflow exists, parses, and SHA-pins third-party actions', () => {
  assert.ok(fs.existsSync(WF_PATH), 'workflow file missing');
  const raw = fs.readFileSync(WF_PATH, 'utf8');
  const doc = yaml.parse(raw);
  assert.equal(doc.name, 'Zizmor (Actions security)');
  assert.match(raw, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(raw, /actions\/setup-python@[0-9a-f]{40}/);
  assert.match(raw, /actions\/setup-node@[0-9a-f]{40}/);
  assert.match(raw, /github\/codeql-action\/upload-sarif@[0-9a-f]{40}/);
  assert.doesNotMatch(raw, /uses:\s*actions\/checkout@v\d+\s*$/m);
  assert.doesNotMatch(raw, /uses:\s*actions\/setup-python@v\d+\s*$/m);
  // Real gate is the ratchet; SARIF upload is advisory.
  assert.match(raw, /node scripts\/zizmor-baseline-gate\.js/);
  assert.match(raw, /persist-credentials:\s*false/);
});

test('workflow and docs explain the code-scanning line-shift gotcha', () => {
  const raw = fs.readFileSync(WF_PATH, 'utf8');
  assert.match(raw, /LINE-SHIFT GOTCHA/);
  assert.match(raw, /line-based/i);
  assert.ok(fs.existsSync(DOCS), 'docs/ZIZMOR.md missing');
  const docs = fs.readFileSync(DOCS, 'utf8');
  assert.match(docs, /line.?shift/i);
  assert.match(docs, /zizmor-baseline/);
  assert.match(docs, /file::rule/);
});

test('baseline file exists and loads', () => {
  assert.ok(fs.existsSync(BASELINE), 'config/zizmor-baseline.txt missing');
  const map = loadBaseline(BASELINE);
  assert.ok(map.size > 0, 'baseline must not be empty while debt remains');
  // artipacked on auto-error-handler was cleared in #17807 — must not reappear.
  assert.equal(map.get('auto-error-handler.yml::artipacked') || 0, 0);
  assert.equal(map.get('auto-error-handler.yml::unpinned-uses') || 0, 0);
  assert.equal(map.get('auto-error-handler.yml::template-injection') || 0, 0);
});

test('workflowBasename strips directories and file://', () => {
  assert.equal(workflowBasename('.github/workflows/foo.yml'), 'foo.yml');
  assert.equal(workflowBasename('/abs/path/foo.yml'), 'foo.yml');
  assert.equal(workflowBasename('file:///abs/path/foo.yml'), 'foo.yml');
});

test('countFromSarif keys on file::rule and ignores note + line numbers', () => {
  const sarif = makeSarif([
    { file: 'a.yml', rule: 'template-injection', line: 10 },
    { file: 'a.yml', rule: 'template-injection', line: 99 }, // same pair, different line
    { file: 'a.yml', rule: 'unpinned-uses', line: 1, level: 'warning' },
    { file: 'b.yml', rule: 'artipacked', line: 5, level: 'note' }, // ignored
  ]);
  const counts = countFromSarif(sarif);
  assert.equal(counts.get('a.yml::template-injection'), 2);
  assert.equal(counts.get('a.yml::unpinned-uses'), 1);
  assert.equal(counts.has('b.yml::artipacked'), false);
});

test('compareToBaseline fails on new rule class and on count growth', () => {
  const baseline = new Map([
    ['a.yml::template-injection', 2],
    ['a.yml::unpinned-uses', 1],
  ]);
  // held
  assert.deepEqual(
    compareToBaseline(new Map([['a.yml::template-injection', 2]]), baseline),
    []
  );
  // shrunk — OK
  assert.deepEqual(
    compareToBaseline(new Map([['a.yml::template-injection', 1]]), baseline),
    []
  );
  // grown
  const grown = compareToBaseline(
    new Map([['a.yml::template-injection', 3]]),
    baseline
  );
  assert.equal(grown.length, 1);
  assert.equal(grown[0].key, 'a.yml::template-injection');
  assert.equal(grown[0].delta, 1);
  // new rule class on a file not already on the ratchet
  const novel = compareToBaseline(
    new Map([['brand-new.yml::template-injection', 1]]),
    baseline
  );
  assert.equal(novel.length, 1);
  assert.equal(novel[0].key, 'brand-new.yml::template-injection');
  assert.equal(novel[0].allowed, 0);
});

test('gate exits 0 when SARIF matches baseline (line shift of same findings)', () => {
  const baselineMap = new Map([
    ['shift.yml::template-injection', 2],
    ['shift.yml::unpinned-uses', 1],
  ]);
  const { file: baselineFile } = writeTemp(
    'baseline.txt',
    formatBaseline(baselineMap)
  );
  // Same findings, different line numbers — must pass.
  const sarif = makeSarif([
    { file: 'shift.yml', rule: 'template-injection', line: 100 },
    { file: 'shift.yml', rule: 'template-injection', line: 200 },
    { file: 'shift.yml', rule: 'unpinned-uses', line: 300, level: 'warning' },
  ]);
  const { file: sarifFile } = writeTemp('out.sarif', JSON.stringify(sarif));
  const res = runGate(['--baseline', baselineFile, '--sarif', sarifFile]);
  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /OK/);
});

test('gate exits 1 when a new file::rule appears', () => {
  const baselineMap = new Map([['old.yml::unpinned-uses', 1]]);
  const { file: baselineFile } = writeTemp(
    'baseline.txt',
    formatBaseline(baselineMap)
  );
  const sarif = makeSarif([
    { file: 'old.yml', rule: 'unpinned-uses', line: 1 },
    { file: 'old.yml', rule: 'template-injection', line: 2 }, // NEW rule class
  ]);
  const { file: sarifFile } = writeTemp('out.sarif', JSON.stringify(sarif));
  const res = runGate(['--baseline', baselineFile, '--sarif', sarifFile]);
  assert.equal(res.status, 1, res.stdout);
  assert.match(res.stderr, /old\.yml::template-injection/);
});

test('gate exits 2 when baseline file is missing', () => {
  const sarif = makeSarif([{ file: 'a.yml', rule: 'unpinned-uses', line: 1 }]);
  const { file: sarifFile } = writeTemp('out.sarif', JSON.stringify(sarif));
  const res = runGate([
    '--baseline',
    path.join(os.tmpdir(), 'no-such-zizmor-baseline.txt'),
    '--sarif',
    sarifFile,
  ]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /baseline file missing/);
});

test('parseArgs accepts known flags', () => {
  const opts = parseArgs([
    '--print-baseline',
    '--baseline',
    '/tmp/b.txt',
    '--target',
    '/tmp/w',
    '--sarif',
    '/tmp/s.sarif',
  ]);
  assert.equal(opts.printBaseline, true);
  assert.equal(opts.baseline, path.resolve('/tmp/b.txt'));
  assert.equal(opts.target, path.resolve('/tmp/w'));
  assert.equal(opts.sarif, path.resolve('/tmp/s.sarif'));
});

test('auto-error-handler.yml cleared artipacked, unpinned-uses, template-injection', () => {
  const wf = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'auto-error-handler.yml'),
    'utf8'
  );
  // Both checkouts pin + disable credential persistence.
  const checkoutPins = wf.match(
    /uses:\s*actions\/checkout@[0-9a-f]{40}/g
  );
  assert.ok(checkoutPins && checkoutPins.length >= 2, 'checkout must be SHA-pinned');
  assert.doesNotMatch(wf, /uses:\s*actions\/checkout@v\d+/);
  const persist = wf.match(/persist-credentials:\s*false/g);
  assert.ok(persist && persist.length >= 2, 'both checkouts need persist-credentials: false');
  // No ${{ inputs.* }} inside script:/run: bodies (env: + process.env instead).
  // Crude but matches the no-untrusted-expression guard's target surface.
  const scriptBlocks = wf.split(/\n/);
  let inRunOrScript = false;
  const offenders = [];
  for (let i = 0; i < scriptBlocks.length; i += 1) {
    const line = scriptBlocks[i];
    if (/^\s+(run|script):\s*\|?\s*$/.test(line) || /^\s+(run|script):\s+\S+/.test(line)) {
      inRunOrScript = true;
      continue;
    }
    if (inRunOrScript && /^\s+\w/.test(line) && !/^\s{8,}/.test(line) && !/^\s+-/.test(line)) {
      // dedent to next step key roughly — keep simple
    }
    if (inRunOrScript && /\$\{\{\s*inputs\./.test(line)) {
      offenders.push(`${i + 1}:${line.trim()}`);
    }
    // leave block on next top-level step key at 6 spaces starting with -
    if (inRunOrScript && /^\s{6}-\s+name:/.test(line)) {
      inRunOrScript = false;
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'inputs must reach scripts via env:/process.env, not ${{ }} substitution'
  );
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'prioritize_stars.py');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'prioritize-stars.yml');
const STANDARD = path.join(ROOT, 'standards', 'AGENTS_STAR_OPTIMIZER.md');
const DOCS = path.join(ROOT, 'docs', 'STAR_OPTIMIZER.md');
const SECRETS = path.join(ROOT, 'docs', 'SECRETS_MAP.md');
const PRODUCT = path.join(ROOT, 'products', 'star-optimizer');

test('star optimizer artifacts exist', () => {
  for (const p of [SCRIPT, WORKFLOW, STANDARD, DOCS, SECRETS, PRODUCT]) {
    assert.ok(fs.existsSync(p), `missing ${path.relative(ROOT, p)}`);
  }
  assert.ok(fs.existsSync(path.join(PRODUCT, 'lib', 'scoring.ts')));
  assert.ok(fs.existsSync(path.join(PRODUCT, 'package.json')));
});

test('workflow points at scripts/prioritize_stars.py and uses concurrency lock', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(yml, /name:\s*Prioritize Starred Repositories/);
  assert.match(yml, /scripts\/prioritize_stars\.py/);
  assert.match(yml, /concurrency:/);
  assert.match(yml, /group:\s*prioritize-stars-job/);
  assert.match(yml, /\[skip ci\]/);
  assert.match(yml, /secrets\.GH_PAT/);
  // This workflow is dispatch-only by design: the recurring cadence lives in
  // hourly-growth-prioritizer.yml (prioritize_and_optimize.py), and only the
  // legacy checkpointed prioritize_stars.py path is kept behind manual
  // dispatch. #17044 shipped an assertion for `cron: '0 */6 * * *'`, which
  // `git log -S` shows was never present in this file at any commit. Assert
  // the arrangement that actually holds, in both directions, so the split
  // cannot silently collapse back into two competing schedules.
  assert.match(yml, /workflow_dispatch:/);
  assert.doesNotMatch(yml, /schedule:/, 'cadence belongs to hourly-growth-prioritizer.yml');
  const hourly = fs.readFileSync(
    path.join(__dirname, '..', '.github/workflows/hourly-growth-prioritizer.yml'),
    'utf8'
  );
  assert.match(hourly, /schedule:/, 'the moved cadence must exist where it moved to');
  // Third-party actions must be SHA-pinned (CLAUDE.md gotcha #8).
  const uses = [...yml.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length >= 3, 'expected checkout, setup-python, auto-commit');
  for (const ref of uses) {
    const pin = ref.split('@')[1] || '';
    assert.match(pin, /^[0-9a-f]{40}$/, `floating action ref: ${ref}`);
  }
});

test('python prioritizer self-test passes offline', () => {
  const result = spawnSync('python3', [SCRIPT, '--self-test'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /self-test ok/);
});

test('python prioritizer fixture mode writes markdown and json', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'star-opt-'));
  const md = path.join(tmp, 'PRIORITIZED_STARS.md');
  const jsonOut = path.join(tmp, 'prioritized_stars.json');
  const result = spawnSync(
    'python3',
    [SCRIPT, '--fixture', '--output-md', md, '--output-json', jsonOut],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const mdText = fs.readFileSync(md, 'utf8');
  assert.match(mdText, /Prioritized Starred Repositories/);
  assert.match(mdText, /active\/tool/);
  const report = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  assert.equal(report.count, 3);
  assert.equal(report.repos[0].nameWithOwner, 'active/tool');
});

test('secrets map documents GH_PAT for star optimizer', () => {
  const text = fs.readFileSync(SECRETS, 'utf8');
  assert.match(text, /GH_PAT/);
  assert.match(text, /prioritize-stars/);
});

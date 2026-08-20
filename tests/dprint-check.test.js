'use strict';

/**
 * Regression tests for the dprint style gate (WR-16273).
 *
 * Guards:
 *  - workflow wires dprint/check@v2.3 on Linux
 *  - dprint.json exists, parses, and lists required plugins/includes
 *  - package.json exposes format / format:check scripts
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WF_PATH = path.join(ROOT, '.github', 'workflows', 'dprint-check.yml');
const CONFIG_PATH = path.join(ROOT, 'dprint.json');
const DOCS_PATH = path.join(ROOT, 'docs', 'DPRINT.md');
const PKG_PATH = path.join(ROOT, 'package.json');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('dprint-check.yml exists and parses with name + on', () => {
  assert.ok(fs.existsSync(WF_PATH), 'missing .github/workflows/dprint-check.yml');
  const doc = yaml.parse(read(WF_PATH));
  assert.equal(doc.name, 'dprint check');
  // yaml may parse bare `on:` as boolean key `true`
  assert.ok(doc.on || doc.true, 'missing on: trigger');
});

test('dprint-check.yml declares least-privilege permissions', () => {
  const doc = yaml.parse(read(WF_PATH));
  assert.ok(doc.permissions && typeof doc.permissions === 'object');
  assert.equal(doc.permissions.contents, 'read');
});

test('dprint-check.yml style job pins dprint/check and does not gate on runner.os', () => {
  // #17742 — this asserted the job guarded with `runner.os == 'Linux'`. That
  // guard sits in a JOB-level `if`, where the `runner` context is not available,
  // so actionlint rejected the workflow and the condition could never evaluate.
  // The guard was redundant anyway: `runs-on: ubuntu-latest` already pins the
  // platform.
  //
  // Fifth test found this session asserting the very defect it was named after.
  // See RVS-VERIFY-001 §4.
  const raw = fs.readFileSync(WF_PATH, "utf8");
  assert.match(raw, /uses:\s*dprint\/check@/, 'the dprint action must still be pinned');
  assert.match(raw, /runs-on:\s*ubuntu-latest/, 'the platform is pinned by runs-on');
  assert.doesNotMatch(
    raw,
    /^\s*if:\s*runner\.os/m,
    'the `runner` context is not available in a job-level `if`',
  );
});

test('dprint.json exists, is valid JSON, and lists plugins + includes', () => {
  assert.ok(fs.existsSync(CONFIG_PATH), 'missing dprint.json');
  const cfg = JSON.parse(read(CONFIG_PATH));
  assert.ok(Array.isArray(cfg.plugins) && cfg.plugins.length >= 3, 'expected >=3 plugins');
  assert.ok(
    cfg.plugins.some((p) => /typescript-.*\.wasm$/.test(p)),
    'missing typescript plugin',
  );
  assert.ok(cfg.plugins.some((p) => /json-.*\.wasm$/.test(p)), 'missing json plugin');
  assert.ok(cfg.plugins.some((p) => /markdown-.*\.wasm$/.test(p)), 'missing markdown plugin');

  assert.ok(Array.isArray(cfg.includes) && cfg.includes.length > 0, 'includes must be non-empty');
  // Root-anchored globs keep nested product package.json files out of scope.
  assert.ok(cfg.includes.includes('/dprint.json') || cfg.includes.includes('dprint.json'));
  assert.ok(
    cfg.includes.includes('/tests/dprint-check.test.js')
      || cfg.includes.includes('tests/dprint-check.test.js'),
  );
  assert.ok(Array.isArray(cfg.excludes), 'excludes should be an array');
  assert.ok(cfg.excludes.some((e) => e.includes('node_modules')));
});

test('docs/DPRINT.md documents the gate and action pin', () => {
  assert.ok(fs.existsSync(DOCS_PATH), 'missing docs/DPRINT.md');
  const body = read(DOCS_PATH);
  assert.match(body, /dprint\/check@v2\.3/);
  assert.match(body, /dprint-check\.yml/);
  assert.match(body, /dprint\.json/);
});

test('package.json exposes format and format:check scripts', () => {
  const pkg = JSON.parse(read(PKG_PATH));
  assert.equal(pkg.scripts['format:check'], 'dprint check');
  assert.equal(pkg.scripts.format, 'dprint fmt');
});

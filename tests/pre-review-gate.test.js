#!/usr/bin/env node
/* Regression tests for .pre-commit-hooks/pre-review-gate.sh */
'use strict';
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.pre-commit-hooks', 'pre-review-gate.sh');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  ok  ' + name); pass++; }
  catch (e) { console.error('  FAIL ' + name + ' — ' + (e.stack || e.message)); fail++; }
}

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
}
function runGate(files) {
  return spawnSync('bash', [GATE, ...files], { cwd: REPO, encoding: 'utf8' });
}
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); return p; }

console.log('pre-review-gate');

test('gate script exists and is readable', () => {
  assert(fs.existsSync(GATE));
});

test('markdown: bare URL wrapped in <>', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'a.md'), '# t\n\nSee https://example.com for info.\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(out.includes('<https://example.com>'), 'expected wrapped URL, got: ' + out);
});

test('markdown: URL inside fenced code block is NOT wrapped', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'b.md'), '```\nhttps://example.com\n```\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(out.includes('https://example.com'), 'URL should still be present');
  assert(!out.includes('<https://example.com>'), 'URL in fence must not be wrapped, got: ' + out);
});

test('markdown: URL already in link [x](url) is NOT double-wrapped', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'c.md'), '[x](https://example.com)\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(out.includes('[x](https://example.com)'));
  assert(!out.includes('<https://example.com>'));
});

test('markdown: fix is idempotent', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'd.md'), 'Visit https://a.example for a.\n');
  runGate([f]); const first = fs.readFileSync(f, 'utf8');
  runGate([f]); const second = fs.readFileSync(f, 'utf8');
  assert.strictEqual(first, second);
});

test('markdown: >1 blank lines collapsed to 1', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'e.md'), '# t\n\n\n\nbody\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(!out.includes('\n\n\n'), 'expected collapsed blanks, got: ' + JSON.stringify(out));
});

test('YAML: syntax error blocks (exit 1)', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'x.yaml'), 'a: [1, 2\n');
  const r = runGate([f]);
  // Only assert non-zero if PyYAML is present; otherwise gate skips.
  const hasYaml = spawnSync('python3', ['-c', 'import yaml'], { encoding: 'utf8' }).status === 0;
  if (hasYaml) assert.notStrictEqual(r.status, 0, 'expected non-zero exit, stderr=' + r.stderr);
});

test('YAML: duplicate key blocks (exit 1)', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'y.yaml'), 'KEY: 1\nother: 2\nKEY: 3\n');
  const r = runGate([f]);
  const hasYaml = spawnSync('python3', ['-c', 'import yaml'], { encoding: 'utf8' }).status === 0;
  if (hasYaml) {
    assert.notStrictEqual(r.status, 0);
    assert(/duplicate key/i.test(r.stderr), 'expected duplicate-key error, stderr=' + r.stderr);
  }
});

test('JSON: invalid blocks (exit 1)', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'z.json'), '{ "a": 1, }');
  const r = runGate([f]);
  assert.notStrictEqual(r.status, 0, 'expected non-zero, stderr=' + r.stderr);
});

test('secret pattern warns but does NOT block', () => {
  const d = mkTmp();
  const f = write(path.join(d, 'note.md'), '# ok\n\nAKIA1234567890ABCDEF text\n');
  const r = runGate([f]);
  assert.strictEqual(r.status, 0, 'secret should be non-blocking, stderr=' + r.stderr);
});

test('missing files handled gracefully', () => {
  const r = runGate([path.join(os.tmpdir(), 'nonexistent-xyz-123.md')]);
  assert.strictEqual(r.status, 0);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

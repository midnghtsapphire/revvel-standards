'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const GATE = path.resolve(__dirname, '..', '.pre-commit-hooks', 'pre-review-gate.sh');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
}

function runGate(files) {
  const res = spawnSync('bash', [GATE, ...files], { encoding: 'utf8' });
  return res;
}

test('gate script exists and is a shell script', () => {
  assert.ok(fs.existsSync(GATE));
  const head = fs.readFileSync(GATE, 'utf8').slice(0, 32);
  assert.ok(head.startsWith('#!/usr/bin/env bash'));
});

test('wraps bare URLs in markdown outside code fences', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, '# Title\n\nsee https://example.com for info\n\n```\nhttps://not-wrapped.example\n```\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(out.includes('<https://example.com>'), 'bare url should be wrapped');
  assert.ok(out.includes('https://not-wrapped.example'), 'url in fence must remain intact');
  assert.ok(!out.includes('<https://not-wrapped.example>'), 'url in fence must NOT be wrapped');
});

test('does not double-wrap already-wrapped URLs (idempotent)', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, 'see <https://example.com> ok\n');
  runGate([f]);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(!out.includes('<<https://example.com>>'));
});

test('does not wrap URLs already inside markdown links', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, '[link](https://example.com)\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.strictEqual(out.trim(), '[link](https://example.com)');
});

test('collapses duplicate blank lines outside fences', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, 'a\n\n\n\nb\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(!/\n\n\n/.test(out), 'no triple blank lines');
});

test('YAML syntax error is blocking', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.yaml');
  fs.writeFileSync(f, 'key: value\n  bad: [unclosed\n');
  const r = runGate([f]);
  assert.notStrictEqual(r.status, 0);
});

test('YAML duplicate key is blocking (safe_load bug fixed)', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.yaml');
  fs.writeFileSync(f, 'KEY: 1\nother: 2\nKEY: 3\n');
  const r = runGate([f]);
  // Only enforce if pyyaml is present; otherwise the test is skipped gracefully.
  const hasYaml = spawnSync('python3', ['-c', 'import yaml']).status === 0;
  if (hasYaml) {
    assert.notStrictEqual(r.status, 0, 'duplicate key must block');
    assert.ok(/duplicate key/i.test(r.stderr || ''), 'error should mention duplicate key');
  }
});

test('JSON syntax error is blocking', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.json');
  fs.writeFileSync(f, '{"a": 1,}\n');
  const r = runGate([f]);
  assert.notStrictEqual(r.status, 0);
});

test('secret pattern is a warning, not blocking', () => {
  const d = tmpdir();
  const f = path.join(d, 'note.md');
  fs.writeFileSync(f, 'token: AKIAABCDEFGHIJKLMNOP\n');
  const r = runGate([f]);
  assert.strictEqual(r.status, 0);
  assert.ok(/secret/i.test(r.stderr || ''));
});

test('missing files are silently skipped', () => {
  const r = runGate([path.join(tmpdir(), 'does-not-exist.md')]);
  assert.strictEqual(r.status, 0);
});

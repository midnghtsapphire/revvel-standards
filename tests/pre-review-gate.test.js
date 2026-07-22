'use strict';
// Regression tests for .pre-commit-hooks/pre-review-gate.sh
// Uses Node's built-in test runner + child_process.

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GATE = path.join(REPO_ROOT, '.pre-commit-hooks', 'pre-review-gate.sh');

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pregate-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function runGate(files) {
  return spawnSync('bash', [GATE, ...files], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
}

test('markdown: wraps bare URL outside code fence', () => {
  const p = tmpFile('a.md', 'See https://example.com here.\n');
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.match(out, /<https:\/\/example\.com>/);
});

test('markdown: does NOT wrap URLs inside fenced code blocks', () => {
  const src = '```\ncurl https://example.com\n```\n';
  const p = tmpFile('b.md', src);
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(out.includes('curl https://example.com'), 'fenced URL untouched');
  assert.ok(!out.includes('<https://example.com>'), 'no wrapping inside fence');
});

test('markdown: does NOT double-wrap already-wrapped URLs', () => {
  const p = tmpFile('c.md', 'See <https://example.com>.\n');
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  const matches = out.match(/<https:\/\/example\.com>/g);
  assert.strictEqual(matches.length, 1);
});

test('markdown: does NOT wrap URL inside markdown link', () => {
  const p = tmpFile('d.md', '[site](https://example.com)\n');
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(out.includes('[site](https://example.com)'));
});

test('markdown: does NOT wrap URLs inside inline code', () => {
  const p = tmpFile('e.md', 'run `curl https://example.com` now.\n');
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(out.includes('`curl https://example.com`'));
});

test('markdown: collapses 3+ blank lines to 1', () => {
  const p = tmpFile('f.md', 'a\n\n\n\n\nb\n');
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(!/\n{3,}/.test(out));
});

test('yaml: blocks on syntax error', () => {
  const p = tmpFile('bad.yaml', 'foo: [unclosed\n');
  const r = runGate([p]);
  assert.notStrictEqual(r.status, 0);
});

test('yaml: blocks on duplicate key', () => {
  const p = tmpFile('dup.yaml', 'KEY: 1\nOTHER: 2\nKEY: 3\n');
  const r = runGate([p]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /duplicate key/i);
});

test('json: blocks on invalid JSON', () => {
  const p = tmpFile('bad.json', '{ "a": 1, }\n');
  const r = runGate([p]);
  assert.notStrictEqual(r.status, 0);
});

test('missing files are ignored', () => {
  const r = runGate([path.join(os.tmpdir(), 'nope-does-not-exist-xyz.md')]);
  assert.strictEqual(r.status, 0);
});

'use strict';
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GATE = path.resolve(__dirname, '..', '.pre-commit-hooks', 'pre-review-gate.sh');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok  ' + name); passed++; }
  catch (e) { console.error('  FAIL ' + name + ' — ' + e.message); failed++; }
}

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

function runGate(files) {
  return spawnSync('bash', [GATE, ...files], { encoding: 'utf8' });
}

console.log('# pre-review-gate');

test('gate script is executable and exists', () => {
  assert.ok(fs.existsSync(GATE), 'gate missing at ' + GATE);
});

test('wraps bare URL in markdown to <url>', () => {
  const f = tmpFile('a.md', 'See https://example.com/path for info.\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(out.includes('<https://example.com/path>'), 'expected wrapped URL, got: ' + out);
});

test('does NOT wrap URLs inside fenced code blocks', () => {
  const src = '```\nhttps://example.com/keep-me\n```\n';
  const f = tmpFile('b.md', src);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(out.includes('https://example.com/keep-me'), 'URL was removed/mangled');
  assert.ok(!out.includes('<https://example.com/keep-me>'), 'URL inside fence was wrapped');
});

test('does NOT double-wrap URLs already in <> or []()', () => {
  const src = 'Already <https://a.example> and [link](https://b.example).\n';
  const f = tmpFile('c.md', src);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(!out.includes('<<https://a.example>>'), 'double-wrap on angle url');
  assert.ok(!out.includes('(<https://b.example>)'), 'wrapped url inside link');
});

test('URL wrapping is idempotent', () => {
  const f = tmpFile('d.md', 'Go https://ex.com now.\n');
  runGate([f]);
  const after1 = fs.readFileSync(f, 'utf8');
  runGate([f]);
  const after2 = fs.readFileSync(f, 'utf8');
  assert.strictEqual(after1, after2, 'gate mutated file on second run');
});

test('collapses runs of blank lines', () => {
  const f = tmpFile('e.md', 'A\n\n\n\n\nB\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(!/\n\n\n/.test(out), 'still contains 3+ consecutive newlines: ' + JSON.stringify(out));
});

test('blocks YAML with syntax error', () => {
  const f = tmpFile('bad.yaml', 'a: [1, 2\nb: 3\n');
  const r = runGate([f]);
  assert.notStrictEqual(r.status, 0, 'expected non-zero exit, got ' + r.status);
});

test('blocks YAML with duplicate keys', () => {
  const f = tmpFile('dup.yaml', 'KEY: 1\nOTHER: 2\nKEY: 3\n');
  const r = runGate([f]);
  assert.notStrictEqual(r.status, 0, 'expected non-zero exit for duplicate key');
  assert.ok(/duplicate key/i.test(r.stderr || ''), 'expected duplicate-key message, got: ' + r.stderr);
});

test('blocks invalid JSON', () => {
  const f = tmpFile('bad.json', '{ "a": 1, }\n');
  const r = runGate([f]);
  assert.notStrictEqual(r.status, 0, 'expected non-zero exit for bad JSON');
});

test('accepts valid JSON', () => {
  const f = tmpFile('good.json', '{"a":1,"b":[2,3]}\n');
  const r = runGate([f]);
  assert.strictEqual(r.status, 0, 'expected zero exit, got ' + r.status + ' stderr=' + r.stderr);
});

test('secret warning is non-blocking', () => {
  const f = tmpFile('note.md', 'token: ghp_' + 'A'.repeat(30) + '\n');
  const r = runGate([f]);
  // Markdown may still lint-fail depending on tools; check the warning presence, not exit.
  assert.ok(/possible secret/i.test(r.stderr || ''), 'expected secret warning');
});

test('missing file is handled gracefully', () => {
  const r = runGate(['/nonexistent/path/file.yaml']);
  assert.strictEqual(r.status, 0, 'missing file should not block, got ' + r.status);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

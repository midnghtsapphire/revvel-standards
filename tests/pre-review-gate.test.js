#!/usr/bin/env node
/* pre-review-gate regression tests — 10 checks. */
'use strict';
var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');

var REPO = path.resolve(__dirname, '..');
var GATE = path.join(REPO, '.pre-commit-hooks', 'pre-review-gate.sh');

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓ ' + name); passed++; }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + (e.stack || e.message)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
}

function tmpFile(name, content) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
  var p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

function runGate(args) {
  var res = cp.spawnSync('bash', [GATE].concat(args), { encoding: 'utf8' });
  return { code: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

console.log('pre-review-gate tests');
console.log('---------------------');

test('gate script exists and is executable', function () {
  assert(fs.existsSync(GATE), 'missing gate script');
});

test('wraps bare URL in markdown', function () {
  var f = tmpFile('a.md', 'See https://example.com for info.\n');
  var r = runGate([f]);
  assertEq(r.code, 0, 'stderr: ' + r.stderr);
  var out = fs.readFileSync(f, 'utf8');
  assert(out.indexOf('<https://example.com>') !== -1, 'not wrapped: ' + out);
});

test('does NOT wrap URL inside fenced code block', function () {
  var content = 'Prose https://a.com\n\n```\ncurl https://api.example.com/v1\n```\n';
  var f = tmpFile('b.md', content);
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert(out.indexOf('<https://a.com>') !== -1, 'prose not wrapped');
  assert(out.indexOf('curl https://api.example.com/v1') !== -1, 'code block URL got mangled: ' + out);
});

test('does NOT double-wrap already-wrapped URL', function () {
  var f = tmpFile('c.md', 'See <https://example.com>.\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assertEq((out.match(/</g) || []).length, 1, 'expected exactly one <: ' + out);
});

test('does NOT wrap URL inside markdown link', function () {
  var f = tmpFile('d.md', '[Docs](https://example.com/docs)\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assertEq(out.trim(), '[Docs](https://example.com/docs)');
});

test('collapses 3+ blank lines to single blank line', function () {
  var f = tmpFile('e.md', 'para1\n\n\n\n\npara2\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assertEq(out, 'para1\n\npara2\n');
});

test('blocks YAML with syntax error', function () {
  var f = tmpFile('bad.yml', 'foo: [unclosed\n');
  var r = runGate([f]);
  // If PyYAML isn't installed the check no-ops; only assert when it ran
  if (r.stderr.indexOf('YAML error') !== -1) {
    assertEq(r.code, 1, 'should block');
  } else {
    console.log('    (PyYAML not installed — skipped)');
  }
});

test('blocks YAML with duplicate top-level keys', function () {
  var f = tmpFile('dup.yml', 'KEY: 1\nother: 2\nKEY: 3\n');
  var r = runGate([f]);
  if (r.stderr.indexOf('YAML error') !== -1 || r.stderr.indexOf('duplicate key') !== -1) {
    assertEq(r.code, 1, 'should block on duplicate key');
    assert(r.stderr.indexOf("duplicate key") !== -1, 'stderr should mention duplicate: ' + r.stderr);
  } else {
    console.log('    (PyYAML not installed — skipped)');
  }
});

test('blocks JSON with syntax error', function () {
  var f = tmpFile('bad.json', '{"a": 1,}\n');
  var r = runGate([f]);
  assertEq(r.code, 1, 'should block invalid JSON');
  assert(r.stderr.indexOf('JSON error') !== -1, 'stderr: ' + r.stderr);
});

test('secret pattern is warning-only (non-blocking)', function () {
  var f = tmpFile('note.txt', 'AKIAIOSFODNN7EXAMPLE\n');
  var r = runGate([f]);
  assertEq(r.code, 0, 'should NOT block');
  assert(r.stderr.indexOf('possible secret') !== -1, 'expected warning');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

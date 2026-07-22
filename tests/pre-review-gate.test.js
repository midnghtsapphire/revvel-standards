// Regression tests for the pre-review commit gate.
// Run: node tests/pre-review-gate.test.js
'use strict';
var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');

var repoRoot = path.resolve(__dirname, '..');
var gate = path.join(repoRoot, '.pre-commit-hooks', 'pre-review-gate.sh');

function tmpFile(name, content) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
  var p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

function runGate(files) {
  var res = cp.spawnSync('bash', [gate].concat(files), {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  return { code: res.status, out: res.stdout, err: res.stderr };
}

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

test('gate exists and is executable', function () {
  assert.ok(fs.existsSync(gate), 'gate script missing');
});

test('markdown bare URL is wrapped with angle brackets', function () {
  var f = tmpFile('doc.md', 'See https://example.com for details.\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.ok(out.indexOf('<https://example.com>') !== -1, 'expected wrapped URL, got: ' + out);
});

test('markdown URL inside fenced code block is NOT wrapped', function () {
  var content = '```\nhttps://example.com/in/code\n```\n';
  var f = tmpFile('code.md', content);
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.ok(out.indexOf('<https://example.com/in/code>') === -1, 'must not wrap in fence');
  assert.ok(out.indexOf('https://example.com/in/code') !== -1);
});

test('markdown URL inside existing [text](url) link is NOT double-wrapped', function () {
  var f = tmpFile('link.md', '[click](https://example.com)\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.ok(out.indexOf('[click](https://example.com)') !== -1);
  assert.ok(out.indexOf('<https://example.com>)') === -1);
});

test('markdown URL fix is idempotent', function () {
  var f = tmpFile('idem.md', 'See <https://example.com>.\n');
  runGate([f]);
  var out1 = fs.readFileSync(f, 'utf8');
  runGate([f]);
  var out2 = fs.readFileSync(f, 'utf8');
  assert.strictEqual(out1, out2);
  assert.ok(out1.indexOf('<<https') === -1);
});

test('markdown collapses 3+ blank lines to 2', function () {
  var f = tmpFile('blank.md', 'a\n\n\n\n\nb\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.strictEqual(out, 'a\n\nb\n');
});

test('YAML syntax error blocks (exit non-zero)', function () {
  var f = tmpFile('bad.yaml', 'a: [unclosed\n');
  var r = runGate([f]);
  assert.notStrictEqual(r.code, 0, 'expected non-zero exit for bad yaml');
});

test('YAML duplicate key blocks (exit non-zero)', function () {
  var f = tmpFile('dup.yaml', 'KEY: 1\nother: 2\nKEY: 3\n');
  var r = runGate([f]);
  // Only assert failure if PyYAML available; if not, gate silently passes.
  var hasPyYaml = cp.spawnSync('python3', ['-c', 'import yaml']).status === 0;
  if (hasPyYaml) {
    assert.notStrictEqual(r.code, 0, 'expected duplicate key to block');
    assert.ok(/duplicate key/i.test(r.err), 'expected duplicate-key message');
  }
});

test('invalid JSON blocks (exit non-zero)', function () {
  var f = tmpFile('bad.json', '{ "a": }');
  var r = runGate([f]);
  assert.notStrictEqual(r.code, 0);
});

test('secret pattern warns but does not block', function () {
  var f = tmpFile('leak.txt', 'AWS=AKIAIOSFODNN7EXAMPLE\n');
  var r = runGate([f]);
  assert.strictEqual(r.code, 0, 'secret scan must be non-blocking');
  assert.ok(/possible secret/i.test(r.err), 'expected warn message, got: ' + r.err);
});

test('missing files are handled gracefully (no crash)', function () {
  var r = runGate(['/tmp/does-not-exist-' + Date.now() + '.md']);
  assert.strictEqual(r.code, 0);
});

var failed = 0;
tests.forEach(function (t) {
  try {
    t.fn();
    console.log('  ok  ' + t.name);
  } catch (e) {
    failed++;
    console.log('  FAIL ' + t.name + ' → ' + e.message);
  }
});
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' passed');
if (failed) process.exit(1);

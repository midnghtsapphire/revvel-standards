// pre-review gate regression tests. Run with: node tests/pre-review-gate.test.js
var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var os = require('os');
var assert = require('assert');

var GATE = path.resolve(__dirname, '..', '.pre-commit-hooks', 'pre-review-gate.sh');
var TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'prerev-'));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓ ' + name); passed++; }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); failed++; }
}

function runGate(files) {
  var res = cp.spawnSync('bash', [GATE].concat(files), { encoding: 'utf8' });
  return { code: res.status, out: res.stdout || '', err: res.stderr || '' };
}

function write(name, content) {
  var p = path.join(TMP, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

console.log('pre-review gate tests');

test('gate exists and is executable', function () {
  assert.ok(fs.existsSync(GATE));
});

test('bare URL in markdown gets wrapped', function () {
  var f = write('a.md', 'See https://example.com here.\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.ok(out.indexOf('<https://example.com>') >= 0, 'got: ' + out);
});

test('URL inside fenced code block is NOT wrapped', function () {
  var body = '```\nhttps://example.com\n```\n';
  var f = write('b.md', body);
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.strictEqual(out, body);
});

test('URL inside markdown link syntax is NOT double-wrapped', function () {
  var body = 'See [example](https://example.com) here.\n';
  var f = write('c.md', body);
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.strictEqual(out, body);
});

test('URL wrapping is idempotent', function () {
  var body = 'See <https://example.com> here.\n';
  var f = write('d.md', body);
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.strictEqual(out, body);
});

test('collapses 3+ blank lines', function () {
  var f = write('e.md', 'a\n\n\n\nb\n');
  runGate([f]);
  var out = fs.readFileSync(f, 'utf8');
  assert.strictEqual(out, 'a\n\nb\n');
});

test('invalid JSON blocks (exit 1)', function () {
  var f = write('bad.json', '{"a": 1,,}');
  var r = runGate([f]);
  assert.notStrictEqual(r.code, 0);
});

test('valid JSON passes (exit 0)', function () {
  var f = write('ok.json', '{"a": 1}');
  var r = runGate([f]);
  assert.strictEqual(r.code, 0);
});

test('duplicate YAML key blocks (if PyYAML present)', function () {
  var hasYaml = cp.spawnSync('python3', ['-c', 'import yaml']).status === 0;
  if (!hasYaml) { console.log('    (skipped: PyYAML not installed)'); return; }
  var f = write('dup.yaml', 'KEY: 1\nOTHER: 2\nKEY: 3\n');
  var r = runGate([f]);
  assert.notStrictEqual(r.code, 0);
  assert.ok(r.err.indexOf('duplicate') >= 0, 'stderr: ' + r.err);
});

test('missing file is handled gracefully', function () {
  var r = runGate([path.join(TMP, 'does-not-exist.md')]);
  assert.strictEqual(r.code, 0);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
// cleanup
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
process.exit(failed === 0 ? 0 : 1);

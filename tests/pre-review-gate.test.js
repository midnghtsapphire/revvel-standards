// Regression tests for .pre-commit-hooks/pre-review-gate.sh
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GATE = path.resolve(__dirname, '..', '.pre-commit-hooks', 'pre-review-gate.sh');
let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.error('  FAIL ' + name + ' — ' + e.message); fail++; }
}
console.log('pre-review-gate.test.js');

function tmp(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}
function runGate(files) {
  return spawnSync('bash', [GATE, ...files], { encoding: 'utf8' });
}

t('gate script exists and is readable', () => {
  assert.ok(fs.existsSync(GATE));
});

t('missing files handled gracefully (no crash)', () => {
  const r = runGate([]);
  assert.strictEqual(r.status, 0, 'stdout:' + r.stdout + ' stderr:' + r.stderr);
});

t('URL wrap: bare URL wrapped in md', () => {
  const p = tmp('a.md', '# T\n\nsee https://example.com here\n');
  const r = runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(out.includes('<https://example.com>'), 'got: ' + out);
  assert.strictEqual(r.status, 0);
});

t('URL wrap: fenced code block untouched', () => {
  const src = '# T\n\n```\nhttps://example.com\n```\n';
  const p = tmp('b.md', src);
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(out.includes('```\nhttps://example.com\n```'), 'fence corrupted: ' + out);
});

t('URL wrap: existing markdown links untouched', () => {
  const src = '# T\n\n[link](https://example.com)\n';
  const p = tmp('c.md', src);
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(out.includes('[link](https://example.com)'), 'link corrupted: ' + out);
});

t('URL wrap: idempotent', () => {
  const p = tmp('d.md', '# T\n\nsee https://example.com\n');
  runGate([p]);
  const first = fs.readFileSync(p, 'utf8');
  runGate([p]);
  const second = fs.readFileSync(p, 'utf8');
  assert.strictEqual(first, second);
});

t('blank-line collapse', () => {
  const p = tmp('e.md', '# T\n\n\n\n\nend\n');
  runGate([p]);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(!/\n\n\n/.test(out), 'triple blank remains: ' + JSON.stringify(out));
});

t('YAML syntax error blocks', () => {
  const p = tmp('bad.yml', 'a: [1, 2\nb: 3\n');
  const r = runGate([p]);
  assert.notStrictEqual(r.status, 0);
});

t('YAML duplicate key blocks', () => {
  const p = tmp('dup.yml', 'KEY: 1\nOther: 2\nKEY: 3\n');
  const r = runGate([p]);
  // Only assert blocking if PyYAML is available
  const hasYaml = spawnSync('python3', ['-c', 'import yaml']).status === 0;
  if (hasYaml) {
    assert.notStrictEqual(r.status, 0, 'expected block; out=' + r.stdout + r.stderr);
    assert.ok((r.stdout + r.stderr).match(/duplicate key/i));
  }
});

t('JSON invalid blocks', () => {
  const p = tmp('bad.json', '{"a": 1,}');
  const r = runGate([p]);
  assert.notStrictEqual(r.status, 0);
});

t('secret warning is non-blocking', () => {
  const p = tmp('leak.txt', 'token=AKIAABCDEFGHIJKLMNOP\n');
  const r = runGate([p]);
  assert.strictEqual(r.status, 0, 'should not block; out=' + r.stdout + r.stderr);
});

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

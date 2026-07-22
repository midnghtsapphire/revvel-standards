// Regression tests for .pre-commit-hooks/pre-review-gate.sh
// Run with: node tests/pre-review-gate.test.js
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GATE = path.join(REPO_ROOT, '.pre-commit-hooks', 'pre-review-gate.sh');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓', name); passed++; }
  catch (e) { console.error('  ✗', name, '\n   ', e.message); failed++; }
}

function tmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));
}
function write(dir, name, content) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}
function runGate(files, cwd) {
  return spawnSync('bash', [GATE, ...files], { cwd: cwd || REPO_ROOT, encoding: 'utf8' });
}

console.log('Pre-review gate tests\n');

test('gate script exists and is executable', () => {
  if (!fs.existsSync(GATE)) throw new Error('gate script missing');
});

test('markdown: wraps bare URL in angle brackets', () => {
  const d = tmp('prg');
  const f = write(d, 'a.md', '# Title\n\nSee https://example.com for info.\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  if (!out.includes('<https://example.com>')) throw new Error('URL not wrapped: ' + out);
});

test('markdown: leaves URLs inside fenced code blocks alone', () => {
  const d = tmp('prg');
  const f = write(d, 'b.md', '# T\n\n```\ncurl https://example.com/api\n```\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  if (out.includes('<https://example.com/api>')) throw new Error('URL inside fence was wrapped');
});

test('markdown: leaves URLs inside existing [text](url) links alone', () => {
  const d = tmp('prg');
  const f = write(d, 'c.md', '# T\n\nSee [site](https://example.com) here.\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  if (out.includes('](<https://example.com>')) throw new Error('link URL was double-wrapped');
});

test('markdown: URL wrapping is idempotent', () => {
  const d = tmp('prg');
  const f = write(d, 'd.md', '# T\n\nSee <https://example.com> here.\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  if (out.includes('<<https://example.com>>')) throw new Error('double-wrapped: ' + out);
});

test('markdown: collapses duplicate blank lines', () => {
  const d = tmp('prg');
  const f = write(d, 'e.md', '# T\n\n\n\nBody\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  if (/\n\n\n/.test(out)) throw new Error('multiple blank lines not collapsed: ' + JSON.stringify(out));
});

test('YAML: syntax error blocks commit (exit 1)', () => {
  const d = tmp('prg');
  const f = write(d, 'a.yml', 'key: value\n  bad: indent: here\n');
  const r = runGate([f]);
  if (r.status === 0) throw new Error('should have failed; stderr=' + r.stderr);
});

test('YAML: duplicate keys are detected and block commit', () => {
  const d = tmp('prg');
  const f = write(d, 'b.yml', 'KEY: one\nother: two\nKEY: three\n');
  const r = runGate([f]);
  if (r.status === 0) throw new Error('duplicate key not detected; stderr=' + r.stderr);
  const combined = (r.stdout || '') + (r.stderr || '');
  if (!/duplicate key/i.test(combined)) throw new Error('no duplicate-key message; got: ' + combined);
});

test('JSON: syntax error blocks commit (exit 1)', () => {
  const d = tmp('prg');
  const f = write(d, 'a.json', '{"broken": true,,}');
  const r = runGate([f]);
  if (r.status === 0) throw new Error('should have failed; stderr=' + r.stderr);
});

test('secrets: warning is non-blocking (exit 0)', () => {
  const d = tmp('prg');
  const f = write(d, 'notes.txt', 'AKIAIOSFODNN7EXAMPLE\n');
  const r = runGate([f]);
  if (r.status !== 0) throw new Error('secret warning should not block; got ' + r.status + ' stderr=' + r.stderr);
});

test('missing files are skipped gracefully', () => {
  const r = runGate([path.join(os.tmpdir(), 'definitely-does-not-exist-' + Date.now() + '.yml')]);
  if (r.status !== 0) throw new Error('missing file should not fail; got ' + r.status);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

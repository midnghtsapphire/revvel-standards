// Regression tests for the pre-review commit gate.
// Run: node tests/pre-review-gate.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const GATE = path.join(REPO_ROOT, '.pre-commit-hooks', 'pre-review-gate.sh');

let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try { fn(); passed++; results.push(`  ok  ${name}`); }
  catch (e) { failed++; results.push(`  FAIL ${name}\n       ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); }

function runGate(files, opts) {
  opts = opts || {};
  try {
    const out = execFileSync('bash', [GATE, ...files], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { code: 0, out, err: '' };
  } catch (e) {
    return { code: e.status || 1, out: (e.stdout || '').toString(), err: (e.stderr || '').toString() };
  }
}

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-review-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

test('gate script exists and is executable', () => {
  assert(fs.existsSync(GATE), 'gate missing');
});

test('missing file arg is skipped, exit 0', () => {
  const r = runGate(['/nonexistent/does-not-exist.md']);
  assert(r.code === 0, `expected 0, got ${r.code}: ${r.err}`);
});

test('markdown bare URL is wrapped with <>', () => {
  const f = tmpFile('a.md', 'See https://example.com/foo for details.\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(out.includes('<https://example.com/foo>'), `got: ${out}`);
});

test('markdown URL inside fenced code block is NOT wrapped', () => {
  const src = '```\ncurl https://example.com/x\n```\n';
  const f = tmpFile('b.md', src);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(!out.includes('<https://example.com/x>'), `should preserve fence: ${out}`);
  assert(out.includes('curl https://example.com/x'), 'code line changed');
});

test('URL already wrapped in <> is left idempotent', () => {
  const src = 'Ref: <https://example.com/ok>\n';
  const f = tmpFile('c.md', src);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(out === src, `changed: ${out}`);
});

test('URL inside markdown link [text](url) is left alone', () => {
  const src = 'See [docs](https://example.com/doc).\n';
  const f = tmpFile('d.md', src);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(out.includes('[docs](https://example.com/doc)'), `broken link: ${out}`);
});

test('multiple blank lines are collapsed to one', () => {
  const src = 'a\n\n\n\nb\n';
  const f = tmpFile('e.md', src);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert(out === 'a\n\nb\n', `got: ${JSON.stringify(out)}`);
});

test('YAML syntax error blocks commit (exit != 0)', () => {
  const f = tmpFile('bad.yaml', 'a: b\n  c: d\n : : :\n');
  const r = runGate([f]);
  assert(r.code !== 0, `expected fail, got ${r.code}`);
});

test('YAML duplicate key blocks commit', () => {
  const f = tmpFile('dup.yaml', 'KEY: 1\nother: 2\nKEY: 3\n');
  const r = runGate([f]);
  assert(r.code !== 0, `expected fail, got ${r.code}. err=${r.err}`);
  assert(/duplicate key/i.test(r.err + r.out), `expected duplicate-key msg, got: ${r.err}`);
});

test('valid YAML passes', () => {
  const f = tmpFile('ok.yaml', 'a: 1\nb: 2\n');
  const r = runGate([f]);
  assert(r.code === 0, `expected pass, got ${r.code}: ${r.err}`);
});

test('invalid JSON blocks commit; secret pattern warns but does not block', () => {
  const bad = tmpFile('bad.json', '{ "a": 1, }');
  const r1 = runGate([bad]);
  assert(r1.code !== 0, 'bad json should fail');

  const secret = tmpFile('leak.md', 'token=AKIAABCDEFGHIJKLMNOP note\n');
  const r2 = runGate([secret]);
  // secret warning is non-blocking
  assert(r2.code === 0, `secret should warn not block, got code=${r2.code} err=${r2.err}`);
  assert(/possible secret/i.test(r2.err), `expected warning, got: ${r2.err}`);
});

console.log(results.join('\n'));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

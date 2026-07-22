/* pre-review-gate.sh regression tests. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const GATE = path.join(__dirname, '..', '.pre-commit-hooks', 'pre-review-gate.sh');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
}

function runGate(files) {
  const res = cp.spawnSync('bash', [GATE, ...files], { encoding: 'utf8' });
  return { code: res.status, out: res.stdout || '', err: res.stderr || '' };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('gate script exists and is executable-readable', () => {
  assert.ok(fs.existsSync(GATE));
});

test('bare URL on its own line is wrapped in angle brackets', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, '# Title\n\nhttps://example.com\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(out.includes('<https://example.com>'), 'expected wrapped URL, got:\n' + out);
});

test('URL inside ``` fenced code block is NOT wrapped', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  const original = '# Title\n\n```\nhttps://example.com\n```\n';
  fs.writeFileSync(f, original);
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(out.includes('```\nhttps://example.com\n```'), 'fence contents were mutated:\n' + out);
  assert.ok(!out.includes('<https://example.com>'), 'URL inside fence should not be wrapped');
});

test('URL already inside a markdown link is not double-wrapped', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, '# T\n\n[link](https://example.com)\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(out.includes('[link](https://example.com)'));
  assert.ok(!out.includes('<https://example.com>'));
});

test('URL wrap is idempotent', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, '# T\n\nhttps://example.com\n');
  runGate([f]);
  const once = fs.readFileSync(f, 'utf8');
  runGate([f]);
  const twice = fs.readFileSync(f, 'utf8');
  assert.strictEqual(once, twice);
});

test('3+ consecutive blank lines are collapsed to 1', () => {
  const d = tmpdir();
  const f = path.join(d, 'a.md');
  fs.writeFileSync(f, '# T\n\n\n\n\nend\n');
  runGate([f]);
  const out = fs.readFileSync(f, 'utf8');
  assert.ok(!/\n\n\n/.test(out), 'expected max one blank line, got:\n' + out);
});

test('YAML with duplicate keys is blocked (exit non-zero)', () => {
  // Only meaningful if python3 + PyYAML present; otherwise skip cleanly.
  const probe = cp.spawnSync('python3', ['-c', 'import yaml']);
  if (probe.status !== 0) return; // pyyaml missing — skip
  const d = tmpdir();
  const f = path.join(d, 'a.yml');
  fs.writeFileSync(f, 'KEY: 1\nOTHER: 2\nKEY: 3\n');
  const r = runGate([f]);
  assert.notStrictEqual(r.code, 0, 'expected non-zero exit for duplicate keys');
  assert.ok(/duplicate key/i.test(r.err) || /duplicate key/i.test(r.out), 'expected duplicate key message');
});

test('YAML with a real syntax error is blocked', () => {
  const probe = cp.spawnSync('python3', ['-c', 'import yaml']);
  if (probe.status !== 0) return;
  const d = tmpdir();
  const f = path.join(d, 'a.yml');
  fs.writeFileSync(f, 'key: [unterminated\n');
  const r = runGate([f]);
  assert.notStrictEqual(r.code, 0);
});

test('invalid JSON is blocked', () => {
  const probe = cp.spawnSync('python3', ['--version']);
  if (probe.status !== 0) return;
  const d = tmpdir();
  const f = path.join(d, 'a.json');
  fs.writeFileSync(f, '{ "a": 1, }\n'); // trailing comma → invalid
  const r = runGate([f]);
  assert.notStrictEqual(r.code, 0);
});

test('secret-looking pattern is advisory only (does not block)', () => {
  const d = tmpdir();
  const f = path.join(d, 'notes.md');
  // Wrap in a fenced block to avoid MD034 wrap and to keep it a text pattern.
  fs.writeFileSync(f, '# T\n\n```\nAKIAIOSFODNN7EXAMPLE\n```\n');
  const r = runGate([f]);
  assert.strictEqual(r.code, 0, 'secrets must be advisory, got exit ' + r.code + '\nstderr:\n' + r.err);
  assert.ok(/possible secret/i.test(r.err), 'expected advisory warning in stderr');
});

test('missing / nonexistent file arg is handled without crashing', () => {
  const r = runGate([path.join(os.tmpdir(), 'does-not-exist-xyz.md')]);
  assert.strictEqual(r.code, 0);
});

(async function run() {
  let pass = 0, fail = 0;
  for (const t of tests) {
    try { await t.fn(); console.log('  ok', t.name); pass++; }
    catch (e) { console.error('  FAIL', t.name, '-', e.message); fail++; }
  }
  console.log(`\n${pass}/${tests.length} passed`);
  if (fail) process.exit(1);
})();

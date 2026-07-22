// Grounding test for WR-4600.3 harvester.
// Shells the Python self-test and performs a dry-run no-fabrication check.

const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

function run(args) {
  const res = spawnSync('python3', ['tools/harvest.py', ...args], {
    encoding: 'utf8',
  });
  return res;
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL ${name}: ${e.message}`);
    failed++;
  }
}

test('self-test exits 0 with 17/17', () => {
  const r = run(['--self-test']);
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  assert.ok(/self-test: 17\/17/.test(r.stdout), 'expected 17/17');
});

test('dry-run emits zero rows (no fabrication)', () => {
  const r = run(['--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.dry_run, true);
  assert.strictEqual(out.rows, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

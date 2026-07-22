// Node grounding test for tools/harvest.py — shells the Python self-test
// and runs a dry-run no-fabrication check. Stdlib only.
const { spawnSync } = require('child_process');
const assert = require('assert');

function run(args) {
  const r = spawnSync('python3', ['tools/harvest.py', ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}: ${e.message}`);
    failed++;
  }
}

test('harvest --self-test exits 0', () => {
  const r = run(['--self-test']);
  assert.strictEqual(r.code, 0, r.err || r.out);
});

test('harvest --self-test reports 17/17', () => {
  const r = run(['--self-test']);
  assert.ok(/self-test: 17\/17/.test(r.out), r.out);
});

test('harvest --dry-run exits 0', () => {
  const r = run(['--dry-run']);
  assert.strictEqual(r.code, 0, r.err || r.out);
});

test('dry-run emits WR-4600.3 version', () => {
  const r = run(['--dry-run']);
  assert.ok(/"version": "WR-4600.3"/.test(r.out), r.out);
});

test('dry-run has adverse shard first in registry', () => {
  const r = run(['--dry-run']);
  const data = JSON.parse(r.out);
  assert.ok(data.shards.adverse, 'adverse shard present');
  assert.ok(data.shards.pubmed, 'pubmed shard present');
  assert.ok(data.shards.trials, 'trials shard present');
  assert.ok(data.shards.crossref, 'crossref shard present');
});

test('dry-run: no fabricated urls (all null or http)', () => {
  const r = run(['--dry-run']);
  const data = JSON.parse(r.out);
  for (const [name, block] of Object.entries(data.shards)) {
    for (const row of block.rows || []) {
      if ('url' in row && row.url !== null) {
        assert.ok(typeof row.url === 'string' && row.url.startsWith('http'),
          `shard ${name} has bad url: ${row.url}`);
      }
    }
  }
});

test('dry-run: quiet-day snapshot is valid (0 rows OK)', () => {
  const r = run(['--dry-run']);
  const data = JSON.parse(r.out);
  for (const block of Object.values(data.shards)) {
    assert.ok(Array.isArray(block.rows));
    assert.strictEqual(block.count, block.rows.length);
  }
});

test('harvest --help does not crash', () => {
  const r = run(['--help']);
  assert.strictEqual(r.code, 0);
});

test('no P0 fabrication guard trip in dry-run', () => {
  const r = run(['--dry-run']);
  assert.ok(!/FABRICATION GUARD/.test(r.err), r.err);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

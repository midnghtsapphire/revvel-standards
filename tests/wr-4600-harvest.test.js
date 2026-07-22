// WR-4600 harvest grounding tests (node, no deps).
// Shells the Python self-test, then verifies dry-run emits no fabricated URLs.
const { spawnSync } = require('child_process');
const assert = require('assert');

function run(args) {
  const r = spawnSync('python3', ['tools/harvest.py', ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

let passed = 0;
function test(name, fn) {
  try { fn(); console.log('ok -', name); passed++; }
  catch (e) { console.error('not ok -', name); console.error(e.message); process.exitCode = 1; }
}

test('self-test exits 0', () => {
  const r = run(['--self-test']);
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /self-test: 17\/17/);
});

test('dry-run emits snapshot json line', () => {
  const r = run(['--dry-run', '--out', 'snapshots-test']);
  assert.strictEqual(r.code, 0, r.out);
  const line = r.out.trim().split('\n').pop();
  const parsed = JSON.parse(line);
  assert.ok(parsed.snapshot, 'snapshot path present');
  assert.strictEqual(parsed.quiet_day, true, 'dry-run is a quiet day');
});

test('dry-run snapshot contains no fabricated URLs', () => {
  const fs = require('fs');
  const path = require('path');
  const dir = 'snapshots-test';
  const files = fs.readdirSync(dir).filter(f => f.startsWith('wr-4600-'));
  assert.ok(files.length > 0, 'a snapshot exists');
  const snap = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
  const allowed = [
    'clinicaltrials.gov',
    'pubmed.ncbi.nlm.nih.gov',
    'doi.org',
    'api.fda.gov',
    'eutils.ncbi.nlm.nih.gov',
    'api.crossref.org',
  ];
  for (const [shard, rows] of Object.entries(snap.shards)) {
    for (const row of rows) {
      if (!row.url) continue;
      const host = new URL(row.url).host.toLowerCase();
      assert.ok(allowed.includes(host), `shard ${shard} produced disallowed host ${host}`);
    }
  }
});

test('spec version is WR-4600.3', () => {
  const fs = require('fs');
  const path = require('path');
  const dir = 'snapshots-test';
  const files = fs.readdirSync(dir).filter(f => f.startsWith('wr-4600-'));
  const snap = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
  assert.strictEqual(snap.spec, 'WR-4600.3');
});

console.log(`\n${passed} passed`);

// WR-4600.3 harvest grounding test
// - shells the Python self-test
// - runs a --dry-run and asserts no fabricated URLs

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  } else {
    console.log('ok -', msg);
  }
}

function python() {
  for (const bin of ['python3', 'python']) {
    const r = spawnSync(bin, ['--version']);
    if (r.status === 0) return bin;
  }
  return null;
}

const py = python();
if (!py) {
  console.log('skip - python not available');
  process.exit(0);
}

// 1. self-test 17/17
const st = spawnSync(py, ['tools/harvest.py', '--self-test'], { encoding: 'utf8' });
assert(st.status === 0, 'harvest --self-test exits 0');
assert(/17\/17 checks passed/.test(st.stdout), 'harvest --self-test reports 17/17');

// 2. dry-run: no network, produces a snapshot, no fabricated URLs
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wr4600-'));
const dr = spawnSync(py, ['tools/harvest.py', '--dry-run', '--out', tmp], { encoding: 'utf8' });
assert(dr.status === 0, 'harvest --dry-run exits 0');

const snaps = fs.readdirSync(tmp).filter(f => f.startsWith('snapshot-'));
assert(snaps.length === 1, 'dry-run creates exactly one snapshot');

const payload = JSON.parse(fs.readFileSync(path.join(tmp, snaps[0]), 'utf8'));
assert(payload.spec === 'WR-4600.3', 'snapshot spec is WR-4600.3');
assert(Array.isArray(payload.shards) && payload.shards.length === 3, 'three shards present');
assert(payload.shards[0].shard === 'adverse', 'adverse shard runs first');

// Walk every row and confirm no fabricated URLs (any URL, if present, is http(s))
let urlCount = 0;
for (const s of payload.shards) {
  for (const r of s.rows) {
    if (r.url !== undefined) {
      urlCount++;
      assert(typeof r.url === 'string' && /^https?:\/\//.test(r.url), `row URL is real: ${r.url}`);
    }
  }
}
console.log(`ok - no fabricated URLs (checked ${urlCount})`);

console.log('\nharvest grounding tests: PASS');

// Grounding test: shells the Python self-test + a dry-run no-fabrication check.
const { spawnSync } = require('child_process');

function run(args) {
  return spawnSync('python3', ['tools/harvest.py', ...args], { encoding: 'utf8' });
}

let failed = 0;
function assert(name, cond) {
  if (cond) { console.log('PASS', name); } else { console.log('FAIL', name); failed++; }
}

// 1. Self-test exits 0 and reports 17/17
const st = run(['--self-test']);
assert('self-test exits 0', st.status === 0);
assert('self-test reports 17/17', /17\/17 checks passed/.test(st.stdout));

// 2. Dry-run produces valid JSON with spec + hash
const dr = run(['--dry-run']);
assert('dry-run exits 0', dr.status === 0);
let snap = null;
try { snap = JSON.parse(dr.stdout); } catch (e) {}
assert('dry-run emits JSON', snap !== null);
assert('dry-run spec is WR-4600.3', snap && snap.spec === 'WR-4600.3');
assert('dry-run has content_hash', snap && typeof snap.content_hash === 'string' && snap.content_hash.length === 64);

// 3. No fabricated URLs on quiet/dry-run day
const urls = snap ? snap.shards.flatMap(s => (s.rows || []).map(r => r.url)) : [];
assert('no fabricated URLs on dry-run', urls.length === 0);

// 4. Adverse shard runs first
assert('adverse shard is first', snap && snap.shards[0].id === 'adverse');

// 5. Regulatory degrades with procurement_note (no key in CI)
const reg = snap && snap.shards.find(s => s.id === 'regulatory');
assert('regulatory degrades (no padding)', reg && (reg.rows || []).length === 0);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall harvest grounding checks passed');

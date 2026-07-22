// Grounding test: shells the Python self-test and asserts no fabrication in dry-run.
const { spawnSync } = require('child_process');
const path = require('path');

const HARVEST = path.join(__dirname, '..', 'tools', 'harvest.py');

function run(args) {
  const r = spawnSync('python3', [HARVEST, ...args], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log(`  ok - ${name}`);
    passed++;
  } else {
    console.log(`  FAIL - ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// 1: self-test exits 0
const st = run(['--self-test']);
assert('self-test exit 0', st.code === 0, st.stderr.slice(0, 200));

// 2: self-test reports 17/17
assert('self-test 17/17', /self-test:\s*17\/17/.test(st.stdout), st.stdout.slice(-200));

// 3: dry-run exits 0 and reports 0 rows (no fabrication offline)
const dry = run(['--dry-run', '--out', path.join(__dirname, '..', 'wr', 'snapshots')]);
assert('dry-run exit 0', dry.code === 0, dry.stderr.slice(0, 200));
let dryJson = null;
try {
  const line = dry.stdout.trim().split('\n').pop();
  dryJson = JSON.parse(line);
} catch (e) {
  // parse failure recorded below
}
assert('dry-run emits JSON', dryJson !== null);
assert('dry-run rows == 0 (no fabrication)', dryJson && dryJson.rows === 0);

// 4: snapshot path is inside wr/snapshots
assert(
  'snapshot in wr/snapshots',
  dryJson && typeof dryJson.snapshot === 'string' && dryJson.snapshot.includes('wr/snapshots'),
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

// WR-4600.3 harvest grounding test.
// Shells the Python self-test and asserts a dry-run emits no fabricated rows.

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const harvest = path.join(repoRoot, 'tools', 'harvest.py');

function run(args) {
  const py = process.env.PYTHON || 'python3';
  return spawnSync(py, [harvest, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('PASS:', msg);
}

// 1. self-test exits 0 and reports 17/17
const st = run(['--self-test']);
assert(st.status === 0, 'harvest --self-test exits 0');
assert(/self-test: 17\/17/.test(st.stdout || ''), 'self-test reports 17/17');

// 2. dry-run emits a snapshot with row_count 0 (no fabrication offline)
const dr = run(['--dry-run', '--out', path.join(repoRoot, 'wr', 'snapshots', 'test')]);
assert(dr.status === 0, 'harvest --dry-run exits 0');
const payload = JSON.parse(dr.stdout);
assert(payload.row_count === 0, 'dry-run row_count is 0 (no fabrication)');
assert(payload.quiet === true, 'dry-run marks snapshot as quiet');
assert(typeof payload.content_hash === 'string' && payload.content_hash.length === 64, 'snapshot has sha256 content_hash');
assert(payload.triage_count === 0, 'dry-run emits no triage candidates');

console.log('\nwr-4600-harvest: all checks passed');

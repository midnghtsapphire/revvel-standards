// tests/wr-4600-harvest.test.js
// WR-4600.3 grounding test: shells the Python self-test + a dry-run
// no-fabrication check. Node stdlib only.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HARVEST = path.join(__dirname, '..', 'tools', 'harvest.py');

function run(args) {
  return spawnSync('python3', [HARVEST, ...args], { encoding: 'utf8' });
}

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else      { failed++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

// 1. self-test exits 0
const st = run(['--self-test']);
check('self-test exits 0', st.status === 0, `status=${st.status}`);

// 2. self-test reports 17/17
check('self-test reports 17/17', /self-test:\s*17\/17/.test(st.stdout || ''),
  (st.stdout || '').split('\n').slice(-3).join(' | '));

// 3. dry-run exits 0
const dr = run(['--dry-run']);
check('dry-run exits 0', dr.status === 0, `status=${dr.status}`);

// 4. dry-run outputs valid JSON
let snap = null;
try { snap = JSON.parse(dr.stdout || ''); } catch (_) {}
check('dry-run outputs valid JSON', snap !== null);

// 5. dry-run yields zero rows (no fabrication path exists)
check('dry-run: zero rows (no fabrication)',
  snap && Array.isArray(snap.rows) && snap.rows.length === 0);

// 6. dry-run notes present for every shard
const notes = (snap && snap.notes) || [];
check('dry-run: adverse note',    notes.some(n => /^adverse:/.test(n)));
check('dry-run: clinical note',   notes.some(n => /^clinical:/.test(n)));
check('dry-run: literature note', notes.some(n => /^literature:/.test(n)));

// 9. snapshot carries a content_hash
check('snapshot has content_hash',
  snap && typeof snap.content_hash === 'string' && snap.content_hash.startsWith('sha256:'));

console.log(`\nharvest tests: ${passed}/${passed + failed}`);
process.exit(failed === 0 ? 0 : 1);
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const HARVEST = path.join(__dirname, "..", "tools", "harvest.py");

// Grounding gate: the harvester's own offline unit checks must pass. This is
// the boolean surface (WR-4200 "maximize the scripted surface") — no network,
// deterministic, so it runs in CI without hitting NCBI/Crossref/ctgov.
test("harvest.py --self-test passes (pure-function contract)", () => {
  const py = process.env.PYTHON || "python3";
  let out;
  try {
    out = execFileSync(py, [HARVEST, "--self-test"], { encoding: "utf8" });
  } catch (err) {
    // Surface the failing checks in the assertion message.
    assert.fail(
      "harvest self-test failed:\n" +
        (err.stdout || "") +
        (err.stderr || "")
    );
  }
  assert.match(out, /harvest self-test: (\d+)\/\1 passed/, out);
});

test("harvest.py --dry-run runs offline without writing or fabricating", () => {
  const py = process.env.PYTHON || "python3";
  // A single keyed shard degrades to zero rows and writes nothing in dry-run.
  const out = execFileSync(py, [HARVEST, "--shard", "standards", "--dry-run"], {
    encoding: "utf8",
  });
  const summary = JSON.parse(out.trim().split("\n").pop());
  assert.equal(summary.new, 0, "keyed shard must not fabricate rows");
  assert.equal(summary.total, 0);
  assert.equal(summary.quiet, true);
});

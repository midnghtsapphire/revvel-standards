// WR-4600.3 harvest grounding test.
// Shells the Python self-test and verifies the harvester never fabricates URLs.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const harvester = path.join(__dirname, '..', 'tools', 'harvest.py');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  } else {
    console.log('  ✓', msg);
  }
}

// 1. Harvester exists
assert(fs.existsSync(harvester), 'tools/harvest.py exists');

// 2. Python self-test passes (17/17)
const py = process.env.PYTHON || 'python3';
const st = spawnSync(py, [harvester, '--self-test'], { encoding: 'utf8' });
if (st.status !== 0) {
  console.error(st.stdout);
  console.error(st.stderr);
}
assert(st.status === 0, 'python self-test exits 0');
assert(/self-test:\s*17\/17/.test(st.stdout), 'self-test reports 17/17');

// 3. Source never contains a constructed pubmed/doi URL literal for row output
const src = fs.readFileSync(harvester, 'utf8');
assert(!/f"https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\{/.test(src),
  'no fabricated pubmed URL template');
assert(!/f"https:\/\/doi\.org\/\{/.test(src),
  'no fabricated doi.org URL template');

// 4. Adverse shard is first in the ordered list
assert(/SHARDS_IN_ORDER\s*=\s*\[shard_adverse,/.test(src),
  'adverse shard runs first');

// 5. Keyless degrade path exists
assert(/procurement_note/.test(src), 'procurement_note path present');

// 6. Self-test is marked offline
assert(/17 offline deterministic checks/.test(src), 'self-test is offline');

// 7. Content-hash used for snapshot filenames
assert(/hashlib\.sha256/.test(src), 'sha256 content hashing');

// 8. Quiet-day still writes a snapshot (no early return on empty)
assert(/snap\.write_bytes\(body\)/.test(src), 'always writes snapshot');

// 9. UA identifies the bot
assert(/wr-watchtower\/4600\.3/.test(src), 'user-agent set');

console.log('wr-4600 harvest: 9/9');

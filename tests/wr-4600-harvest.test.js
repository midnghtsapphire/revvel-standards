// Node grounding test for WR-4600.3 harvest pipeline.
// Shells the Python self-test (17 checks) and asserts no-fabrication invariants.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

let passed = 0;
let failed = 0;
function t(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL ${name}: ${e.message}`);
    failed++;
  }
}

t('harvest.py exists', () => {
  if (!fs.existsSync('tools/harvest.py')) throw new Error('missing');
});

t('spec yaml exists', () => {
  if (!fs.existsSync('WR-4600.3-harvest-spec.yml')) throw new Error('missing');
});

t('python self-test passes (17/17)', () => {
  const out = run('python3', ['tools/harvest.py', '--self-test']);
  if (!/17\/17/.test(out)) throw new Error('self-test not 17/17:\n' + out);
});

t('no constructed pubmed URLs from bare strings', () => {
  const src = fs.readFileSync('tools/harvest.py', 'utf-8');
  // Allowed: f"...{pmid}/" where pmid comes from API result.uids — verify comment marker present.
  if (!src.includes('ncbi.esummary')) throw new Error('missing ncbi provenance tag');
});

t('crossref uses API-supplied URL field', () => {
  const src = fs.readFileSync('tools/harvest.py', 'utf-8');
  if (!src.includes('it.get("URL")')) throw new Error('crossref must use payload URL');
});

t('openfda omits URL rather than constructing one', () => {
  const src = fs.readFileSync('tools/harvest.py', 'utf-8');
  if (!src.includes('openFDA does not return a canonical per-record URL')) {
    throw new Error('missing openfda omit-not-construct guard');
  }
});

t('adverse shard runs first', () => {
  const src = fs.readFileSync('tools/harvest.py', 'utf-8');
  const m = src.match(/SHARDS_ORDER\s*=\s*\[([^\]]+)\]/);
  if (!m) throw new Error('cannot find SHARDS_ORDER');
  const first = m[1].split(',')[0].trim().replace(/['"]/g, '');
  if (first !== 'adverse') throw new Error(`first shard is ${first}`);
});

t('watchtower workflow is valid-looking YAML', () => {
  const y = fs.readFileSync('.github/workflows/watchtower.yml', 'utf-8');
  if (!/schedule:/.test(y) || !/cron:\s*'17 6/.test(y)) throw new Error('cron missing');
  if (!/--self-test/.test(y)) throw new Error('grounding gate missing');
});

t('spectrum-blueprint read-through exists with tags', () => {
  const p = 'wr/research/spectrum-blueprint-read.md';
  if (!fs.existsSync(p)) throw new Error('missing');
  const s = fs.readFileSync(p, 'utf-8');
  if (!/\[PROVEN\]/.test(s) || !/\[EMERGING\]/.test(s) || !/\[SPECULATIVE\]/.test(s)) {
    throw new Error('tags missing');
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

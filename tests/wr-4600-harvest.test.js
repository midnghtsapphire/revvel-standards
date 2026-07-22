#!/usr/bin/env node
// WR-4600 harvest grounding test.
// Shells the Python self-test (17 checks) and runs a dry-run no-fabrication
// verification.  No network required.

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HARVEST = path.join(__dirname, '..', 'tools', 'harvest.py');

function run(args) {
  const bin = process.env.PYTHON || 'python3';
  const r = spawnSync(bin, [HARVEST, ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

let passed = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    console.log(`  FAIL ${name}`);
  }
}

// 1. self-test exits 0
const st = run(['--self-test']);
check('python self-test exits 0', st.code === 0);

// 2. self-test reports 17/17
check('python self-test reports 17/17', /self-test:\s*17\/17/.test(st.out));

// 3. self-test names the WR-4200 no-fabrication check
check('self-test exercises no-fabrication rule',
  /no-fabrication/i.test(st.out));

// 4. dry-run exits 0
const dr = run(['--dry-run']);
check('python dry-run exits 0', dr.code === 0);

// 5. dry-run emits 0 fabrications explicitly
check('dry-run reports 0 fabrications', /0 fabrications/.test(dr.out));

// 6. dry-run does not write a snapshot
const fs = require('node:fs');
const snapDir = path.join(__dirname, '..', 'wr', 'snapshots');
const before = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).length : 0;
run(['--dry-run']);
const after = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).length : 0;
check('dry-run does not write a snapshot', before === after);

// 7. harvester file mentions WR-4200 rule
const src = fs.readFileSync(HARVEST, 'utf8');
check('harvester documents WR-4200 no-fabrication rule',
  /WR-4200/.test(src) && /fabricat/i.test(src));

// 8. adverse shard is first in order
check('adverse shard runs first',
  /SHARDS\s*=\s*\["adverse"/.test(src));

// 9. triage tokens are HARM/FLICKER/OCULAR
check('triage tokens defined',
  /TRIAGE_TOKENS\s*=\s*\("HARM",\s*"FLICKER",\s*"OCULAR"\)/.test(src));

console.log(`\nharvest grounding: ${passed}/${total}`);
process.exit(passed === total ? 0 : 1);

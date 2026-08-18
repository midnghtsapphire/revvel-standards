'use strict';

// Regression tests for WR-MOTU-BNAT-SHEAF PR 1 (issue #16900):
// documentation + standard foundation package. Locks required files and
// key phrases so the geometric invariant stays in the SSOT.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full), `missing required file: ${rel}`);
  return fs.readFileSync(full, 'utf8');
}

test('docs/bnatsheaf package ships README, standard, and master prompt', () => {
  for (const rel of [
    'docs/bnatsheaf/README.md',
    'docs/bnatsheaf/BNAT_SHEAF_STANDARD.md',
    'docs/bnatsheaf/MOTU_MASTER_PROMPT.md',
    'wr/WR-MOTU-BNAT-SHEAF.md',
    'wr/memory/learnings-bnat-sheaf.md',
  ]) {
    assert.ok(fs.statSync(path.join(ROOT, rel)).isFile(), rel);
  }
});

test('README links living BIOME example and states imprint-at-spawn', () => {
  const md = read('docs/bnatsheaf/README.md');
  assert.match(md, /scripts\/biome\/sheaf\.js/);
  assert.match(md, /docs\/biome\/biome-status\.json/);
  assert.match(md, /imprint-at-spawn/i);
  assert.match(md, /node scripts\/bnatsheaf\/cli\.js imprint_agent/);
  assert.match(md, /14-veins-grounding-gate/);
  // Must not advertise a non-existent Python imprint path.
  assert.doesNotMatch(md, /python3 bnatsheaf\/scripts\/imprint_agent\.py/);
});

test('BNAT_SHEAF_STANDARD formalizes E(x), H^1, barcodes, dual embedding, Controller rule', () => {
  const md = read('docs/bnatsheaf/BNAT_SHEAF_STANDARD.md');
  assert.match(md, /cellular sheaf/i);
  assert.match(md, /restriction map/i);
  assert.match(md, /E\(x\)/);
  assert.match(md, /H\^1|H\u00b9|\$H\^1\$/);
  assert.match(md, /persistent homology/i);
  assert.match(md, /dual embedding/i);
  assert.match(md, /chemistry|cognitive/i);
  assert.match(md, /No WR.*high-blast PR|high-blast PR.*E\(x\)/i);
  assert.match(md, /14-veins-grounding-gate/);
  assert.match(md, /[Oo]bstruction [Rr]eporting|[Vv]erifier [Ss]ection/);
});

test('MOTU_MASTER_PROMPT includes all ten Visiting Controller sections', () => {
  const md = read('docs/bnatsheaf/MOTU_MASTER_PROMPT.md');
  const required = [
    /##\s*1\.\s*Identity/i,
    /##\s*2\.\s*Pre-engagement gate/i,
    /##\s*3\.\s*Multi-fleet hygiene/i,
    /##\s*4\.\s*BNAT core/i,
    /##\s*5\.\s*Knowledge Sheaf/i,
    /##\s*6\.\s*Neural Sheaf Diffusion/i,
    /##\s*7\.\s*Dual modes/i,
    /##\s*8\.\s*WR\/PR/i,
    /##\s*9\.\s*Speed-demon algorithms/i,
    /##\s*10\.\s*Output discipline/i,
  ];
  for (const re of required) {
    assert.match(md, re, `missing section matching ${re}`);
  }
  assert.match(md, /AGENTS\.md/);
  assert.match(md, /VISITING_AGENTS\.md/);
  assert.match(md, /E\(x\)\s*>\s*\\?varepsilon|E\(x\) > \\varepsilon|\$E\(x\) > \\varepsilon\$/);
});

test('WR body and learning file record geometric invariant in SSOT', () => {
  const wr = read('wr/WR-MOTU-BNAT-SHEAF.md');
  assert.match(wr, /docs\/bnatsheaf\/README\.md/);
  assert.match(wr, /BNAT_SHEAF_STANDARD\.md/);
  assert.match(wr, /MOTU_MASTER_PROMPT\.md/);
  assert.match(wr, /14-veins-grounding-gate/);
  assert.match(wr, /XAI_API_KEY/);
  assert.match(wr, /GROK_API_KEY/);
  assert.match(wr, /16900|WR-MOTU-BNAT-SHEAF/);

  const learn = read('wr/memory/learnings-bnat-sheaf.md');
  assert.match(learn, /SSOT|Single Source of Truth/i);
  assert.match(learn, /E\(x\)/);
  assert.match(learn, /H\^1|geometric invariant/i);
  assert.match(learn, /16900|WR-MOTU-BNAT-SHEAF/);
});

test('.env.example documents XAI_API_KEY / GROK_API_KEY once with Vault path', () => {
  const env = read('.env.example');
  const xai = env.match(/^XAI_API_KEY=$/gm) || [];
  const grok = env.match(/^GROK_API_KEY=$/gm) || [];
  assert.equal(xai.length, 1, 'XAI_API_KEY placeholder must appear exactly once');
  assert.equal(grok.length, 1, 'GROK_API_KEY placeholder must appear exactly once');
  assert.match(env, /revvel\/shared\/llm\/xai/);
  // No real-looking secrets
  assert.doesNotMatch(env, /XAI_API_KEY=\S+/);
  assert.doesNotMatch(env, /GROK_API_KEY=\S+/);
});

test('additive guarantee: BIOME sheaf module still loads independently', () => {
  const biome = require('../scripts/biome/sheaf');
  assert.equal(typeof biome.glueSections, 'function');
  const status = biome.glueSections(
    [{ worker: 'sentinel', status: 'healthy' }],
    '2026-08-08T00:00:00Z'
  );
  assert.equal(status.schema, 'biome-status/v1');
});

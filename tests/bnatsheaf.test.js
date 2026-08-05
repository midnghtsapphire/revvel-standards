'use strict';

// BNAT sheaf test harness — unit, integration, property, and
// topological-regression tests for the mathematical sheaf layer (WR-16893).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  matVec,
  vecSub,
  normSq,
  identity,
  CellularSheaf,
  sheafFromBiomeStatus,
} = require('../scripts/bnatsheaf/sheaf');
const {
  computeBarcodes,
  longLivedH1,
  barcodesFromBiomeStatus,
} = require('../scripts/bnatsheaf/persistence');
const {
  consistencyCheck,
  imprintAgent,
  phMonitor,
  main,
} = require('../scripts/bnatsheaf/cli');

// ── unit: linear algebra primitives ─────────────────────────────────────────

test('matVec multiplies matrix by vector and throws on dimension mismatch', () => {
  assert.deepEqual(matVec([[1, 2], [3, 4]], [1, 1]), [3, 7]);
  assert.throws(() => matVec([[1, 2]], [1]), RangeError);
});

test('vecSub / normSq / identity behave as expected', () => {
  assert.deepEqual(vecSub([3, 4], [1, 1]), [2, 3]);
  assert.equal(normSq([3, 4]), 25);
  assert.deepEqual(identity(2), [[1, 0], [0, 1]]);
  assert.throws(() => vecSub([1], [1, 2]), RangeError);
});

// ── unit: cellular sheaf, Laplacian energy, H¹ obstructions ─────────────────

test('a consistent assignment is a global section with E(x)=0 and no H¹ obstruction', () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [1, 2], b: [1, 2] },
    edges: [{ u: 'a', v: 'b' }],
  });
  assert.equal(sheaf.laplacianEnergy(), 0);
  assert.equal(sheaf.isGlobalSection(), true);
  assert.deepEqual(sheaf.h1Obstructions(), []);
});

test('disagreement on an overlap produces positive energy and a transition patch', () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [1], b: [3] },
    edges: [{ u: 'a', v: 'b' }],
  });
  assert.equal(sheaf.laplacianEnergy(), 4);
  assert.equal(sheaf.isGlobalSection(), false);
  const obs = sheaf.h1Obstructions();
  assert.equal(obs.length, 1);
  assert.deepEqual(obs[0].edge, ['a', 'b']);
  assert.deepEqual(obs[0].transitionPatch, [-2]);
});

test('non-identity restriction maps are honored', () => {
  // R_a doubles a's stalk; a=[1], b=[2] then agree on the overlap.
  const sheaf = new CellularSheaf({
    stalks: { a: [1], b: [2] },
    edges: [{ u: 'a', v: 'b', ru: [[2]] }],
  });
  assert.equal(sheaf.laplacianEnergy(), 0);
});

test('constructing a sheaf with an edge to an unknown vertex fails loud', () => {
  assert.throws(
    () => new CellularSheaf({ stalks: { a: [1] }, edges: [{ u: 'a', v: 'ghost' }] }),
    RangeError
  );
});

// ── property: random global sections always have zero energy ────────────────

test('property: any constant assignment over identity restrictions has E(x)=0', () => {
  for (let trial = 0; trial < 25; trial++) {
    const dim = 1 + (trial % 3);
    const value = Array.from({ length: dim }, () => Math.random() * 10 - 5);
    const stalks = { a: value.slice(), b: value.slice(), c: value.slice() };
    const edges = [
      { u: 'a', v: 'b' },
      { u: 'b', v: 'c' },
      { u: 'a', v: 'c' },
    ];
    const sheaf = new CellularSheaf({ stalks, edges });
    assert.ok(sheaf.laplacianEnergy() < 1e-12, `trial ${trial} energy should be 0`);
  }
});

test('property: perturbing one stalk always raises energy above epsilon', () => {
  for (let trial = 0; trial < 25; trial++) {
    const value = [Math.random() * 10];
    const stalks = { a: value.slice(), b: [value[0] + 1 + Math.random()] };
    const sheaf = new CellularSheaf({ stalks, edges: [{ u: 'a', v: 'b' }] });
    assert.ok(sheaf.laplacianEnergy() >= 1, `trial ${trial} perturbation must be detected`);
  }
});

// ── unit: BIOME integration (additive, read-only) ───────────────────────────

const healthyStatus = {
  schema: 'biome-status/v1',
  workers: {
    sentinel: { status: 'healthy' },
    homeostat: { status: 'healthy' },
    medic: { status: 'healthy' },
  },
};
const degradedStatus = {
  schema: 'biome-status/v1',
  workers: {
    sentinel: { status: 'healthy' },
    homeostat: { status: 'down' },
    medic: { status: 'healthy' },
  },
};

test('sheafFromBiomeStatus: all-healthy feed glues into a global section', () => {
  const sheaf = sheafFromBiomeStatus(healthyStatus);
  assert.equal(sheaf.isGlobalSection(), true);
});

test('sheafFromBiomeStatus: a down worker is an H¹ obstruction, never glued over', () => {
  const sheaf = sheafFromBiomeStatus(degradedStatus);
  assert.equal(sheaf.isGlobalSection(), false);
  const obs = sheaf.h1Obstructions();
  assert.ok(obs.length >= 1);
  assert.ok(obs.every((o) => o.edge.includes('homeostat')));
});

// ── unit: persistent homology barcodes ──────────────────────────────────────

test('computeBarcodes: a tree has |V| H⁰ bars, one immortal, and no H¹ bars', () => {
  const { h0, h1 } = computeBarcodes(['a', 'b', 'c'], [
    { u: 'a', v: 'b', weight: 1 },
    { u: 'b', v: 'c', weight: 2 },
  ]);
  assert.equal(h0.length, 3);
  assert.equal(h0.filter((b) => b.death === null).length, 1);
  assert.deepEqual(h1, []);
});

test('topological regression: a cycle creates exactly one immortal H¹ bar', () => {
  const { h1 } = computeBarcodes(['a', 'b', 'c'], [
    { u: 'a', v: 'b', weight: 1 },
    { u: 'b', v: 'c', weight: 2 },
    { u: 'a', v: 'c', weight: 3 },
  ]);
  assert.equal(h1.length, 1);
  assert.equal(h1[0].birth, 3);
  assert.equal(h1[0].death, null);
});

test('elder rule: the older component survives merges', () => {
  const { h0 } = computeBarcodes(['a', 'b'], [{ u: 'a', v: 'b', weight: 5 }]);
  const dead = h0.filter((b) => b.death !== null);
  assert.equal(dead.length, 1);
  assert.equal(dead[0].death, 5);
});

test('longLivedH1 filters bars by lifetime against maxWeight', () => {
  const barcodes = { h1: [{ birth: 1, death: null }, { birth: 9, death: null }] };
  assert.equal(longLivedH1(barcodes, 10, 5).length, 1);
  assert.equal(longLivedH1(barcodes, 10, 0).length, 2);
});

test('barcodesFromBiomeStatus: complete agreement yields no positive-weight H¹ births beyond zero', () => {
  const { h1 } = barcodesFromBiomeStatus(healthyStatus);
  // 3 workers, complete graph K3 → 3 edges, spanning tree uses 2 → one cycle,
  // but born at weight 0 (perfect agreement).
  assert.equal(h1.length, 1);
  assert.equal(h1[0].birth, 0);
});

test('barcodesFromBiomeStatus: disagreement bars are born at positive weight', () => {
  const { h1 } = barcodesFromBiomeStatus(degradedStatus);
  assert.ok(h1.some((b) => b.birth > 0), 'obstruction must appear as a late-born H¹ bar');
});

// ── integration: harness cores + CLI exit codes ─────────────────────────────

test('consistencyCheck reports consistent=true only when E(x) < epsilon', () => {
  assert.equal(consistencyCheck(healthyStatus).consistent, true);
  const r = consistencyCheck(degradedStatus);
  assert.equal(r.consistent, false);
  assert.ok(r.energy > 0);
  assert.ok(r.obstructions.length > 0);
});

test('imprintAgent: imprint succeeds only from a consistent sheaf and known agent', () => {
  const ok = imprintAgent(healthyStatus, 'sentinel');
  assert.equal(ok.imprinted, true);
  assert.deepEqual(ok.restriction, [0]);

  const blocked = imprintAgent(degradedStatus, 'sentinel');
  assert.equal(blocked.imprinted, false, 'H¹ ≉ 0 must block spawn');

  const unknown = imprintAgent(healthyStatus, 'ghost');
  assert.equal(unknown.imprinted, false);
  assert.equal(unknown.known, false);
});

test('phMonitor surfaces persistent H¹ bars for a degraded feed', () => {
  const clean = phMonitor(healthyStatus, 0.5);
  assert.equal(clean.persistentH1.filter((b) => b.birth > 0).length, 0);
  const dirty = phMonitor(degradedStatus, 0.5);
  assert.ok(dirty.persistentH1.length >= 1);
});

test('CLI main: exit codes reflect the postcondition, not process completion', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bnatsheaf-'));
  const good = path.join(dir, 'good.json');
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(good, JSON.stringify(healthyStatus));
  fs.writeFileSync(bad, JSON.stringify(degradedStatus));

  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    assert.equal(main(['consistency_check', '--status', good]), 0);
    assert.equal(main(['consistency_check', '--status', bad]), 1);
    assert.equal(main(['imprint_agent', '--agent', 'sentinel', '--status', good]), 0);
    assert.equal(main(['imprint_agent', '--agent', 'sentinel', '--status', bad]), 1);
    assert.equal(main(['imprint_agent', '--status', good]), 2, 'missing --agent is usage error');
    assert.equal(main(['ph_monitor', '--status', good, '--min-lifetime', '0.5']), 0);
    assert.equal(main(['ph_monitor', '--status', bad, '--min-lifetime', '0.5']), 1);
    assert.equal(main(['consistency_check', '--status', path.join(dir, 'missing.json')]), 2);
    assert.equal(main(['nonsense', '--status', good]), 2);
  } finally {
    console.log = origLog;
    console.error = origErr;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('additive guarantee: BIOME sheaf exports are untouched and still glue', () => {
  const biome = require('../scripts/biome/sheaf');
  const status = biome.glueSections(
    [{ worker: 'sentinel', status: 'healthy' }],
    '2026-08-03T00:00:00Z'
  );
  assert.equal(status.schema, 'biome-status/v1');
  // and the mathematical layer consumes the same feed shape
  assert.equal(consistencyCheck(status).consistent, true);
});

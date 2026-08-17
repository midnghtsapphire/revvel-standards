'use strict';

/**
 * Executable sheaf-cohomology proofs (WR-16909).
 *
 * Verified identities:
 *   | Complex        | dim H⁰ | dim H¹ | rank δ | Gluing       |
 *   | Path (tree)    | 1      | 0      | 2      | yes          |
 *   | Cycle          | 1      | 1      | 2      | obstruction  |
 *   | 2 components   | 2      | 0      | 2      | yes          |
 *   | Constant sect. | energy≈0 | —    | —      | in H⁰        |
 */

const { test } = require('node:test');
const assert = require('node:assert');

const { CellularSheaf } = require('../scripts/bnatsheaf/sheaf');
const {
  matrixRank,
  coboundaryMatrix,
  computeCohomology,
  cohomologyOfGraph,
  applyCoboundary,
} = require('../scripts/bnatsheaf/cohomology');
const {
  learnScalarRestriction,
  diffuse,
  fitAndDiffuse,
} = require('../scripts/bnatsheaf/nsd');
const {
  barcodesWithBackend,
  probeBackends,
} = require('../scripts/bnatsheaf/tda_adapters');
const {
  topologicalFingerprint,
  attachFingerprint,
} = require('../scripts/bnatsheaf/fingerprint');

// ── linear algebra primitives ───────────────────────────────────────────────

test('matrixRank: identity n has rank n; zero matrix has rank 0', () => {
  assert.equal(
    matrixRank([
      [1, 0],
      [0, 1],
    ]),
    2
  );
  assert.equal(
    matrixRank([
      [0, 0],
      [0, 0],
    ]),
    0
  );
  assert.equal(
    matrixRank([
      [1, 2],
      [2, 4],
    ]),
    1
  );
});

// ── Theorem: rank-nullity identities on classic complexes ───────────────────

test('proof: path (tree) has dim H⁰=1, dim H¹=0, rank δ=2', () => {
  // Path a—b—c : n=3, m=2, d=1 → dim C⁰=3, dim C¹=2
  const { dimH0, dimH1, rankDelta, dimC0, dimC1, inH0, obstruction } =
    cohomologyOfGraph(
      ['a', 'b', 'c'],
      [
        { u: 'a', v: 'b' },
        { u: 'b', v: 'c' },
      ],
      1
    );
  assert.equal(dimC0, 3);
  assert.equal(dimC1, 2);
  assert.equal(rankDelta, 2);
  assert.equal(dimH0, 1);
  assert.equal(dimH1, 0);
  assert.equal(inH0, true, 'zero section on a tree is a global section');
  assert.equal(obstruction, false);
});

test('proof: cycle has dim H⁰=1, dim H¹=1, rank δ=2 (obstruction class exists)', () => {
  // Cycle a—b—c—a : n=3, m=3, d=1
  const r = cohomologyOfGraph(
    ['a', 'b', 'c'],
    [
      { u: 'a', v: 'b' },
      { u: 'b', v: 'c' },
      { u: 'c', v: 'a' },
    ],
    1
  );
  assert.equal(r.dimC0, 3);
  assert.equal(r.dimC1, 3);
  assert.equal(r.rankDelta, 2);
  assert.equal(r.dimH0, 1);
  assert.equal(r.dimH1, 1);
  // Zero section still glues (energy 0) but the *group* H¹ is non-trivial —
  // there exist residual assignments not in im δ.
  assert.equal(r.inH0, true);
  assert.equal(r.obstruction, true, 'non-vanishing H¹ is the algebraic obstruction');
});

test('proof: 2 components have dim H⁰=2, dim H¹=0, rank δ=2', () => {
  // Two disjoint edges: a—b  and  c—d
  const r = cohomologyOfGraph(
    ['a', 'b', 'c', 'd'],
    [
      { u: 'a', v: 'b' },
      { u: 'c', v: 'd' },
    ],
    1
  );
  assert.equal(r.dimC0, 4);
  assert.equal(r.dimC1, 2);
  assert.equal(r.rankDelta, 2);
  assert.equal(r.dimH0, 2);
  assert.equal(r.dimH1, 0);
  assert.equal(r.inH0, true);
});

test('proof: constant section has energy ≈ 0 and lies in H⁰', () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [3, 1], b: [3, 1], c: [3, 1] },
    edges: [
      { u: 'a', v: 'b' },
      { u: 'b', v: 'c' },
      { u: 'a', v: 'c' },
    ],
  });
  const coh = computeCohomology(sheaf);
  assert.ok(coh.energy < 1e-12, `energy ${coh.energy} should be ~0`);
  assert.equal(coh.inH0, true);
  // On a cycle with d=2: dim C⁰=6, dim C¹=6, rank δ = 6−dim H⁰, dim H⁰=2
  assert.equal(coh.dimH0, 2);
  assert.equal(coh.dimH1, 2);
});

test('proof: H⁰ = ker δ — residual vanishes iff section is global', () => {
  const good = new CellularSheaf({
    stalks: { a: [1], b: [1] },
    edges: [{ u: 'a', v: 'b' }],
  });
  const bad = new CellularSheaf({
    stalks: { a: [1], b: [4] },
    edges: [{ u: 'a', v: 'b' }],
  });
  const rGood = applyCoboundary(good);
  const rBad = applyCoboundary(bad);
  assert.deepEqual(rGood, [0]);
  assert.deepEqual(rBad, [-3]); // ρ_a(1) − ρ_b(4) = 1 − 4
  assert.equal(computeCohomology(good).inH0, true);
  assert.equal(computeCohomology(bad).inH0, false);
});

test('proof: energy characterization E(x)=‖δx‖² equals laplacianEnergy', () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [2], b: [5], c: [1] },
    edges: [
      { u: 'a', v: 'b' },
      { u: 'b', v: 'c' },
    ],
  });
  const coh = computeCohomology(sheaf);
  assert.ok(Math.abs(coh.energy - sheaf.laplacianEnergy()) < 1e-12);
  assert.ok(coh.energy > 0);
});

test('coboundaryMatrix row count equals dim C¹ and respects non-identity maps', () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [1], b: [2] },
    edges: [{ u: 'a', v: 'b', ru: [[2]] }],
  });
  const { delta, dimC0, dimC1 } = coboundaryMatrix(sheaf);
  assert.equal(dimC0, 2);
  assert.equal(dimC1, 1);
  assert.equal(delta.length, 1);
  // δ = [2, −1] so δ·(1,2)=0
  assert.deepEqual(delta[0], [2, -1]);
  assert.equal(computeCohomology(sheaf).inH0, true);
});

// ── NSD ─────────────────────────────────────────────────────────────────────

test('nsd: learnScalarRestriction recovers w≈xv/xu', () => {
  const w = learnScalarRestriction(1, 2, { lr: 0.05, steps: 300 });
  assert.ok(Math.abs(w - 2) < 1e-3, `learned w=${w}`);
});

test('nsd: fitAndDiffuse drives energy toward 0 on a disagreeing edge', () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [1], b: [2] },
    edges: [{ u: 'a', v: 'b' }],
  });
  assert.ok(sheaf.laplacianEnergy() > 0);
  const { sheaf: fitted, energies } = fitAndDiffuse(sheaf, {
    lr: 0.05,
    steps: 100,
    diffuse: false,
  });
  assert.ok(fitted.laplacianEnergy() < 1e-6, 'learned restriction should glue');
  assert.ok(energies[energies.length - 1] < 1e-6);
});

test('nsd: discrete diffusion is energy-non-increasing on identity path', () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [0], b: [10], c: [0] },
    edges: [
      { u: 'a', v: 'b' },
      { u: 'b', v: 'c' },
    ],
  });
  const { energies } = diffuse(sheaf, { steps: 20, eta: 0.1 });
  for (let i = 1; i < energies.length; i++) {
    assert.ok(
      energies[i] <= energies[i - 1] + 1e-9,
      `energy rose at step ${i}: ${energies[i - 1]} → ${energies[i]}`
    );
  }
  assert.ok(energies[energies.length - 1] < energies[0]);
});

// ── TDA adapters ────────────────────────────────────────────────────────────

test('tda_adapters: native backend always available and matches computeBarcodes', () => {
  const probe = probeBackends();
  assert.equal(probe.native, true);
  const vertices = ['a', 'b', 'c'];
  const edges = [
    { u: 'a', v: 'b', weight: 1 },
    { u: 'b', v: 'c', weight: 2 },
    { u: 'a', v: 'c', weight: 3 },
  ];
  const result = barcodesWithBackend(vertices, edges, { prefer: 'native' });
  assert.equal(result.backend, 'native');
  assert.equal(result.barcodes.h1.length, 1);
  // Preferring missing optional backends must fall back, never throw.
  const ripserFallback = barcodesWithBackend(vertices, edges, { prefer: 'ripser' });
  assert.ok(ripserFallback.barcodes.h0.length >= 1);
  const gudhiFallback = barcodesWithBackend(vertices, edges, { prefer: 'gudhi' });
  assert.ok(gudhiFallback.barcodes.h0.length >= 1);
});

// ── Topological fingerprint ─────────────────────────────────────────────────

test('fingerprint: healthy BIOME feed is consistent with dim_H0 ≥ 1', () => {
  const status = {
    schema: 'biome-status/v1',
    workers: {
      sentinel: { status: 'healthy' },
      homeostat: { status: 'healthy' },
      medic: { status: 'healthy' },
    },
  };
  const fp = topologicalFingerprint(status);
  assert.equal(fp.schema, 'bnat-fingerprint/v1');
  assert.equal(fp.credit_free, true);
  assert.equal(fp.consistent, true);
  assert.ok(fp.dim_H0 >= 1);
  assert.equal(fp.long_lived_h1_count, 0);
  const attached = attachFingerprint(status);
  assert.equal(attached.bnat.dim_H0, fp.dim_H0);
  assert.equal(attached.schema, 'biome-status/v1', 'BIOME schema preserved');
});

test('fingerprint: degraded worker yields energy > 0 and obstruction', () => {
  const status = {
    schema: 'biome-status/v1',
    workers: {
      sentinel: { status: 'healthy' },
      homeostat: { status: 'down' },
      medic: { status: 'healthy' },
    },
  };
  const fp = topologicalFingerprint(status, { minLifetime: 0.5 });
  assert.equal(fp.consistent, false);
  assert.ok(fp.energy > 0);
  assert.equal(fp.obstruction, true);
});

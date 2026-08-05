#!/usr/bin/env node
'use strict';

/**
 * BNAT Knowledge Sheaf — mathematical layer on top of the BIOME sheaf metaphor.
 *
 * BIOME (`scripts/biome/sheaf.js`) glues local worker status sections into a
 * global fleet-health object — a metaphorical sheaf. This module makes that
 * geometry rigorous with a *cellular sheaf* over a graph:
 *
 *   - vertices  = agents / knowledge sections (each carries a stalk, a real vector)
 *   - edges     = overlaps (shared context between two sections)
 *   - restriction maps = linear maps stalk(vertex) → stalk(edge)
 *
 * A global section exists iff for every edge (u,v):
 *     R_{u→e} · x_u  ==  R_{v→e} · x_v
 * Disagreement is measured by the sheaf Laplacian quadratic form
 *     E(x) = Σ_e || R_{u→e} x_u − R_{v→e} x_v ||²
 * E(x) = 0  ⇔  x is a global section (H⁰). Non-zero residuals localize the
 * obstruction — the computational shadow of H¹. `h1Obstructions` reports the
 * offending edges plus a *transition patch* (the correction that would glue).
 *
 * Design constraints (per WR-16893):
 *   - Strictly additive: never mutates BIOME code or its status feed.
 *   - Dependency-free (pure Node stdlib) so `npm test` covers it everywhere.
 *   - The WR sketch said "pure-Python"; this repo's runtime, CI, and the
 *     existing BIOME sheaf are Node, so the implementation is pure JS to keep
 *     the invariant enforced by the same `npm test` gate. Documented in
 *     standards/BNAT_SHEAF_STANDARD.md.
 *
 * Failure modes / what to check if it breaks:
 *   - Dimension mismatches between a stalk vector and its restriction map
 *     throw immediately (fail loud, never glue silently).
 *   - If E(x) exceeds epsilon, callers must escalate — see cli.js.
 */

/** Multiply matrix (array of rows) by vector. Throws on dimension mismatch. */
function matVec(matrix, vector) {
  if (!Array.isArray(matrix) || !Array.isArray(vector)) {
    throw new TypeError('matVec requires a matrix (array of rows) and a vector');
  }
  return matrix.map((row, i) => {
    if (!Array.isArray(row) || row.length !== vector.length) {
      throw new RangeError(`matVec: row ${i} has length ${row && row.length}, vector has length ${vector.length}`);
    }
    return row.reduce((acc, v, j) => acc + v * vector[j], 0);
  });
}

/** Element-wise difference of two equal-length vectors. */
function vecSub(a, b) {
  if (a.length !== b.length) {
    throw new RangeError(`vecSub: length mismatch ${a.length} vs ${b.length}`);
  }
  return a.map((v, i) => v - b[i]);
}

/** Squared Euclidean norm. */
function normSq(v) {
  return v.reduce((acc, x) => acc + x * x, 0);
}

/** Identity matrix of size n — the default restriction map. */
function identity(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

/**
 * A cellular sheaf on a graph.
 *
 * @param {Object} spec
 * @param {Object<string, number[]>} spec.stalks  vertex name → stalk vector x_v
 * @param {Array<{u: string, v: string, ru?: number[][], rv?: number[][]}>} spec.edges
 *        Each edge carries restriction maps ru (for u) and rv (for v);
 *        both default to the identity on the respective stalk.
 */
class CellularSheaf {
  constructor({ stalks, edges }) {
    if (!stalks || typeof stalks !== 'object') throw new TypeError('stalks required');
    this.stalks = stalks;
    this.edges = (edges || []).map((e) => {
      if (!(e.u in stalks) || !(e.v in stalks)) {
        throw new RangeError(`edge (${e.u}, ${e.v}) references unknown vertex`);
      }
      return {
        u: e.u,
        v: e.v,
        ru: e.ru || identity(stalks[e.u].length),
        rv: e.rv || identity(stalks[e.v].length),
      };
    });
  }

  /** Per-edge residuals: r_e = R_u x_u − R_v x_v (the coboundary δx on e). */
  edgeResiduals() {
    return this.edges.map((e) => {
      const pu = matVec(e.ru, this.stalks[e.u]);
      const pv = matVec(e.rv, this.stalks[e.v]);
      return { u: e.u, v: e.v, residual: vecSub(pu, pv) };
    });
  }

  /** Sheaf Laplacian energy E(x) = x^T L x = Σ_e ||δx|_e||². */
  laplacianEnergy() {
    return this.edgeResiduals().reduce((acc, r) => acc + normSq(r.residual), 0);
  }

  /** True iff the assignment is a global section up to epsilon (H¹ ≈ 0 locally). */
  isGlobalSection(epsilon = 1e-9) {
    return this.laplacianEnergy() < epsilon;
  }

  /**
   * H¹ obstruction report: edges whose residual exceeds epsilon, with the
   * transition patch (the vector that must be added on v's side to glue).
   * Empty array ⇔ a global section exists at this tolerance (H¹ ≈ 0).
   */
  h1Obstructions(epsilon = 1e-9) {
    return this.edgeResiduals()
      .filter((r) => normSq(r.residual) >= epsilon)
      .map((r) => ({
        edge: [r.u, r.v],
        residual: r.residual,
        energy: normSq(r.residual),
        transitionPatch: r.residual.slice(),
      }));
  }
}

/**
 * Build a cellular sheaf from a BIOME status feed (docs/biome/biome-status.json).
 * Each worker becomes a vertex; the stalk encodes its severity as a 1-vector.
 * Every pair of workers shares an edge with identity restrictions, so any
 * severity disagreement surfaces as positive Laplacian energy — the exact
 * "liveness is not correctness" obstruction wr/pending/14 asks us to report.
 * Read-only over the feed; strictly additive to BIOME.
 */
function sheafFromBiomeStatus(status, severityMap = { healthy: 0, degraded: 1, down: 2 }) {
  const workers = Object.entries((status && status.workers) || {});
  const stalks = {};
  for (const [name, w] of workers) {
    const sev = severityMap[w.status];
    stalks[name] = [sev === undefined ? 1 : sev];
  }
  const names = Object.keys(stalks);
  const edges = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      edges.push({ u: names[i], v: names[j] });
    }
  }
  return new CellularSheaf({ stalks, edges });
}

module.exports = {
  matVec,
  vecSub,
  normSq,
  identity,
  CellularSheaf,
  sheafFromBiomeStatus,
};

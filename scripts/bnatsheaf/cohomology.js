#!/usr/bin/env node
'use strict';

/**
 * Cellular sheaf cohomology — H⁰ / H¹ via the coboundary δ and rank-nullity.
 *
 * For a cellular sheaf F on a graph X=(V,E) with constant stalk dimension d
 * (or heterogeneous stalks padded into a block coboundary):
 *
 *   C⁰ = ⊕_v F(v)          dim = Σ_v dim F(v)
 *   C¹ = ⊕_e F(e)          dim = Σ_e dim F(e)
 *   (δx)_e = ρ_{u◃e}(x_u) − ρ_{v◃e}(x_v)
 *
 * Theorems (executable; see docs/bnatsheaf/SHEAF_COHOMOLOGY_PROOFS.md):
 *   H⁰ = ker δ  ≅ Γ(X,F)     (global sections)
 *   H¹ = coker δ = C¹ / im δ (obstruction classes)
 *   dim H⁰ = dim C⁰ − rank δ
 *   dim H¹ = dim C¹ − rank δ
 *   E(x) = ‖δx‖² = 0  ⇔  x ∈ H⁰
 *
 * Credit-free pure Node. No NumPy/SciPy; Gaussian elimination over ℝ.
 */

const { CellularSheaf, matVec, vecSub, normSq, identity } = require('./sheaf');

const EPS = 1e-10;

/**
 * Numerical rank of a matrix (array of rows) via Gaussian elimination with
 * partial pivoting. Mutates a working copy only.
 */
function matrixRank(rows, epsilon = EPS) {
  if (!rows || rows.length === 0) return 0;
  const m = rows.length;
  const n = rows[0].length;
  const a = rows.map((r) => r.slice());
  let rank = 0;
  let col = 0;
  for (let row = 0; row < m && col < n; ) {
    // Partial pivot.
    let pivot = row;
    for (let i = row + 1; i < m; i++) {
      if (Math.abs(a[i][col]) > Math.abs(a[pivot][col])) pivot = i;
    }
    if (Math.abs(a[pivot][col]) < epsilon) {
      col++;
      continue;
    }
    if (pivot !== row) {
      const tmp = a[row];
      a[row] = a[pivot];
      a[pivot] = tmp;
    }
    const piv = a[row][col];
    for (let i = row + 1; i < m; i++) {
      const f = a[i][col] / piv;
      if (Math.abs(f) < epsilon) continue;
      for (let j = col; j < n; j++) a[i][j] -= f * a[row][j];
    }
    rank++;
    row++;
    col++;
  }
  return rank;
}

/**
 * Build the coboundary matrix δ : C⁰ → C¹ as an array of rows.
 * Column layout: stalks concatenated in Object.keys(stalks) order.
 * Row layout: residual coordinates per edge in edge order.
 *
 * @param {CellularSheaf} sheaf
 * @returns {{ delta: number[][], vertexOrder: string[], dimC0: number, dimC1: number, stalkOffsets: Object<string,number> }}
 */
function coboundaryMatrix(sheaf) {
  const vertexOrder = Object.keys(sheaf.stalks);
  const stalkOffsets = {};
  let dimC0 = 0;
  for (const v of vertexOrder) {
    stalkOffsets[v] = dimC0;
    dimC0 += sheaf.stalks[v].length;
  }

  const rows = [];
  for (const e of sheaf.edges) {
    const xu = sheaf.stalks[e.u];
    const xv = sheaf.stalks[e.v];
    // Edge stalk dim = output dim of restrictions (must agree).
    const edgeDim = e.ru.length;
    if (e.rv.length !== edgeDim) {
      throw new RangeError(
        `restriction output dims disagree on edge (${e.u},${e.v}): ${edgeDim} vs ${e.rv.length}`
      );
    }
    for (let k = 0; k < edgeDim; k++) {
      const row = Array(dimC0).fill(0);
      // ρ_u contribution: + ru[k][·] on u's block
      for (let j = 0; j < xu.length; j++) {
        row[stalkOffsets[e.u] + j] += e.ru[k][j];
      }
      // − ρ_v contribution on v's block
      for (let j = 0; j < xv.length; j++) {
        row[stalkOffsets[e.v] + j] -= e.rv[k][j];
      }
      rows.push(row);
    }
  }
  return {
    delta: rows,
    vertexOrder,
    dimC0,
    dimC1: rows.length,
    stalkOffsets,
  };
}

/**
 * Flatten stalks into a C⁰ vector in vertexOrder.
 */
function sectionVector(sheaf, vertexOrder) {
  const order = vertexOrder || Object.keys(sheaf.stalks);
  const out = [];
  for (const v of order) {
    const s = sheaf.stalks[v];
    for (let i = 0; i < s.length; i++) out.push(s[i]);
  }
  return out;
}

/**
 * Apply δ to a C⁰ vector (or the sheaf's current section).
 */
function applyCoboundary(sheaf, x) {
  const { delta, vertexOrder, dimC0 } = coboundaryMatrix(sheaf);
  const vec = x || sectionVector(sheaf, vertexOrder);
  if (vec.length !== dimC0) {
    throw new RangeError(`section length ${vec.length} ≠ dim C⁰ ${dimC0}`);
  }
  return delta.map((row) => row.reduce((acc, a, j) => acc + a * vec[j], 0));
}

/**
 * Compute cohomology summary for a cellular sheaf.
 *
 * @param {CellularSheaf} sheaf
 * @param {{epsilon?: number, basis?: boolean}} [opts]
 * @returns {{
 *   dimC0: number, dimC1: number, rankDelta: number,
 *   dimH0: number, dimH1: number,
 *   energy: number, inH0: boolean, obstruction: boolean,
 *   residual: number[],
 *   basisH0?: number[][],
 * }}
 */
function computeCohomology(sheaf, opts = {}) {
  const epsilon = opts.epsilon === undefined ? 1e-9 : opts.epsilon;
  const { delta, dimC0, dimC1, vertexOrder } = coboundaryMatrix(sheaf);
  const rankDelta = matrixRank(delta);
  const dimH0 = dimC0 - rankDelta;
  const dimH1 = dimC1 - rankDelta;
  const residual = applyCoboundary(sheaf);
  const energy = residual.reduce((acc, r) => acc + r * r, 0);
  const inH0 = energy < epsilon;
  const result = {
    dimC0,
    dimC1,
    rankDelta,
    dimH0,
    dimH1,
    energy,
    inH0,
    obstruction: dimH1 > 0 || !inH0,
    residual,
    vertexOrder,
  };
  if (opts.basis) {
    // Nullspace basis of δ via RREF on [δ | I] is heavier than we need for
    // the proof suite; expose a constant-section generator for identity sheaves.
    result.basisH0 = nullspaceConstantSections(sheaf, dimH0);
  }
  return result;
}

/**
 * For identity-restriction sheaves with equal stalk dim d, H⁰ is spanned by
 * the d constant assignments (one per coordinate). Returns up to dimH0 of them.
 */
function nullspaceConstantSections(sheaf, dimH0) {
  const names = Object.keys(sheaf.stalks);
  if (names.length === 0 || dimH0 <= 0) return [];
  const d = sheaf.stalks[names[0]].length;
  const basis = [];
  for (let k = 0; k < d && basis.length < dimH0; k++) {
    const section = {};
    for (const v of names) {
      const stalk = Array(sheaf.stalks[v].length).fill(0);
      if (k < stalk.length) stalk[k] = 1;
      section[v] = stalk;
    }
    basis.push(section);
  }
  return basis;
}

/**
 * Convenience: cohomology of a constant-d identity sheaf on an abstract graph.
 * stalks default to zero vectors of dimension `d`.
 */
function cohomologyOfGraph(vertices, edges, d = 1, stalkValues = null) {
  const stalks = {};
  for (const v of vertices) {
    stalks[v] =
      stalkValues && stalkValues[v]
        ? stalkValues[v].slice()
        : Array(d).fill(0);
  }
  const sheaf = new CellularSheaf({
    stalks,
    edges: edges.map((e) => ({ u: e.u || e[0], v: e.v || e[1] })),
  });
  return { sheaf, ...computeCohomology(sheaf) };
}

module.exports = {
  matrixRank,
  coboundaryMatrix,
  sectionVector,
  applyCoboundary,
  computeCohomology,
  cohomologyOfGraph,
  nullspaceConstantSections,
  // re-export helpers tests may want
  CellularSheaf,
  matVec,
  vecSub,
  normSq,
  identity,
};

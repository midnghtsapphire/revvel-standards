#!/usr/bin/env node
'use strict';

/**
 * Discrete Neural Sheaf Diffusion (NSD) — credit-free offline layer.
 *
 * Production BNAT keeps restriction maps deterministic (usually identity) so
 * imprint-at-spawn and the VEINS grounding gate stay auditable. NSD is the
 * *offline* path that learns diagonal restriction weights from stalk pairs,
 * then freezes them into a CellularSheaf for deterministic diffusion.
 *
 * References:
 *   Bodnar et al., Neural Sheaf Diffusion, NeurIPS 2022 (arXiv:2202.04579)
 *   Hansen & Ghrist, Toward a Spectral Theory of Cellular Sheaves (arXiv:1808.01513)
 *
 * No autodiff framework — pure gradient steps on diagonal maps. Optional; the
 * core consistency path never requires this module.
 */

const { CellularSheaf, matVec, vecSub, normSq, identity } = require('./sheaf');

/**
 * Learn a scalar restriction weight w such that w·x_u ≈ x_v.
 * Energy E(w) = (w·xu − xv)², dE/dw = 2(w·xu − xv)·xu.
 */
function learnScalarRestriction(xu, xv, { lr = 0.05, steps = 200 } = {}) {
  let w = 1;
  for (let i = 0; i < steps; i++) {
    const grad = 2 * (w * xu - xv) * xu;
    w -= lr * grad;
  }
  return w;
}

/**
 * Learn a diagonal restriction map R = diag(w) of size d so R x_u ≈ x_v.
 * Independent 1-d problems per coordinate.
 */
function learnDiagonalRestriction(xu, xv, opts = {}) {
  if (!Array.isArray(xu) || !Array.isArray(xv) || xu.length !== xv.length) {
    throw new RangeError('learnDiagonalRestriction requires equal-length vectors');
  }
  const weights = xu.map((a, i) => learnScalarRestriction(a, xv[i], opts));
  return weights.map((w, i) => {
    const row = Array(xu.length).fill(0);
    row[i] = w;
    return row;
  });
}

/**
 * One discrete sheaf-diffusion step: x ← x − η · δ* δ x
 * For identity restrictions this is ordinary graph Laplacian smoothing on
 * each stalk coordinate. For diagonal learned maps it is sheaf diffusion.
 *
 * Returns a new stalks object (does not mutate input).
 */
function diffuseStep(sheaf, eta = 0.1) {
  const residuals = sheaf.edgeResiduals(); // r_e = Ru xu − Rv xv
  // Accumulate δ* r on each vertex stalk (adjoint of coboundary).
  const grad = {};
  for (const v of Object.keys(sheaf.stalks)) {
    grad[v] = Array(sheaf.stalks[v].length).fill(0);
  }
  sheaf.edges.forEach((e, idx) => {
    const r = residuals[idx].residual;
    // ⟨δx, r⟩ = Σ_e ⟨Ru xu − Rv xv, r_e⟩
    // ⇒ (δ* r)_u += Ru^T r,  (δ* r)_v −= Rv^T r
    const RuT_r = matVecTranspose(e.ru, r);
    const RvT_r = matVecTranspose(e.rv, r);
    for (let i = 0; i < RuT_r.length; i++) grad[e.u][i] += RuT_r[i];
    for (let i = 0; i < RvT_r.length; i++) grad[e.v][i] -= RvT_r[i];
  });

  const next = {};
  for (const v of Object.keys(sheaf.stalks)) {
    next[v] = sheaf.stalks[v].map((x, i) => x - eta * grad[v][i]);
  }
  return new CellularSheaf({
    stalks: next,
    edges: sheaf.edges.map((e) => ({ u: e.u, v: e.v, ru: e.ru, rv: e.rv })),
  });
}

/** Multiply matrix^T by vector. */
function matVecTranspose(matrix, vector) {
  if (!matrix.length) return [];
  const cols = matrix[0].length;
  const out = Array(cols).fill(0);
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < cols; j++) out[j] += matrix[i][j] * vector[i];
  }
  return out;
}

/**
 * Run T steps of sheaf diffusion. Returns { sheaf, energies[] }.
 * Energies are monotonically non-increasing for small enough η on undirected
 * identity sheaves (discrete heat flow to H⁰).
 */
function diffuse(sheaf, { steps = 25, eta = 0.1 } = {}) {
  let current = sheaf;
  const energies = [current.laplacianEnergy()];
  for (let t = 0; t < steps; t++) {
    current = diffuseStep(current, eta);
    energies.push(current.laplacianEnergy());
  }
  return { sheaf: current, energies };
}

/**
 * Fit diagonal restrictions on every edge from the current stalk assignment,
 * freeze them into a new sheaf, and optionally diffuse to the learned H⁰.
 */
function fitAndDiffuse(sheaf, opts = {}) {
  const edges = sheaf.edges.map((e) => {
    const xu = sheaf.stalks[e.u];
    const xv = sheaf.stalks[e.v];
    // Only fit when dims match (edge stalk = vertex stalk for diagonal case).
    if (xu.length !== xv.length) {
      return { u: e.u, v: e.v, ru: e.ru, rv: e.rv };
    }
    const ru = learnDiagonalRestriction(xu, xv, opts);
    return { u: e.u, v: e.v, ru, rv: identity(xv.length) };
  });
  const fitted = new CellularSheaf({ stalks: sheaf.stalks, edges });
  if (opts.diffuse === false) {
    return { sheaf: fitted, energies: [fitted.laplacianEnergy()] };
  }
  return diffuse(fitted, opts);
}

module.exports = {
  learnScalarRestriction,
  learnDiagonalRestriction,
  diffuseStep,
  diffuse,
  fitAndDiffuse,
  matVecTranspose,
  CellularSheaf,
  matVec,
  vecSub,
  normSq,
  identity,
};

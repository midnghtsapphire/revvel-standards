#!/usr/bin/env node
'use strict';

/**
 * Neural Sheaf Diffusion (NSD) — minimal learnable-restriction stub.
 *
 * Research / optional path (WR-MOTU-BNAT-SHEAF PR6). Not required on the
 * credit-free BIOME runtime. Pure Node; no torch.
 *
 * Discrete diffusion step under a sheaf Laplacian:
 *   x ← x − η Δ_ℱ x
 * For a single edge with diagonal (scalar) restriction w on u:
 *   E(w) = (w·x_u − x_v)²
 *   dE/dw = 2(w·x_u − x_v)·x_u
 *
 * Learned maps freeze into CellularSheaf restriction matrices for runtime.
 * See docs/bnatsheaf/NSD_EXPLORATION.md (Bodnar et al., NeurIPS 2022).
 */

const { CellularSheaf } = require('./sheaf');

/**
 * Learn a scalar restriction w such that w·xu ≈ xv by gradient descent.
 * Returns the learned weight (≈ xv/xu when xu ≠ 0).
 */
function learnScalarRestriction(xu, xv, { lr = 0.05, steps = 200 } = {}) {
  if (typeof xu !== 'number' || typeof xv !== 'number') {
    throw new TypeError('learnScalarRestriction expects numeric stalks');
  }
  let w = 1;
  for (let i = 0; i < steps; i++) {
    const residual = w * xu - xv;
    const grad = 2 * residual * xu;
    w -= lr * grad;
  }
  return w;
}

/**
 * One explicit-Euler diffusion step on a CellularSheaf's stalk assignment.
 * For identity restrictions this is ordinary graph Laplacian smoothing:
 * each vertex moves toward the mean of its neighbors.
 *
 * Mutates a copy of stalks; returns { stalks, energyBefore, energyAfter }.
 */
function diffuseStep(sheaf, eta = 0.25) {
  if (!(sheaf instanceof CellularSheaf) && !(sheaf && sheaf.stalks && sheaf.edges)) {
    throw new TypeError('diffuseStep requires a CellularSheaf');
  }
  const energyBefore = sheaf.laplacianEnergy();
  // Accumulate Δx per vertex from edge residuals.
  const delta = {};
  for (const name of Object.keys(sheaf.stalks)) {
    delta[name] = sheaf.stalks[name].map(() => 0);
  }
  for (const e of sheaf.edges) {
    const xu = sheaf.stalks[e.u];
    const xv = sheaf.stalks[e.v];
    // For identity (or general) maps: residual r = Ru xu − Rv xv
    // Contribution to gradient of ½||r||² w.r.t. xu is Ruᵀ r; w.r.t. xv is −Rvᵀ r.
    const ruXu = e.ru.map((row) => row.reduce((a, v, j) => a + v * xu[j], 0));
    const rvXv = e.rv.map((row) => row.reduce((a, v, j) => a + v * xv[j], 0));
    const r = ruXu.map((v, i) => v - rvXv[i]);
    // Ruᵀ r
    for (let j = 0; j < xu.length; j++) {
      let s = 0;
      for (let i = 0; i < r.length; i++) s += e.ru[i][j] * r[i];
      delta[e.u][j] += s;
    }
    // −Rvᵀ r
    for (let j = 0; j < xv.length; j++) {
      let s = 0;
      for (let i = 0; i < r.length; i++) s += e.rv[i][j] * r[i];
      delta[e.v][j] -= s;
    }
  }
  const nextStalks = {};
  for (const name of Object.keys(sheaf.stalks)) {
    nextStalks[name] = sheaf.stalks[name].map((v, i) => v - eta * delta[name][i]);
  }
  const next = new CellularSheaf({
    stalks: nextStalks,
    edges: sheaf.edges.map((e) => ({ u: e.u, v: e.v, ru: e.ru, rv: e.rv })),
  });
  return {
    stalks: nextStalks,
    sheaf: next,
    energyBefore,
    energyAfter: next.laplacianEnergy(),
  };
}

/**
 * Run several diffusion steps; energy is non-increasing for small η on
 * undirected sheaves (healing flow toward global sections).
 */
function diffuse(sheaf, { steps = 8, eta = 0.25 } = {}) {
  let current = sheaf;
  const trajectory = [];
  for (let i = 0; i < steps; i++) {
    const step = diffuseStep(current, eta);
    trajectory.push({
      step: i + 1,
      energyBefore: step.energyBefore,
      energyAfter: step.energyAfter,
    });
    current = step.sheaf;
  }
  return { sheaf: current, trajectory, finalEnergy: current.laplacianEnergy() };
}

/**
 * Freeze a learned scalar restriction into a CellularSheaf edge.
 * Core WR does not require a trained model — this is the upgrade path.
 */
function freezeScalarRestriction(xu, xv, edge = { u: 'a', v: 'b' }) {
  const w = learnScalarRestriction(xu, xv);
  return new CellularSheaf({
    stalks: { [edge.u]: [xu], [edge.v]: [xv] },
    edges: [{ u: edge.u, v: edge.v, ru: [[w]] }],
  });
}

module.exports = {
  learnScalarRestriction,
  diffuseStep,
  diffuse,
  freezeScalarRestriction,
};

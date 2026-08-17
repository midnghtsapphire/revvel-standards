#!/usr/bin/env node
'use strict';

/**
 * BNAT persistent homology layer — barcodes over a filtration of the
 * knowledge sheaf (H⁰ = connected components, H¹ = independent cycles).
 *
 * A filtration is an increasing sequence of graphs: each edge carries a
 * birth weight (e.g. the Laplacian energy of the disagreement it detected,
 * or the timestamp of a learning-file write). Sweeping the threshold from
 * 0 upward we track:
 *
 *   H⁰ bars — components merging (union-find): a bar dies when its component
 *             is absorbed into an older one (elder rule).
 *   H¹ bars — an edge whose endpoints are ALREADY connected creates an
 *             independent cycle: an H¹ bar is born and (here) never dies —
 *             graphs have no 2-cells to fill cycles, so every H¹ bar is an
 *             essential class that must be explicitly killed or escalated.
 *
 * Long-lived H¹ bars = persistent obstructions = disagreements the fleet has
 * been gluing over. `longLivedH1` surfaces them for escalation (never
 * silently glued — WR acceptance criterion).
 *
 * Pure functions, no I/O, no deps. Integration with BIOME status sections is
 * in `barcodesFromBiomeStatus` (read-only over the feed).
 */

const { sheafFromBiomeStatus } = require('./sheaf');

/** Minimal union-find with elder-rule tie-breaking by birth time. */
class UnionFind {
  constructor() {
    this.parent = new Map();
    this.birth = new Map();
  }

  add(x, birth = 0) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.birth.set(x, birth);
    }
  }

  find(x) {
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    while (this.parent.get(x) !== root) {
      const next = this.parent.get(x);
      this.parent.set(x, root);
      x = next;
    }
    return root;
  }

  /**
   * Union by elder rule: the component with the OLDER birth survives.
   * Returns { merged, dying } where dying is the root of the component
   * that dies (or null if already connected).
   */
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return { merged: false, dying: null };
    // Elder rule: younger component dies into the older one.
    const [elder, younger] =
      this.birth.get(ra) <= this.birth.get(rb) ? [ra, rb] : [rb, ra];
    this.parent.set(younger, elder);
    return { merged: true, dying: younger };
  }
}

/**
 * Compute persistence barcodes for a filtered graph.
 *
 * @param {string[]} vertices              all vertices, born at weight 0
 * @param {Array<{u:string, v:string, weight:number}>} edges  filtration weights
 * @returns {{h0: Array<{birth:number, death:number|null, component:string}>,
 *            h1: Array<{birth:number, death:null, edge:[string,string]}>}}
 *          death === null means the bar lives forever (essential class).
 */
function computeBarcodes(vertices, edges) {
  const uf = new UnionFind();
  const h0 = new Map(); // root vertex -> bar
  for (const v of vertices || []) {
    uf.add(v, 0);
    h0.set(v, { birth: 0, death: null, component: v });
  }
  const h1 = [];
  const sorted = [...(edges || [])].sort((a, b) => a.weight - b.weight);
  for (const e of sorted) {
    uf.add(e.u, 0);
    uf.add(e.v, 0);
    if (!h0.has(e.u)) h0.set(e.u, { birth: 0, death: null, component: e.u });
    if (!h0.has(e.v)) h0.set(e.v, { birth: 0, death: null, component: e.v });
    const { merged, dying } = uf.union(e.u, e.v);
    if (merged) {
      // A component dies at this filtration value (elder rule).
      h0.get(dying).death = e.weight;
    } else {
      // Endpoints already connected → the edge creates an independent cycle.
      h1.push({ birth: e.weight, death: null, edge: [e.u, e.v] });
    }
  }
  return { h0: [...h0.values()], h1 };
}

/**
 * H¹ bars whose lifetime (measured against maxWeight, since graph H¹ bars
 * never die on their own) meets or exceeds `minLifetime`. These are the
 * persistent obstructions that MUST be killed or escalated.
 */
function longLivedH1(barcodes, maxWeight, minLifetime = 0) {
  return (barcodes.h1 || []).filter(
    (bar) => maxWeight - bar.birth >= minLifetime
  );
}

/**
 * Barcodes over the BIOME status feed. Filtration weight of each worker-pair
 * edge = the Laplacian energy of their disagreement (0 = perfect agreement,
 * born immediately; larger = born later, i.e. only "connected" if we tolerate
 * that much disagreement). Read-only; strictly additive to BIOME.
 */
function barcodesFromBiomeStatus(status) {
  const sheaf = sheafFromBiomeStatus(status);
  const vertices = Object.keys(sheaf.stalks);
  const residuals = sheaf.edgeResiduals();
  const edges = residuals.map((r) => ({
    u: r.u,
    v: r.v,
    weight: r.residual.reduce((acc, x) => acc + x * x, 0),
  }));
  return computeBarcodes(vertices, edges);
}

module.exports = {
  UnionFind,
  computeBarcodes,
  longLivedH1,
  barcodesFromBiomeStatus,
};

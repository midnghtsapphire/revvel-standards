#!/usr/bin/env node
'use strict';

/**
 * Topological fingerprint of a BIOME / knowledge-sheaf status snapshot.
 *
 * Produces the compact record the WR asks to attach alongside biome-status:
 *   { dim_H0, dim_H1, rank_delta, energy, long_lived_h1, consistent, ... }
 *
 * Additive: never mutates scripts/biome/sheaf.js. Callers may write the
 * result to docs/biome/bnat-fingerprint.json (companion file) so external
 * monitors can poll it without forking the BIOME schema.
 */

const { sheafFromBiomeStatus } = require('./sheaf');
const { computeCohomology } = require('./cohomology');
const { barcodesFromBiomeStatus, longLivedH1 } = require('./persistence');

/**
 * @param {object} status  biome-status/v1 object
 * @param {{epsilon?: number, minLifetime?: number, maxWeight?: number}} [opts]
 */
function topologicalFingerprint(status, opts = {}) {
  const epsilon = opts.epsilon === undefined ? 1e-9 : opts.epsilon;
  const minLifetime = opts.minLifetime === undefined ? 0.5 : opts.minLifetime;
  const sheaf = sheafFromBiomeStatus(status);
  const coh = computeCohomology(sheaf, { epsilon });
  const barcodes = barcodesFromBiomeStatus(status);
  const weights = (barcodes.h1 || []).map((b) => b.birth);
  const maxWeight =
    opts.maxWeight !== undefined
      ? opts.maxWeight
      : weights.length
        ? Math.max(...weights, 0)
        : 0;
  const longLived = longLivedH1(barcodes, maxWeight + minLifetime, minLifetime).filter(
    (b) => b.birth > 0
  );

  return {
    schema: 'bnat-fingerprint/v1',
    generated_at: new Date().toISOString(),
    credit_free: true,
    dim_H0: coh.dimH0,
    dim_H1: coh.dimH1,
    rank_delta: coh.rankDelta,
    dim_C0: coh.dimC0,
    dim_C1: coh.dimC1,
    energy: coh.energy,
    consistent: coh.inH0,
    obstruction: coh.obstruction,
    long_lived_h1: longLived.map((b) => ({
      birth: b.birth,
      death: b.death,
      edge: b.edge,
    })),
    long_lived_h1_count: longLived.length,
    h0_bars: (barcodes.h0 || []).length,
    h1_bars: (barcodes.h1 || []).length,
    workers: Object.keys(sheaf.stalks).length,
  };
}

/**
 * Attach fingerprint under status.bnat (in-memory only). Does not write disk.
 * BIOME writers stay untouched; this is for monitors that already hold the
 * status object and want a single JSON blob.
 */
function attachFingerprint(status, opts = {}) {
  const fp = topologicalFingerprint(status, opts);
  return {
    ...status,
    bnat: fp,
  };
}

module.exports = {
  topologicalFingerprint,
  attachFingerprint,
};

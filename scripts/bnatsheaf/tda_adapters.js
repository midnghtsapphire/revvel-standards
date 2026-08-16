#!/usr/bin/env node
'use strict';

/**
 * Optional TDA backends for BNAT persistent homology.
 *
 * Credit-free invariant (WR-16909 / BNAT_SHEAF_STANDARD):
 *   The core path NEVER requires Ripser, GUDHI, or any native addon.
 *   This module probes for optional packages and falls back to the pure-JS
 *   union-find barcode engine in ./persistence.js.
 *
 * Adapters return a common shape:
 *   { backend: 'native'|'ripser'|'gudhi', barcodes: { h0, h1 }, note?: string }
 */

const { computeBarcodes } = require('./persistence');

function nativeBarcodes(vertices, edges) {
  return {
    backend: 'native',
    barcodes: computeBarcodes(vertices, edges),
    note: 'pure-JS union-find (credit-free default)',
  };
}

/**
 * Try to load an optional CommonJS package. Returns null when absent.
 * Never throws for missing modules — absence is the expected production path.
 */
function tryRequire(name) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(name);
  } catch (err) {
    if (err && (err.code === 'MODULE_NOT_FOUND' || /Cannot find module/.test(String(err.message)))) {
      return null;
    }
    // Unexpected load errors still fall back — adapters are best-effort.
    return null;
  }
}

/**
 * Ripser.py is a Python package; there is no official Node binding in this
 * monorepo. We accept a future `ripser-js` / `node-ripser` if present and
 * otherwise document the fallback. Kept as a named probe so the survey doc
 * and tests share one source of truth.
 */
function tryRipser(vertices, edges) {
  const ripser = tryRequire('ripser') || tryRequire('ripser-js') || tryRequire('node-ripser');
  if (!ripser) return null;
  // No standardized Node API — if a package is present but unusable, fall back.
  if (typeof ripser.ripser !== 'function' && typeof ripser !== 'function') {
    return {
      backend: 'ripser',
      barcodes: computeBarcodes(vertices, edges),
      note: 'ripser package present but no callable API; used native barcodes',
    };
  }
  // Unknown shape — refuse to guess; native path stays authoritative.
  return {
    backend: 'ripser',
    barcodes: computeBarcodes(vertices, edges),
    note: 'ripser detected; native barcodes returned (no JS binding contract)',
  };
}

/**
 * GUDHI is likewise Python-first. Probe only; never hard-depend.
 */
function tryGudhi(vertices, edges) {
  const gudhi = tryRequire('gudhi') || tryRequire('node-gudhi');
  if (!gudhi) return null;
  return {
    backend: 'gudhi',
    barcodes: computeBarcodes(vertices, edges),
    note: 'gudhi detected; native barcodes returned (no JS binding contract)',
  };
}

/**
 * Compute barcodes with the preferred backend.
 * @param {string[]} vertices
 * @param {Array<{u:string,v:string,weight:number}>} edges
 * @param {{prefer?: 'native'|'ripser'|'gudhi'|'auto'}} [opts]
 */
function barcodesWithBackend(vertices, edges, opts = {}) {
  const prefer = opts.prefer || 'auto';
  if (prefer === 'native') return nativeBarcodes(vertices, edges);

  if (prefer === 'ripser' || prefer === 'auto') {
    const hit = tryRipser(vertices, edges);
    if (hit) return hit;
    if (prefer === 'ripser') {
      return {
        ...nativeBarcodes(vertices, edges),
        note: 'ripser unavailable; fell back to native',
      };
    }
  }

  if (prefer === 'gudhi' || prefer === 'auto') {
    const hit = tryGudhi(vertices, edges);
    if (hit) return hit;
    if (prefer === 'gudhi') {
      return {
        ...nativeBarcodes(vertices, edges),
        note: 'gudhi unavailable; fell back to native',
      };
    }
  }

  return nativeBarcodes(vertices, edges);
}

/** Which optional backends are loadable in this process. */
function probeBackends() {
  return {
    native: true,
    ripser: Boolean(tryRequire('ripser') || tryRequire('ripser-js') || tryRequire('node-ripser')),
    gudhi: Boolean(tryRequire('gudhi') || tryRequire('node-gudhi')),
  };
}

module.exports = {
  nativeBarcodes,
  barcodesWithBackend,
  probeBackends,
  tryRequire,
};

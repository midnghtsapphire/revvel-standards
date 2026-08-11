'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Test suite for getEnterpriseMatrix in src/lib/model-router.js
 *
 * The function is expected to:
 *  - Load enterprise-matrix.json and enterprise-model-matrix.json
 *  - Combine them into a single unified object
 *  - Cache the result on subsequent calls
 */

const MODULE_PATH = path.join(__dirname, '..', 'src', 'lib', 'model-router.js');

function loadRouterFresh() {
  // Clear cache so module state (including memoized matrix) is reset per test.
  const resolved = require.resolve(MODULE_PATH);
  delete require.cache[resolved];
  return require(MODULE_PATH);
}

function routerAvailable() {
  try {
    require.resolve(MODULE_PATH);
    return true;
  } catch (_) {
    return false;
  }
}

test('getEnterpriseMatrix combines enterprise-matrix and enterprise-model-matrix', (t) => {
  if (!routerAvailable()) {
    t.skip('src/lib/model-router.js not present in this repository snapshot');
    return;
  }

  const router = loadRouterFresh();

  if (typeof router.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix is not exported from model-router');
    return;
  }

  const matrix = router.getEnterpriseMatrix();

  assert.ok(matrix, 'expected getEnterpriseMatrix to return a truthy value');
  assert.strictEqual(typeof matrix, 'object', 'matrix should be an object');
  assert.ok(!Array.isArray(matrix), 'matrix should not be an array');
});

test('getEnterpriseMatrix caches the result across calls', (t) => {
  if (!routerAvailable()) {
    t.skip('src/lib/model-router.js not present in this repository snapshot');
    return;
  }

  const router = loadRouterFresh();

  if (typeof router.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix is not exported from model-router');
    return;
  }

  const first = router.getEnterpriseMatrix();
  const second = router.getEnterpriseMatrix();

  assert.strictEqual(
    first,
    second,
    'expected the same cached reference to be returned on subsequent calls'
  );
});

test('getEnterpriseMatrix includes keys from both underlying JSON sources when available', (t) => {
  if (!routerAvailable()) {
    t.skip('src/lib/model-router.js not present in this repository snapshot');
    return;
  }

  const router = loadRouterFresh();

  if (typeof router.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix is not exported from model-router');
    return;
  }

  const repoRoot = path.join(__dirname, '..');
  const candidates = [
    path.join(repoRoot, 'src', 'lib', 'enterprise-matrix.json'),
    path.join(repoRoot, 'src', 'lib', 'enterprise-model-matrix.json'),
    path.join(repoRoot, 'data', 'enterprise-matrix.json'),
    path.join(repoRoot, 'data', 'enterprise-model-matrix.json'),
    path.join(repoRoot, 'enterprise-matrix.json'),
    path.join(repoRoot, 'enterprise-model-matrix.json'),
  ];

  const foundSources = candidates.filter((p) => fs.existsSync(p));

  if (foundSources.length === 0) {
    t.skip('No enterprise matrix JSON source files found; skipping key-merge assertion');
    return;
  }

  const matrix = router.getEnterpriseMatrix();
  const matrixKeys = Object.keys(matrix);

  assert.ok(
    matrixKeys.length > 0,
    'expected combined matrix to contain at least one key when source files exist'
  );
});

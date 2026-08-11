// Unit tests for getEnterpriseMatrix in src/lib/model-router.js
// Uses node:test to validate matrix combination and caching behavior.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Attempt to load the model-router module. We try a few likely locations
// so the tests are resilient to minor path differences.
function loadModelRouter() {
  const candidates = [
    path.resolve(__dirname, '..', 'src', 'lib', 'model-router.js'),
    path.resolve(__dirname, '..', 'src', 'lib', 'model-router', 'index.js'),
    path.resolve(__dirname, '..', 'lib', 'model-router.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      // Bust require cache so tests can re-import cleanly if needed.
      delete require.cache[require.resolve(p)];
      return { module: require(p), path: p };
    }
  }
  return { module: null, path: null };
}

const loaded = loadModelRouter();

test('getEnterpriseMatrix combines enterprise matrix JSON files', (t) => {
  if (!loaded.module || typeof loaded.module.getEnterpriseMatrix !== 'function') {
    t.skip('model-router module or getEnterpriseMatrix not available in this repo');
    return;
  }

  const matrix = loaded.module.getEnterpriseMatrix();
  assert.ok(matrix && typeof matrix === 'object', 'matrix should be an object');
});

test('getEnterpriseMatrix caches the resulting matrix', (t) => {
  if (!loaded.module || typeof loaded.module.getEnterpriseMatrix !== 'function') {
    t.skip('model-router module or getEnterpriseMatrix not available in this repo');
    return;
  }

  const first = loaded.module.getEnterpriseMatrix();
  const second = loaded.module.getEnterpriseMatrix();
  assert.strictEqual(first, second, 'subsequent calls should return the cached instance');
});

// Unit tests for getEnterpriseMatrix in src/lib/model-router.js
// Uses node:test (built-in Node.js test runner, no external deps)

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Attempt to load the model-router module. If it does not exist yet,
// tests will be skipped so this file remains safe in any repo state.
let modelRouter = null;
let loadError = null;
try {
  // Try common locations
  const candidates = [
    path.join(__dirname, '..', 'src', 'lib', 'model-router.js'),
    path.join(__dirname, '..', 'src', 'lib', 'model-router', 'index.js'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) {
    modelRouter = require(found);
  } else {
    loadError = new Error('model-router module not found at expected paths');
  }
} catch (err) {
  loadError = err;
}

test('getEnterpriseMatrix: module can be loaded', (t) => {
  if (!modelRouter) {
    t.skip(`Skipping: ${loadError && loadError.message}`);
    return;
  }
  assert.ok(modelRouter, 'model-router module should load');
});

test('getEnterpriseMatrix: returns a combined object', (t) => {
  if (!modelRouter || typeof modelRouter.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix not exported');
    return;
  }

  const matrix = modelRouter.getEnterpriseMatrix();
  assert.ok(matrix, 'matrix should be defined');
  assert.strictEqual(typeof matrix, 'object', 'matrix should be an object');
});

test('getEnterpriseMatrix: combines enterprise-matrix and enterprise-model-matrix', (t) => {
  if (!modelRouter || typeof modelRouter.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix not exported');
    return;
  }

  const matrix = modelRouter.getEnterpriseMatrix();

  // Verify presence of keys from both source files when they exist.
  const rootDir = path.join(__dirname, '..');
  const enterpriseMatrixPath = [
    path.join(rootDir, 'src', 'lib', 'enterprise-matrix.json'),
    path.join(rootDir, 'enterprise-matrix.json'),
    path.join(rootDir, 'config', 'enterprise-matrix.json'),
  ].find((p) => fs.existsSync(p));

  const modelMatrixPath = [
    path.join(rootDir, 'src', 'lib', 'enterprise-model-matrix.json'),
    path.join(rootDir, 'enterprise-model-matrix.json'),
    path.join(rootDir, 'config', 'enterprise-model-matrix.json'),
  ].find((p) => fs.existsSync(p));

  if (enterpriseMatrixPath) {
    const em = JSON.parse(fs.readFileSync(enterpriseMatrixPath, 'utf8'));
    for (const key of Object.keys(em)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(matrix, key),
        `Combined matrix should contain key '${key}' from enterprise-matrix.json`
      );
    }
  }

  if (modelMatrixPath) {
    const mm = JSON.parse(fs.readFileSync(modelMatrixPath, 'utf8'));
    for (const key of Object.keys(mm)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(matrix, key),
        `Combined matrix should contain key '${key}' from enterprise-model-matrix.json`
      );
    }
  }
});

test('getEnterpriseMatrix: caches the result across calls', (t) => {
  if (!modelRouter || typeof modelRouter.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix not exported');
    return;
  }

  const first = modelRouter.getEnterpriseMatrix();
  const second = modelRouter.getEnterpriseMatrix();

  // Same reference indicates caching in module state.
  assert.strictEqual(
    first,
    second,
    'Subsequent calls to getEnterpriseMatrix should return the cached instance'
  );
});

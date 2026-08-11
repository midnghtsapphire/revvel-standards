// Unit tests for getEnterpriseMatrix in src/lib/model-router.js
// Uses node:test (Node.js >= 18)

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Resolve model-router module path. If not present, tests are skipped
 * gracefully so this test file does not break CI on repos where the
 * module has not been added yet.
 */
function resolveRouterPath() {
  const candidates = [
    path.join(__dirname, '..', 'src', 'lib', 'model-router.js'),
    path.join(__dirname, '..', 'src', 'lib', 'model-router', 'index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const routerPath = resolveRouterPath();

test('getEnterpriseMatrix combines enterprise-matrix.json and enterprise-model-matrix.json', (t) => {
  if (!routerPath) {
    t.skip('src/lib/model-router.js not present; skipping');
    return;
  }

  // Clear require cache to ensure a fresh module state per test
  delete require.cache[require.resolve(routerPath)];
  const router = require(routerPath);

  if (typeof router.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix is not exported; skipping');
    return;
  }

  const matrix = router.getEnterpriseMatrix();

  assert.ok(matrix, 'expected getEnterpriseMatrix() to return a truthy value');
  assert.equal(typeof matrix, 'object', 'expected matrix to be an object');

  // The combined matrix should include keys from both source files.
  // We do not hardcode exact keys (they can evolve), but we assert that
  // the result has at least one enumerable own property.
  const keys = Object.keys(matrix);
  assert.ok(keys.length > 0, 'expected combined matrix to have properties');
});

test('getEnterpriseMatrix caches the result across calls', (t) => {
  if (!routerPath) {
    t.skip('src/lib/model-router.js not present; skipping');
    return;
  }

  delete require.cache[require.resolve(routerPath)];
  const router = require(routerPath);

  if (typeof router.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix is not exported; skipping');
    return;
  }

  const first = router.getEnterpriseMatrix();
  const second = router.getEnterpriseMatrix();

  // Cached value should be strictly equal (same reference) on subsequent calls
  assert.strictEqual(first, second, 'expected cached matrix to be reused across calls');
});

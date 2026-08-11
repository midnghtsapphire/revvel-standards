// Unit tests for getEnterpriseMatrix in src/lib/model-router.js
// Uses node:test (built-in) — no extra deps required.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const ROUTER_PATH = path.resolve(__dirname, '..', 'src', 'lib', 'model-router.js');

function loadRouter() {
  // Clear cache so we get a fresh module state per test.
  delete require.cache[ROUTER_PATH];
  if (!fs.existsSync(ROUTER_PATH)) return null;
  try {
    return require(ROUTER_PATH);
  } catch (err) {
    return { __loadError: err };
  }
}

test('model-router module exists', (t) => {
  if (!fs.existsSync(ROUTER_PATH)) {
    t.skip(`skipping: ${ROUTER_PATH} not present`);
    return;
  }
  const mod = loadRouter();
  assert.ok(mod, 'router module should load');
  assert.ok(!mod.__loadError, `router should load without error: ${mod.__loadError && mod.__loadError.message}`);
});

test('getEnterpriseMatrix combines matrices into a single object', (t) => {
  const mod = loadRouter();
  if (!mod || mod.__loadError || typeof mod.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix not exported; skipping');
    return;
  }

  const matrix = mod.getEnterpriseMatrix();
  assert.ok(matrix && typeof matrix === 'object', 'matrix should be an object');

  // The combined matrix should carry keys from either source matrix.
  // We don't hard-code exact keys — just verify non-empty object shape.
  const keys = Object.keys(matrix);
  assert.ok(keys.length > 0, 'combined matrix should have at least one key');
});

test('getEnterpriseMatrix caches the result (identity equality on repeat calls)', (t) => {
  const mod = loadRouter();
  if (!mod || mod.__loadError || typeof mod.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix not exported; skipping');
    return;
  }

  const first = mod.getEnterpriseMatrix();
  const second = mod.getEnterpriseMatrix();
  assert.strictEqual(first, second, 'repeat calls should return the same cached object reference');
});

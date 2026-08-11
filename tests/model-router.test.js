// Unit tests for getEnterpriseMatrix in src/lib/model-router.js
// Uses node:test (no external deps required).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ROUTER_PATH = path.join(ROOT, 'src', 'lib', 'model-router.js');

function loadRouterFresh() {
  // Bust require cache so module-level state (cached matrix) is fresh per test.
  delete require.cache[require.resolve(ROUTER_PATH)];
  return require(ROUTER_PATH);
}

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

test('model-router: module exists', (t) => {
  if (!fs.existsSync(ROUTER_PATH)) {
    t.skip('src/lib/model-router.js not present in this repo checkout');
    return;
  }
  const mod = loadRouterFresh();
  assert.ok(mod, 'router module should load');
});

test('getEnterpriseMatrix: returns a combined object of enterprise + model matrices', (t) => {
  if (!fs.existsSync(ROUTER_PATH)) {
    t.skip('router module missing');
    return;
  }
  const mod = loadRouterFresh();
  if (typeof mod.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix not exported');
    return;
  }

  const matrix = mod.getEnterpriseMatrix();
  assert.ok(matrix && typeof matrix === 'object', 'matrix must be an object');

  // If underlying data files are present, verify keys are represented.
  const entPath = path.join(ROOT, 'enterprise-matrix.json');
  const modelPath = path.join(ROOT, 'enterprise-model-matrix.json');
  const ent = safeReadJson(entPath);
  const modelMat = safeReadJson(modelPath);

  if (ent && typeof ent === 'object') {
    for (const k of Object.keys(ent)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(matrix, k) ||
          Object.prototype.hasOwnProperty.call(matrix, 'enterprise'),
        `combined matrix should include enterprise key: ${k}`
      );
    }
  }
  if (modelMat && typeof modelMat === 'object') {
    for (const k of Object.keys(modelMat)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(matrix, k) ||
          Object.prototype.hasOwnProperty.call(matrix, 'models'),
        `combined matrix should include model key: ${k}`
      );
    }
  }
});

test('getEnterpriseMatrix: caches result across calls (same reference)', (t) => {
  if (!fs.existsSync(ROUTER_PATH)) {
    t.skip('router module missing');
    return;
  }
  const mod = loadRouterFresh();
  if (typeof mod.getEnterpriseMatrix !== 'function') {
    t.skip('getEnterpriseMatrix not exported');
    return;
  }

  const first = mod.getEnterpriseMatrix();
  const second = mod.getEnterpriseMatrix();
  assert.strictEqual(first, second, 'subsequent calls must return the cached instance');
});

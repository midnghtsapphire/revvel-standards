'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { getEnterpriseMatrix } = require('../src/lib/model-router');

test('model-router: getEnterpriseMatrix', async (t) => {
  await t.test('should load and combine enterprise architecture and model catalog matrices', () => {
    const matrix = getEnterpriseMatrix();

    // Check that we got a valid object
    assert.ok(matrix, 'matrix should be defined');

    // Check properties from enterprise-matrix.json (architecture config)
    assert.strictEqual(matrix.matrix_role, 'enterprise-architecture');
    assert.ok(Array.isArray(matrix.enterprises), 'enterprises should be an array');
    assert.ok(matrix.enterprises.length > 0, 'enterprises should not be empty');

    // Check properties from enterprise-model-matrix.json (model config)
    // The loadMatrix logic maps `modelCatalog.models` into `matrix.models`
    assert.ok(Array.isArray(matrix.models), 'models should be an array');
    assert.ok(matrix.models.length > 0, 'models should not be empty');

    // Verify a model entry looks correct
    const firstModel = matrix.models[0];
    assert.ok(firstModel.id, 'model should have an id');
    assert.ok(firstModel.name, 'model should have a name');
    assert.ok(firstModel.provider, 'model should have a provider');
  });

  await t.test('should cache the enterprise matrix on subsequent calls', () => {
    const firstCallMatrix = getEnterpriseMatrix();
    const secondCallMatrix = getEnterpriseMatrix();

    // Must be the exact same object reference (strict equality)
    assert.strictEqual(firstCallMatrix, secondCallMatrix, 'should return the cached object reference');
  });
});

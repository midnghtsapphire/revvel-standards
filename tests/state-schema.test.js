#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
// 2026-05-21 (Claude): schemas/state.schema.json declares draft 2020-12, so use
// Ajv's 2020 build instead of the default draft-07 entrypoint (was: require('ajv')).
const Ajv = require('ajv/dist/2020');

const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

const schema = readJson('schemas/state.schema.json');
const ajv = new Ajv({ allErrors: true, strict: true });
// 2026-05-21 (Claude): register standard formats (date-time, etc.) so strict
// mode does not reject the schema's "format" keywords.
require('ajv-formats')(ajv);
const validate = ajv.compile(schema);

function assertValidState(relativePath) {
  const state = readJson(relativePath);
  const ok = validate(state);
  assert(ok, `${relativePath} failed state schema: ${ajv.errorsText(validate.errors)}`);
  return state;
}

test('schema requires product_slug instead of legacy slug', () => {
  assert(schema.properties.product_slug, 'schema is missing product_slug property');
  assert(!schema.properties.slug, 'schema still exposes legacy slug property');
  assert(schema.required.includes('product_slug'), 'schema does not require product_slug');
  assert(!schema.required.includes('slug'), 'schema still requires legacy slug');
});

test('agent-generated product template validates against state schema', () => {
  assertValidState('templates/agent-generated-product/state.json');
});

test('checked-in agent-generated example validates against state schema', () => {
  assertValidState('projects/agent-generated/_examples/demo-product/state.json');
});

test('state shape emitted by init-product.sh validates against state schema', () => {
  const template = readJson('templates/agent-generated-product/state.json');
  const generated = {
    ...template,
    product_slug: 'schema-contract-demo',
    shape: 'pdf',
    created_at: '2026-05-20T23:51:00Z',
    last_updated_at: '2026-05-20T23:51:00Z'
  };
  const ok = validate(generated);
  assert(ok, `generated init-product state failed schema: ${ajv.errorsText(validate.errors)}`);
});

test('legacy slug-only state is rejected', () => {
  const template = readJson('templates/agent-generated-product/state.json');
  const legacy = { ...template, slug: template.product_slug };
  delete legacy.product_slug;

  const ok = validate(legacy);
  assert(!ok, 'schema accepted legacy slug-only state');
  const errors = ajv.errorsText(validate.errors);
  assert(/product_slug/.test(errors), `expected missing product_slug error, got: ${errors}`);
});

test('init-product.sh stamps product_slug', () => {
  const script = fs.readFileSync(path.join(REPO_ROOT, 'scripts/init-product.sh'), 'utf8');
  assert(/state\["product_slug"\]\s*=\s*slug/.test(script), 'init-product.sh does not stamp product_slug');
  assert(!/state\["slug"\]\s*=\s*slug/.test(script), 'init-product.sh still stamps legacy slug');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

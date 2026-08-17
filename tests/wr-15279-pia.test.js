'use strict';

/**
 * Regression tests for WR-15279 / issue #16110 Privacy Impact Assessment package.
 *
 * These tests would have failed before the PIA package existed and will fail if
 * required sections, inventory fields, regulations, processors, or mitigations
 * are removed — protecting the blocking launch gate documentation.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const PIA_DIR = path.join(REPO_ROOT, 'compliance', 'wr-15279');

const REQUIRED_FILES = [
  'README.md',
  'privacy-impact-assessment.md',
  'data-inventory.md',
  'data-inventory.json',
  'data-flows.md',
  'regulatory-mapping.md',
  'third-party-processors.md',
  'vendor-register.json',
  'risk-register.md',
  'risk-register.json',
  'entity-classification.md',
];

function read(rel) {
  return fs.readFileSync(path.join(PIA_DIR, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

test('PIA package directory exists', () => {
  assert.ok(fs.existsSync(PIA_DIR), `missing ${PIA_DIR}`);
  assert.ok(fs.statSync(PIA_DIR).isDirectory(), 'compliance/wr-15279 must be a directory');
});

test('all required PIA artifacts exist', () => {
  const missing = REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(PIA_DIR, f)));
  assert.deepEqual(missing, [], `missing PIA files: ${missing.join(', ')}`);
});

test('master PIA covers issue #16110 resolution checklist items', () => {
  const pia = read('privacy-impact-assessment.md');
  for (const needle of [
    'Complete data inventory',
    'Data flow diagrams',
    'Regulatory mapping',
    'Third-party processor inventory',
    'Risk register with mitigations',
    'HIPAA',
    'HBNR',
    'MHMDA',
    'GDPR',
    'CCPA',
    '#16110',
    'Not legal advice',
    'Sign-off',
  ]) {
    assert.ok(pia.includes(needle), `PIA missing required content: ${needle}`);
  }
});

test('data inventory JSON has required high-sensitivity fields', () => {
  const inv = readJson('data-inventory.json');
  assert.ok(Array.isArray(inv.fields), 'fields must be an array');
  assert.ok(inv.fields.length >= 8, 'expected a complete field inventory');

  const ids = new Set(inv.fields.map((f) => f.id));
  for (const id of [
    'email',
    'postpartum_week',
    'stretch_mark_severity',
    'progress_photo',
    'symptom_notes',
    'session_log',
    'calculator_inputs',
    'device_analytics',
    'crash_reports',
  ]) {
    assert.ok(ids.has(id), `inventory missing field id: ${id}`);
  }

  const health = inv.fields.filter((f) => f.consumer_health_data === true);
  assert.ok(health.length >= 4, 'expected multiple consumer health data fields');

  for (const field of inv.fields) {
    for (const key of ['id', 'name', 'source', 'purpose', 'retention', 'sensitivity']) {
      assert.ok(field[key], `field ${field.id || '?'} missing ${key}`);
    }
  }
});

test('data-flows document maps client to server to third parties', () => {
  const flows = read('data-flows.md');
  for (const needle of [
    'Phase 0',
    'Phase 1',
    'Phase 2',
    'Browser',
    'Object storage',
    'Analytics',
    'FORBIDDEN',
    'DELETE /me',
  ]) {
    assert.ok(flows.includes(needle), `data-flows missing: ${needle}`);
  }
});

test('regulatory mapping covers HIPAA HBNR MHMDA GDPR CCPA', () => {
  const reg = read('regulatory-mapping.md');
  for (const needle of [
    'HIPAA',
    'Health Breach Notification Rule',
    'My Health My Data',
    'MHMDA',
    'GDPR',
    'CCPA',
    'CPRA',
    'Covered Entity',
    'Business Associate',
    'Art. 9',
  ]) {
    assert.ok(reg.includes(needle), `regulatory-mapping missing: ${needle}`);
  }
});

test('vendor register inventories analytics crash cloud and LLM processors', () => {
  const vendors = readJson('vendor-register.json');
  assert.ok(Array.isArray(vendors.processors), 'processors must be an array');
  const categories = new Set(vendors.processors.map((p) => p.category));
  for (const cat of [
    'cloud_hosting_cdn',
    'cloud_storage',
    'analytics',
    'crash_reporting',
    'llm_api',
    'payments',
  ]) {
    assert.ok(categories.has(cat), `vendor register missing category: ${cat}`);
  }

  const llm = vendors.processors.find((p) => p.category === 'llm_api');
  assert.ok(llm, 'llm processor required');
  assert.equal(llm.status, 'not_in_mvp', 'LLM health features must stay out of MVP');
  assert.equal(
    vendors.policy.default_health_data_sale,
    false,
    'default health data sale must be false'
  );
});

test('risk register has mitigations for each risk', () => {
  const rr = readJson('risk-register.json');
  assert.ok(Array.isArray(rr.risks), 'risks must be an array');
  assert.ok(rr.risks.length >= 8, 'expected a non-trivial risk register');

  const ids = new Set(rr.risks.map((r) => r.id));
  for (const id of ['R-01', 'R-02', 'R-03', 'R-04', 'R-08', 'R-09']) {
    assert.ok(ids.has(id), `risk register missing ${id}`);
  }

  for (const risk of rr.risks) {
    assert.ok(risk.title, `${risk.id} missing title`);
    assert.ok(Array.isArray(risk.mitigations) && risk.mitigations.length >= 1, `${risk.id} needs mitigations`);
    assert.ok(risk.owner, `${risk.id} needs owner`);
    assert.ok(risk.likelihood && risk.impact, `${risk.id} needs likelihood/impact`);
  }
});

test('entity classification draft concludes D2C not CE/BA at MVP', () => {
  const memo = read('entity-classification.md');
  assert.ok(memo.includes('Covered Entity'));
  assert.ok(memo.includes('Business Associate'));
  assert.ok(memo.includes('Direct-to-consumer') || memo.includes('D2C'));
  assert.ok(memo.includes('HIPAA does **not** apply') || memo.includes('HIPAA does not apply'));
  assert.ok(memo.includes('Sign-off'));
});

test('parent WR links to the PIA package and marks PIA progress', () => {
  const parent = fs.readFileSync(
    path.join(
      REPO_ROOT,
      'wr',
      'issues',
      'issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md'
    ),
    'utf8'
  );
  assert.ok(
    parent.includes('compliance/wr-15279/privacy-impact-assessment.md'),
    'parent WR must link to the PIA'
  );
  assert.ok(
    parent.includes('[x]') && parent.toLowerCase().includes('privacy impact assessment'),
    'parent WR should mark PIA engineering checklist progress'
  );
});

test('README indexes all package artifacts', () => {
  const readme = read('README.md');
  for (const f of [
    'privacy-impact-assessment.md',
    'data-inventory.md',
    'data-flows.md',
    'regulatory-mapping.md',
    'third-party-processors.md',
    'risk-register.md',
    'entity-classification.md',
  ]) {
    assert.ok(readme.includes(f), `README must index ${f}`);
  }
});

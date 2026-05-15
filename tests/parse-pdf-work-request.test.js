#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  parsePdfWorkRequest,
  parseSection,
} = require('../scripts/parse-pdf-work-request.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

const wrBody = `### Output Type (required)

sellable-pdf

### PDF pipeline batch

Autocreate 3

### Research Mode

standard
`;

test('parseSection reads Output Type with (required)', () => {
  assert.strictEqual(parseSection(wrBody, 'Output Type'), 'sellable-pdf');
});

test('parseSection reads PDF pipeline batch', () => {
  assert.strictEqual(parseSection(wrBody, 'PDF pipeline batch'), 'Autocreate 3');
});

test('parsePdfWorkRequest returns autocreate 3', () => {
  const r = parsePdfWorkRequest(wrBody, {});
  assert.strictEqual(r.isSellablePdf, true);
  assert.strictEqual(r.pdfPipelineBatch, 'Autocreate 3');
  assert.strictEqual(r.autocreateCount, 3);
  assert.strictEqual(r.validBatch, true);
});

test('Not applicable maps to autocreateCount 1', () => {
  const body = wrBody.replace('Autocreate 3', 'Not applicable');
  const r = parsePdfWorkRequest(body, {});
  assert.strictEqual(r.autocreateCount, 1);
});

test('forceSellablePdf when body missing Output Type line', () => {
  const r = parsePdfWorkRequest('no structured form here', {
    forceSellablePdf: true,
  });
  assert.strictEqual(r.isSellablePdf, true);
  assert.strictEqual(r.validBatch, false);
});

if (failed > 0) process.exit(1);

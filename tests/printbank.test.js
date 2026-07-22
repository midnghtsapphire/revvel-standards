#!/usr/bin/env node
/* Regression tests for products/printbank/public/print-engine.js */
'use strict';
const assert = require('assert');
const path = require('path');
const PE = require(path.join(__dirname, '..', 'products', 'printbank', 'public', 'print-engine.js'));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  ok  ' + name); pass++; }
  catch (e) { console.error('  FAIL ' + name + ' — ' + e.message); fail++; }
}

console.log('printbank print-engine');

test('SIZES catalog has all standard sizes', () => {
  const names = PE.getSizes().map(s => s.name);
  ['4x6','8x10','11x14','16x20','A4','A0','8x8'].forEach(n => assert(names.includes(n), 'missing ' + n));
  assert(PE.getSizes().length >= 24, 'expected >=24 sizes');
});

test('pixelsForSize: 8x10 @ 300 DPI = 2400x3000', () => {
  const p = PE.pixelsForSize(PE.getSize('8x10'), 300);
  assert.strictEqual(p.w, 2400);
  assert.strictEqual(p.h, 3000);
});

test('effectiveDPI: 6000x4000 photo → 8x10 (landscape auto-rotate)', () => {
  // photo is landscape; 8x10 flips to 10x8. Ratio 10/8=1.25, photo 1.5 → crop width by height.
  const e = PE.effectiveDPI({ w: 6000, h: 4000 }, PE.getSize('8x10'));
  assert.strictEqual(e.sizeW, 10);
  assert.strictEqual(e.sizeH, 8);
  // cropH = 4000, cropW = 4000*1.25 = 5000; dpi = 5000/10 = 500
  assert.strictEqual(e.dpi, 500);
});

test('gradeDPI thresholds', () => {
  assert.strictEqual(PE.gradeDPI(320), 'gallery');
  assert.strictEqual(PE.gradeDPI(260), 'excellent');
  assert.strictEqual(PE.gradeDPI(200), 'good');
  assert.strictEqual(PE.gradeDPI(160), 'acceptable');
  assert.strictEqual(PE.gradeDPI(100), 'low');
});

test('canExport blocks <150 DPI', () => {
  assert.strictEqual(PE.canExport(149), false);
  assert.strictEqual(PE.canExport(150), true);
});

test('gradePhotoAllSizes returns entry per size', () => {
  const g = PE.gradePhotoAllSizes({ w: 4000, h: 6000 });
  assert.strictEqual(g.length, PE.getSizes().length);
  assert(g.every(x => typeof x.dpi === 'number' && x.grade));
});

test('generateSVG is deterministic for same genre+seed', () => {
  const a = PE.generateSVG('abstract', 1);
  const b = PE.generateSVG('abstract', 1);
  assert.strictEqual(a, b);
});

test('generateSVG differs across seeds', () => {
  const a = PE.generateSVG('abstract', 1);
  const b = PE.generateSVG('abstract', 2);
  assert.notStrictEqual(a, b);
});

test('generateSVG produces valid <svg>…</svg> for every genre', () => {
  PE.GENRES.forEach(g => {
    const s = PE.generateSVG(g, 7);
    assert(s.startsWith('<svg '), g + ' bad start');
    assert(s.endsWith('</svg>'), g + ' bad end');
    assert(s.includes('viewBox='), g + ' missing viewBox');
  });
});

test('buildCatalog is reproducible and has 8 genres × N items', () => {
  const a = PE.buildCatalog(5);
  const b = PE.buildCatalog(5);
  assert.strictEqual(a.length, 40);
  assert.deepStrictEqual(a, b);
});

test('effectiveDPI: tiny photo → large print is low grade', () => {
  const e = PE.effectiveDPI({ w: 800, h: 1200 }, PE.getSize('24x36'));
  assert(e.dpi < 100);
  assert.strictEqual(PE.gradeDPI(e.dpi), 'low');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

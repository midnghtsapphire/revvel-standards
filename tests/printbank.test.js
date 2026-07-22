'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../products/printbank/public/print-engine.js');

test('SIZES catalog has 24 entries including ISO A-series and squares', () => {
  assert.strictEqual(E.SIZES.length, 24);
  const names = E.SIZES.map(s => s.name);
  ['4x6', '8x10', '11x14', '16x20', '20x30', 'A4', 'A3', '6x6', '20x20'].forEach(n => {
    assert.ok(names.includes(n), 'missing ' + n);
  });
});

test('pixelsForSize computes width*dpi rounded', () => {
  const p = E.pixelsForSize({ w: 8, h: 10 }, 300);
  assert.strictEqual(p.w, 2400);
  assert.strictEqual(p.h, 3000);
});

test('effectiveDPI center-crop matches expected floor for 8x10 at 300 DPI equivalent', () => {
  // A 2400x3000 source should give exactly 300 DPI on 8x10.
  const dpi = E.effectiveDPI(2400, 3000, { w: 8, h: 10 });
  assert.strictEqual(dpi, 300);
});

test('effectiveDPI auto-selects best orientation', () => {
  // Landscape source, portrait target — engine should rotate mentally and give same DPI.
  const dpi = E.effectiveDPI(3000, 2400, { w: 8, h: 10 });
  assert.strictEqual(dpi, 300);
});

test('cropRect returns centered crop with target ratio', () => {
  const c = E.cropRect(4000, 3000, { w: 8, h: 10 });
  assert.strictEqual(c.h, 3000);
  assert.strictEqual(c.w, 2400);
  assert.strictEqual(c.x, 800);
  assert.strictEqual(c.y, 0);
});

test('gradeDPI thresholds', () => {
  assert.strictEqual(E.gradeDPI(320).grade, 'gallery');
  assert.strictEqual(E.gradeDPI(260).grade, 'excellent');
  assert.strictEqual(E.gradeDPI(210).grade, 'good');
  assert.strictEqual(E.gradeDPI(160).grade, 'acceptable');
  assert.strictEqual(E.gradeDPI(100).grade, 'low');
  assert.strictEqual(E.gradeDPI(100).ok, false);
});

test('gradePhoto returns one row per size with all fields', () => {
  const rows = E.gradePhoto(6000, 4000);
  assert.strictEqual(rows.length, E.SIZES.length);
  rows.forEach(r => {
    assert.ok(typeof r.size === 'string');
    assert.ok(typeof r.dpi === 'number');
    assert.ok(['gallery', 'excellent', 'good', 'acceptable', 'low'].includes(r.grade));
  });
});

test('generateSVG is deterministic for same inputs', () => {
  const a = E.generateSVG('abstract', 'abstract-001', 400, 600);
  const b = E.generateSVG('abstract', 'abstract-001', 400, 600);
  assert.strictEqual(a, b);
});

test('generateSVG differs across ids', () => {
  const a = E.generateSVG('abstract', 'abstract-001', 400, 600);
  const b = E.generateSVG('abstract', 'abstract-002', 400, 600);
  assert.notStrictEqual(a, b);
});

test('generateSVG produces valid <svg>…</svg> for every genre', () => {
  E.GENRES.forEach(g => {
    const svg = E.generateSVG(g, g + '-001', 400, 600);
    assert.ok(svg.startsWith('<svg '), g + ' should start with <svg');
    assert.ok(svg.endsWith('</svg>'), g + ' should end with </svg>');
    assert.ok(svg.includes('viewBox='), g + ' should have viewBox');
  });
});

test('buildCatalog is reproducible and yields requested count', () => {
  const a = E.buildCatalog(144);
  const b = E.buildCatalog(144);
  assert.strictEqual(a.length, 144);
  assert.deepStrictEqual(a.map(x => x.id), b.map(x => x.id));
});

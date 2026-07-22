'use strict';
// Regression tests for PrintBank print engine.
// Runs under Node's built-in test runner: `node --test tests/printbank.test.js`.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const PE = require(path.join('..', 'products', 'printbank', 'public', 'print-engine.js'));

test('size catalog contains 24 sizes including A-series and squares', () => {
  assert.strictEqual(PE.SIZES.length, 24);
  assert.ok(PE.SIZES.find(s => s.name === 'A4'));
  assert.ok(PE.SIZES.find(s => s.name === '12x12'));
  assert.ok(PE.SIZES.find(s => s.name === '11x14'));
});

test('pixelsForSize computes correct 300dpi pixel counts', () => {
  const p = PE.pixelsForSize('8x10', 300);
  assert.strictEqual(p.w, 2400);
  assert.strictEqual(p.h, 3000);
  const p2 = PE.pixelsForSize('4x6', 150);
  assert.strictEqual(p2.w, 600);
  assert.strictEqual(p2.h, 900);
});

test('pixelsForSize throws on unknown size', () => {
  assert.throws(() => PE.pixelsForSize('99x99', 300), /Unknown size/);
});

test('centerCrop crops sides when source is wider than target', () => {
  const c = PE.centerCrop(3000, 2000, 2, 3); // source 3:2, target 2:3 → very tall crop
  assert.strictEqual(c.h, 2000);
  assert.ok(c.w < c.h);
  assert.strictEqual(c.y, 0);
});

test('centerCrop crops top/bottom when source is taller than target', () => {
  const c = PE.centerCrop(2000, 3000, 3, 2);
  assert.strictEqual(c.w, 2000);
  assert.ok(c.h < c.w);
  assert.strictEqual(c.x, 0);
});

test('gradePhotoForSize returns gallery for high-DPI match', () => {
  // 12MP-ish landscape photo → 8x10 print
  const g = PE.gradePhotoForSize(4000, 3000, '8x10');
  assert.strictEqual(g.grade, 'gallery');
  assert.ok(g.effectiveDpi >= 300);
  assert.strictEqual(g.printReady, true);
});

test('gradePhotoForSize returns low for tiny photo on large print', () => {
  const g = PE.gradePhotoForSize(800, 600, '24x36');
  assert.strictEqual(g.grade, 'low');
  assert.strictEqual(g.printReady, false);
});

test('gradePhotoForSize auto-rotates when orientations differ', () => {
  // landscape photo, portrait target size
  const g = PE.gradePhotoForSize(4000, 3000, '8x12');
  assert.strictEqual(g.rotated, true);
});

test('generateSVG is deterministic for same id', () => {
  const a = PE.generateSVG(42);
  const b = PE.generateSVG(42);
  assert.strictEqual(a.svg, b.svg);
  assert.strictEqual(a.genre, b.genre);
});

test('generateSVG produces valid-looking SVG for every genre', () => {
  // Run enough ids to hit all 8 genres.
  const seen = new Set();
  for (let i = 1; i <= 50 && seen.size < PE.GENRES.length; i++) {
    const meta = PE.generateSVG(i);
    assert.ok(meta.svg.startsWith('<svg'), 'starts with <svg');
    assert.ok(meta.svg.endsWith('</svg>'), 'ends with </svg>');
    assert.ok(PE.GENRES.includes(meta.genre));
    seen.add(meta.genre);
  }
  assert.strictEqual(seen.size, PE.GENRES.length, 'all genres appear');
});

test('buildCatalog is reproducible', () => {
  const a = PE.buildCatalog(20);
  const b = PE.buildCatalog(20);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.length, 20);
  assert.strictEqual(a[0].id, 1);
});

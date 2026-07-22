'use strict';
const assert = require('assert');
const path = require('path');
const E = require(path.join('..', 'products', 'printbank', 'public', 'print-engine.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok  ' + name); passed++; }
  catch (e) { console.error('  FAIL ' + name + ' — ' + e.message); failed++; }
}

console.log('# printbank print-engine');

test('SIZES catalog has 24 entries', () => {
  assert.strictEqual(E.SIZES.length, 24);
});

test('SIZES entries are well-formed', () => {
  for (const s of E.SIZES) {
    assert.ok(typeof s.name === 'string' && s.name.length > 0);
    assert.ok(s.w > 0 && s.h > 0);
    assert.ok(typeof s.ratio === 'string');
  }
});

test('pixelsForSize 8x10 @ 300 = 2400x3000', () => {
  const s = E.SIZES.find(x => x.name === '8x10');
  assert.deepStrictEqual(E.pixelsForSize(s, 300), { w: 2400, h: 3000 });
});

test('centerCropRect wider photo crops horizontally', () => {
  const s = E.SIZES.find(x => x.name === '8x10'); // 4:5 portrait
  const c = E.centerCropRect(4000, 3000, s, false);
  assert.ok(c.w < 4000, 'width must be cropped');
  assert.strictEqual(c.h, 3000);
});

test('gradeDpi thresholds', () => {
  assert.strictEqual(E.gradeDpi(350).grade, 'gallery');
  assert.strictEqual(E.gradeDpi(250).grade, 'excellent');
  assert.strictEqual(E.gradeDpi(210).grade, 'good');
  assert.strictEqual(E.gradeDpi(160).grade, 'acceptable');
  assert.strictEqual(E.gradeDpi(100).grade, 'low');
  assert.strictEqual(E.gradeDpi(100).ok, false);
});

test('gradePhotoForSize auto-rotates when it improves DPI', () => {
  const s = E.SIZES.find(x => x.name === '8x10'); // portrait
  // Landscape 6000x4000 → rotating helps.
  const g = E.gradePhotoForSize(6000, 4000, s);
  assert.strictEqual(g.rotate, true);
  assert.ok(g.dpi >= 300);
});

test('generatePrint returns deterministic output for same id', () => {
  const a = E.generatePrint('print-0001');
  const b = E.generatePrint('print-0001');
  assert.strictEqual(a.svg, b.svg);
  assert.strictEqual(a.genre, b.genre);
});

test('generatePrint produces valid-looking SVG', () => {
  const p = E.generatePrint('print-0042');
  assert.ok(p.svg.startsWith('<svg'));
  assert.ok(p.svg.endsWith('</svg>'));
  assert.ok(p.svg.includes('viewBox="0 0 1000 1000"'));
});

test('each genre generator produces an SVG', () => {
  // Force each genre by trying many IDs until we see all.
  const seen = new Set();
  for (let i = 1; i <= 500 && seen.size < E.GENRES.length; i++) {
    const p = E.generatePrint('print-' + i);
    seen.add(p.genre);
    assert.ok(p.svg.startsWith('<svg'));
  }
  for (const g of E.GENRES) assert.ok(seen.has(g), 'missed genre: ' + g);
});

test('generateCatalog(144) is reproducible', () => {
  const a = E.generateCatalog(144);
  const b = E.generateCatalog(144);
  assert.strictEqual(a.length, 144);
  for (let i = 0; i < a.length; i++) assert.strictEqual(a[i].svg, b[i].svg);
});

test('effectiveDpi shrinks with smaller photos', () => {
  const s = E.SIZES.find(x => x.name === '16x20');
  const big = E.effectiveDpi(6000, 4000, s);
  const small = E.effectiveDpi(1000, 800, s);
  assert.ok(big > small);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

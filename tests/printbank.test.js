// Regression tests for products/printbank/public/print-engine.js
const assert = require('assert');
const path = require('path');
const E = require(path.join('..', 'products', 'printbank', 'public', 'print-engine.js'));

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.error('  FAIL ' + name + ' — ' + e.message); fail++; }
}

console.log('printbank.test.js');

t('SIZES catalog has 24 entries', () => {
  assert.strictEqual(E.SIZES.length, 24);
});

t('pixelsForSize: 8x10 @ 300 = 2400x3000', () => {
  const s = E.SIZES.find(x => x.name === '8x10');
  const p = E.pixelsForSize(s, 300);
  assert.strictEqual(p.w, 2400);
  assert.strictEqual(p.h, 3000);
});

t('cropForTarget: landscape source to portrait target auto-rotates', () => {
  const c = E.cropForTarget(3000, 2000, 8, 10);
  assert.ok(c.rotated, 'should rotate');
});

t('cropForTarget: 3000x2000 -> 2:3 (rotated to 10x8 => 5:4) crops height', () => {
  const c = E.cropForTarget(3000, 2000, 4, 6);
  // rotated to 6x4 ratio 3:2 = 1.5; src 3000/2000 = 1.5 => no crop
  assert.strictEqual(c.w, 3000);
  assert.strictEqual(c.h, 2000);
});

t('gradePhotoForSize: 6000x4000 for 8x10 => gallery', () => {
  const s = E.SIZES.find(x => x.name === '8x10');
  const g = E.gradePhotoForSize(6000, 4000, s);
  assert.strictEqual(g.grade, 'gallery');
  assert.ok(g.dpi >= 300, 'dpi >= 300 got ' + g.dpi);
});

t('gradePhotoForSize: 800x600 for 16x20 => low', () => {
  const s = E.SIZES.find(x => x.name === '16x20');
  const g = E.gradePhotoForSize(800, 600, s);
  assert.strictEqual(g.grade, 'low');
});

t('grade thresholds correct', () => {
  assert.strictEqual(E.grade(300), 'gallery');
  assert.strictEqual(E.grade(299), 'excellent');
  assert.strictEqual(E.grade(240), 'excellent');
  assert.strictEqual(E.grade(180), 'good');
  assert.strictEqual(E.grade(150), 'acceptable');
  assert.strictEqual(E.grade(149), 'low');
});

t('generatePrint deterministic: same id => same svg', () => {
  const a = E.generatePrint(42);
  const b = E.generatePrint(42);
  assert.strictEqual(a.svg, b.svg);
  assert.strictEqual(a.genre, b.genre);
});

t('generatePrint returns valid SVG for every genre', () => {
  for (let i = 1; i <= 32; i++) {
    const p = E.generatePrint(i);
    assert.ok(p.svg.startsWith('<svg'), 'starts with <svg');
    assert.ok(p.svg.endsWith('</svg>'), 'ends with </svg>');
    assert.ok(E.GENRES.includes(p.genre));
  }
});

t('generateCatalog(144) is reproducible', () => {
  const a = E.generateCatalog(144);
  const b = E.generateCatalog(144);
  assert.strictEqual(a.length, 144);
  assert.strictEqual(a[0].svg, b[0].svg);
  assert.strictEqual(a[143].svg, b[143].svg);
});

t('effectiveDpi returns 0 for zero inches', () => {
  assert.strictEqual(E.effectiveDpi(3000, 0), 0);
});

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

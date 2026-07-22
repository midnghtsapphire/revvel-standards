/* PrintBank regression tests. Runnable under node --test or as plain script. */
const assert = require('assert');
const path = require('path');
const PE = require(path.join('..', 'products', 'printbank', 'public', 'print-engine.js'));

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('size catalog contains expected named sizes', () => {
  const names = PE.getSizes().map(s => s.name);
  ['4x6','5x7','8x10','11x14','16x20','16x24','24x36','A4','A3','A0','6x6','20x20'].forEach(n => {
    assert.ok(names.includes(n), 'missing size ' + n);
  });
});

test('pixelsForSize computes correct pixel dims at 300 DPI', () => {
  const s = PE.getSize('16x24');
  const px = PE.pixelsForSize(s, 300);
  assert.strictEqual(px.w, 4800);
  assert.strictEqual(px.h, 7200);
});

test('pixelsForSize scales with DPI', () => {
  const s = PE.getSize('4x6');
  assert.strictEqual(PE.pixelsForSize(s, 150).w, 600);
  assert.strictEqual(PE.pixelsForSize(s, 300).w, 1200);
});

test('effectiveDpi center-crops correctly for matching ratio', () => {
  // 3600x5400 into 4x6 (2:3) at same ratio = 900 DPI
  const e = PE.effectiveDpi({ w: 3600, h: 5400 }, PE.getSize('4x6'));
  assert.strictEqual(Math.round(e.dpi), 900);
});

test('gradePhoto returns gallery grade for high-res match', () => {
  const g = PE.gradePhoto({ w: 6000, h: 9000 }, PE.getSize('16x24'));
  assert.strictEqual(g.grade, 'gallery');
  assert.ok(g.printable);
});

test('gradePhoto returns low grade and blocks print for small image', () => {
  const g = PE.gradePhoto({ w: 400, h: 600 }, PE.getSize('16x24'));
  assert.strictEqual(g.grade, 'low');
  assert.strictEqual(g.printable, false);
});

test('gradePhoto auto-rotates landscape source to fit portrait target', () => {
  const g = PE.gradePhoto({ w: 6000, h: 4000 }, PE.getSize('4x6'));
  assert.strictEqual(g.rotated, true);
});

test('generator is deterministic for same id+genre', () => {
  const a = PE.generatePrint(1, 'abstract');
  const b = PE.generatePrint(1, 'abstract');
  assert.strictEqual(a.svg, b.svg);
  assert.strictEqual(a.title, b.title);
});

test('generator produces valid-looking SVG for every genre', () => {
  PE.GENRES.forEach(g => {
    const p = PE.generatePrint(1, g);
    assert.ok(p.svg.startsWith('<?xml'));
    assert.ok(p.svg.includes('<svg '));
    assert.ok(p.svg.trim().endsWith('</svg>'));
    assert.ok(p.svg.length > 200, 'svg too short for genre ' + g);
  });
});

test('buildCatalog produces reproducible 144-print catalog by default', () => {
  const a = PE.buildCatalog();
  const b = PE.buildCatalog();
  assert.strictEqual(a.length, 144);
  assert.strictEqual(a.length, b.length);
  for (let i = 0; i < a.length; i++) assert.strictEqual(a[i].svg, b[i].svg);
});

test('generatePrint throws on unknown genre', () => {
  assert.throws(() => PE.generatePrint(1, 'nope'));
});

(async function run() {
  let pass = 0, fail = 0;
  for (const t of tests) {
    try { await t.fn(); console.log('  ok', t.name); pass++; }
    catch (e) { console.error('  FAIL', t.name, '-', e.message); fail++; }
  }
  console.log(`\n${pass}/${tests.length} passed`);
  if (fail) process.exit(1);
})();

// PrintBank regression tests. Run: node tests/printbank.test.js
'use strict';
var assert = require('assert');
var path = require('path');
var PE = require(path.join(__dirname, '..', 'products', 'printbank', 'public', 'print-engine.js'));

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

test('SIZES catalog covers 24 standard sizes', function () {
  assert.strictEqual(PE.SIZES.length, 24);
  var names = PE.SIZES.map(function (s) { return s.name; });
  ['4x6', '5x7', '8x10', '11x14', '16x20', '20x30', '24x36', 'A6', 'A4', 'A1', '12x12'].forEach(function (n) {
    assert.ok(names.indexOf(n) !== -1, 'missing size ' + n);
  });
});

test('pixelDimensions computes width*dpi rounded', function () {
  var size = { w: 8, h: 10 };
  var d = PE.pixelDimensions(size, 300);
  assert.deepStrictEqual(d, { w: 2400, h: 3000 });
  var d2 = PE.pixelDimensions({ w: 8.27, h: 11.69 }, 300);
  assert.strictEqual(d2.w, 2481);
  assert.strictEqual(d2.h, 3507);
});

test('centerCrop crops sides when source wider than target', function () {
  // 3000x2000 into 8x10 (portrait) → target ratio 0.8
  var crop = PE.centerCrop(3000, 2000, 8, 10);
  assert.strictEqual(crop.h, 2000);
  assert.strictEqual(crop.w, 1600); // 2000*0.8
  assert.strictEqual(crop.cx = crop.x, Math.round((3000 - 1600) / 2));
});

test('centerCrop crops top/bottom when source taller', function () {
  var crop = PE.centerCrop(2000, 3000, 8, 10);
  // target ratio 0.8, source ratio 0.667 → source taller → crop top/bottom
  assert.strictEqual(crop.w, 2000);
  assert.strictEqual(crop.h, Math.round(2000 / 0.8));
});

test('effectiveDpi auto-rotates when landscape yields better DPI', function () {
  // Very wide photo — landscape target should win
  var eff = PE.effectiveDpi(6000, 2000, { w: 4, h: 6 });
  assert.ok(eff.rotated, 'expected rotated to be true for a wide photo');
});

test('grade thresholds match spec', function () {
  assert.strictEqual(PE.grade(400), 'gallery');
  assert.strictEqual(PE.grade(300), 'gallery');
  assert.strictEqual(PE.grade(260), 'excellent');
  assert.strictEqual(PE.grade(180), 'good');
  assert.strictEqual(PE.grade(150), 'acceptable');
  assert.strictEqual(PE.grade(100), 'low');
});

test('gradePhotoAcrossSizes returns entry per standard size', function () {
  var out = PE.gradePhotoAcrossSizes(6000, 4000);
  assert.strictEqual(out.length, PE.SIZES.length);
  out.forEach(function (r) {
    assert.ok(typeof r.dpi === 'number');
    assert.ok(['gallery', 'excellent', 'good', 'acceptable', 'low'].indexOf(r.grade) !== -1);
  });
});

test('generateSvg is deterministic for same seed', function () {
  var a = PE.generateSvg('abstract-geometric', 12345, 500, 700);
  var b = PE.generateSvg('abstract-geometric', 12345, 500, 700);
  assert.strictEqual(a, b);
});

test('generateSvg produces valid SVG for every genre', function () {
  PE.GENRES.forEach(function (g) {
    var svg = PE.generateSvg(g, 42, 400, 500);
    assert.ok(/^<svg[\s\S]*<\/svg>$/.test(svg), 'invalid svg for ' + g);
    assert.ok(svg.indexOf('viewBox="0 0 400 500"') !== -1);
  });
});

test('buildCatalog returns 144 prints across 8 genres × 18', function () {
  var c = PE.buildCatalog(18);
  assert.strictEqual(c.length, 144);
  var genres = {};
  c.forEach(function (p) { genres[p.genre] = (genres[p.genre] || 0) + 1; });
  Object.keys(genres).forEach(function (g) {
    assert.strictEqual(genres[g], 18);
  });
});

test('buildCatalog is reproducible (same ids and seeds across runs)', function () {
  var a = PE.buildCatalog(18);
  var b = PE.buildCatalog(18);
  assert.deepStrictEqual(a, b);
});

var failed = 0;
tests.forEach(function (t) {
  try {
    t.fn();
    console.log('  ok  ' + t.name);
  } catch (e) {
    failed++;
    console.log('  FAIL ' + t.name + ' → ' + e.message);
  }
});
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' passed');
if (failed) process.exit(1);

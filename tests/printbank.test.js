// PrintBank regression tests. Run with: node tests/printbank.test.js
var PE = require('../products/printbank/public/print-engine.js');
var assert = require('assert');

var failed = 0;
var passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓ ' + name); passed++; }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); failed++; }
}

console.log('PrintBank tests');

test('size catalog has 24 sizes', function () {
  assert.strictEqual(PE.SIZES.length, 24);
});

test('pixelsForSize 8x10 @ 300 DPI = 2400x3000', function () {
  var p = PE.pixelsForSize('8x10', 300);
  assert.strictEqual(p.w, 2400);
  assert.strictEqual(p.h, 3000);
});

test('pixelsForSize A4 @ 300 DPI ≈ 2481x3507', function () {
  var p = PE.pixelsForSize('A4', 300);
  assert.ok(Math.abs(p.w - 2481) <= 2, 'w=' + p.w);
  assert.ok(Math.abs(p.h - 3507) <= 2, 'h=' + p.h);
});

test('pixelsForSize throws on unknown', function () {
  assert.throws(function () { PE.pixelsForSize('bogus', 300); });
});

test('centerCrop landscape photo to portrait ratio crops width', function () {
  var c = PE.centerCrop(4000, 3000, 2 / 3);
  assert.strictEqual(Math.round(c.w), 2000);
  assert.strictEqual(c.h, 3000);
  assert.strictEqual(c.y, 0);
});

test('centerCrop portrait photo to landscape ratio crops height', function () {
  var c = PE.centerCrop(3000, 4000, 3 / 2);
  assert.strictEqual(c.w, 3000);
  assert.strictEqual(Math.round(c.h), 2000);
  assert.strictEqual(c.x, 0);
});

test('gradePhoto 6000x4000 for 8x10 = gallery + rotated', function () {
  var g = PE.gradePhoto(6000, 4000, '8x10');
  assert.strictEqual(g.grade, 'gallery');
  assert.strictEqual(g.rotated, true);
  assert.strictEqual(g.printReady, true);
  assert.ok(g.dpi >= 300);
});

test('gradePhoto 800x600 for 24x36 = low + not printReady', function () {
  var g = PE.gradePhoto(800, 600, '24x36');
  assert.strictEqual(g.grade, 'low');
  assert.strictEqual(g.printReady, false);
});

test('generateSvg is deterministic', function () {
  var a = PE.generateSvg('pb-0001', 'botanical', { width: 100, height: 150 });
  var b = PE.generateSvg('pb-0001', 'botanical', { width: 100, height: 150 });
  assert.strictEqual(a, b);
  assert.ok(a.indexOf('<svg') === 0);
  assert.ok(a.indexOf('</svg>') > 0);
});

test('generateSvg produces valid output for every genre', function () {
  PE.GENRES.forEach(function (g) {
    var svg = PE.generateSvg('seed-' + g, g, { width: 200, height: 300 });
    assert.ok(svg.startsWith('<svg'), g + ' missing <svg');
    assert.ok(svg.endsWith('</svg>'), g + ' missing </svg>');
    assert.ok(svg.length > 100, g + ' too short');
  });
});

test('buildCatalog is reproducible and sized', function () {
  var a = PE.buildCatalog(144);
  var b = PE.buildCatalog(144);
  assert.strictEqual(a.length, 144);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a[0].id, 'pb-0001');
  assert.ok(PE.GENRES.indexOf(a[0].genre) >= 0);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

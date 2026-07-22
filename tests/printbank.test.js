#!/usr/bin/env node
/* PrintBank regression tests — 11 checks. Deterministic, no deps. */
'use strict';
var PE = require('../products/printbank/public/print-engine.js');

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓ ' + name); passed++; }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
}

console.log('PrintBank tests');
console.log('---------------');

test('size catalog has 24 standard sizes', function () {
  assertEq(PE.SIZES.length, 24);
});

test('size catalog includes A0 through A4', function () {
  ['A0','A1','A2','A3','A4'].forEach(function (id) {
    assert(PE.SIZES.some(function (s) { return s.id === id; }), 'missing ' + id);
  });
});

test('pixelsAtDpi(16x20, 300) = 4800×6000', function () {
  var s = PE.SIZES.find(function (x) { return x.id === '16x20'; });
  var p = PE.pixelsAtDpi(s, 300);
  assertEq(p.w, 4800); assertEq(p.h, 6000);
});

test('pixelsAtDpi(A4, 300) ≈ 2480×3508', function () {
  var s = PE.SIZES.find(function (x) { return x.id === 'A4'; });
  var p = PE.pixelsAtDpi(s, 300);
  assertEq(p.w, 2480); assertEq(p.h, 3508);
});

test('centerCropTo trims sides of wider source', function () {
  // 3000×2000 source, target 2:3 portrait (2 wide × 3 tall)
  var c = PE.centerCropTo(3000, 2000, 2, 3);
  // Target ratio 2/3 ≈ 0.667. Source ratio 1.5. Source is wider → crop width.
  assertEq(c.cropH, 2000);
  assertEq(c.cropW, Math.round(2000 * (2/3)));
  assert(c.offsetX > 0);
  assertEq(c.offsetY, 0);
});

test('gradeForDpi thresholds', function () {
  assertEq(PE.gradeForDpi(320).grade, 'gallery');
  assertEq(PE.gradeForDpi(260).grade, 'excellent');
  assertEq(PE.gradeForDpi(200).grade, 'good');
  assertEq(PE.gradeForDpi(160).grade, 'acceptable');
  assertEq(PE.gradeForDpi(120).grade, 'low');
  assertEq(PE.gradeForDpi(120).exportable, false);
  assertEq(PE.gradeForDpi(160).exportable, true);
});

test('gradePhotoAgainstSize auto-rotates for best score', function () {
  // Landscape 6000×4000 photo vs 8×10 portrait size — should prefer rotated landscape
  var size = PE.SIZES.find(function (s) { return s.id === '8x10'; });
  var g = PE.gradePhotoAgainstSize(6000, 4000, size);
  assertEq(g.rotated, true);
  assert(g.effectiveDpi >= 300, 'expected gallery grade, got ' + g.effectiveDpi);
});

test('gradePhotoAgainstAll returns one entry per size', function () {
  var grades = PE.gradePhotoAgainstAll(4000, 6000);
  assertEq(grades.length, PE.SIZES.length);
});

test('generateSvg is deterministic for same seed+genre', function () {
  var a = PE.generateSvg('seed-1', 'bauhaus', 1000, 1500);
  var b = PE.generateSvg('seed-1', 'bauhaus', 1000, 1500);
  assertEq(a, b);
  var c = PE.generateSvg('seed-2', 'bauhaus', 1000, 1500);
  assert(a !== c, 'different seeds should differ');
});

test('generateSvg produces valid SVG root for every genre', function () {
  PE.GENRES.forEach(function (g) {
    var svg = PE.generateSvg('seed-x', g, 500, 750);
    assert(svg.indexOf('<svg') === 0, 'no <svg for ' + g);
    assert(svg.indexOf('</svg>') > 0, 'no closing </svg> for ' + g);
    assert(svg.indexOf('viewBox="0 0 500 750"') > 0, 'missing viewBox for ' + g);
  });
});

test('buildCatalog is deterministic and covers all genres', function () {
  var a = PE.buildCatalog(144);
  var b = PE.buildCatalog(144);
  assertEq(a.length, 144);
  assertEq(JSON.stringify(a), JSON.stringify(b));
  var genres = {};
  a.forEach(function (i) { genres[i.genre] = true; });
  assertEq(Object.keys(genres).length, PE.GENRES.length);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

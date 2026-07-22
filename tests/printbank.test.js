'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const PE = require(path.join('..', 'products', 'printbank', 'public', 'print-engine.js'));

test('size catalog has 24 entries with valid dimensions', () => {
  assert.equal(PE.SIZES.length, 24);
  for (const s of PE.SIZES) {
    assert.ok(s.name && typeof s.name === 'string');
    assert.ok(s.w > 0 && s.h > 0);
    assert.ok(s.ratio);
  }
});

test('pixelsForSize computes width*dpi rounded', () => {
  const s = PE.SIZES.find(x => x.name === '8x10');
  const px = PE.pixelsForSize(s, 300);
  assert.equal(px.w, 2400);
  assert.equal(px.h, 3000);
  const px150 = PE.pixelsForSize(s, 150);
  assert.equal(px150.w, 1200);
  assert.equal(px150.h, 1500);
});

test('centerCropForTarget crops width when source is wider', () => {
  // 4000x3000 source, target 2:3 (portrait) - very tall target vs landscape source
  const c = PE.centerCropForTarget(4000, 3000, 2, 3);
  // targetAspect = 2/3 = 0.667, srcAspect = 4/3 = 1.333 -> source wider -> crop width
  assert.equal(c.h, 3000);
  assert.ok(c.w < 4000);
  assert.ok(c.x > 0);
  assert.equal(c.y, 0);
});

test('centerCropForTarget crops height when source is narrower', () => {
  const c = PE.centerCropForTarget(2000, 4000, 3, 2); // target landscape, source portrait
  assert.equal(c.w, 2000);
  assert.ok(c.h < 4000);
  assert.ok(c.y > 0);
  assert.equal(c.x, 0);
});

test('gradePhotoForSize returns gallery grade at 300+ DPI', () => {
  // 6000x4000 photo on 8x10 - target aspect 4/5 = 0.8, source aspect 1.5
  const s = PE.SIZES.find(x => x.name === '8x10');
  const g = PE.gradePhotoForSize(6000, 4000, s);
  assert.ok(g.dpi >= 300);
  assert.equal(g.grade, 'gallery');
  assert.equal(g.printable, true);
});

test('gradePhotoForSize returns low grade for tiny images', () => {
  const s = PE.SIZES.find(x => x.name === '24x36');
  const g = PE.gradePhotoForSize(800, 1200, s);
  assert.ok(g.dpi < 150);
  assert.equal(g.grade, 'low');
  assert.equal(g.printable, false);
});

test('gradePhotoForSize auto-rotates for better DPI', () => {
  // Landscape source, portrait target: rotation should give better DPI
  const portraitSize = PE.SIZES.find(x => x.name === '8x12'); // 2:3 portrait
  const g = PE.gradePhotoForSize(6000, 4000, portraitSize);
  assert.equal(g.rotated, true);
});

test('gradePhotoAllSizes returns entry per catalog size', () => {
  const grades = PE.gradePhotoAllSizes(4000, 3000);
  assert.equal(grades.length, PE.SIZES.length);
  for (const g of grades) {
    assert.ok(['gallery','excellent','good','acceptable','low'].includes(g.grade));
  }
});

test('generateSVG produces valid SVG for every genre, deterministic', () => {
  for (const g of PE.GENRES) {
    const a = PE.generateSVG(g, 42, 1000, 1500);
    const b = PE.generateSVG(g, 42, 1000, 1500);
    assert.equal(a, b, `genre ${g} not deterministic`);
    assert.ok(a.startsWith('<svg'), `genre ${g} missing svg opening`);
    assert.ok(a.endsWith('</svg>'), `genre ${g} missing svg closing`);
    assert.ok(a.includes('viewBox'), `genre ${g} missing viewBox`);
  }
});

test('generateSVG differs across seeds', () => {
  const a = PE.generateSVG('abstract-geo', 1, 1000, 1500);
  const b = PE.generateSVG('abstract-geo', 2, 1000, 1500);
  assert.notEqual(a, b);
});

test('buildCatalog is deterministic and yields 144 unique ids', () => {
  const a = PE.buildCatalog(144);
  const b = PE.buildCatalog(144);
  assert.equal(a.length, 144);
  assert.deepEqual(a, b);
  const ids = new Set(a.map(x => x.id));
  assert.equal(ids.size, 144);
});

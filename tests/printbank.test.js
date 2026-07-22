// PrintBank regression tests. Run with: node tests/printbank.test.js
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '..', 'products', 'printbank', 'public', 'print-engine.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓', name); passed++; }
  catch (e) { console.error('  ✗', name, '\n   ', e.message); failed++; }
}

console.log('PrintBank engine tests\n');

test('SIZES catalog has 24 standard sizes', () => {
  assert.ok(Array.isArray(E.SIZES));
  assert.ok(E.SIZES.length >= 24, `expected >=24 sizes, got ${E.SIZES.length}`);
});

test('SIZES includes core Etsy sizes', () => {
  const names = E.SIZES.map(s => s.name);
  ['4×6', '5×7', '8×10', '11×14', '16×20', '24×36', 'A4', 'A3'].forEach(n => {
    assert.ok(names.includes(n), `missing size ${n}`);
  });
});

test('pixelsForSize 8×10 @ 300 DPI = 2400×3000', () => {
  const s = E.SIZES.find(x => x.name === '8×10');
  const px = E.pixelsForSize(s, 300);
  assert.strictEqual(px.w, 2400);
  assert.strictEqual(px.h, 3000);
});

test('effectiveDpi: 3000×4000 photo on 8×10 → 300 DPI (aspect ratio matches after crop)', () => {
  const s = E.SIZES.find(x => x.name === '8×10');
  const dpi = E.effectiveDpi(3000, 4000, s);
  // Photo is 3:4, target is 4:5. After crop: shorter side / shorter inch.
  // Photo AR 0.75 < target 0.8 → crop top/bottom. cropW=3000, cropH=3750. dpiW=3000/8=375, dpiH=3750/10=375.
  assert.ok(Math.abs(dpi - 375) < 0.1, `expected ~375, got ${dpi}`);
});

test('gradeDpi thresholds', () => {
  assert.strictEqual(E.gradeDpi(350), 'gallery');
  assert.strictEqual(E.gradeDpi(300), 'gallery');
  assert.strictEqual(E.gradeDpi(250), 'excellent');
  assert.strictEqual(E.gradeDpi(200), 'good');
  assert.strictEqual(E.gradeDpi(160), 'acceptable');
  assert.strictEqual(E.gradeDpi(100), 'low');
});

test('gradePhoto auto-rotates for better fit', () => {
  const s = E.SIZES.find(x => x.name === '4×6'); // portrait 2:3
  // Landscape photo 6000×4000 — rotated fits better.
  const g = E.gradePhoto(6000, 4000, s);
  assert.strictEqual(g.rotated, true);
  assert.ok(g.dpi > 600, `expected high DPI when rotated, got ${g.dpi}`);
});

test('cropRect centers crop correctly', () => {
  const s = E.SIZES.find(x => x.name === '8×10'); // 4:5
  const c = E.cropRect(1000, 1000, s); // square photo → crop top/bottom
  assert.strictEqual(c.w, 800);
  assert.strictEqual(c.h, 1000);
  assert.strictEqual(c.x, 100);
  assert.strictEqual(c.y, 0);
});

test('generateSVG produces valid SVG for every genre', () => {
  E.GENRES.forEach(g => {
    const svg = E.generateSVG(g, 'test-seed');
    assert.ok(svg.startsWith('<svg'), `${g}: bad start`);
    assert.ok(svg.endsWith('</svg>'), `${g}: bad end`);
    assert.ok(svg.includes('viewBox'), `${g}: no viewBox`);
  });
});

test('generateSVG is deterministic (same seed → same output)', () => {
  const a = E.generateSVG('geometric', 'seed-42');
  const b = E.generateSVG('geometric', 'seed-42');
  assert.strictEqual(a, b);
});

test('generateSVG differs across seeds', () => {
  const a = E.generateSVG('geometric', 'seed-a');
  const b = E.generateSVG('geometric', 'seed-b');
  assert.notStrictEqual(a, b);
});

test('buildCatalog is deterministic and produces 144 items', () => {
  const c1 = E.buildCatalog(144);
  const c2 = E.buildCatalog(144);
  assert.strictEqual(c1.length, 144);
  assert.deepStrictEqual(c1, c2);
  // ids unique
  const ids = new Set(c1.map(i => i.id));
  assert.strictEqual(ids.size, 144);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

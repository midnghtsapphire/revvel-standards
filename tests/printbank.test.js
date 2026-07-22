// PrintBank regression tests. Run: node tests/printbank.test.js
const path = require('path');
const E = require(path.join(__dirname, '..', 'products', 'printbank', 'public', 'print-engine.js'));

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push(`  ok  ${name}`);
  } catch (e) {
    failed++;
    results.push(`  FAIL ${name}\n       ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

test('size catalog contains 24 sizes across expected families', () => {
  const sizes = E.getSizes();
  assert(sizes.length === 24, `expected 24 sizes, got ${sizes.length}`);
  const families = new Set(sizes.map((s) => s.family));
  ['2:3', '3:4', '4:5', '5:7', '1:1', 'ISO'].forEach((f) => {
    assert(families.has(f), `missing family ${f}`);
  });
});

test('pixelsForSize computes correct pixels at 300 DPI', () => {
  const s = E.getSize('8x10');
  const p = E.pixelsForSize(s, 300);
  assert(p.w === 2400 && p.h === 3000, `expected 2400x3000, got ${p.w}x${p.h}`);
});

test('computeCrop center-crops a landscape photo to portrait 4x5', () => {
  const s = E.getSize('8x10'); // portrait 4:5
  const crop = E.computeCrop(6000, 4000, s);
  // landscape photo + portrait size → auto-rotate → target becomes 10x8 (5:4)
  assert(crop.rotated === true, 'expected rotation');
  // target aspect 10/8 = 1.25; photo aspect 1.5 → crop width
  assert(crop.w < 6000, 'should crop width');
  assert(crop.h === 4000, 'should keep full height');
  assert(crop.effectiveDpi > 0, 'should compute effective dpi');
});

test('gradeDpi returns gallery for 300+, low for <150', () => {
  assert(E.gradeDpi(320).grade === 'gallery');
  assert(E.gradeDpi(300).grade === 'gallery');
  assert(E.gradeDpi(250).grade === 'excellent');
  assert(E.gradeDpi(220).grade === 'good');
  assert(E.gradeDpi(170).grade === 'acceptable');
  assert(E.gradeDpi(120).grade === 'low');
  assert(E.gradeDpi(120).ok === false);
});

test('gradeAllSizes returns entry per standard size', () => {
  const all = E.gradeAllSizes(6000, 4000);
  assert(all.length === 24);
  all.forEach((entry) => {
    assert(entry.result && typeof entry.result.effectiveDpi === 'number');
  });
});

test('a 24MP photo prints 12x18 at gallery grade', () => {
  const s = E.getSize('12x18');
  const r = E.gradePhoto(6000, 4000, s);
  assert(r.grade === 'gallery' || r.grade === 'excellent', `got ${r.grade} @ ${r.effectiveDpi} dpi`);
});

test('a 2MP photo is rejected at 16x20', () => {
  const s = E.getSize('16x20');
  const r = E.gradePhoto(1600, 1200, s);
  assert(r.ok === false, `expected low, got ${r.grade}`);
});

test('generateSvg is deterministic for the same id', () => {
  const a = E.generateSvg('pb-botanical-001', { width: 400, height: 500, genre: 'botanical' });
  const b = E.generateSvg('pb-botanical-001', { width: 400, height: 500, genre: 'botanical' });
  assert(a === b, 'same id should produce identical svg');
});

test('every genre generator produces valid <svg> root', () => {
  E.GENRES.forEach((g) => {
    const svg = E.generateSvg(`pb-${g}-test`, { width: 200, height: 200, genre: g });
    assert(svg.startsWith('<svg'), `${g} did not produce <svg>`);
    assert(svg.includes('</svg>'), `${g} did not close </svg>`);
    assert(svg.includes('viewBox'), `${g} missing viewBox`);
  });
});

test('buildCatalog produces 144 unique ids', () => {
  const cat = E.buildCatalog(144);
  assert(cat.length === 144);
  const ids = new Set(cat.map((p) => p.id));
  assert(ids.size === 144, 'duplicate ids');
});

test('buildCatalog is reproducible', () => {
  const a = E.buildCatalog(144).map((p) => p.id).join('|');
  const b = E.buildCatalog(144).map((p) => p.id).join('|');
  assert(a === b, 'catalog not reproducible');
});

console.log(results.join('\n'));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

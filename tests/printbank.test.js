const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const engine = require(path.join(
  __dirname,
  "..",
  "products",
  "printbank",
  "public",
  "print-engine.js"
));

test("listSizes exposes the standard print-size catalog", () => {
  const sizes = engine.listSizes();
  assert.ok(sizes.length >= 20);
  const ids = sizes.map((s) => s.id);
  assert.ok(ids.includes("8x10in"));
  assert.ok(ids.includes("a4"));
  assert.ok(ids.includes("24x36in"));
  // Every size maps to a known ratio.
  const ratioIds = engine.listRatios().map((r) => r.id);
  sizes.forEach((s) => assert.ok(ratioIds.includes(s.ratioId), s.id));
});

test("pixelsForSize computes 300 DPI dimensions for 8x10", () => {
  const px = engine.pixelsForSize("8x10in", 300);
  assert.deepEqual(px, { width: 2400, height: 3000 });
});

test("pixelsForSize handles ISO sizes and rejects bad dpi", () => {
  const a4 = engine.pixelsForSize("a4", 300);
  // A4 = 210 × 297 mm → 2480 × 3508 px at 300 DPI (industry standard).
  assert.equal(a4.width, 2480);
  assert.equal(a4.height, 3508);
  assert.throws(() => engine.pixelsForSize("8x10in", 0), /dpi/);
  assert.throws(() => engine.pixelsForSize("nope", 300), /Unknown size/);
});

test("centerCropRect crops the wider dimension and stays centered", () => {
  // 4000×3000 source cropped to 4:5 portrait → width shrinks to 2400.
  const rect = engine.centerCropRect(4000, 3000, 4, 5);
  assert.deepEqual(rect, { x: 800, y: 0, width: 2400, height: 3000 });
  // Already matching aspect → full frame.
  const same = engine.centerCropRect(800, 1000, 4, 5);
  assert.deepEqual(same, { x: 0, y: 0, width: 800, height: 1000 });
  assert.throws(() => engine.centerCropRect(0, 100, 1, 1), /positive/);
});

test("gradePhotoForSize grades by effective DPI after crop", () => {
  // 2400×3000 photo is exactly 300 DPI on 8×10.
  const g = engine.gradePhotoForSize({ width: 2400, height: 3000 }, "8x10in");
  assert.equal(g.effectiveDpi, 300);
  assert.equal(g.grade, "gallery");
  assert.equal(g.printable, true);
  // Tiny photo grades low and unprintable.
  const low = engine.gradePhotoForSize({ width: 600, height: 750 }, "8x10in");
  assert.equal(low.grade, "low");
  assert.equal(low.printable, false);
});

test("gradePhotoForSize auto-rotates landscape photos for portrait sizes", () => {
  // 3000×2400 landscape should rotate to fit 8×10 portrait at full 300 DPI.
  const g = engine.gradePhotoForSize({ width: 3000, height: 2400 }, "8x10in");
  assert.equal(g.rotate, true);
  assert.equal(g.effectiveDpi, 300);
});

test("recommendSizes returns all sizes sorted by effective DPI", () => {
  const recs = engine.recommendSizes({ width: 3000, height: 2400 });
  assert.equal(recs.length, engine.listSizes().length);
  for (let i = 1; i < recs.length; i += 1) {
    assert.ok(recs[i - 1].effectiveDpi >= recs[i].effectiveDpi);
  }
});

test("generatePrint is deterministic for identical inputs", () => {
  const a = engine.generatePrint({ genreId: "bauhaus", seed: 42, ratioId: "4x5" });
  const b = engine.generatePrint({ genreId: "bauhaus", seed: 42, ratioId: "4x5" });
  assert.equal(a.svg, b.svg);
  assert.equal(a.title, b.title);
  const c = engine.generatePrint({ genreId: "bauhaus", seed: 43, ratioId: "4x5" });
  assert.notEqual(a.svg, c.svg);
});

test("generatePrint produces valid scalable SVG for every genre", () => {
  engine.listGenres().forEach(({ id }) => {
    const print = engine.generatePrint({ genreId: id, seed: 7, ratioId: "2x3" });
    assert.ok(print.svg.startsWith("<svg"), id);
    assert.ok(print.svg.includes("viewBox="), id);
    assert.ok(!print.svg.includes("NaN"), id);
    assert.ok(!print.svg.includes("undefined"), id);
    assert.equal(print.genreId, id);
    assert.ok(print.title.length > 0, id);
  });
  assert.throws(() => engine.generatePrint({ genreId: "nope", seed: 1 }), /Unknown genre/);
});

test("buildCatalog is deterministic and covers all genres", () => {
  const one = engine.buildCatalog({ perGenre: 3 });
  const two = engine.buildCatalog({ perGenre: 3 });
  assert.equal(one.length, engine.listGenres().length * 3);
  assert.deepEqual(one.map((p) => p.id), two.map((p) => p.id));
  assert.deepEqual(one.map((p) => p.svg), two.map((p) => p.svg));
  const genresSeen = new Set(one.map((p) => p.genreId));
  assert.equal(genresSeen.size, engine.listGenres().length);
});

test("sizesForRatio groups sizes correctly", () => {
  const iso = engine.sizesForRatio("iso");
  assert.equal(iso.length, 6);
  iso.forEach((s) => assert.equal(s.ratioId, "iso"));
  assert.ok(engine.sizesForRatio("2x3").length >= 5);
});

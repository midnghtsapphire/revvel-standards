const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const engine = require(path.join(
  __dirname,
  "..",
  "products",
  "wr-4600-photon-bench",
  "dose-engine.js"
));

test("fluence follows J/cm2 = mW/cm2 * s / 1000", () => {
  // 50 mW/cm2 for 60 s = 3.0 J/cm2 (the dashboard's default reading).
  assert.equal(engine.fluence(50, 60), 3);
  assert.equal(engine.fluence(25, 120), 3);
  assert.equal(engine.fluence(0, 100), 0);
  assert.equal(engine.fluence(100, 0), 0);
});

test("fluence rejects negative or non-finite inputs", () => {
  assert.throws(() => engine.fluence(-1, 60), /irradiance/);
  assert.throws(() => engine.fluence(50, -1), /exposure/);
  assert.throws(() => engine.fluence(NaN, 60), /irradiance/);
});

test("irradiance and fluence are independent — Lopes 55 vs 155 mW/cm2", () => {
  // Same 0.9 J/cm2 delivered at two irradiances (opposite outcomes in vivo).
  // The engine must reach the identical fluence via different exposure times,
  // never collapsing power density and dose into one number.
  const t55 = engine.secondsForFluence(0.9, 55);
  const t155 = engine.secondsForFluence(0.9, 155);
  assert.equal(Number(engine.fluence(55, t55).toFixed(3)), 0.9);
  assert.equal(Number(engine.fluence(155, t155).toFixed(3)), 0.9);
  assert.ok(t55 > t155, "lower irradiance needs longer exposure for same dose");
});

test("secondsForFluence inverts fluence and handles zero irradiance", () => {
  assert.equal(engine.secondsForFluence(3, 50), 60);
  assert.equal(engine.secondsForFluence(0, 0), 0);
  assert.equal(engine.secondsForFluence(3, 0), Infinity);
});

test("totalJoules scales fluence by spot area", () => {
  assert.equal(engine.totalJoules(3, 60), 180);
  assert.throws(() => engine.totalJoules(3, 0), /spotArea/);
});

test("relativeResponse is biphasic — peaks near proliferation dose", () => {
  const peak = engine.relativeResponse(engine.PROLIFERATION_PEAK);
  const below = engine.relativeResponse(0.05);
  const above = engine.relativeResponse(200);
  assert.ok(peak > below, "peak beats subthreshold");
  assert.ok(peak > above, "peak beats inhibitory overdose");
  assert.ok(peak > 0.99, "peak is near 1 at the proliferation dose");
  assert.equal(engine.relativeResponse(0), 0);
  assert.equal(engine.relativeResponse(-5), 0);
});

test("classify names the zone against the therapeutic windows", () => {
  // 3 J/cm2 at 50 mW/cm2 → therapeutic, both parameters in band.
  const good = engine.classify(50, 60);
  assert.equal(good.zone, "therapeutic");
  assert.equal(good.fluenceInBand, true);
  assert.equal(good.irradianceInBand, true);

  // Tiny dose → subthreshold ("nothing").
  const low = engine.classify(50, 5); // 0.25 J/cm2
  assert.equal(low.zone, "subthreshold");
  assert.equal(low.fluenceInBand, false);

  // Big dose → inhibitory (descending limb).
  const high = engine.classify(50, 600); // 30 J/cm2
  assert.equal(high.zone, "inhibitory");

  // Irradiance out of band even when fluence lands in band (155 mW/cm2).
  const hotPower = engine.classify(155, 60); // 9.3 J/cm2
  assert.equal(hotPower.fluenceInBand, true);
  assert.equal(hotPower.irradianceInBand, false);
});

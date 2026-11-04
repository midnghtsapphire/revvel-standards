const scenarios = [
  { id: "A", base: 50, essay: 87, w: { proximity: 0.35, concealment: 0.05, metrology: 0.25, seismic: 0.05, acidity: -0.15 } },
  { id: "B", base: 30, essay: 64, w: { proximity: 0.15, concealment: -0.45, metrology: 0.15, seismic: 0.6, acidity: 0.2 } },
  { id: "C", base: 35, essay: 78, w: { proximity: 0.05, concealment: 0.55, metrology: 0.4, seismic: -0.2, acidity: 0.05 } },
];
const keys = ["proximity", "concealment", "metrology", "seismic", "acidity"];
const defaults = { proximity: 85, concealment: 90, metrology: 78, seismic: 65, acidity: 40 };

function raw(scenario, drivers) {
  return keys.reduce((sum, key) => sum + scenario.w[key] * drivers[key], scenario.base);
}
function asWritten(value) {
  return Math.max(1, Math.min(99, Math.round(value)));
}

const rows = scenarios.map((scenario) => {
  const value = raw(scenario, defaults);
  return { ...scenario, raw: value, shown: asWritten(value) };
});
const expected = { A: [101, 99], B: [60.95, 61], C: [108.95, 99] };
for (const row of rows) {
  const [wantRaw, wantShown] = expected[row.id];
  if (Math.abs(row.raw - wantRaw) > 1e-9) {
    throw new Error(`${row.id} raw ${row.raw} !== ${wantRaw}`);
  }
  if (row.shown !== wantShown) throw new Error(`${row.id} shown ${row.shown} !== ${wantShown}`);
  if (row.shown === row.essay) throw new Error(`${row.id} unexpectedly matched the essay`);
}
const structural = rows.map((row) => Math.max(0, row.raw));
const total = structural.reduce((sum, value) => sum + value, 0);
const shares = structural.map((value) => (value / total) * 100);
const shareSum = shares.reduce((sum, value) => sum + value, 0);
if (Math.abs(shareSum - 100) > 1e-6) throw new Error(`shares sum to ${shareSum}`);
if (!(shares[2] > shares[0] && shares[0] > shares[1])) {
  throw new Error(`expected C > A > B, got ${shares}`);
}
console.log("verify.mjs ok");
console.log(
  rows
    .map((row, index) => `${row.id} essay ${row.essay} shown ${row.shown} raw ${row.raw} share ${shares[index].toFixed(2)}`)
    .join("\n"),
);

import assert from "node:assert/strict";
import {
  buildCsvExport,
  buildMarkdownReport,
  calculateDuctSize,
  calculateEnergy,
  calculateLoad,
  normalizeLoadInputs,
  recommendEquipment,
} from "../app/data/calculator";

// ─────────────────────────────────────────────────────────
// normalizeLoadInputs
// ─────────────────────────────────────────────────────────

const defaultInputs = normalizeLoadInputs({});
assert.equal(defaultInputs.floorArea, 1500);
assert.equal(defaultInputs.ceilingHeight, 9);
assert.equal(defaultInputs.windowFraction, 0.15);
assert.equal(defaultInputs.climateZoneId, "3a");
assert.equal(defaultInputs.insulationLevelId, "good");

// Edge case: negative / NaN values should be clamped/defaulted
const sanitized = normalizeLoadInputs({
  floorArea: -500,
  ceilingHeight: 200,
  windowFraction: 2.0,
  occupants: -1,
});
assert.equal(sanitized.floorArea, 100,        "floorArea clamped to min 100");
assert.equal(sanitized.ceilingHeight, 20,     "ceilingHeight clamped to max 20");
assert.equal(sanitized.windowFraction, 0.50,  "windowFraction clamped to max 0.50");
assert.equal(sanitized.occupants, 0,          "occupants clamped to min 0");

// ─────────────────────────────────────────────────────────
// calculateLoad — basic sanity checks
// ─────────────────────────────────────────────────────────

const atlantaGoodLoad = calculateLoad({
  floorArea: 2000,
  climateZoneId: "3a",
  insulationLevelId: "good",
  occupants: 4,
});

assert.ok(
  atlantaGoodLoad.sensibleCoolingLoad > 0,
  "Atlanta cooling load must be positive"
);
assert.ok(
  atlantaGoodLoad.sensibleHeatingLoad > 0,
  "Atlanta heating load must be positive"
);
assert.ok(
  atlantaGoodLoad.recommendedCoolingTons > 0,
  "recommendedCoolingTons must be positive"
);
assert.ok(
  atlantaGoodLoad.recommendedCoolingTons < 20,
  "recommendedCoolingTons < 20 for 2000 sq ft"
);

// Poor insulation → higher load than good insulation
const atlantaPoorLoad = calculateLoad({
  floorArea: 2000,
  climateZoneId: "3a",
  insulationLevelId: "poor",
  occupants: 4,
});
assert.ok(
  atlantaPoorLoad.sensibleCoolingLoad > atlantaGoodLoad.sensibleCoolingLoad,
  "Poor insulation increases cooling load vs good insulation"
);
assert.ok(
  atlantaPoorLoad.sensibleHeatingLoad > atlantaGoodLoad.sensibleHeatingLoad,
  "Poor insulation increases heating load vs good insulation"
);

// Cold climate (Minneapolis) should have higher heating than Atlanta
const minneapolisLoad = calculateLoad({
  floorArea: 2000,
  climateZoneId: "6a",
  insulationLevelId: "good",
  occupants: 4,
});
assert.ok(
  minneapolisLoad.sensibleHeatingLoad > atlantaGoodLoad.sensibleHeatingLoad,
  "Minneapolis heating load > Atlanta heating load"
);

// Hot climate (Phoenix) should have higher cooling than Atlanta
const phoenixLoad = calculateLoad({
  floorArea: 2000,
  climateZoneId: "2b",
  insulationLevelId: "good",
  occupants: 4,
});
assert.ok(
  phoenixLoad.sensibleCoolingLoad > atlantaGoodLoad.sensibleCoolingLoad,
  "Phoenix cooling load > Atlanta cooling load"
);

// Load breakdown should sum to total (within 1 BTU rounding)
const breakdownSum = Object.values(atlantaGoodLoad.coolingBreakdown).reduce(
  (s, v) => s + v,
  0
);
assert.ok(
  Math.abs(breakdownSum - atlantaGoodLoad.sensibleCoolingLoad) < 5,
  "Cooling breakdown components sum to total load (within 5 BTU)"
);

// ─────────────────────────────────────────────────────────
// recommendEquipment
// ─────────────────────────────────────────────────────────

const rec1 = recommendEquipment(18000); // 1.5 tons exactly
assert.equal(rec1.nominalTons, 1.5);
assert.equal(rec1.verdict, "optimal");

const rec2 = recommendEquipment(36000); // 3.0 tons exactly
assert.equal(rec2.nominalTons, 3.0);
assert.equal(rec2.verdict, "optimal");

const rec3 = recommendEquipment(10000); // 0.83 tons → 1.0 ton nominal → oversized
assert.equal(rec3.nominalTons, 1.0);
assert.ok(
  rec3.verdict === "slightly-oversized" || rec3.verdict === "oversized",
  "1.0 ton for 10,000 BTU load should flag as oversized"
);

const rec4 = recommendEquipment(100000); // 8.3 tons → 10 ton?  above max → capped
assert.ok(rec4.nominalTons >= 6, "Large load → largest available size");

// ─────────────────────────────────────────────────────────
// calculateDuctSize
// ─────────────────────────────────────────────────────────

const duct = calculateDuctSize({ coolingLoadBtu: 36000 });
assert.ok(duct.requiredCfm > 0, "CFM must be positive");
assert.ok(duct.roundDuctDiameter > 0, "Round duct diameter must be positive");
assert.ok(
  duct.rectangularDuct.width > 0 && duct.rectangularDuct.height > 0,
  "Rectangular duct dimensions must be positive"
);

// 36,000 BTU / (1.1 × 20°F) = ~1636 CFM
assert.ok(
  Math.abs(duct.requiredCfm - 1636) < 5,
  "36,000 BTU duct CFM ≈ 1636"
);

// ─────────────────────────────────────────────────────────
// calculateEnergy
// ─────────────────────────────────────────────────────────

const energy = calculateEnergy({
  coolingLoadBtu: 24000,
  heatingLoadBtu: 30000,
  seer2: 16,
  hspf2: 8.5,
  electricityRateCentsKwh: 16,
  climateZoneId: "3a",
  isFurnace: false,
});

assert.ok(energy.annualCoolingKwh > 0, "Annual cooling kWh must be positive");
assert.ok(energy.annualCoolingCost > 0, "Annual cooling cost must be positive");
assert.ok(energy.annualHeatingKwh > 0, "Annual heating kWh must be positive");
assert.ok(energy.totalAnnualCost > 0, "Total annual cost must be positive");
assert.equal(
  energy.totalAnnualCost,
  Math.round((energy.annualCoolingCost + energy.annualHeatingCost) * 100) / 100,
  "Total cost = cooling + heating cost"
);

// Gas furnace path
const energyGas = calculateEnergy({
  coolingLoadBtu: 24000,
  heatingLoadBtu: 30000,
  seer2: 16,
  hspf2: 0.95, // AFUE 95%
  electricityRateCentsKwh: 16,
  gasRateDollarsTherm: 1.5,
  climateZoneId: "3a",
  isFurnace: true,
});
assert.ok(energyGas.annualHeatingCost > 0, "Gas heating cost must be positive");

// Higher SEER2 → lower cooling cost
const energyHighSeer = calculateEnergy({
  coolingLoadBtu: 24000,
  heatingLoadBtu: 30000,
  seer2: 22,
  hspf2: 8.5,
  electricityRateCentsKwh: 16,
  climateZoneId: "3a",
  isFurnace: false,
});
assert.ok(
  energyHighSeer.annualCoolingCost < energy.annualCoolingCost,
  "Higher SEER2 → lower annual cooling cost"
);

// ─────────────────────────────────────────────────────────
// buildMarkdownReport
// ─────────────────────────────────────────────────────────

const inputs = normalizeLoadInputs({
  floorArea: 2000,
  climateZoneId: "3a",
  insulationLevelId: "good",
  occupants: 3,
});
const load = calculateLoad(inputs);
const report = buildMarkdownReport(inputs, load, energy, duct);

assert.match(report, /HVAC Load Calculation Report/, "Report has title");
assert.match(report, /Cooling Load/, "Report has cooling load section");
assert.match(report, /Heating Load/, "Report has heating load section");
assert.match(report, /Disclaimer/, "Report has disclaimer");

// ─────────────────────────────────────────────────────────
// buildCsvExport
// ─────────────────────────────────────────────────────────

const csv = buildCsvExport(load, energy);
assert.match(csv, /"Metric","Value","Unit"/, "CSV has header row");
assert.match(csv, /"Cooling Load"/, "CSV has cooling load row");
assert.match(csv, /"Total Annual Cost"/, "CSV has annual cost row when energy provided");

const csvNoEnergy = buildCsvExport(load);
assert.doesNotMatch(csvNoEnergy, /"Total Annual Cost"/, "CSV omits energy rows when not provided");

console.log("✅ All HVAC calculator tests passed.");

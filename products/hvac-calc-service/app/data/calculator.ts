/**
 * HVAC Calculation Engine
 *
 * Implements simplified Manual J (ACCA) load calculations for residential
 * and light-commercial HVAC sizing.  All formulas follow:
 *   - ACCA Manual J 8th Edition (simplified approach)
 *   - ASHRAE Handbook of Fundamentals (2021)
 *   - ACCA Manual D for duct sizing
 *   - ACCA Manual S for equipment selection
 *
 * Units: BTU/hr for heat, sq ft for area, °F for temperature,
 *        CFM for airflow, tons (1 ton = 12,000 BTU/hr) for equipment.
 */

import {
  ANNUAL_COOLING_HOURS,
  ANNUAL_HEATING_HOURS,
  CLIMATE_ZONES,
  INFILTRATION_ACH,
  INFILTRATION_FACTOR,
  INSULATION_LEVELS,
  INTERNAL_GAIN_BTU_PER_SQFT,
  OCCUPANT_SENSIBLE_GAIN_BTU,
  REFRIGERANTS,
  SOLAR_IRRADIANCE_BTU,
  WINDOW_SHGC,
  type ClimateZone,
  type InsulationLevel,
  type Refrigerant,
} from "./constants";

// ─────────────────────────────────────────────────────────
// Input / Output Types
// ─────────────────────────────────────────────────────────

export interface LoadInputs {
  /** Conditioned floor area (sq ft) */
  floorArea: number;
  /** Ceiling height (ft) */
  ceilingHeight: number;
  /** Window area as fraction of floor area (0.10 = 10%) */
  windowFraction: number;
  /** Number of occupants */
  occupants: number;
  /** Climate zone id (e.g. "3a") */
  climateZoneId: string;
  /** Insulation level id ("poor" | "fair" | "good" | "excellent") */
  insulationLevelId: string;
  /** Indoor cooling setpoint (°F, default 75) */
  indoorCoolingSetpoint?: number;
  /** Indoor heating setpoint (°F, default 70) */
  indoorHeatingSetpoint?: number;
}

export interface LoadResult {
  /** Sensible cooling load (BTU/hr) */
  sensibleCoolingLoad: number;
  /** Sensible heating load (BTU/hr) */
  sensibleHeatingLoad: number;
  /** Recommended equipment size (tons, cooling) */
  recommendedCoolingTons: number;
  /** Recommended equipment size (BTU/hr, heating) */
  recommendedHeatingBtu: number;
  /** Breakdown of cooling load components (BTU/hr) */
  coolingBreakdown: CoolingBreakdown;
  /** Breakdown of heating load components (BTU/hr) */
  heatingBreakdown: HeatingBreakdown;
  /** Climate zone used */
  climateZone: ClimateZone;
  /** Insulation level used */
  insulationLevel: InsulationLevel;
}

export interface CoolingBreakdown {
  wallTransmission: number;
  ceilingTransmission: number;
  floorTransmission: number;
  windowTransmission: number;
  solarGain: number;
  infiltration: number;
  internalGain: number;
  occupantGain: number;
}

export interface HeatingBreakdown {
  wallTransmission: number;
  ceilingTransmission: number;
  floorTransmission: number;
  windowTransmission: number;
  infiltration: number;
}

// ─────────────────────────────────────────────────────────
// Load Calculation (Manual J simplified)
// ─────────────────────────────────────────────────────────

/**
 * Sanitize and validate LoadInputs — returns safe values with defaults.
 */
export function normalizeLoadInputs(raw: Partial<LoadInputs>): LoadInputs {
  return {
    floorArea: Math.max(100, Number.isFinite(raw.floorArea) ? raw.floorArea : 1500),
    ceilingHeight: clamp(Number.isFinite(raw.ceilingHeight) ? raw.ceilingHeight : 9, 7, 20),
    windowFraction: clamp(Number.isFinite(raw.windowFraction) ? raw.windowFraction : 0.15, 0.05, 0.50),
    occupants: clamp(Math.round(Number.isFinite(raw.occupants) ? raw.occupants : 2), 0, 50),
    climateZoneId:
      typeof raw.climateZoneId === "string" && CLIMATE_ZONES.some((z) => z.id === raw.climateZoneId)
        ? raw.climateZoneId
        : "3a",
    insulationLevelId:
      typeof raw.insulationLevelId === "string" && INSULATION_LEVELS.some((l) => l.id === raw.insulationLevelId)
        ? raw.insulationLevelId
        : "good",
    indoorCoolingSetpoint: clamp(
      Number.isFinite(raw.indoorCoolingSetpoint) ? raw.indoorCoolingSetpoint : 75,
      68,
      80
    ),
    indoorHeatingSetpoint: clamp(
      Number.isFinite(raw.indoorHeatingSetpoint) ? raw.indoorHeatingSetpoint : 70,
      60,
      78
    ),
  };
}

/**
 * Calculate HVAC heating and cooling loads using Manual J simplified method.
 *
 * For a square building the perimeter-to-area ratio is estimated as
 * 4 × √(floorArea).  Wall area = perimeter × ceilingHeight.
 */
export function calculateLoad(rawInputs: Partial<LoadInputs>): LoadResult {
  const inputs = normalizeLoadInputs(rawInputs);

  const zone = CLIMATE_ZONES.find((z) => z.id === inputs.climateZoneId);
  const ins = INSULATION_LEVELS.find((l) => l.id === inputs.insulationLevelId);
  if (!zone || !ins) {
    throw new Error(`Unknown climateZoneId=${inputs.climateZoneId} or insulationLevelId=${inputs.insulationLevelId}`);
  }

  const indoorCool = inputs.indoorCoolingSetpoint!;
  const indoorHeat = inputs.indoorHeatingSetpoint!;

  // ── Geometric assumptions ─────────────────────────────
  const perimeter = 4 * Math.sqrt(inputs.floorArea);            // ft
  const wallArea = perimeter * inputs.ceilingHeight;            // ft²
  const windowArea = Math.min(wallArea, inputs.floorArea * inputs.windowFraction); // ft²
  const netWallArea = wallArea - windowArea;                    // ft²
  const ceilingArea = inputs.floorArea;                        // ft²
  const floorArea = inputs.floorArea;                          // ft²
  const volume = inputs.floorArea * inputs.ceilingHeight;      // ft³ (conditioned volume)

  // ── Cooling load ─────────────────────────────────────
  const coolingDeltaT = zone.designCoolingTemp - indoorCool;

  const coolingBreakdown: CoolingBreakdown = {
    wallTransmission: round2(netWallArea * ins.wallUValue * coolingDeltaT),
    ceilingTransmission: round2(ceilingArea * ins.ceilingUValue * coolingDeltaT),
    floorTransmission: round2(floorArea * ins.floorUValue * coolingDeltaT * 0.3), // 30% factor — slab/ground contact
    windowTransmission: round2(windowArea * ins.windowUValue * coolingDeltaT),
    solarGain: round2(windowArea * WINDOW_SHGC * SOLAR_IRRADIANCE_BTU),
    infiltration: round2(
      (volume / 60) * INFILTRATION_ACH[inputs.insulationLevelId] * INFILTRATION_FACTOR * coolingDeltaT
    ),
    internalGain: round2(inputs.floorArea * INTERNAL_GAIN_BTU_PER_SQFT),
    occupantGain: round2(inputs.occupants * OCCUPANT_SENSIBLE_GAIN_BTU),
  };

  const sensibleCoolingLoad = Math.max(
    0,
    Object.values(coolingBreakdown).reduce((sum, v) => sum + v, 0)
  );

  // ── Heating load ─────────────────────────────────────
  const heatingDeltaT = indoorHeat - zone.designHeatingTemp;

  const heatingBreakdown: HeatingBreakdown = {
    wallTransmission: round2(netWallArea * ins.wallUValue * heatingDeltaT),
    ceilingTransmission: round2(ceilingArea * ins.ceilingUValue * heatingDeltaT),
    floorTransmission: round2(floorArea * ins.floorUValue * heatingDeltaT * 0.3),
    windowTransmission: round2(windowArea * ins.windowUValue * heatingDeltaT),
    infiltration: round2(
      (volume / 60) * INFILTRATION_ACH[inputs.insulationLevelId] * INFILTRATION_FACTOR * heatingDeltaT
    ),
  };

  const sensibleHeatingLoad = Math.max(
    0,
    Object.values(heatingBreakdown).reduce((sum, v) => sum + v, 0)
  );

  // ── Equipment sizing ─────────────────────────────────
  // Add 10% safety factor per Manual S guidelines (do not over-size)
  const recommendedCoolingTons = round2(sensibleCoolingLoad * 1.1 / 12000);
  const recommendedHeatingBtu = round2(sensibleHeatingLoad * 1.1);

  return {
    sensibleCoolingLoad: round2(sensibleCoolingLoad),
    sensibleHeatingLoad: round2(sensibleHeatingLoad),
    recommendedCoolingTons,
    recommendedHeatingBtu,
    coolingBreakdown,
    heatingBreakdown,
    climateZone: zone,
    insulationLevel: ins,
  };
}

// ─────────────────────────────────────────────────────────
// SEER / Energy Cost Calculator
// ─────────────────────────────────────────────────────────

export interface EnergyInputs {
  coolingLoadBtu: number;
  heatingLoadBtu: number;
  seer2: number;               // SEER2 rating (current DOE standard, ≈ SEER × 0.95)
  hspf2: number;               // HSPF2 for heat pump heating (or furnace AFUE as decimal for gas)
  electricityRateCentsKwh: number; // ¢/kWh
  gasRateDollarsTherm?: number;    // $/therm (if gas furnace)
  climateZoneId: string;
  isFurnace?: boolean;         // true = gas furnace heating; false = heat pump (default)
}

export interface EnergyResult {
  annualCoolingKwh: number;
  annualCoolingCost: number;
  annualHeatingKwh: number;    // kWh equiv even for gas (for comparison)
  annualHeatingCost: number;
  totalAnnualCost: number;
  co2EquivalentKg: number;     // based on US avg grid intensity 0.386 kg CO₂/kWh
}

/**
 * Calculate estimated annual energy use and cost.
 *
 * SEER2 formula: kWh = (BTU/hr × hours) / (SEER2 × 1000)
 * HSPF2 formula: kWh = (BTU/hr × hours) / (HSPF2 × 1000)
 * Gas formula:   therms = BTU_annual / (100,000 × AFUE)
 */
export function calculateEnergy(inputs: EnergyInputs): EnergyResult {
  const coolHours = ANNUAL_COOLING_HOURS[inputs.climateZoneId] ?? 1500;
  const heatHours = ANNUAL_HEATING_HOURS[inputs.climateZoneId] ?? 2000;

  const seer2 = Number.isFinite(inputs.seer2) && inputs.seer2 > 0 ? inputs.seer2 : 16;
  const hspf2 =
    Number.isFinite(inputs.hspf2) && inputs.hspf2 > 0
      ? inputs.hspf2
      : inputs.isFurnace
        ? 0.95
        : 8.5;
  const electricityRateCentsKwh =
    Number.isFinite(inputs.electricityRateCentsKwh) && inputs.electricityRateCentsKwh > 0
      ? inputs.electricityRateCentsKwh
      : 16;

  const annualCoolingKwh = round2((inputs.coolingLoadBtu * coolHours) / (seer2 * 1000));
  const annualCoolingCost = round2((annualCoolingKwh * electricityRateCentsKwh) / 100);

  let annualHeatingKwh: number;
  let annualHeatingCost: number;

  if (inputs.isFurnace && inputs.gasRateDollarsTherm !== undefined) {
    const afue = hspf2 > 1 ? hspf2 / 100 : hspf2;
    const safeAfue = afue >= 0.5 && afue <= 1 ? afue : 0.95;
    const therms = (inputs.heatingLoadBtu * heatHours) / (100_000 * safeAfue);
    annualHeatingCost = round2(therms * inputs.gasRateDollarsTherm);
    annualHeatingKwh = round2(therms * 29.3); // 1 therm ≈ 29.3 kWh
  } else {
    annualHeatingKwh = round2((inputs.heatingLoadBtu * heatHours) / (hspf2 * 1000));
    annualHeatingCost = round2((annualHeatingKwh * electricityRateCentsKwh) / 100);
  }

  const totalAnnualCost = round2(annualCoolingCost + annualHeatingCost);
  const co2EquivalentKg = round2((annualCoolingKwh + annualHeatingKwh) * 0.386);

  return {
    annualCoolingKwh,
    annualCoolingCost,
    annualHeatingKwh,
    annualHeatingCost,
    totalAnnualCost,
    co2EquivalentKg,
  };
}

// ─────────────────────────────────────────────────────────
// Duct Sizing (Manual D simplified)
// ─────────────────────────────────────────────────────────

export interface DuctInputs {
  /** Cooling load to supply (BTU/hr) */
  coolingLoadBtu: number;
  /** Supply–return temperature difference (°F) — typically 18–22°F */
  supplyDeltaT?: number;
  /** Target duct velocity (FPM) — supply 700–900, return 600–700 */
  targetVelocity?: number;
}

export interface DuctResult {
  /** Required airflow (CFM) */
  requiredCfm: number;
  /** Required duct cross-section area (sq in) */
  ductAreaSqIn: number;
  /** Equivalent round duct diameter (in) */
  roundDuctDiameter: number;
  /** Suggested rectangular duct (width × height, in) */
  rectangularDuct: { width: number; height: number };
}

/**
 * Calculate duct sizing for a given cooling load.
 *
 * CFM = BTU/hr / (1.1 × ΔT)
 * Duct area (ft²) = CFM / velocity (FPM)
 * Round diameter (in) = 2 × √(area / π) × 12
 */
export function calculateDuctSize(inputs: DuctInputs): DuctResult {
  const deltaT = inputs.supplyDeltaT ?? 20; // °F
  const velocity = inputs.targetVelocity ?? 800; // FPM

  const requiredCfm = round2(inputs.coolingLoadBtu / (1.1 * deltaT));
  const ductAreaFt2 = requiredCfm / velocity;
  const ductAreaSqIn = round2(ductAreaFt2 * 144);
  const roundDuctDiameter = round2(2 * Math.sqrt(ductAreaFt2 / Math.PI) * 12);

  // Preferred rectangular aspect ratio ≤ 4:1; find a practical size
  const height = roundToNearestStandard(Math.sqrt(ductAreaSqIn));
  const width = roundToNearestStandard(ductAreaSqIn / height);

  return {
    requiredCfm,
    ductAreaSqIn,
    roundDuctDiameter,
    rectangularDuct: { width, height },
  };
}

// ─────────────────────────────────────────────────────────
// Equipment Recommendation (Manual S)
// ─────────────────────────────────────────────────────────

export interface EquipmentRecommendation {
  /** Nominal tons (standard commercial size, e.g. 2.0, 2.5, 3.0) */
  nominalTons: number;
  /** Nominal BTU/hr */
  nominalBtu: number;
  /** Sizing verdict */
  verdict: "undersized" | "optimal" | "slightly-oversized" | "oversized";
  /** Note explaining the verdict */
  note: string;
}

/**
 * Recommend equipment size per Manual S: size to calculated load, not to
 * the next standard size up.  Optimal is within +15% of the load.
 */
export function recommendEquipment(coolingLoadBtu: number): EquipmentRecommendation {
  const standardSizes = [0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0];

  // Guard against a non-positive load. calculateLoad always produces a positive
  // cooling load (solar + internal gains), but recommendEquipment is exported
  // and may be called directly — without this, oversizeRatio would be Infinity.
  if (!Number.isFinite(coolingLoadBtu) || coolingLoadBtu <= 0) {
    return {
      nominalTons: standardSizes[0],
      nominalBtu: standardSizes[0] * 12000,
      verdict: "oversized",
      note: "No meaningful cooling load — equipment recommendation not applicable.",
    };
  }

  const targetTons = coolingLoadBtu / 12000;

  let nominalTons = standardSizes[standardSizes.length - 1];
  for (const size of standardSizes) {
    if (size >= targetTons) {
      nominalTons = size;
      break;
    }
  }

  const nominalBtu = nominalTons * 12000;
  const oversizeRatio = nominalBtu / coolingLoadBtu;

  let verdict: EquipmentRecommendation["verdict"];
  let note: string;

  if (oversizeRatio < 1.0) {
    verdict = "undersized";
    note = `Equipment is undersized by ${((1 - oversizeRatio) * 100).toFixed(0)}%. The space will not reach setpoint on peak design days.`;
  } else if (oversizeRatio <= 1.15) {
    verdict = "optimal";
    note = "Equipment is within Manual S limits (≤115% of calculated load). Good comfort and humidity control expected.";
  } else if (oversizeRatio <= 1.40) {
    verdict = "slightly-oversized";
    note = `Equipment is ${((oversizeRatio - 1) * 100).toFixed(0)}% over load. Short-cycling may reduce humidity control; consider variable-speed equipment.`;
  } else {
    verdict = "oversized";
    note = `Equipment is ${((oversizeRatio - 1) * 100).toFixed(0)}% over load. Significant short-cycling expected — poor humidity control, higher energy use, reduced comfort.`;
  }

  return { nominalTons, nominalBtu, verdict, note };
}

// ─────────────────────────────────────────────────────────
// Refrigerant Reference Lookup
// ─────────────────────────────────────────────────────────

export function getRefrigerant(id: string): Refrigerant | undefined {
  return REFRIGERANTS.find((r) => r.id === id);
}

export function getAllRefrigerants(): Refrigerant[] {
  return REFRIGERANTS;
}

// ─────────────────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────────────────

export function buildMarkdownReport(
  inputs: LoadInputs,
  load: LoadResult,
  energy?: EnergyResult,
  duct?: DuctResult
): string {
  const lines: string[] = [
    "# HVAC Load Calculation Report",
    "",
    `**Generated:** ${new Date().toISOString().split("T")[0]}`,
    `**Climate Zone:** ${load.climateZone.name} (${load.climateZone.description})`,
    `**Insulation Level:** ${load.insulationLevel.label}`,
    `**Floor Area:** ${inputs.floorArea.toLocaleString()} sq ft`,
    `**Ceiling Height:** ${inputs.ceilingHeight} ft`,
    `**Window Fraction:** ${(inputs.windowFraction * 100).toFixed(0)}%`,
    `**Occupants:** ${inputs.occupants}`,
    "",
    "---",
    "",
    "## Load Summary",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Cooling Load | ${load.sensibleCoolingLoad.toLocaleString()} BTU/hr |`,
    `| Heating Load | ${load.sensibleHeatingLoad.toLocaleString()} BTU/hr |`,
    `| Recommended Cooling | **${load.recommendedCoolingTons.toFixed(2)} tons** |`,
    `| Recommended Heating | **${(load.recommendedHeatingBtu / 1000).toFixed(1)} kBTU/hr** |`,
    "",
    "## Cooling Load Breakdown",
    "",
    `| Component | BTU/hr |`,
    `| --- | --- |`,
    ...Object.entries(load.coolingBreakdown).map(
      ([k, v]) => `| ${camelToLabel(k)} | ${Math.round(v).toLocaleString()} |`
    ),
    `| **Total** | **${load.sensibleCoolingLoad.toLocaleString()}** |`,
    "",
    "## Heating Load Breakdown",
    "",
    `| Component | BTU/hr |`,
    `| --- | --- |`,
    ...Object.entries(load.heatingBreakdown).map(
      ([k, v]) => `| ${camelToLabel(k)} | ${Math.round(v).toLocaleString()} |`
    ),
    `| **Total** | **${load.sensibleHeatingLoad.toLocaleString()}** |`,
  ];

  if (energy) {
    lines.push(
      "",
      "## Annual Energy Estimate",
      "",
      `| Metric | Value |`,
      `| --- | --- |`,
      `| Cooling (kWh) | ${energy.annualCoolingKwh.toLocaleString()} |`,
      `| Cooling Cost | $${energy.annualCoolingCost.toFixed(0)} |`,
      `| Heating (kWh eq) | ${energy.annualHeatingKwh.toLocaleString()} |`,
      `| Heating Cost | $${energy.annualHeatingCost.toFixed(0)} |`,
      `| **Total Annual Cost** | **$${energy.totalAnnualCost.toFixed(0)}** |`,
      `| CO₂ Equivalent | ${energy.co2EquivalentKg.toFixed(0)} kg |`
    );
  }

  if (duct) {
    lines.push(
      "",
      "## Duct Sizing",
      "",
      `| Metric | Value |`,
      `| --- | --- |`,
      `| Required Airflow | ${duct.requiredCfm.toLocaleString()} CFM |`,
      `| Round Duct Diameter | ${duct.roundDuctDiameter.toFixed(1)}" |`,
      `| Rectangular Duct | ${duct.rectangularDuct.width}" × ${duct.rectangularDuct.height}" |`
    );
  }

  lines.push("", "---", "", "_Disclaimer: This tool provides simplified Manual J estimates for preliminary sizing. Always have a licensed HVAC engineer perform a full Manual J/D/S calculation before purchasing equipment._");

  return lines.join("\n");
}

export function buildCsvExport(load: LoadResult, energy?: EnergyResult): string {
  const rows = [
    ["Metric", "Value", "Unit"],
    ["Cooling Load", String(load.sensibleCoolingLoad), "BTU/hr"],
    ["Heating Load", String(load.sensibleHeatingLoad), "BTU/hr"],
    ["Recommended Cooling", String(load.recommendedCoolingTons), "tons"],
    ["Recommended Heating", String(load.recommendedHeatingBtu), "BTU/hr"],
    ["Climate Zone", load.climateZone.id, ""],
    ["Insulation Level", load.insulationLevel.id, ""],
  ];

  if (energy) {
    rows.push(
      ["Annual Cooling kWh", String(energy.annualCoolingKwh), "kWh"],
      ["Annual Cooling Cost", energy.annualCoolingCost.toFixed(2), "USD"],
      ["Annual Heating kWh", String(energy.annualHeatingKwh), "kWh"],
      ["Annual Heating Cost", energy.annualHeatingCost.toFixed(2), "USD"],
      ["Total Annual Cost", energy.totalAnnualCost.toFixed(2), "USD"],
      ["CO2 Equivalent", energy.co2EquivalentKg.toFixed(0), "kg"]
    );
  }

  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// ─────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToNearestStandard(inches: number): number {
  // Standard duct dimensions: 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36
  const standard = [6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36];
  return standard.reduce((prev, curr) =>
    Math.abs(curr - inches) < Math.abs(prev - inches) ? curr : prev
  );
}

function camelToLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

import { NextRequest, NextResponse } from "next/server";
import {
  buildCsvExport,
  buildMarkdownReport,
  calculateDuctSize,
  calculateEnergy,
  calculateLoad,
  normalizeLoadInputs,
  recommendEquipment,
} from "../../data/calculator";

/**
 * POST /api/calculate
 *
 * Body (JSON):
 * {
 *   floorArea: number,           // sq ft (min 100)
 *   ceilingHeight?: number,      // ft (default 9)
 *   windowFraction?: number,     // 0.05–0.50 (default 0.15)
 *   occupants?: number,          // (default 2)
 *   climateZoneId?: string,      // ASHRAE zone id (default "3a")
 *   insulationLevelId?: string,  // "poor"|"fair"|"good"|"excellent" (default "good")
 *   indoorCoolingSetpoint?: number, // °F (default 75)
 *   indoorHeatingSetpoint?: number, // °F (default 70)
 *   // Energy estimation (optional)
 *   seer2?: number,              // SEER2 rating (default 16)
 *   hspf2?: number,              // HSPF2 or AFUE decimal (default 8.5)
 *   electricityRateCentsKwh?: number, // ¢/kWh (default 16)
 *   gasRateDollarsTherm?: number, // $/therm (default 1.50)
 *   isFurnace?: boolean          // true = gas furnace heating (default false)
 * }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.floorArea !== "number" ||
    !Number.isFinite(body.floorArea) ||
    body.floorArea <= 0
  ) {
    return NextResponse.json(
      { error: "floorArea must be a positive number" },
      { status: 400 }
    );
  }

  if (body.floorArea > 1_000_000) {
    return NextResponse.json(
      { error: "floorArea must be <= 1,000,000 sq ft" },
      { status: 400 }
    );
  }

  const inputs = normalizeLoadInputs(body as Parameters<typeof normalizeLoadInputs>[0]);
  const load = calculateLoad(inputs);
  const equipment = recommendEquipment(load.sensibleCoolingLoad);
  const duct = calculateDuctSize({ coolingLoadBtu: load.sensibleCoolingLoad });

  const seer2 = parseNum(body.seer2, 16);
  const isFurnace = body.isFurnace === true;
  // `hspf2` is overloaded: HSPF2 for heat pumps (~8.5) or AFUE decimal for gas
  // furnaces (~0.95). Use a furnace-appropriate default so an omitted value is
  // not silently interpreted as an absurd AFUE. calculateEnergy() still guards
  // the value, but the correct default keeps the API contract honest.
  const hspf2 = parseNum(body.hspf2, isFurnace ? 0.95 : 8.5);
  const elecRate = parseNum(body.electricityRateCentsKwh, 16);
  const gasRate = parseNum(body.gasRateDollarsTherm, 1.5);

  const energy = calculateEnergy({
    coolingLoadBtu: load.sensibleCoolingLoad,
    heatingLoadBtu: load.sensibleHeatingLoad,
    seer2,
    hspf2,
    electricityRateCentsKwh: elecRate,
    gasRateDollarsTherm: isFurnace ? gasRate : undefined,
    climateZoneId: inputs.climateZoneId,
    isFurnace,
  });

  const markdown = buildMarkdownReport(inputs, load, energy, duct);
  const csv = buildCsvExport(load, energy);

  return NextResponse.json({
    inputs,
    load: {
      sensibleCoolingLoad: load.sensibleCoolingLoad,
      sensibleHeatingLoad: load.sensibleHeatingLoad,
      recommendedCoolingTons: load.recommendedCoolingTons,
      recommendedHeatingBtu: load.recommendedHeatingBtu,
      coolingBreakdown: load.coolingBreakdown,
      heatingBreakdown: load.heatingBreakdown,
      climateZone: {
        id: load.climateZone.id,
        name: load.climateZone.name,
        description: load.climateZone.description,
      },
      insulationLevel: {
        id: load.insulationLevel.id,
        label: load.insulationLevel.label,
      },
    },
    equipment,
    duct,
    energy,
    markdown,
    csv,
  });
}

function parseNum(value: unknown, defaultVal: number): number {
  if (typeof value === "number" && isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (isFinite(n) && n > 0) return n;
  }
  return defaultVal;
}

/**
 * HVAC Calculation Constants
 *
 * Sources: ASHRAE Handbook of Fundamentals, ACCA Manual J (8th Ed.),
 * Manual D (duct design), Manual S (equipment selection).
 */

/** Climate zone definitions (ASHRAE 169 / IECC) */
export interface ClimateZone {
  id: string;
  name: string;
  description: string;
  designCoolingTemp: number; // °F outdoor dry-bulb 1% design temp
  designHeatingTemp: number; // °F outdoor dry-bulb 99% design temp
  coolingDegreeDays: number; // CDD 65°F base
  heatingDegreeDays: number; // HDD 65°F base
  state: string;             // representative state/region
}

export const CLIMATE_ZONES: ClimateZone[] = [
  {
    id: "1a",
    name: "Zone 1A — Very Hot, Humid",
    description: "Miami, FL",
    designCoolingTemp: 91,
    designHeatingTemp: 44,
    coolingDegreeDays: 4500,
    heatingDegreeDays: 200,
    state: "FL",
  },
  {
    id: "2a",
    name: "Zone 2A — Hot, Humid",
    description: "Houston, TX",
    designCoolingTemp: 97,
    designHeatingTemp: 28,
    coolingDegreeDays: 3000,
    heatingDegreeDays: 1400,
    state: "TX",
  },
  {
    id: "2b",
    name: "Zone 2B — Hot, Dry",
    description: "Phoenix, AZ",
    designCoolingTemp: 109,
    designHeatingTemp: 34,
    coolingDegreeDays: 4000,
    heatingDegreeDays: 1000,
    state: "AZ",
  },
  {
    id: "3a",
    name: "Zone 3A — Warm, Humid",
    description: "Atlanta, GA",
    designCoolingTemp: 94,
    designHeatingTemp: 22,
    coolingDegreeDays: 1800,
    heatingDegreeDays: 3000,
    state: "GA",
  },
  {
    id: "3b",
    name: "Zone 3B — Warm, Dry",
    description: "Los Angeles, CA",
    designCoolingTemp: 90,
    designHeatingTemp: 38,
    coolingDegreeDays: 1000,
    heatingDegreeDays: 2000,
    state: "CA",
  },
  {
    id: "3c",
    name: "Zone 3C — Warm, Marine",
    description: "San Francisco, CA",
    designCoolingTemp: 83,
    designHeatingTemp: 35,
    coolingDegreeDays: 200,
    heatingDegreeDays: 3000,
    state: "CA",
  },
  {
    id: "4a",
    name: "Zone 4A — Mixed, Humid",
    description: "Baltimore, MD",
    designCoolingTemp: 94,
    designHeatingTemp: 14,
    coolingDegreeDays: 1300,
    heatingDegreeDays: 4600,
    state: "MD",
  },
  {
    id: "4b",
    name: "Zone 4B — Mixed, Dry",
    description: "Albuquerque, NM",
    designCoolingTemp: 97,
    designHeatingTemp: 16,
    coolingDegreeDays: 1300,
    heatingDegreeDays: 4400,
    state: "NM",
  },
  {
    id: "4c",
    name: "Zone 4C — Mixed, Marine",
    description: "Seattle, WA",
    designCoolingTemp: 84,
    designHeatingTemp: 24,
    coolingDegreeDays: 200,
    heatingDegreeDays: 4800,
    state: "WA",
  },
  {
    id: "5a",
    name: "Zone 5A — Cool, Humid",
    description: "Chicago, IL",
    designCoolingTemp: 93,
    designHeatingTemp: -4,
    coolingDegreeDays: 800,
    heatingDegreeDays: 6500,
    state: "IL",
  },
  {
    id: "6a",
    name: "Zone 6A — Cold, Humid",
    description: "Minneapolis, MN",
    designCoolingTemp: 91,
    designHeatingTemp: -16,
    coolingDegreeDays: 700,
    heatingDegreeDays: 8000,
    state: "MN",
  },
  {
    id: "7",
    name: "Zone 7 — Very Cold",
    description: "Fairbanks, AK",
    designCoolingTemp: 82,
    designHeatingTemp: -47,
    coolingDegreeDays: 100,
    heatingDegreeDays: 13400,
    state: "AK",
  },
];

/** Insulation level affecting U-values (heat transfer coefficient, BTU/hr·ft²·°F) */
export interface InsulationLevel {
  id: string;
  label: string;
  ceilingUValue: number; // BTU/hr·ft²·°F — accounts for R-value + framing
  wallUValue: number;
  floorUValue: number;
  windowUValue: number;
}

export const INSULATION_LEVELS: InsulationLevel[] = [
  {
    id: "poor",
    label: "Poor (pre-1980, minimal insulation)",
    ceilingUValue: 0.066, // ~R-15
    wallUValue: 0.110,    // ~R-9
    floorUValue: 0.083,   // ~R-12
    windowUValue: 0.87,   // single pane, no low-E
  },
  {
    id: "fair",
    label: "Fair (1980–2000, code-minimum)",
    ceilingUValue: 0.040, // ~R-25
    wallUValue: 0.069,    // ~R-14
    floorUValue: 0.060,   // ~R-17
    windowUValue: 0.48,   // double pane, clear
  },
  {
    id: "good",
    label: "Good (2000–2015, energy code)",
    ceilingUValue: 0.026, // ~R-38
    wallUValue: 0.051,    // ~R-19
    floorUValue: 0.047,   // ~R-21
    windowUValue: 0.30,   // double pane, low-E
  },
  {
    id: "excellent",
    label: "Excellent (2015+, high-performance)",
    ceilingUValue: 0.020, // ~R-49
    wallUValue: 0.036,    // ~R-27
    floorUValue: 0.033,   // ~R-30
    windowUValue: 0.20,   // triple pane or high-performance low-E
  },
];

/** Occupant internal heat gain (sensible, BTU/hr per person) */
export const OCCUPANT_SENSIBLE_GAIN_BTU = 250; // ASHRAE moderate activity

/** Lighting/appliance internal gain multiplier (BTU/hr per sq ft) */
export const INTERNAL_GAIN_BTU_PER_SQFT = 3.5;

/** Solar heat gain coefficient for windows — used in cooling calc */
export const WINDOW_SHGC = 0.4; // mid-range, low-E glass

/** Average solar irradiance (BTU/hr·ft²) applied to window area */
export const SOLAR_IRRADIANCE_BTU = 200;

/** Infiltration factor (BTU/hr per CFM per °F ΔT) */
export const INFILTRATION_FACTOR = 1.1;

/** Typical infiltration rate (ACH — Air Changes per Hour) by construction quality */
export const INFILTRATION_ACH: Record<string, number> = {
  poor: 0.5,
  fair: 0.35,
  good: 0.20,
  excellent: 0.10,
};

/**
 * Common refrigerants and their properties
 * GWP: Global Warming Potential (CO₂ equivalent)
 */
export interface Refrigerant {
  id: string;
  name: string;
  gwp: number;
  ozoneDepleting: boolean;
  status: "phased-out" | "transitional" | "low-gwp";
  normalBoilingPoint: number; // °F
  notes: string;
}

export const REFRIGERANTS: Refrigerant[] = [
  {
    id: "r22",
    name: "R-22 (HCFC-22)",
    gwp: 1810,
    ozoneDepleting: true,
    status: "phased-out",
    normalBoilingPoint: -41.4,
    notes: "Phased out Jan 2020. Cannot be manufactured/imported. Servicing only from reclaimed stock.",
  },
  {
    id: "r410a",
    name: "R-410A",
    gwp: 2088,
    ozoneDepleting: false,
    status: "transitional",
    normalBoilingPoint: -61.9,
    notes: "Phase-down under AIM Act. US equipment ban from 2025 for new residential, 2026 commercial.",
  },
  {
    id: "r32",
    name: "R-32",
    gwp: 675,
    ozoneDepleting: false,
    status: "low-gwp",
    normalBoilingPoint: -60.9,
    notes: "Lower GWP than R-410A. Used widely in mini-splits globally.",
  },
  {
    id: "r454b",
    name: "R-454B (Puron Advance™)",
    gwp: 466,
    ozoneDepleting: false,
    status: "low-gwp",
    normalBoilingPoint: -61.6,
    notes: "Primary R-410A replacement. Adopted by Carrier, Trane, Lennox for 2025+ equipment.",
  },
  {
    id: "r290",
    name: "R-290 (Propane)",
    gwp: 3,
    ozoneDepleting: false,
    status: "low-gwp",
    normalBoilingPoint: -43.7,
    notes: "Excellent efficiency; flammable (A3 safety group). Common in room ACs, mini-splits.",
  },
];

/** SEER/EER reference: annual cooling hours by climate zone id */
export const ANNUAL_COOLING_HOURS: Record<string, number> = {
  "1a": 2800,
  "2a": 2500,
  "2b": 2700,
  "3a": 2000,
  "3b": 1500,
  "3c": 500,
  "4a": 1400,
  "4b": 1300,
  "4c": 400,
  "5a": 900,
  "6a": 700,
  "7": 300,
};

/** SEER/EER reference: annual heating hours by climate zone id */
export const ANNUAL_HEATING_HOURS: Record<string, number> = {
  "1a": 200,
  "2a": 700,
  "2b": 600,
  "3a": 1500,
  "3b": 1200,
  "3c": 1800,
  "4a": 2400,
  "4b": 2200,
  "4c": 2600,
  "5a": 3200,
  "6a": 4000,
  "7": 6000,
};

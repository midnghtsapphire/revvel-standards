export type CompensationProfile = "none" | "solar_meter" | "skin_reflection";

export interface DosageInput {
  irradianceMwPerCm2: number;
  targetDoseJPerCm2: number;
  treatmentAreaCm2?: number;
  sessionsPerWeek?: number;
  dutyCyclePercent?: number;
  compensationProfile?: CompensationProfile;
}

export interface NormalizedDosageInput {
  irradianceMwPerCm2: number;
  targetDoseJPerCm2: number;
  treatmentAreaCm2: number;
  sessionsPerWeek: number;
  dutyCyclePercent: number;
  compensationProfile: CompensationProfile;
}

export interface DosageResult {
  effectiveIrradianceMwPerCm2: number;
  baseTimeSeconds: number;
  adjustedTimeSeconds: number;
  adjustedTimeMinutes: number;
  totalEnergyJoules: number;
  weeklyDoseJPerCm2: number;
  compensationMultiplier: number;
}

const DEFAULTS = {
  irradianceMwPerCm2: 35,
  targetDoseJPerCm2: 10,
  treatmentAreaCm2: 100,
  sessionsPerWeek: 4,
  dutyCyclePercent: 100,
  compensationProfile: "none" as CompensationProfile,
};

const COMPENSATION_MULTIPLIERS: Record<CompensationProfile, number> = {
  none: 1,
  solar_meter: 2,
  skin_reflection: 2.5,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeDosageInput(input: Partial<DosageInput>): NormalizedDosageInput {
  const compensationProfile = input.compensationProfile ?? DEFAULTS.compensationProfile;

  return {
    irradianceMwPerCm2: clamp(
      input.irradianceMwPerCm2 ?? DEFAULTS.irradianceMwPerCm2,
      1,
      300,
    ),
    targetDoseJPerCm2: clamp(input.targetDoseJPerCm2 ?? DEFAULTS.targetDoseJPerCm2, 1, 120),
    treatmentAreaCm2: clamp(input.treatmentAreaCm2 ?? DEFAULTS.treatmentAreaCm2, 1, 10000),
    sessionsPerWeek: Math.round(clamp(input.sessionsPerWeek ?? DEFAULTS.sessionsPerWeek, 1, 21)),
    dutyCyclePercent: clamp(input.dutyCyclePercent ?? DEFAULTS.dutyCyclePercent, 5, 100),
    compensationProfile:
      compensationProfile in COMPENSATION_MULTIPLIERS
        ? compensationProfile
        : DEFAULTS.compensationProfile,
  };
}

export function calculateDosage(input: Partial<DosageInput>): DosageResult {
  const normalized = normalizeDosageInput(input);
  const dutyCycleRatio = normalized.dutyCyclePercent / 100;
  const effectiveIrradianceMwPerCm2 = normalized.irradianceMwPerCm2 * dutyCycleRatio;
  const baseTimeSeconds =
    (normalized.targetDoseJPerCm2 * 1000) / Math.max(effectiveIrradianceMwPerCm2, 0.001);
  const compensationMultiplier = COMPENSATION_MULTIPLIERS[normalized.compensationProfile];
  const adjustedTimeSeconds = baseTimeSeconds * compensationMultiplier;

  return {
    effectiveIrradianceMwPerCm2,
    baseTimeSeconds,
    adjustedTimeSeconds,
    adjustedTimeMinutes: adjustedTimeSeconds / 60,
    totalEnergyJoules: normalized.targetDoseJPerCm2 * normalized.treatmentAreaCm2,
    weeklyDoseJPerCm2: normalized.targetDoseJPerCm2 * normalized.sessionsPerWeek,
    compensationMultiplier,
  };
}

export function formatMinutes(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes >= 10) return `${minutes.toFixed(1)} min`;
  return `${minutes.toFixed(2)} min`;
}

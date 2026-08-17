import assert from "node:assert/strict";
import { calculateDosage, formatMinutes, normalizeDosageInput } from "../app/data/calculator";

function approxEqual(actual: number, expected: number, epsilon = 0.0001): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
}

{
  const normalized = normalizeDosageInput({
    irradianceMwPerCm2: -5,
    targetDoseJPerCm2: 999,
    treatmentAreaCm2: 0,
    sessionsPerWeek: 40,
    dutyCyclePercent: 0,
  });

  assert.equal(normalized.irradianceMwPerCm2, 1);
  assert.equal(normalized.targetDoseJPerCm2, 120);
  assert.equal(normalized.treatmentAreaCm2, 1);
  assert.equal(normalized.sessionsPerWeek, 21);
  assert.equal(normalized.dutyCyclePercent, 5);
}

{
  const result = calculateDosage({
    irradianceMwPerCm2: 50,
    targetDoseJPerCm2: 10,
    dutyCyclePercent: 100,
    compensationProfile: "none",
  });

  approxEqual(result.baseTimeSeconds, 200);
  approxEqual(result.adjustedTimeSeconds, 200);
  approxEqual(result.adjustedTimeMinutes, 3.3333333, 0.001);
}

{
  const withCompensation = calculateDosage({
    irradianceMwPerCm2: 50,
    targetDoseJPerCm2: 10,
    dutyCyclePercent: 50,
    compensationProfile: "skin_reflection",
  });

  // 50% duty cycle halves irradiance, then skin-reflection multiplier x2.5.
  approxEqual(withCompensation.baseTimeSeconds, 400);
  approxEqual(withCompensation.adjustedTimeSeconds, 1000);
  assert.equal(withCompensation.compensationMultiplier, 2.5);
}

{
  const weekly = calculateDosage({
    targetDoseJPerCm2: 8,
    sessionsPerWeek: 3,
    treatmentAreaCm2: 120,
  });

  assert.equal(weekly.weeklyDoseJPerCm2, 24);
  assert.equal(weekly.totalEnergyJoules, 960);
}

{
  assert.equal(formatMinutes(150), "2.50 min");
  assert.equal(formatMinutes(1200), "20.0 min");
}

console.log("✅ Red light dosage calculator tests passed.");

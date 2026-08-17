(function exposeCalculator(globalScope) {
  function toPositiveNumber(value, name) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new Error(name + " must be a positive number");
    }
    return numeric;
  }

  function calculateSessionMinutes(input) {
    const targetDoseJcm2 = toPositiveNumber(input.targetDoseJcm2, "targetDoseJcm2");
    const irradianceMwCm2 = toPositiveNumber(input.irradianceMwCm2, "irradianceMwCm2");

    const irradianceWcm2 = irradianceMwCm2 / 1000;
    const seconds = targetDoseJcm2 / irradianceWcm2;
    return seconds / 60;
  }

  function calculateDeliveredDose(input) {
    const minutes = toPositiveNumber(input.minutes, "minutes");
    const irradianceMwCm2 = toPositiveNumber(input.irradianceMwCm2, "irradianceMwCm2");

    const seconds = minutes * 60;
    const irradianceWcm2 = irradianceMwCm2 / 1000;
    return irradianceWcm2 * seconds;
  }

  function buildWeeklyPlan(input) {
    const daysPerWeek = Math.round(toPositiveNumber(input.daysPerWeek, "daysPerWeek"));
    const dosePerSessionJcm2 = toPositiveNumber(input.dosePerSessionJcm2, "dosePerSessionJcm2");
    const startDay = Number.isInteger(input.startDay) ? input.startDay : 0;

    if (daysPerWeek < 1 || daysPerWeek > 7) {
      throw new Error("daysPerWeek must be between 1 and 7");
    }
    if (startDay < 0 || startDay > 6) {
      throw new Error("startDay must be between 0 and 6");
    }

    const plan = [];
    for (let index = 0; index < 7; index += 1) {
      plan.push({
        dayIndex: index,
        scheduled: false,
        plannedDoseJcm2: 0,
      });
    }

    for (let session = 0; session < daysPerWeek; session += 1) {
      const dayIndex = (startDay + session) % 7;
      plan[dayIndex] = {
        dayIndex,
        scheduled: true,
        plannedDoseJcm2: dosePerSessionJcm2,
      };
    }

    return plan;
  }

  const api = {
    calculateSessionMinutes,
    calculateDeliveredDose,
    buildWeeklyPlan,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.RedLightCalculator = api;
}(typeof window !== "undefined" ? window : globalThis));

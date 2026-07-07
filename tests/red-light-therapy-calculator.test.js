const test = require("node:test");
const assert = require("node:assert/strict");

const calculator = require("../projects/agent-generated/red-light-therapy-mobile/build/app/calculator.js");

test("calculateSessionMinutes derives minutes from dose and irradiance", () => {
  const minutes = calculator.calculateSessionMinutes({
    targetDoseJcm2: 6,
    irradianceMwCm2: 50,
  });

  assert.ok(minutes > 1.9 && minutes < 2.1);
});

test("calculateDeliveredDose inverts session minute calculation", () => {
  const dose = calculator.calculateDeliveredDose({
    minutes: 2,
    irradianceMwCm2: 50,
  });

  assert.equal(Number(dose.toFixed(2)), 6);
});

test("buildWeeklyPlan schedules requested number of sessions", () => {
  const plan = calculator.buildWeeklyPlan({
    daysPerWeek: 4,
    dosePerSessionJcm2: 5,
    startDay: 2,
  });

  const activeDays = plan.filter((entry) => entry.scheduled);

  assert.equal(plan.length, 7);
  assert.equal(activeDays.length, 4);
  assert.equal(activeDays[0].dayIndex, 2);
  assert.equal(activeDays[3].dayIndex, 5);
});

test("buildWeeklyPlan rejects out-of-range daysPerWeek", () => {
  assert.throws(() => {
    calculator.buildWeeklyPlan({
      daysPerWeek: 8,
      dosePerSessionJcm2: 5,
      startDay: 0,
    });
  }, /daysPerWeek/);
});

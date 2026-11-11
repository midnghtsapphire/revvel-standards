const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateAgentRoi } = require("../lib/agent-roi");

test("values recovered capacity using 52 weeks and subtracts agent price", () => {
  const result = calculateAgentRoi({ hoursPerWeek: 30, hourlyCost: 60, automationPercent: 50, monthlyPrice: 2000 });
  assert.equal(result.monthlyHours, 65);
  assert.equal(result.capacityValue, 3900);
  assert.equal(result.monthlyNetValue, 1900);
  assert.equal(result.annualNetValue, 22800);
  assert.equal(result.roiPercent, 95);
});
test("zero rates and price have defined results without infinite ROI", () => {
  const result = calculateAgentRoi({ hoursPerWeek: 0, hourlyCost: 0, automationPercent: 0, monthlyPrice: 0 });
  assert.equal(result.roiPercent, null);
  assert.equal(result.breakEvenHours, null);
  assert.equal(result.monthlyNetValue, 0);
});
test("rejects invalid assumptions instead of showing misleading savings", () => {
  for (const override of [{ automationPercent: 101 }, { monthlyPrice: -1 }, { hourlyCost: NaN }, { hoursPerWeek: Infinity }]) {
    assert.throws(() => calculateAgentRoi({ hoursPerWeek: 30, hourlyCost: 60, automationPercent: 50, monthlyPrice: 2000, ...override }), RangeError);
  }
});

"use strict";

// This is a capacity estimate, not a promise of headcount removal. Keep the
// assumptions explicit so a buyer can replace defaults with pilot measurements.
function calculateAgentRoi({ hoursPerWeek, hourlyCost, automationPercent, monthlyPrice }) {
  for (const [name, value] of Object.entries({ hoursPerWeek, hourlyCost, automationPercent, monthlyPrice })) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite non-negative number`);
  }
  if (automationPercent > 100) throw new RangeError("automationPercent must be at most 100");
  const monthlyHours = hoursPerWeek * 52 / 12 * automationPercent / 100;
  const capacityValue = monthlyHours * hourlyCost;
  return { monthlyHours, capacityValue, monthlyNetValue: capacityValue - monthlyPrice,
    annualNetValue: (capacityValue - monthlyPrice) * 12,
    roiPercent: monthlyPrice === 0 ? null : (capacityValue - monthlyPrice) / monthlyPrice * 100,
    breakEvenHours: hourlyCost === 0 ? null : monthlyPrice / hourlyCost };
}

module.exports = { calculateAgentRoi };

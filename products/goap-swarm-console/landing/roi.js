(function () {
  // Same arithmetic as lib/agent-roi.js. tests/landing-roi.test.js fails if
  // the two diverge. Kept in the browser file because the static page has no
  // bundler. A capacity estimate, not a promise that a job goes away.
  function calculateAgentRoi(input) {
    var hoursPerWeek = input.hoursPerWeek;
    var hourlyCost = input.hourlyCost;
    var automationPercent = input.automationPercent;
    var monthlyPrice = input.monthlyPrice;
    var values = { hoursPerWeek: hoursPerWeek, hourlyCost: hourlyCost, automationPercent: automationPercent, monthlyPrice: monthlyPrice };
    Object.keys(values).forEach(function (name) {
      if (!Number.isFinite(values[name]) || values[name] < 0) {
        throw new RangeError(name + " must be a finite non-negative number");
      }
    });
    if (automationPercent > 100) throw new RangeError("automationPercent must be at most 100");
    var monthlyHours = hoursPerWeek * 52 / 12 * automationPercent / 100;
    var capacityValue = monthlyHours * hourlyCost;
    return {
      monthlyHours: monthlyHours,
      capacityValue: capacityValue,
      monthlyNetValue: capacityValue - monthlyPrice,
      annualNetValue: (capacityValue - monthlyPrice) * 12,
      roiPercent: monthlyPrice === 0 ? null : (capacityValue - monthlyPrice) / monthlyPrice * 100,
      breakEvenHours: hourlyCost === 0 ? null : monthlyPrice / hourlyCost,
    };
  }
  window.revvelCalculateAgentRoi = calculateAgentRoi;
})();

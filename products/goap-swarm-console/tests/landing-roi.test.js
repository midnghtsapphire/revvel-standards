"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateAgentRoi } = require("../lib/agent-roi");

function browserRoi() {
  const context = { window: {}, URL, Number, RangeError, Object };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../landing/roi.js"), "utf8"), context);
  return context.window.revvelCalculateAgentRoi;
}

test("landing calculator matches lib/agent-roi.js", () => {
  const browser = browserRoi();
  const samples = [
    { hoursPerWeek: 30, hourlyCost: 60, automationPercent: 50, monthlyPrice: 2000 },
    { hoursPerWeek: 0, hourlyCost: 0, automationPercent: 0, monthlyPrice: 0 },
    { hoursPerWeek: 10, hourlyCost: 40, automationPercent: 100, monthlyPrice: 5000 },
    { hoursPerWeek: 40, hourlyCost: 80, automationPercent: 10, monthlyPrice: 5000 },
  ];
  for (const sample of samples) {
    // vm.runInNewContext gives the result a different Object prototype, so
    // compare the JSON form rather than the object identity.
    assert.deepEqual(JSON.parse(JSON.stringify(browser(sample))), JSON.parse(JSON.stringify(calculateAgentRoi(sample))));
  }
});

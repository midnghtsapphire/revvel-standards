#!/usr/bin/env node
"use strict";

/**
 * Compare linear fan-out with Policy-of-Thoughts on a committed evaluation
 * set, and refuse to invent the comparison when the set cannot support it.
 *
 * The only committed research-style fixture in this repo is
 * products/rnd-research-fleet/eval/fixtures/queries.json. It is a search
 * rubric (expected keyword qualities), not a labeled acceptance set, and it
 * holds 6 prompts rather than the 100 the work request lists as a dependency.
 * Scoring either strategy against it would be a synthetic result. This
 * script reports NOT_MEASURED and does not print a quality delta.
 *
 * Exit 0 means the report was produced. It does not mean the +20-30%
 * criterion passed. Exit 2 means the fixture path exists but could not be
 * parsed, which is a broken harness rather than an unmeasured criterion.
 *
 * What to check: `status` and `qualityDelta`. `qualityDelta` stays null
 * until a set with acceptance labels is committed and a run actually scores
 * both strategies. Do not fill it in by hand.
 */

const fs = require("fs");
const path = require("path");

const FIXTURE = "products/rnd-research-fleet/eval/fixtures/queries.json";
const CRITERION = "+20-30% research quality versus the linear fan-out";

function inspectEvaluationSet(repoRoot) {
  const rel = FIXTURE;
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) {
    return {
      found: false,
      path: rel,
      exampleCount: 0,
      hasAcceptanceLabels: false,
      criterion: CRITERION,
      status: "NOT_MEASURED",
      qualityDelta: null,
      compared: false,
      reason:
        "No committed research-example file was found at the known fixture path. " +
        "The acceptance criterion has not been measured.",
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (error) {
    return {
      found: true,
      path: rel,
      parseError: error.message,
      exampleCount: 0,
      hasAcceptanceLabels: false,
      criterion: CRITERION,
      status: "NOT_MEASURED",
      qualityDelta: null,
      compared: false,
      reason: `The fixture file exists but is not valid JSON (${error.message}). No comparison was run.`,
    };
  }
  const queries = Array.isArray(parsed.queries) ? parsed.queries : [];
  const hasAcceptanceLabels = queries.some(
    (query) => query && (query.acceptance != null || query.accepted != null || query.label != null),
  );
  return {
    found: true,
    path: rel,
    exampleCount: queries.length,
    hasAcceptanceLabels,
    criterion: CRITERION,
    status: "NOT_MEASURED",
    qualityDelta: null,
    compared: false,
    reason: hasAcceptanceLabels
      ? "The fixture has label-like fields, but this harness still does not score strategies. " +
        "A labeled run of 100 or more research examples is the measurement, and this file is not that run."
      : `The committed file is a search rubric of ${queries.length} prompts with expected_qualities. ` +
        "It has no research-acceptance labels and it is below the 100-example dependency. " +
        "Linear fan-out and PoT were not scored against it. " +
        "The +20-30% acceptance criterion has not been measured.",
  };
}

function formatReport(report) {
  return [
    "PoT benchmark harness",
    `fixture: ${report.path}`,
    `found: ${report.found}`,
    `examples: ${report.exampleCount}`,
    `acceptance_labels: ${report.hasAcceptanceLabels}`,
    `criterion: ${report.criterion}`,
    `status: ${report.status}`,
    "quality_delta: null",
    `compared: ${report.compared}`,
    `reason: ${report.reason}`,
  ].join("\n");
}

function main(repoRoot = path.join(__dirname, "..", "..")) {
  const report = inspectEvaluationSet(repoRoot);
  const text = formatReport(report);
  process.stdout.write(`${text}\n${JSON.stringify(report, null, 2)}\n`);
  if (report.parseError) return 2;
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  CRITERION,
  FIXTURE,
  formatReport,
  inspectEvaluationSet,
  main,
};

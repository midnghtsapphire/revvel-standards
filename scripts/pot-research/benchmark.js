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
 * Since research-gold-v1 landed (WR #18341, PR 2) the report also validates
 * products/rnd-research-fleet/eval/fixtures/research-gold-v1.jsonl: real
 * research items with a recorded verdict and provenance. It prints the
 * count, the per-source counts and the shortfall against the 100-example
 * dependency. It does not score either strategy, so `status` stays
 * NOT_MEASURED and `qualityDelta` stays null. Rows from private repos carry
 * hashes only; set RESEARCH_GOLD_FULLTEXT to a locally rebuilt file (see
 * eval/build-research-gold.js) to attach and hash-check their text.
 *
 * Exit 0 means the report was produced. It does not mean the +20-30%
 * criterion passed. Exit 2 means a fixture path exists but could not be
 * parsed or failed validation, which is a broken harness rather than an
 * unmeasured criterion.
 *
 * What to check: `status` and `qualityDelta`. `qualityDelta` stays null
 * until a set with acceptance labels is committed and a run actually scores
 * both strategies. Do not fill it in by hand.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const FIXTURE = "products/rnd-research-fleet/eval/fixtures/queries.json";
const GOLD_FIXTURE = "products/rnd-research-fleet/eval/fixtures/research-gold-v1.jsonl";
const GOLD_TARGET = 100;
const GOLD_REQUIRED = [
  "id",
  "question_form",
  "source_repo",
  "source_path",
  "source_sha",
  "source_blob_sha",
  "source_locator",
  "source_url",
  "domain",
  "label",
  "visibility",
  "question_sha256",
  "reference_sha256",
];
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const CRITERION = "+20-30% research quality versus the linear fan-out";

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function readJsonl(abs) {
  return fs
    .readFileSync(abs, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`line ${index + 1}: ${error.message}`);
      }
    });
}

/**
 * Validate one gold row. Public rows carry their text and must match their
 * hashes. Private rows (source repo is private, text not published) carry
 * null text and only provenance plus hashes.
 */
function validateGoldRow(row, seen) {
  const errors = [];
  for (const key of GOLD_REQUIRED) {
    if (typeof row[key] !== "string" || row[key].trim() === "") errors.push(`${row.id || "?"}: missing ${key}`);
  }
  if (row.id) {
    if (seen.has(row.id)) errors.push(`${row.id}: duplicate id`);
    seen.add(row.id);
  }
  if (!SHA1.test(row.source_sha || "")) errors.push(`${row.id}: source_sha is not a 40-character commit sha`);
  if (!SHA1.test(row.source_blob_sha || "")) errors.push(`${row.id}: source_blob_sha is not a 40-character sha`);
  if (!SHA256.test(row.question_sha256 || "")) errors.push(`${row.id}: question_sha256 is not sha-256`);
  if (!SHA256.test(row.reference_sha256 || "")) errors.push(`${row.id}: reference_sha256 is not sha-256`);
  if (row.visibility === "public") {
    if (!row.question || !row.reference_answer) errors.push(`${row.id}: public row without text`);
    else {
      if (sha256(row.question) !== row.question_sha256) errors.push(`${row.id}: question hash mismatch`);
      if (sha256(row.reference_answer) !== row.reference_sha256) errors.push(`${row.id}: reference hash mismatch`);
    }
  } else if (row.visibility === "private") {
    if (row.question != null || row.reference_answer != null) errors.push(`${row.id}: private row must not carry text`);
  } else {
    errors.push(`${row.id}: visibility must be public or private`);
  }
  return errors;
}

/**
 * Load and validate the research gold set. Optionally attach the private
 * rows' text from a locally rebuilt file (see eval/build-research-gold.js);
 * every attached text is checked against the committed hashes.
 */
function inspectResearchGold(repoRoot, options = {}) {
  const abs = path.join(repoRoot, GOLD_FIXTURE);
  const base = {
    path: GOLD_FIXTURE,
    found: false,
    valid: false,
    count: 0,
    target: GOLD_TARGET,
    shortfall: GOLD_TARGET,
    meetsDependency: false,
    bySource: {},
    byVisibility: {},
    textAvailable: 0,
    fulltextVerified: 0,
    errors: [],
  };
  if (!fs.existsSync(abs)) return base;
  let rows;
  try {
    rows = readJsonl(abs);
  } catch (error) {
    return { ...base, found: true, errors: [`unreadable: ${error.message}`] };
  }
  const seen = new Set();
  const errors = [];
  const bySource = {};
  const byVisibility = {};
  for (const row of rows) {
    errors.push(...validateGoldRow(row, seen));
    bySource[row.source_repo] = (bySource[row.source_repo] || 0) + 1;
    byVisibility[row.visibility] = (byVisibility[row.visibility] || 0) + 1;
  }
  let fulltextVerified = 0;
  const fullTextPath = options.fullTextPath || process.env.RESEARCH_GOLD_FULLTEXT || null;
  if (fullTextPath && fs.existsSync(fullTextPath)) {
    try {
      const full = new Map(readJsonl(fullTextPath).map((row) => [row.id, row]));
      for (const row of rows) {
        if (row.visibility !== "private") continue;
        const text = full.get(row.id);
        if (!text) continue;
        if (sha256(text.question || "") === row.question_sha256 && sha256(text.reference_answer || "") === row.reference_sha256) {
          fulltextVerified += 1;
        } else {
          errors.push(`${row.id}: local full text does not match the committed hashes`);
        }
      }
    } catch (error) {
      errors.push(`full text unreadable: ${error.message}`);
    }
  }
  const publicRows = rows.filter((row) => row.visibility === "public").length;
  return {
    ...base,
    found: true,
    valid: errors.length === 0,
    count: rows.length,
    shortfall: Math.max(0, GOLD_TARGET - rows.length),
    meetsDependency: errors.length === 0 && rows.length >= GOLD_TARGET,
    bySource,
    byVisibility,
    textAvailable: publicRows + fulltextVerified,
    fulltextVerified,
    errors,
  };
}

function inspectLegacyRubric(repoRoot) {
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

function inspectEvaluationSet(repoRoot, options = {}) {
  const report = inspectLegacyRubric(repoRoot);
  const gold = inspectResearchGold(repoRoot, options);
  return { ...report, gold };
}

function formatReport(report) {
  const gold = report.gold || {};
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
    `gold_fixture: ${gold.path}`,
    `gold_found: ${Boolean(gold.found)}`,
    `gold_valid: ${Boolean(gold.valid)}`,
    `gold_count: ${gold.count || 0}`,
    `gold_target: ${gold.target}`,
    `gold_shortfall: ${gold.shortfall}`,
    `gold_text_available: ${gold.textAvailable || 0}`,
    `gold_by_source: ${JSON.stringify(gold.bySource || {})}`,
    "gold_scored: false",
  ].join("\n");
}

function main(repoRoot = path.join(__dirname, "..", "..")) {
  const report = inspectEvaluationSet(repoRoot);
  const text = formatReport(report);
  process.stdout.write(`${text}\n${JSON.stringify(report, null, 2)}\n`);
  if (report.parseError) return 2;
  if (report.gold && report.gold.found && !report.gold.valid) return 2;
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  CRITERION,
  FIXTURE,
  GOLD_FIXTURE,
  GOLD_TARGET,
  formatReport,
  inspectEvaluationSet,
  inspectResearchGold,
  validateGoldRow,
  main,
};

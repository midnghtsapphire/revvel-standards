#!/usr/bin/env node
"use strict";

/**
 * Markdown Backlog Maintenance
 *
 * WHY this exists (read before touching):
 *   `npm run lint` runs markdownlint-cli2 across the WHOLE repo and has always
 *   surfaced a large pre-existing backlog (tens of thousands of findings) that
 *   is unrelated to any single PR. The CI gate (CircleCI + wr-lint) is scoped
 *   to *changed* Markdown on purpose so new work isn't drowned by that backlog
 *   — but the backlog itself never shrinks on its own, so it keeps getting
 *   re-flagged in issue after issue. This script is the "resolve it permanently
 *   in a maintenance script" answer: it uses the FOSS tool we already depend on
 *   (markdownlint-cli2, David Anson, MIT-licensed) to auto-fix the mechanical
 *   findings (list style, ordered-list numbering, blank lines, trailing spaces,
 *   heading spacing, bare URLs, …). The vast majority of the backlog is
 *   auto-fixable, so running this sweep collapses it dramatically.
 *
 * Modes:
 *   (default) / --fix   Count findings, run `markdownlint-cli2 --fix`, then
 *                       count again and print a before/after summary. Exit 0
 *                       even if some non-auto-fixable findings remain (they
 *                       need human edits — this is maintenance, not a gate).
 *   --check             Count findings only; do NOT modify files. Exits 1 if
 *                       the backlog exceeds --threshold (default 0), otherwise
 *                       0. Useful for reporting / scheduled monitoring.
 *
 * Options:
 *   --threshold=<n>     Allowed backlog size in --check mode (default 0).
 *   --quiet             Suppress the per-file findings dump; print summary only.
 *
 * This script shells out to the repo's `lint` / `lint:fix` npm scripts so it
 * always honours .markdownlint.jsonc and .markdownlintignore — the single
 * source of truth for what "clean" means here. If it ever reports 0 fixed but
 * a non-zero backlog, those are genuinely non-auto-fixable findings that a
 * human (or a follow-up agent) must resolve by editing the flagged files.
 */

const { spawnSync } = require("child_process");

/**
 * Count markdownlint findings from markdownlint-cli2 stderr/stdout output.
 * Each finding is one line containing " error " (e.g.
 * "path/file.md:12 error MD012/no-multiple-blanks ..."). Pure + unit-tested.
 *
 * @param {string} output - combined stdout/stderr from a lint run.
 * @returns {number} number of findings.
 */
function countLintErrors(output) {
  if (!output) return 0;
  let count = 0;
  for (const line of String(output).split("\n")) {
    if (/ error /.test(line)) count++;
  }
  return count;
}

/**
 * Run an npm script and return combined output + exit code.
 * markdownlint-cli2 exits non-zero when findings exist; that's expected here,
 * so callers inspect the parsed count rather than the exit code.
 *
 * @param {string} scriptName - npm script to run (e.g. "lint", "lint:fix").
 * @returns {{output: string, status: number}}
 */
function runNpmScript(scriptName) {
  const res = spawnSync("npm", ["run", "--silent", scriptName], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${res.stdout || ""}${res.stderr || ""}`;
  return { output, status: res.status == null ? 1 : res.status };
}

/**
 * Parse CLI args into a simple options object. Pure + unit-tested.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{check: boolean, quiet: boolean, threshold: number}}
 */
function parseArgs(argv) {
  const opts = { check: false, quiet: false, threshold: 0 };
  for (const arg of argv || []) {
    if (arg === "--check") opts.check = true;
    else if (arg === "--fix") opts.check = false;
    else if (arg === "--quiet") opts.quiet = true;
    else if (arg.startsWith("--threshold=")) {
      const n = Number.parseInt(arg.slice("--threshold=".length), 10);
      if (Number.isFinite(n) && n >= 0) opts.threshold = n;
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  const before = runNpmScript("lint");
  const beforeCount = countLintErrors(before.output);

  if (opts.check) {
    console.log(`Markdown backlog: ${beforeCount} finding(s).`);
    if (beforeCount > opts.threshold) {
      console.log(
        `❌ Backlog (${beforeCount}) exceeds threshold (${opts.threshold}). ` +
          `Run \`npm run markdown:fix-backlog\` to auto-fix the mechanical findings.`
      );
      process.exit(1);
    }
    console.log(`✅ Backlog within threshold (${opts.threshold}).`);
    return;
  }

  console.log(`Markdown backlog before fix: ${beforeCount} finding(s).`);
  console.log("Running markdownlint-cli2 --fix (this rewrites files in place)…");
  runNpmScript("lint:fix");

  const after = runNpmScript("lint");
  const afterCount = countLintErrors(after.output);
  const fixed = Math.max(0, beforeCount - afterCount);

  console.log("");
  console.log(`✅ Auto-fixed ${fixed} finding(s).`);
  console.log(`Remaining (non-auto-fixable) findings: ${afterCount}.`);
  if (afterCount > 0 && !opts.quiet) {
    console.log(
      "These require manual edits. Review the remaining findings with `npm run lint`."
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = { countLintErrors, parseArgs, runNpmScript };

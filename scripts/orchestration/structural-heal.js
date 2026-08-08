#!/usr/bin/env node
"use strict";

/**
 * Structural Heal Orchestrator
 *
 * Walks a directory tree (default: docs/), runs the deterministic Markdown
 * structural healer (MD003/MD025/MD056 via scripts/heal-markdown.js), and
 * optionally fails when non-auto-fixable findings remain.
 *
 * This is the production entrypoint used by:
 *   - .github/workflows/structural-auto-heal.yml
 *   - npm run orchestration:heal
 *   - products/orchestration-console (docs reference)
 *
 * Design choices vs the WR draft:
 *   - No silent force-push to contributor branches (repo policy).
 *   - Deterministic local heal first; OpenRouter is NOT required for MD025/MD056.
 *   - Exit code reflects postcondition (clean or remaining findings), not
 *     "process finished".
 *
 * Usage:
 *   node scripts/orchestration/structural-heal.js [--root docs] [--strict] [--dry-run]
 *   node scripts/orchestration/structural-heal.js --files a.md b.md
 */

const fs = require("fs");
const path = require("path");
const healMarkdown = require("../heal-markdown.js");
const {
  heal,
  loadIgnorePatterns,
  isIgnored,
  countLintErrors,
  runMarkdownlint,
} = healMarkdown;

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const opts = {
    root: "docs",
    strict: false,
    dryRun: false,
    quiet: false,
    files: [],
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--root" && next) {
      opts.root = next;
      i += 1;
    } else if (a === "--strict") {
      opts.strict = true;
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    } else if (a === "--quiet") {
      opts.quiet = true;
    } else if (a === "--json") {
      opts.json = true;
    } else if (a === "--files") {
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) {
        opts.files.push(argv[++i]);
      }
    } else if (!a.startsWith("--")) {
      opts.files.push(a);
    }
  }
  return opts;
}

/**
 * Recursively collect .md files under dir.
 * @param {string} dir
 * @returns {string[]}
 */
function walkMarkdown(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "transcripts") {
        continue;
      }
      out.push(...walkMarkdown(full));
    } else if (ent.isFile() && ent.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Heal a list of absolute or relative Markdown paths.
 *
 * @param {string[]} files
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ healed: string[], unchanged: string[], skipped: string[] }}
 */
function healFiles(files, opts = {}) {
  const ignorePatterns = loadIgnorePatterns();
  const healed = [];
  const unchanged = [];
  const skipped = [];

  for (const file of files) {
    const abs = path.isAbsolute(file) ? file : path.resolve(REPO_ROOT, file);
    if (!fs.existsSync(abs)) {
      skipped.push(file);
      continue;
    }
    if (isIgnored(abs, ignorePatterns, REPO_ROOT)) {
      skipped.push(file);
      continue;
    }
    const original = fs.readFileSync(abs, "utf8");
    const { text, changed } = heal(original);
    if (!changed) {
      unchanged.push(path.relative(REPO_ROOT, abs));
      continue;
    }
    if (!opts.dryRun) {
      fs.writeFileSync(abs, text, "utf8");
    }
    healed.push(path.relative(REPO_ROOT, abs));
  }

  return { healed, unchanged, skipped };
}

function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  let files = opts.files.slice();
  if (files.length === 0) {
    const rootAbs = path.resolve(REPO_ROOT, opts.root);
    files = walkMarkdown(rootAbs);
  }

  const summary = healFiles(files, { dryRun: opts.dryRun });

  let remaining = null;
  if (typeof runMarkdownlint === "function" && summary.healed.length && !opts.dryRun) {
    const absHealed = summary.healed.map((f) => path.resolve(REPO_ROOT, f));
    runMarkdownlint(absHealed, { fix: true });
    const finalRun = runMarkdownlint(absHealed);
    remaining = countLintErrors(finalRun.output);
  }

  const report = {
    root: opts.root,
    dryRun: opts.dryRun,
    healed: summary.healed,
    unchangedCount: summary.unchanged.length,
    skippedCount: summary.skipped.length,
    remainingFindings: remaining,
  };

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (!opts.quiet) {
    process.stdout.write(
      `Structural heal: ${summary.healed.length} rewritten, ` +
        `${summary.unchanged.length} unchanged, ${summary.skipped.length} skipped` +
        (opts.dryRun ? " (dry-run)" : "") +
        "\n"
    );
    for (const f of summary.healed) process.stdout.write(`  healed: ${f}\n`);
    if (remaining != null) {
      process.stdout.write(`Remaining lint findings on healed set: ${remaining}\n`);
    }
  }

  if (opts.strict && remaining != null && remaining > 0) return 1;
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  parseArgs,
  walkMarkdown,
  healFiles,
  main,
  REPO_ROOT,
};

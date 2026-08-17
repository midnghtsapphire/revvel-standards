#!/usr/bin/env node
/**
 * find-unwired-promises.js
 *
 * Scans scripts/** header comments and skills/**\/SKILL.md files for
 * mentions of a .github/workflows/*.yml or tests/*.test.js filename, then
 * checks whether that named file actually exists on disk. Flags any that
 * don't -- these are cases where documentation/code promises a workflow or
 * test that was never actually created (the exact shape of WR-01 and WR-06
 * from the 2026-08-05 audit).
 *
 * Report-only, no network calls, exits 0 always.
 * Usage: node tools/sandbox-audit-2026-08-05/find-unwired-promises.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

// Matches things like ".github/workflows/foo.yml" or "tests/bar.test.js"
const WORKFLOW_REF_RE = /\.github\/workflows\/[\w-]+\.ya?ml/g;
const TEST_REF_RE = /tests\/[\w./-]+\.test\.(js|ts)/g;

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (
      full.endsWith(".js") ||
      full.endsWith(".ts") ||
      full.endsWith(".py") ||
      (full.endsWith("SKILL.md"))
    ) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const scriptsDir = path.join(REPO_ROOT, "scripts");
  const skillsDir = path.join(REPO_ROOT, "skills");
  const candidateFiles = [
    ...walk(scriptsDir, []),
    ...walk(skillsDir, []),
  ];

  const findings = [];

  for (const file of candidateFiles) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const refs = new Set([
      ...(content.match(WORKFLOW_REF_RE) || []),
      ...(content.match(TEST_REF_RE) || []),
    ]);

    for (const ref of refs) {
      const refPath = path.join(REPO_ROOT, ref);
      if (!fs.existsSync(refPath)) {
        findings.push({
          promisedIn: path.relative(REPO_ROOT, file),
          promisedFile: ref,
          exists: false,
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        scannedFiles: candidateFiles.length,
        brokenPromiseCount: findings.length,
        findings,
      },
      null,
      2
    )
  );
  process.exit(0);
}

main();

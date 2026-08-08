#!/usr/bin/env node
/**
 * find-orphaned-scripts.js
 *
 * Finds files under scripts/ that are referenced nowhere else in the repo:
 * no workflow, no doc, no other script mentions their filename. Report-only,
 * no network calls, exits 0 always.
 *
 * Built during the 2026-08-05 repo audit (see
 * wr/pending/audit-2026-08-05/README.md) to find WR-06/WR-07-shaped gaps.
 * Usage: node tools/sandbox-audit-2026-08-05/find-orphaned-scripts.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");

const SEARCH_EXTS = new Set([
  ".js", ".ts", ".py", ".yml", ".yaml", ".md", ".json", ".sh",
]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".next",
]);

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
    } else {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const allFiles = walk(REPO_ROOT, []);
  const scriptFiles = allFiles.filter(
    (f) => f.startsWith(SCRIPTS_DIR + path.sep) &&
      (f.endsWith(".js") || f.endsWith(".py") || f.endsWith(".ts"))
  );

  // Build a combined haystack of every searchable file's contents.
  const haystackFiles = allFiles.filter((f) =>
    SEARCH_EXTS.has(path.extname(f))
  );
  const contentsByFile = new Map();
  for (const f of haystackFiles) {
    try {
      contentsByFile.set(f, fs.readFileSync(f, "utf8"));
    } catch {
      // binary or unreadable, skip
    }
  }

  const findings = [];
  for (const scriptFile of scriptFiles) {
    const base = path.basename(scriptFile); // e.g. "label-inventory.js"
    const baseNoExt = base.replace(/\.(js|ts|py)$/, ""); // "label-inventory"
    let referenceCount = 0;
    const referencedIn = [];

    for (const [otherFile, content] of contentsByFile) {
      if (otherFile === scriptFile) continue;
      if (content.includes(base) || content.includes(baseNoExt)) {
        referenceCount++;
        referencedIn.push(path.relative(REPO_ROOT, otherFile));
      }
    }

    if (referenceCount === 0) {
      findings.push({
        file: path.relative(REPO_ROOT, scriptFile),
        referenceCount: 0,
        referencedIn: [],
        note: "zero references anywhere else in the repo",
      });
    } else {
      findings.push({
        file: path.relative(REPO_ROOT, scriptFile),
        referenceCount,
        referencedIn,
      });
    }
  }

  const orphaned = findings.filter((f) => f.referenceCount === 0);
  console.log(
    JSON.stringify(
      {
        scannedScripts: scriptFiles.length,
        orphanedCount: orphaned.length,
        orphaned,
      },
      null,
      2
    )
  );
  process.exit(0);
}

main();

#!/usr/bin/env node
/**
 * Revvel Flow Chart Sync
 *
 * Automatically keeps the "Master Revvel-Standards Flow Charts" folder up-to-date.
 *
 * What it does:
 *   1. Scans the entire docs/ tree for .md files
 *   2. Updates <!-- SYNC-META-START --> blocks in flow chart files with current counts + date
 *   3. Detects renamed/moved docs and patches broken cross-references in flow charts
 *   4. Updates the TOOLS_CATALOG.csv Last_Sync row
 *
 * Usage (local):
 *   node scripts/sync-flow-charts.js
 *
 * Usage (CI — see .github/workflows/flow-chart-sync.yml):
 *   REPO_ROOT=/path/to/repo node scripts/sync-flow-charts.js
 *
 * Environment variables:
 *   REPO_ROOT    — absolute path to repo root (defaults to process.cwd())
 *   DRY_RUN      — set to "true" to print changes without writing files
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT = process.env.REPO_ROOT || process.cwd();
const DRY_RUN = process.env.DRY_RUN === "true";
const FLOW_CHARTS_DIR = path.join(REPO_ROOT, "docs", "Master Revvel-Standards Flow Charts");
const DOCS_DIR = path.join(REPO_ROOT, "docs");

const TODAY = new Date().toISOString().split("T")[0];

// Files inside the flow charts folder that get metadata updates
const FLOW_CHART_FILES = [
  "README.md",
  "MASTER_FLOW_SIMPLE.md",
  "MASTER_FLOW_WIREFRAME.md",
  "MASTER_FLOW_3D.md",
  "TOOLS_CATALOG.md",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Directories to always skip during file-system walks. */
const WALK_SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "build",
  "dist",
  "out",
  ".cache",
  "coverage",
  ".turbo",
]);

/**
 * Recursively walk a directory and return all file paths matching a filter.
 * Automatically skips common non-documentation directories.
 * @param {string} dir
 * @param {(file: string) => boolean} filter
 * @returns {Promise<string[]>}
 */
async function walk(dir, filter) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return [];
    throw err;
  }

  const results = [];
  const promises = [];

  for (const entry of entries) {
    if (entry.isDirectory() && WALK_SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      promises.push(walk(full, filter));
    } else if (entry.isFile() && filter(full)) {
      results.push(full);
    }
  }

  if (promises.length > 0) {
    const subDirs = await Promise.all(promises);
    for (const sub of subDirs) {
      results.push(...sub);
    }
  }

  return results;
}

/**
 * Read a file and return its content as a string.
 * @param {string} filePath
 * @returns {string}
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Write content to a file (unless DRY_RUN is active).
 * @param {string} filePath
 * @param {string} content
 */
function writeFile(filePath, content) {
  if (DRY_RUN) {
    console.log(`  [DRY_RUN] Would write: ${path.relative(REPO_ROOT, filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
}

// ---------------------------------------------------------------------------
// Step 1: Scan docs/ for all .md files
// ---------------------------------------------------------------------------

async function scanDocs() {
  const allMd = await walk(REPO_ROOT, (f) => f.endsWith(".md"));
  // Exclude the flow charts folder itself to avoid circular counting
  const flowChartsPrefix = FLOW_CHARTS_DIR + path.sep;
  const docsMd = allMd.filter((f) => !f.startsWith(flowChartsPrefix));
  const relPaths = docsMd.map((f) => path.relative(REPO_ROOT, f));
  console.log(`📂 Found ${relPaths.length} .md files in repo (excluding flow charts folder)`);
  return relPaths;
}

// ---------------------------------------------------------------------------
// Step 2: Update <!-- SYNC-META-START --> blocks
// ---------------------------------------------------------------------------

const META_START = "<!-- SYNC-META-START -->";
const META_END = "<!-- SYNC-META-END -->";

/**
 * Count the number of data rows (tools) in TOOLS_CATALOG.csv.
 * Excludes the header row and any blank trailing lines.
 * @returns {number} tool count, or 0 if the CSV is missing/unreadable
 */
function countTools() {
  const csvPath = path.join(FLOW_CHARTS_DIR, "TOOLS_CATALOG.csv");
  if (!fs.existsSync(csvPath)) return 0;
  const content = readFile(csvPath);
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  // Subtract 1 for the header row
  return Math.max(0, lines.length - 1);
}

/**
 * Build the new metadata block content.
 * @param {number} docCount
 * @param {number} toolCount
 * @returns {string}
 */
function buildMetaBlock(docCount, toolCount) {
  return (
    `${META_START}\n` +
    `- **Last sync:** ${TODAY}\n` +
    `- **Total docs in repo:** ${docCount}\n` +
    `- **Total tools catalogued:** ${toolCount}\n` +
    `- **Workflow:** \`.github/workflows/flow-chart-sync.yml\`\n` +
    `- **Script:** \`scripts/sync-flow-charts.js\`\n` +
    `${META_END}`
  );
}

/**
 * Update the metadata block inside a file if it exists.
 * @param {string} filePath
 * @param {number} docCount
 * @param {number} toolCount
 * @returns {boolean} true if the file was changed
 */
function updateMetaBlock(filePath, docCount, toolCount) {
  if (!fs.existsSync(filePath)) return false;
  const original = readFile(filePath);
  const startIdx = original.indexOf(META_START);
  const endIdx = original.indexOf(META_END);
  if (startIdx === -1 || endIdx === -1) return false;

  const newBlock = buildMetaBlock(docCount, toolCount);
  const updated = original.slice(0, startIdx) + newBlock + original.slice(endIdx + META_END.length);

  if (updated === original) return false;

  writeFile(filePath, updated);
  return true;
}

/**
 * Update the "Last auto-sync" footer line in a file.
 * @param {string} filePath
 * @returns {boolean}
 */
function updateSyncFooter(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const original = readFile(filePath);
  const footerPattern = /\*Last auto-sync: \d{4}-\d{2}-\d{2}\*/;
  const newFooter = `*Last auto-sync: ${TODAY}*`;

  if (!footerPattern.test(original)) return false;

  const updated = original.replace(/\*Last auto-sync: \d{4}-\d{2}-\d{2}\*/g, newFooter);
  if (updated === original) return false;

  writeFile(filePath, updated);
  return true;
}

// ---------------------------------------------------------------------------
// Step 3: Detect renamed/moved files and patch references
// ---------------------------------------------------------------------------

/**
 * Build a map of basename → current relative path for all .md files in docs/.
 * Used to detect when a file was moved.
 * @param {string[]} allDocPaths - relative paths from repo root
 * @returns {Map<string, string>}
 */
function buildBasenameMap(allDocPaths) {
  const map = new Map();
  for (const relPath of allDocPaths) {
    const base = path.basename(relPath);
    // If there are multiple files with the same name, prefer the one in docs/
    if (!map.has(base) || relPath.startsWith("docs/")) {
      map.set(base, relPath);
    }
  }
  return map;
}

/**
 * Scan a flow chart file for Markdown links, check if any linked file has
 * moved, and patch the path if so.
 * @param {string} filePath
 * @param {Map<string, string>} basenameMap
 * @returns {boolean}
 */
function patchBrokenRefs(filePath, basenameMap) {
  if (!fs.existsSync(filePath)) return false;
  let content = readFile(filePath);
  let changed = false;

  // Match Markdown links: [text](path)  — only relative paths (no http)
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  const replacements = [];

  while ((match = linkPattern.exec(content)) !== null) {
    const [fullMatch, linkText, linkHref] = match;
    if (linkHref.startsWith("http") || linkHref.startsWith("#")) continue;

    // Resolve the linked file relative to the flow charts folder
    const resolvedPath = path.resolve(FLOW_CHARTS_DIR, linkHref);

    // Security: ensure the resolved path stays within the repository root
    const repoRootNormalized = path.resolve(REPO_ROOT) + path.sep;
    if (!resolvedPath.startsWith(repoRootNormalized) && resolvedPath !== path.resolve(REPO_ROOT)) {
      console.warn(`  ⚠️  Skipping link outside repo root: ${linkHref}`);
      continue;
    }

    if (fs.existsSync(resolvedPath)) continue; // link is fine

    // File not found at current path — try to locate it by basename
    const basename = path.basename(linkHref);
    if (basenameMap.has(basename)) {
      const newAbsPath = path.join(REPO_ROOT, basenameMap.get(basename));
      const newRelPath = path.relative(FLOW_CHARTS_DIR, newAbsPath);
      const newLink = `[${linkText}](${newRelPath})`;
      replacements.push({ old: fullMatch, new: newLink });
      console.log(`  🔗 Patched broken ref: ${linkHref} → ${newRelPath}`);
    }
  }

  for (const r of replacements) {
    content = content.replace(r.old, r.new);
    changed = true;
  }

  if (changed) writeFile(filePath, content);
  return changed;
}

// ---------------------------------------------------------------------------
// Step 4: Update "Last_Sync" row in TOOLS_CATALOG.csv
// ---------------------------------------------------------------------------

function updateCsvSync() {
  const csvPath = path.join(FLOW_CHARTS_DIR, "TOOLS_CATALOG.csv");
  if (!fs.existsSync(csvPath)) return false;

  let content = readFile(csvPath);
  // The pattern to look for: any date in the header or metadata row
  // We just update a comment line at the top if present, otherwise skip
  const datePattern = /^(#\s*Last sync:\s*)\d{4}-\d{2}-\d{2}/m;
  if (!datePattern.test(content)) return false;

  const updated = content.replace(datePattern, `$1${TODAY}`);
  if (updated === content) return false;

  writeFile(csvPath, updated);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🔄 Revvel Flow Chart Sync");
  console.log(`📅 Date: ${TODAY}`);
  console.log(`📁 Repo root: ${REPO_ROOT}`);
  console.log(`📂 Flow charts dir: ${FLOW_CHARTS_DIR}`);
  if (DRY_RUN) console.log("⚠️  DRY_RUN mode — no files will be written\n");
  console.log();

  if (!fs.existsSync(FLOW_CHARTS_DIR)) {
    console.error(`❌ Flow charts directory not found: ${FLOW_CHARTS_DIR}`);
    console.error("   Run this script from the repository root.");
    process.exit(1);
  }

  // Step 1: Scan docs
  const allDocPaths = await scanDocs();
  const docCount = allDocPaths.length;
  const toolCount = countTools();
  console.log(`🛠️  Tools catalogued in TOOLS_CATALOG.csv: ${toolCount}`);

  // Step 2: Update metadata blocks + footers
  console.log("\n✏️  Updating metadata blocks...");
  let metaChanges = 0;
  for (const filename of FLOW_CHART_FILES) {
    const filePath = path.join(FLOW_CHARTS_DIR, filename);
    const metaChanged = updateMetaBlock(filePath, docCount, toolCount);
    const footerChanged = updateSyncFooter(filePath);
    if (metaChanged || footerChanged) {
      console.log(`  ✅ Updated: ${filename}`);
      metaChanges++;
    } else {
      console.log(`  ─  No change: ${filename}`);
    }
  }

  // Step 3: Patch broken references
  console.log("\n🔗 Checking for broken file references...");
  const basenameMap = buildBasenameMap(allDocPaths);
  let refChanges = 0;
  for (const filename of FLOW_CHART_FILES) {
    const filePath = path.join(FLOW_CHARTS_DIR, filename);
    if (patchBrokenRefs(filePath, basenameMap)) refChanges++;
  }
  if (refChanges === 0) console.log("  ─  All references are valid");

  // Step 4: CSV sync line
  updateCsvSync();

  // Summary
  console.log(`\n✅ Sync complete`);
  console.log(`   Docs found:    ${docCount}`);
  console.log(`   Meta updates:  ${metaChanges}`);
  console.log(`   Ref patches:   ${refChanges}`);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY_RUN — no files were modified");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

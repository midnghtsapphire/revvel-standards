#!/usr/bin/env node
"use strict";

/**
 * No-Destroy Guard
 *
 * Fails a pull request that DELETES existing apps/products or strips a large
 * number of lines from protected paths — the exact failure that wiped
 * products/life-insurance-lead-saas and products/ugc-review-generator under a PR
 * that claimed to "add a research WR".
 *
 * An LLM coder that "rewrites" a working app shows up as mass deletions of
 * existing files; this guard stops that from merging. Intentional removals are
 * still possible — add the `allow-destroy` label to the PR to override.
 *
 * Env:
 *   BASE_SHA        the PR base commit (e.g. github.event.pull_request.base.sha)
 *   ALLOW_DESTROY   'true' when the PR carries the allow-destroy label
 *   PROTECTED       comma list of protected path prefixes (default below)
 *   MAX_DELETED     max deleted lines allowed under protected paths (default 400)
 */

const { execFileSync } = require("child_process");

const DEFAULT_PROTECTED = "products/,apps/,sites/,src/,public/";
const LOCKFILE_RE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/;

function evaluateDiff(files, { protectedPrefixes, maxDeleted, allowDestroy }) {
  if (allowDestroy) {
    return { fail: false, reasons: ["`allow-destroy` label present — guard intentionally skipped."] };
  }
  const reasons = [];
  const inProtected = (p) => protectedPrefixes.some((pre) => pre && p.startsWith(pre));
  let protectedDeleted = 0;
  const deletedFiles = [];
  for (const f of files) {
    if (!inProtected(f.path)) continue;
    if (f.status === "D") deletedFiles.push(f.path);
    if (!LOCKFILE_RE.test(f.path)) protectedDeleted += Number(f.deleted) || 0;
  }
  if (deletedFiles.length > 0) {
    reasons.push(`Deletes ${deletedFiles.length} existing file(s) under protected paths:`);
    deletedFiles.slice(0, 20).forEach((p) => reasons.push(`  - ${p}`));
    if (deletedFiles.length > 20) reasons.push(`  …and ${deletedFiles.length - 20} more`);
  }
  if (protectedDeleted > maxDeleted) {
    reasons.push(`Removes ${protectedDeleted} lines under protected paths (limit ${maxDeleted}).`);
  }
  return { fail: reasons.length > 0, reasons };
}

function readDiff(baseSha) {
  // name-status gives A/M/D; numstat gives added/deleted counts. Merge by path.
  const nameStatus = execFileSync("git", ["diff", "--name-status", `${baseSha}...HEAD`], { encoding: "utf8" });
  const numstat = execFileSync("git", ["diff", "--numstat", `${baseSha}...HEAD`], { encoding: "utf8" });

  const status = {};
  for (const line of nameStatus.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const code = parts[0][0]; // A/M/D/R...
    const path = parts[parts.length - 1];
    status[path] = code;
  }
  const files = [];
  for (const line of numstat.split("\n")) {
    if (!line.trim()) continue;
    const [added, deleted, path] = line.split("\t");
    files.push({ path, added, deleted, status: status[path] || "M" });
  }
  return files;
}

function main() {
  const baseSha = process.env.BASE_SHA;
  if (!baseSha) {
    console.log("::warning::BASE_SHA not set — no-destroy guard skipped.");
    return 0;
  }
  const protectedPrefixes = (process.env.PROTECTED || DEFAULT_PROTECTED).split(",").map((s) => s.trim()).filter(Boolean);
  const maxDeleted = Math.max(1, parseInt(process.env.MAX_DELETED || "400", 10) || 400);
  const allowDestroy = (process.env.ALLOW_DESTROY || "").toLowerCase() === "true";

  const files = readDiff(baseSha);
  const { fail, reasons } = evaluateDiff(files, { protectedPrefixes, maxDeleted, allowDestroy });

  if (fail) {
    console.log("❌ No-Destroy Guard: this PR would destroy existing work.\n");
    reasons.forEach((r) => console.log(r));
    console.log(
      "\nIf this removal is intentional, add the `allow-destroy` label to the PR and re-run.\n" +
      "Otherwise, change the approach to EDIT existing files with minimal diffs instead of replacing them."
    );
    return 1;
  }
  console.log("✅ No-Destroy Guard passed.");
  reasons.forEach((r) => console.log(r));
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (e) {
    console.error("no-destroy-guard error:", e.message);
    process.exit(1);
  }
}

module.exports = { evaluateDiff };

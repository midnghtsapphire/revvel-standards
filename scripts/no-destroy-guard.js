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
 * 2026-11-15 controlling behavior: global file-loss block, global 1000-line
 * deletion budget (including lockfiles), 80% replacement/loss on files >=20
 * baseline lines, and the retained protected 400-line budget. The old bypass
 * description above is historical only; neither a label nor env overrides policy.
 * HEAD_SHA defaults to HEAD locally. Missing baseline and Git errors fail closed.
 * MAX_GLOBAL_DELETED, MIN_REPLACEMENT_LINES, REPLACEMENT_RATIO configure heuristics.
 * These are tripwires, not proof of intent or universal destruction detection.
 *
 * Env:
 *   BASE_SHA        the PR base commit (e.g. github.event.pull_request.base.sha)
 *   ALLOW_DESTROY   'true' when the PR carries the allow-destroy label
 *   PROTECTED       comma list of protected path prefixes (default below)
 *   MAX_DELETED     max deleted lines allowed under protected paths (default 400)
 */

const { execFileSync } = require("child_process");

const DEFAULT_PROTECTED = "products/,apps/,sites/,src/,public/";
// 2026-11-15 owner rule: all paths are protected against file deletion; labels never bypass.
const LOCKFILE_RE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/;

// 2026-11-15: additive global limits retain the old protected-path limit as a stricter layer.
function evaluateDiff(files, {
  protectedPrefixes = DEFAULT_PROTECTED.split(','), maxDeleted = 400, allowDestroy,
  maxGlobalDeleted = 1000, replacementRatio = 0.8, minReplacementLines = 20,
} = {}) {
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Owner forbids destructive changes; allowDestroy is retained only as an inert compatibility argument.
//   if (allowDestroy) {
//     return { fail: false, reasons: ["`allow-destroy` label present — guard intentionally skipped."] };
//   }
// REVVEL-DISABLED-END

  const reasons = [];
  if (!Array.isArray(files)) throw new Error('Diff must be an array');
  for (const [name, value] of Object.entries({ maxDeleted, maxGlobalDeleted, minReplacementLines })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
  }
  if (!Number.isFinite(replacementRatio) || replacementRatio <= 0 || replacementRatio > 1) {
    throw new Error('Invalid replacementRatio');
  }
  let globalDeleted = 0;
  const inProtected = (p) => protectedPrefixes.some((pre) => pre && p.startsWith(pre));
  let protectedDeleted = 0;
  const deletedFiles = [];
  for (const f of files) {
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: The previous loop skipped every unprotected path and silently coerced malformed counts.
//     if (!inProtected(f.path)) continue;
//     if (f.status === "D") deletedFiles.push(f.path);
//     if (!LOCKFILE_RE.test(f.path)) protectedDeleted += Number(f.deleted) || 0;
// REVVEL-DISABLED-END
    if (typeof f.path !== 'string' || !f.path || !/^[AMDT]$/.test(f.status)) {
      throw new Error('Missing or unsupported diff path/status');
    }
    if (f.status === 'D') deletedFiles.push(f.path);
    if (f.status === 'T') reasons.push(`Changes existing file type: ${JSON.stringify(f.path)}.`);
    if (f.added === '-' || f.deleted === '-') {
      if (f.status !== 'A') reasons.push(`Cannot quantify existing binary change: ${JSON.stringify(f.path)}.`);
      continue;
    }
    if (!/^\d+$/.test(String(f.added)) || !/^\d+$/.test(String(f.deleted))) {
      throw new Error('Invalid diff line counts');
    }
    const deleted = Number(f.deleted);
    if (!Number.isSafeInteger(deleted) || !Number.isSafeInteger(Number(f.added))) {
      throw new Error('Unsafe diff line counts');
    }
    globalDeleted += deleted; // Includes lockfiles and every directory.
    if (inProtected(f.path) && !LOCKFILE_RE.test(f.path)) protectedDeleted += deleted;
    if (f.beforeLines !== undefined && (!Number.isSafeInteger(f.beforeLines) || f.beforeLines < 0)) {
      throw new Error('Invalid baseline line count');
    }
    if (f.status !== 'D' && f.beforeLines >= minReplacementLines && deleted / f.beforeLines >= replacementRatio) {
      reasons.push(`Replaces or strips ${deleted}/${f.beforeLines} baseline lines in ${JSON.stringify(f.path)} (ratio limit ${replacementRatio}).`);
    }
  }
  if (deletedFiles.length > 0) {
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: File deletion is prohibited globally, not only in product directories.
//     reasons.push(`Deletes ${deletedFiles.length} existing file(s) under protected paths:`);
// REVVEL-DISABLED-END
    reasons.push(`Deletes ${deletedFiles.length} existing file(s) anywhere in the repository:`);
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Escape newlines/control characters so a Git filename cannot inject log annotations.
//     deletedFiles.slice(0, 20).forEach((p) => reasons.push(`  - ${p}`));
// REVVEL-DISABLED-END
    deletedFiles.slice(0, 20).forEach((p) => reasons.push(`  - ${JSON.stringify(p)}`));
    if (deletedFiles.length > 20) reasons.push(`  …and ${deletedFiles.length - 20} more`);
  }
  if (protectedDeleted > maxDeleted) {
    reasons.push(`Removes ${protectedDeleted} lines under protected paths (limit ${maxDeleted}).`);
  }
  if (globalDeleted > maxGlobalDeleted) {
    reasons.push(`Removes ${globalDeleted} lines repository-wide (limit ${maxGlobalDeleted}).`);
  }
  return { fail: reasons.length > 0, reasons };
}

// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Whitespace-splitting Git paths was unsafe; explicit merge-base and NUL records fail closed.
// function readDiff(baseSha) {
//   // name-status gives A/M/D; numstat gives added/deleted counts. Merge by path.
//   const nameStatus = execFileSync("git", ["diff", "--name-status", `${baseSha}...HEAD`], { encoding: "utf8" });
//   const numstat = execFileSync("git", ["diff", "--numstat", `${baseSha}...HEAD`], { encoding: "utf8" });
//
//   const status = {};
//   for (const line of nameStatus.split("\n")) {
//     if (!line.trim()) continue;
//     const parts = line.split("\t");
//     const code = parts[0][0]; // A/M/D/R...
//     const path = parts[parts.length - 1];
//     status[path] = code;
//   }
//   const files = [];
//   for (const line of numstat.split("\n")) {
//     if (!line.trim()) continue;
//     const [added, deleted, path] = line.split("\t");
//     files.push({ path, added, deleted, status: status[path] || "M" });
//   }
//   return files;
// }
// REVVEL-DISABLED-END
// Git is invoked directly, never through a shell; PR blobs are read as DATA.
// --no-ext-diff/--no-textconv prohibit executable drivers. --no-renames deliberately
// exposes a rename as deletion + addition because the owner prohibits file loss.
function git(args, cwd) {
  return execFileSync('git', args, {
    cwd, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveCommit(ref, cwd) {
  if (typeof ref !== 'string' || !ref || ref.startsWith('-') || /[\x00-\x20]/.test(ref)) {
    throw new Error('Missing or invalid commit reference');
  }
  const sha = git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], cwd).toString('ascii').trim();
  if (!/^[a-f0-9]{40,64}$/.test(sha)) throw new Error('Invalid resolved commit');
  return sha;
}

function nulRecords(buffer) {
  if (buffer.length && buffer[buffer.length - 1] !== 0) throw new Error('Unterminated Git path data');
  // Invalid UTF-8 paths fail closed, rather than combining two distinct byte paths.
  const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  return text ? text.slice(0, -1).split('\0') : [];
}

function countLines(buffer) {
  let n = 0;
  for (const byte of buffer) if (byte === 10) n++;
  return n + (buffer.length && buffer[buffer.length - 1] !== 10 ? 1 : 0);
}

function readDiff(baseSha, headSha = 'HEAD', { cwd } = {}) {
  const base = resolveCommit(baseSha, cwd);
  const head = resolveCommit(headSha, cwd);
  const baseline = git(['merge-base', base, head], cwd).toString('ascii').trim();
  if (!/^[a-f0-9]{40,64}$/.test(baseline)) throw new Error('No valid merge base');
  const args = ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames'];
  const nameStatus = nulRecords(git([...args, '--name-status', '-z', baseline, head, '--'], cwd));
  const numstat = nulRecords(git([...args, '--numstat', '-z', baseline, head, '--'], cwd));
  const status = new Map();
  if (nameStatus.length % 2) throw new Error('Malformed name-status data');
  for (let i = 0; i < nameStatus.length; i += 2) {
    const code = nameStatus[i];
    const filename = nameStatus[i + 1];
    if (!/^[AMDT]$/.test(code) || !filename || status.has(filename)) throw new Error('Unsupported Git status');
    status.set(filename, code);
  }
  const files = [];
  for (const record of numstat) {
    const first = record.indexOf('\t');
    const second = record.indexOf('\t', first + 1);
    if (first <= 0 || second <= first + 1) throw new Error('Malformed numstat data');
    const added = record.slice(0, first);
    const deleted = record.slice(first + 1, second);
    const filename = record.slice(second + 1); // tabs/newlines in the path stay intact
    if (!status.has(filename)) throw new Error('Diff status/count mismatch');
    const code = status.get(filename);
    status.delete(filename);
    const beforeLines = code === 'A' ? 0 : countLines(git(['cat-file', 'blob', `${baseline}:${filename}`], cwd));
    files.push({ path: filename, added, deleted, status: code, beforeLines });
  }
  if (status.size) throw new Error('Diff omitted changed files');
  return files;
}

function positiveInteger(value, fallback, name) {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Invalid ${name}`);
  return Number(value);
}

function main() {
  const baseSha = process.env.BASE_SHA;
  if (!baseSha) {
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Missing baseline must never appear as a passing check.
//     console.log("::warning::BASE_SHA not set — no-destroy guard skipped.");
//     return 0;
// REVVEL-DISABLED-END
    console.error('No-Destroy Guard: BASE_SHA is required; no baseline means no successful check.');
    return 1;
  }
  const protectedPrefixes = (process.env.PROTECTED || DEFAULT_PROTECTED).split(",").map((s) => s.trim()).filter(Boolean);
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Strict threshold validation; ALLOW_DESTROY is not read and cannot bypass owner policy.
//   const maxDeleted = Math.max(1, parseInt(process.env.MAX_DELETED || "400", 10) || 400);
//   const allowDestroy = (process.env.ALLOW_DESTROY || "").toLowerCase() === "true";
//
//   const files = readDiff(baseSha);
//   const { fail, reasons } = evaluateDiff(files, { protectedPrefixes, maxDeleted, allowDestroy });
// REVVEL-DISABLED-END
  const maxDeleted = positiveInteger(process.env.MAX_DELETED, 400, 'MAX_DELETED');
  const maxGlobalDeleted = positiveInteger(process.env.MAX_GLOBAL_DELETED, 1000, 'MAX_GLOBAL_DELETED');
  const minReplacementLines = positiveInteger(process.env.MIN_REPLACEMENT_LINES, 20, 'MIN_REPLACEMENT_LINES');
  const replacementRatio = process.env.REPLACEMENT_RATIO === undefined ? 0.8 : Number(process.env.REPLACEMENT_RATIO);
  const files = readDiff(baseSha, process.env.HEAD_SHA || 'HEAD');
  const { fail, reasons } = evaluateDiff(files, {
    protectedPrefixes, maxDeleted, maxGlobalDeleted, minReplacementLines, replacementRatio,
  });

  if (fail) {
    console.log("❌ No-Destroy Guard: this PR would destroy existing work.\n");
    reasons.forEach((r) => console.log(r));
    console.log(
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: The legacy remediation instructed agents to violate the no-delete owner rule.
//       "\nIf this removal is intentional, add the `allow-destroy` label to the PR and re-run.\n" +
//       "Otherwise, change the approach to EDIT existing files with minimal diffs instead of replacing them."
// REVVEL-DISABLED-END
      '\nNo label bypass is permitted. Preserve the original work with dated comments and additive changes.\n' +
      'Owner review is required; agents must never merge their own PRs.'
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
// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Do not echo arbitrary Git stderr or filename content into annotations.
//     console.error("no-destroy-guard error:", e.message);
// REVVEL-DISABLED-END
    console.error('no-destroy-guard error: baseline/diff evaluation failed; check Git refs and threshold configuration.');
    process.exit(1);
  }
}

// REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Export Git integration and CLI logic for real-repository regression tests.
// module.exports = { evaluateDiff };
// REVVEL-DISABLED-END
module.exports = { evaluateDiff, readDiff, main, countLines };

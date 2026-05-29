#!/usr/bin/env node
/**
 * Auto-resolve mechanical merge conflicts.
 *
 * Run inside a merge-in-progress worktree (the caller already ran
 * `git merge --no-commit --no-ff <ref>` and got conflicts). This script
 * walks each conflicted file, classifies every conflict hunk by pattern,
 * and resolves the safe patterns in place. Anything ambiguous is left
 * with conflict markers intact so a human still decides.
 *
 * Safe patterns we resolve:
 *
 *   1. VERSION_BUMP — same `uses: owner/repo@ref` line on both sides,
 *      different `@ref`. Keep the newer one (SHA-pinned > tag, higher
 *      semver > lower, longer-prefix SHA > shorter).
 *
 *   2. ADDITIVE_LINES — incoming and current both ADD lines around the
 *      same anchor in main, neither removes anything. Keep both blocks
 *      in original order (current first, incoming after). Detected by
 *      "incoming is N new lines + current is M different new lines and
 *      neither hunk side is a strict subset of the merge-base context."
 *
 * Anything else is marked ambiguous; the script writes the file back
 * with markers intact and reports it on stdout.
 *
 * Output:
 *   - Resolved files written in place.
 *   - One line per file printed to stdout:
 *       RESOLVED <path>   N hunks ok
 *       PARTIAL  <path>   N ok, M ambiguous
 *       MANUAL   <path>   all M hunks ambiguous
 *   - Exit code 0 iff every file is fully resolved.
 *   - Exit code 2 iff anything remained ambiguous.
 *
 * Caller responsibility:
 *   - Decide whether to commit (exit 0) or `git merge --abort` (exit 2).
 *   - Post the per-file summary to the PR as a comment.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Pattern detectors ───────────────────────────────────────────────────────

const USES_LINE = /^(\s*-?\s*uses:\s*)([A-Za-z0-9_.\/-]+)@([^\s#]+)(.*)$/;

/**
 * If both sides are exactly one line and both match `uses: owner/repo@ref`
 * with the same owner/repo, return the resolved line (newer ref wins).
 * Otherwise return null.
 */
function tryVersionBump(currentBlock, incomingBlock) {
  // Preserve indent — split without trimming, then drop empty trailing lines.
  const curr = currentBlock.split(/\r?\n/).filter((l) => l !== "");
  const inc = incomingBlock.split(/\r?\n/).filter((l) => l !== "");
  if (curr.length !== 1 || inc.length !== 1) return null;

  const cm = curr[0].match(USES_LINE);
  const im = inc[0].match(USES_LINE);
  if (!cm || !im) return null;
  if (cm[2] !== im[2]) return null; // different action — not a version bump

  const newer = pickNewerRef(cm[3], im[3]);
  if (!newer) return null; // can't decide — leave to human

  // Take the matching source line (preserves indentation + trailing comment).
  const winner = newer === cm[3] ? curr[0] : inc[0];
  return winner + "\n";
}

/**
 * Return whichever ref is newer ("a" or "b"), or null if undecidable.
 * Rules:
 *   - SHA (40-char hex) is treated as the newest reference because it's
 *     immutable. If both sides are SHAs, prefer the longer/more-recent
 *     one we cannot determine — return null.
 *   - vX.Y.Z semver: compare numerically.
 *   - vX vs vY: compare major.
 *   - SHA vs tag: SHA wins (immutable pin).
 *   - Anything else: null.
 */
function pickNewerRef(a, b) {
  const isSha = (s) => /^[0-9a-f]{40}$/i.test(s);
  if (a === b) return a;
  if (isSha(a) && isSha(b)) return null;
  if (isSha(a)) return a;
  if (isSha(b)) return b;

  const sem = (s) => {
    const m = s.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!m) return null;
    return [m[1], m[2] || "0", m[3] || "0"].map(Number);
  };
  const sa = sem(a);
  const sb = sem(b);
  if (!sa || !sb) return null;
  for (let i = 0; i < 3; i++) {
    if (sa[i] > sb[i]) return a;
    if (sb[i] > sa[i]) return b;
  }
  return null;
}

/**
 * Resolve only when both blocks are *structurally additive*: every non-blank
 * line on each side matches a recognizable additive shape (markdown table
 * row, markdown list item, or table-separator). Two arbitrary one-liners
 * that happen to differ — e.g. `foo = "a"` vs `foo = "b"` — must NOT be
 * auto-merged because they're semantically a value swap, not an addition.
 *
 * When the structural test passes, return current + incoming in order
 * (current first to preserve the diff baseline). Otherwise null.
 */
function tryAdditive(currentBlock, incomingBlock) {
  if (currentBlock.trim() === "" || incomingBlock.trim() === "") return null;

  const ADDITIVE_LINE =
    /^\s*(?:\|.*\||[-*+]\s+\S|\d+\.\s+\S|\|\s*[-: ]+\s*\|)/;
  const isAdditive = (block) =>
    block
      .split(/\r?\n/)
      .filter((l) => l.trim() !== "")
      .every((l) => ADDITIVE_LINE.test(l));

  if (!isAdditive(currentBlock) || !isAdditive(incomingBlock)) return null;

  // Belt-and-suspenders: never auto-merge if any single line repeats on both
  // sides (would be a duplicate row).
  const currSet = new Set(
    currentBlock.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  );
  for (const l of incomingBlock.split(/\r?\n/)) {
    if (l.trim() && currSet.has(l.trim())) return null;
  }
  return currentBlock.replace(/\n?$/, "\n") + incomingBlock.replace(/\n?$/, "\n");
}

// ── Conflict-hunk parsing ───────────────────────────────────────────────────

/**
 * Walk file contents and yield each conflict hunk with its surrounding text
 * preserved. A hunk is the region:
 *
 *   <<<<<<< something
 *   ...current block...
 *   =======
 *   ...incoming block...
 *   >>>>>>> something
 */
function* iterHunks(text) {
  const HUNK = /(<{7}[^\n]*\n)([\s\S]*?)(={7}\n)([\s\S]*?)(>{7}[^\n]*\n)/g;
  let last = 0;
  let m;
  while ((m = HUNK.exec(text)) !== null) {
    yield {
      preText: text.slice(last, m.index),
      header: m[1],
      currentBlock: m[2],
      separator: m[3],
      incomingBlock: m[4],
      footer: m[5],
    };
    last = HUNK.lastIndex;
  }
  yield { tail: text.slice(last) };
}

function resolveFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  let output = "";
  let ok = 0;
  let ambiguous = 0;

  for (const piece of iterHunks(text)) {
    if (piece.tail !== undefined) {
      output += piece.tail;
      continue;
    }
    output += piece.preText;

    const versionResolved = tryVersionBump(piece.currentBlock, piece.incomingBlock);
    if (versionResolved !== null) {
      output += versionResolved;
      ok++;
      continue;
    }

    const additiveResolved = tryAdditive(piece.currentBlock, piece.incomingBlock);
    if (additiveResolved !== null) {
      output += additiveResolved;
      ok++;
      continue;
    }

    // Ambiguous — preserve the conflict block verbatim.
    output +=
      piece.header + piece.currentBlock + piece.separator + piece.incomingBlock + piece.footer;
    ambiguous++;
  }

  fs.writeFileSync(filePath, output);
  return { ok, ambiguous };
}

// ── Driver ──────────────────────────────────────────────────────────────────

function listConflictedFiles() {
  const out = execSync("git diff --name-only --diff-filter=U", { encoding: "utf8" });
  return out.split(/\r?\n/).filter(Boolean);
}

function main() {
  const conflicted = listConflictedFiles();
  if (conflicted.length === 0) {
    console.log("No conflicted files. Nothing to do.");
    process.exit(0);
  }

  let totalAmbiguous = 0;
  const lines = [];

  for (const file of conflicted) {
    if (!fs.existsSync(file)) {
      lines.push(`SKIP     ${file}   (deleted on one side — leave to human)`);
      totalAmbiguous++;
      continue;
    }
    const { ok, ambiguous } = resolveFile(file);
    totalAmbiguous += ambiguous;
    if (ambiguous === 0 && ok > 0) {
      lines.push(`RESOLVED ${file}   ${ok} hunk(s) auto-resolved`);
    } else if (ok > 0) {
      lines.push(`PARTIAL  ${file}   ${ok} ok, ${ambiguous} ambiguous`);
    } else {
      lines.push(`MANUAL   ${file}   ${ambiguous} hunk(s) ambiguous`);
    }
  }

  console.log(lines.join("\n"));
  process.exit(totalAmbiguous > 0 ? 2 : 0);
}

if (require.main === module) main();
module.exports = { pickNewerRef, tryVersionBump, tryAdditive, resolveFile };

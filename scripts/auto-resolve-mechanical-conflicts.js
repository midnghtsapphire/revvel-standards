#!/usr/bin/env node
/**
 * Auto-resolve mechanical merge conflicts.
 *
 * Run inside a merge-in-progress worktree (the caller already ran
 * `git merge --no-commit --no-ff <ref>` and got conflicts). This script
 * walks each conflicted file, classifies every conflict hunk by pattern,
 * and resolves the safe patterns in place. Anything ambiguous is left
 * with conflict markers intact so a human still decides.
 * Attempts to mechanically auto-resolve simple merge conflicts in the current
 * working tree (e.g. GitHub Actions `uses:` version bumps, lockfile-style
 * additions, etc.). Any file that cannot be fully resolved is left alone so a
 * human can finish the merge.
 *
 * Exit code contract:
 *   0 -> EVERY conflicted file was fully, mechanically resolved. Safe for a
 *        CI workflow to `git add -A && git commit && git push` the result.
 *   2 -> At least one conflicted file was NOT fully resolved. This includes:
 *          - SKIP    (binary / too-large / unreadable)
 *          - PARTIAL (some hunks resolved, some ambiguous)
 *          - MANUAL  (nothing resolvable found in this file) -- INCLUDING the
 *                    zero-hunk case (e.g. binary "both modified" conflicts
 *                    that never contain `<<<<<<<` markers at all).
 *   1 -> Fatal script error.
 *
 * The zero-hunk MANUAL case is important: previously the exit code was gated
 * on a counter of *ambiguous hunks*, so a conflicted file with no detected
 * hunks contributed nothing and the script exited 0 -- causing the calling
 * workflow to push unresolved conflicts onto the PR branch. This script now
 * tracks unresolved *files* directly.
 * Attempts to mechanically resolve simple merge conflicts in a working tree
 * where `git merge` (or rebase) has left conflict markers in files.
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
 *   - Exit code 0 iff every conflicted file came out fully, cleanly
 *     resolved (this includes files with zero recognized conflict-marker
 *     hunks, e.g. binary "both modified" conflicts — those still count as
 *     unresolved and block a 0 exit).
 *   - Exit code 2 iff anything remained ambiguous, unresolved, or unparsed.
 *
 * Caller responsibility:
 *   - Decide whether to commit (exit 0) or `git merge --abort` (exit 2).
 *   - Post the per-file summary to the PR as a comment.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFLICT_START = '<<<<<<<';
const CONFLICT_MID = '=======';
const CONFLICT_END = '>>>>>>>';
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB safety cap

function listConflictedFiles() {
  const out = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
    encoding: 'utf8',
  });
  if (out.status !== 0) {
    throw new Error(`git diff failed: ${out.stderr}`);
  }
  return out.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isProbablyBinary(buf) {
  // Heuristic: NUL byte in first 8KiB => binary.
  const slice = buf.slice(0, Math.min(buf.length, 8192));
  for (let i = 0; i < slice.length; i++) {
    if (slice[i] === 0) return true;
  }
  return false;
}

function* iterHunks(lines) {
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith(CONFLICT_START)) {
      const start = i;
      let mid = -1;
      let end = -1;
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].startsWith(CONFLICT_START)) {
          // nested/broken -> bail on this hunk
          break;
        }
        if (mid === -1 && lines[j].startsWith(CONFLICT_MID)) {
          mid = j;
        } else if (mid !== -1 && lines[j].startsWith(CONFLICT_END)) {
          end = j;
          break;
        }
        j++;
      }
      if (mid !== -1 && end !== -1) {
        yield {
          start,
          mid,
          end,
          ours: lines.slice(start + 1, mid),
          theirs: lines.slice(mid + 1, end),
        };
        i = end + 1;
        continue;
      }
      // Malformed -- skip past this marker so we don't infinite loop.
      i = start + 1;
      continue;
    }
    i++;
  }
}

// Try to auto-resolve a single hunk. Return the resolved lines (array) or null
// if the hunk is ambiguous / not safely mechanical.
function resolveHunk(hunk) {
  const { ours, theirs } = hunk;

  // Trivially identical.
  if (ours.join('\n') === theirs.join('\n')) {
    return ours.slice();
  }

  // One side empty -> take the other.
  if (ours.length === 0) return theirs.slice();
  if (theirs.length === 0) return ours.slice();

  // GitHub Actions `uses: owner/name@vX` version bump: same action, differing
  // ref -> prefer the higher/newer semver-ish tag on `theirs` if both look
  // like refs.
  if (ours.length === 1 && theirs.length === 1) {
    const reUses = /^(\s*(?:-\s*)?uses:\s*)([^\s@]+)@(\S+)(\s*)$/;
    const mo = ours[0].match(reUses);
    const mt = theirs[0].match(reUses);
    if (mo && mt && mo[2] === mt[2]) {
      // Same action reference. Prefer the ref that sorts higher lexicographically
      // when both look like `v<semver>`; otherwise prefer theirs (incoming).
      const ro = mo[3];
      const rt = mt[3];
      const semverish = /^v?\d+(\.\d+){0,2}$/;
      if (semverish.test(ro) && semverish.test(rt)) {
        const cmp = compareSemverish(ro, rt);
        return cmp >= 0 ? [ours[0]] : [theirs[0]];
      }
      return [theirs[0]];
    }
  }

  return null;
}

function compareSemverish(a, b) {
  const parse = (s) =>
    s
      .replace(/^v/, '')
      .split('.')
      .map((p) => parseInt(p, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function resolveFile(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'missing' };
  }
  if (!stat.isFile()) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'not-file' };
  }
  if (stat.size > MAX_FILE_BYTES) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'too-large' };
  }
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: `read: ${e.message}` };
  }
  if (isProbablyBinary(buf)) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'binary' };
  }

  const text = buf.toString('utf8');
  const lines = text.split('\n');

  const hunks = [...iterHunks(lines)];
  if (hunks.length === 0) {
    // No detectable textual conflict markers. This does NOT mean the file is
    // resolved -- it may still be in the index as "both modified" (e.g. binary
    // that slipped past the heuristic, or an unknown conflict style). Report
    // MANUAL so the caller treats it as unresolved.
    return { status: 'MANUAL', ok: 0, ambiguous: 0 };
  }

  const resolutions = new Array(hunks.length);
  let ambiguous = 0;
  for (let i = 0; i < hunks.length; i++) {
    const r = resolveHunk(hunks[i]);
    if (r === null) {
      ambiguous++;
      resolutions[i] = null;
    } else {
      resolutions[i] = r;
    }
  }

  if (ambiguous === hunks.length) {
    return { status: 'MANUAL', ok: 0, ambiguous };
  }

  // Rebuild the file. Ambiguous hunks are left as-is (markers preserved).
  const outLines = [];
  let cursor = 0;
  for (let i = 0; i < hunks.length; i++) {
    const h = hunks[i];
    for (let k = cursor; k < h.start; k++) outLines.push(lines[k]);
    if (resolutions[i] === null) {
      for (let k = h.start; k <= h.end; k++) outLines.push(lines[k]);
    } else {
      for (const l of resolutions[i]) outLines.push(l);
    }
    cursor = h.end + 1;
  }
  for (let k = cursor; k < lines.length; k++) outLines.push(lines[k]);

  fs.writeFileSync(file, outLines.join('\n'));

  if (ambiguous === 0) {
    // Fully resolved -> stage it.
    try {
      execSync(`git add -- ${JSON.stringify(file)}`, { stdio: 'ignore' });
    } catch {
      /* best-effort */
    }
    return { status: 'RESOLVED', ok: hunks.length, ambiguous: 0 };
  }
  return {
    status: 'PARTIAL',
    ok: hunks.length - ambiguous,
    ambiguous,
  };
}

function main() {
  let files;
  try {
    files = listConflictedFiles();
  } catch (e) {
    console.error(`fatal: ${e.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('no conflicted files');
    process.exit(0);
  }

  let totalResolved = 0;
  let totalAmbiguous = 0;
  let totalUnresolved = 0; // files not fully in RESOLVED state
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

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
  // Counts every file that did NOT come out fully, cleanly resolved —
  // including files whose conflict-marker scanner found zero hunks at all
  // (binary "both modified" conflicts, or any conflict style iterHunks
  // doesn't recognize). Such a file still has an unresolved/undefined
  // working-tree state and must gate the exit code, even though it
  // contributes nothing to totalAmbiguous (ambiguous === 0 for it). Without
  // this counter, a PR where every conflicted file hits that path would
  // report "MANUAL" for each one yet still exit 0, and the caller
  // (conflict-helper.yml) would `git add -A && git commit && git push`
  // that unresolved state onto the PR branch as if it were safely resolved.
  let totalUnresolved = 0;
  const lines = [];

  for (const f of files) {
    let r;
    try {
      r = resolveFile(f);
    } catch (e) {
      console.log(`ERROR   ${f}   ${e.message}`);
      totalUnresolved++;
      continue;
    }
    const { ok, ambiguous } = resolveFile(file);
    switch (r.status) {
      case 'RESOLVED':
        console.log(`RESOLVED ${f}   ${r.ok} hunk(s) auto-resolved`);
        totalResolved += r.ok;
        break;
      case 'PARTIAL':
        console.log(
          `PARTIAL  ${f}   ${r.ok} resolved, ${r.ambiguous} ambiguous`,
        );
        totalResolved += r.ok;
        totalAmbiguous += r.ambiguous;
        totalUnresolved++;
        break;
      case 'MANUAL':
        console.log(`MANUAL   ${f}   ${r.ambiguous} hunk(s) ambiguous`);
        totalAmbiguous += r.ambiguous;
        totalUnresolved++;
        break;
      case 'SKIP':
      default:
        console.log(`SKIP     ${f}   ${r.reason || 'skipped'}`);
        totalUnresolved++;
        break;
    const { ok, ambiguous } = resolveFile(f);
    totalOk += ok;
    totalAmbiguous += ambiguous;
    if (ambiguous === 0 && ok > 0) {
      lines.push(`RESOLVED ${file}   ${ok} hunk(s) auto-resolved`);
    } else if (ok > 0) {
      lines.push(`PARTIAL  ${file}   ${ok} ok, ${ambiguous} ambiguous`);
      totalUnresolved++;
    } else {
      lines.push(`MANUAL   ${file}   ${ambiguous} hunk(s) ambiguous`);
      totalUnresolved++;
    }
  }

  console.log(
    `summary: ${totalResolved} hunk(s) auto-resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) unresolved`,
  );

  // Exit 0 ONLY when every conflicted file was fully resolved.
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  iterHunks,
  resolveHunk,
  resolveFile,
  compareSemverish,
    `\nSummary: ${totalOk} resolved, ${totalAmbiguous} ambiguous hunk(s), ${totalUnresolved} unresolved file(s) across ${files.length} conflicted file(s).`
  );
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
  console.log(lines.join("\n"));
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) main();
module.exports = { pickNewerRef, tryVersionBump, tryAdditive, resolveFile };

#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Best-effort auto-resolver for mechanical merge conflicts (e.g. GitHub Actions
 * `uses:` version bumps, lockfile-style trivial hunks). Intended to be run by
 * .github/workflows/conflict-helper.yml on a PR branch after a merge attempt
 * that produced conflicts.
 *
 * Exit code contract (IMPORTANT — the workflow relies on this):
 *   0  → every conflicted file was fully, mechanically resolved. Safe for the
 *        caller to `git add -A && git commit && git push` back to the PR branch.
 *   2  → at least one file was NOT fully resolved. This includes:
 *          - SKIP    (file we refuse to touch)
 *          - PARTIAL (some hunks resolved, some ambiguous)
 *          - MANUAL  (no hunks resolved) — INCLUDING files with zero detected
 *                     textual conflict-marker hunks (e.g. binary "both modified"
 *                     conflicts, or any conflict style the marker scanner does
 *                     not recognize). These MUST NOT be treated as success:
 *                     `git status` still shows them as unmerged and pushing the
 *                     working tree would push an unresolved conflict.
 *   1  → hard error (unexpected exception).
 *
 * Previously this script gated the exit code on `totalAmbiguous`, which only
 * counted marker-hunks discovered by iterHunks(). A conflicted file with zero
 * detected hunks contributed 0 to that counter, so a PR whose only conflicts
 * were binary/unrecognized would exit 0 and the workflow would push the
 * unresolved tree. We now gate on `totalUnresolved` instead, which increments
 * for every file that did not land in the RESOLVED bucket.
 */

"use strict";

const { execSync } = require("child_process");
const fs = require("fs");

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts });
}

/**
 * List files git currently reports as unmerged (conflicted).
 */
function listConflictedFiles() {
  let out = "";
  try {
    out = sh("git diff --name-only --diff-filter=U");
  } catch {
    return [];
  }
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Iterate textual conflict hunks in a file's contents. Yields objects with
 * { start, end, ours, theirs } indices/strings. Returns [] for binary files
 * or files without recognizable `<<<<<<<`/`=======`/`>>>>>>>` markers.
 */
function iterHunks(content) {
  const hunks = [];
  if (typeof content !== "string" || content.length === 0) return hunks;
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("<<<<<<<")) {
      const start = i;
      const ours = [];
      const theirs = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("=======")) {
        ours.push(lines[i]);
        i++;
      }
      if (i >= lines.length) return hunks;
      i++; // skip =======
      while (i < lines.length && !lines[i].startsWith(">>>>>>>")) {
        theirs.push(lines[i]);
        i++;
      }
      if (i >= lines.length) return hunks;
      const end = i;
      hunks.push({
        start,
        end,
        ours: ours.join("\n"),
        theirs: theirs.join("\n"),
      });
      i++;
    } else {
      i++;
    }
  }
  return hunks;
}

/**
 * Try to mechanically resolve a single hunk. Returns { resolved, text } where
 * `text` is the replacement block (without markers) if resolved.
 *
 * Current heuristics:
 *   - GitHub Actions `uses: owner/repo@vX.Y.Z` version bump: pick the higher
 *     semver on either side.
 *   - Identical ours/theirs (should be rare but harmless): pick either.
 *   - Single-line version bump where the other side added extra lines:
 *     resolve the version bump and preserve all lines from the longer side.
 */
function tryResolveHunk(ours, theirs) {
  if (ours === theirs) return { resolved: true, text: ours };

  const usesRe = /^(\s*)([-]?\s*uses:\s*)([^\s@]+)@(\S+)\s*$/;
  const oLines = ours.split("\n");
  const tLines = theirs.split("\n");

  // Case 1: equal line counts - resolve line-by-line
  if (oLines.length === tLines.length && oLines.length > 0) {
    const merged = [];
    for (let k = 0; k < oLines.length; k++) {
      const om = oLines[k].match(usesRe);
      const tm = tLines[k].match(usesRe);
      if (om && tm && om[3] === tm[3]) {
        const pick = semverCmp(om[4], tm[4]) >= 0 ? om[4] : tm[4];
        merged.push(`${om[1]}${om[2]}${om[3]}@${pick}`);
      } else if (oLines[k] === tLines[k]) {
        merged.push(oLines[k]);
      } else {
        return { resolved: false };
      }
    }
    return { resolved: true, text: merged.join("\n") };
  }

  // Case 2: unequal line counts - try single-line version bump resolution
  // If one side has a single `uses:` line and the other side has the same
  // action with a different version (possibly with extra lines), resolve by:
  // 1. Finding and resolving the version bump
  // 2. Keeping all non-conflicting lines from both sides
  if (oLines.length > 0 && tLines.length > 0) {
    // Find all uses: lines
    const oUsesIndices = [];
    const tUsesIndices = [];
    for (let i = 0; i < oLines.length; i++) {
      if (usesRe.test(oLines[i])) oUsesIndices.push(i);
    }
    for (let i = 0; i < tLines.length; i++) {
      if (usesRe.test(tLines[i])) tUsesIndices.push(i);
    }

    // If exactly one uses: line on each side and they reference the same action
    if (oUsesIndices.length === 1 && tUsesIndices.length === 1) {
      const oUsesIdx = oUsesIndices[0];
      const tUsesIdx = tUsesIndices[0];
      const oUses = oLines[oUsesIdx];
      const tUses = tLines[tUsesIdx];
      const om = oUses.match(usesRe);
      const tm = tUses.match(usesRe);

      if (om && tm && om[3] === tm[3]) {
        // Same action, resolve version
        const pick = semverCmp(om[4], tm[4]) >= 0 ? om[4] : tm[4];
        const resolvedUses = `${om[1]}${om[2]}${om[3]}@${pick}`;

        // Collect all lines except the conflicting uses: line
        const result = [];
        for (let i = 0; i < oLines.length; i++) {
          if (i !== oUsesIdx) result.push(oLines[i]);
        }
        for (let i = 0; i < tLines.length; i++) {
          if (i !== tUsesIdx) result.push(tLines[i]);
        }
        // Insert the resolved uses: line at the position it appeared in ours
        result.splice(oUsesIdx, 0, resolvedUses);

        return { resolved: true, text: result.join("\n") };
      }
    }
  }

  return { resolved: false };
}

function semverCmp(a, b) {
  const pa = String(a)
    .replace(/^v/, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b)
    .replace(/^v/, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
    const x = pa[k] || 0;
    const y = pb[k] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function pickNewerRef(a, b) {
  const isSha40 = (s) => /^[a-f0-9]{40}$/.test(String(s));
  const isSemver = (s) =>
    /^\d+(\.\d+)?(\.\d+)?$/.test(String(s).replace(/^v/, ""));
  const aIsSha = isSha40(a);
  const bIsSha = isSha40(b);
  if (aIsSha && bIsSha) return null;
  if (aIsSha) return a;
  if (bIsSha) return b;
  if (isSemver(a) && isSemver(b)) {
    const cmp = semverCmp(a, b);
    return cmp >= 0 ? a : b;
  }
  return null;
}

function tryVersionBump(ours, theirs) {
  const usesRe = /^(\s*)([-]?\s*uses:\s*)([^\s@]+)@(\S+)\s*$/;
  const om = String(ours).match(usesRe);
  const tm = String(theirs).match(usesRe);
  if (!om || !tm) return null;
  if (om[3] !== tm[3]) return null;
  const newer = pickNewerRef(om[4], tm[4]);
  if (newer === null) return null;
  return `${om[1]}${om[2]}${om[3]}@${newer}\n`;
}

function tryAdditive(ours, theirs) {
  const oLines = ours.split("\n").filter(Boolean);
  const tLines = theirs.split("\n").filter(Boolean);
  if (oLines.length === 0 && tLines.length === 0) return null;
  const oSet = new Set(oLines);
  const tSet = new Set(tLines);

  // Check for exact line duplicates
  for (const line of oSet) {
    if (tSet.has(line)) return null;
  }

  // Detect variable assignment conflicts (same variable with different values)
  const oAssignments = new Map();
  const tAssignments = new Map();
  const assignRe = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;

  for (const line of oLines) {
    const m = line.match(assignRe);
    if (m) oAssignments.set(m[1], line);
  }
  for (const line of tLines) {
    const m = line.match(assignRe);
    if (m) tAssignments.set(m[1], line);
  }

  // If the same variable appears in both with different values, not additive
  for (const [varName, oLine] of oAssignments) {
    if (tAssignments.has(varName) && tAssignments.get(varName) !== oLine) {
      return null;
    }
  }

  // Detect content type mismatch (list items vs assignments vs other)
  const oHasLists = oLines.some((l) => /^\s*[-*]\s/.test(l));
  const tHasLists = tLines.some((l) => /^\s*[-*]\s/.test(l));
  const oHasAssignments = oLines.some((l) => assignRe.test(l));
  const tHasAssignments = tLines.some((l) => assignRe.test(l));

  if ((oHasLists && tHasAssignments) || (oHasAssignments && tHasLists)) {
    return null;
  }

  // Detect when both sides reference the same action/package but with different versions
  // e.g., "uses: actions/checkout@v4" vs "uses: actions/checkout@v5"
  const usesRe = /^(\s*)([-]?\s*uses:\s*)([^\s@]+)@(\S+)\s*$/;
  const oUsesRefs = new Map();
  const tUsesRefs = new Map();

  for (const line of oLines) {
    const m = line.match(usesRe);
    if (m) oUsesRefs.set(m[3], m[4]);
  }
  for (const line of tLines) {
    const m = line.match(usesRe);
    if (m) tUsesRefs.set(m[3], m[4]);
  }

  // If same action referenced with different versions, not additive
  for (const [action, oVersion] of oUsesRefs) {
    if (tUsesRefs.has(action) && tUsesRefs.get(action) !== oVersion) {
      return null;
    }
  }

  const merged = [...oLines, ...tLines];
  return merged.length > 0 ? merged.join("\n") : null;
}

/**
 * Attempt to resolve all hunks in one file. Returns { ok, ambiguous } counts.
 */
function resolveFile(file) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return { ok: 0, ambiguous: 0 };
  }
  const hunks = iterHunks(content);
  if (hunks.length === 0) return { ok: 0, ambiguous: 0 };

  const lines = content.split("\n");
  let ok = 0;
  let ambiguous = 0;

  // Walk hunks back-to-front so indices stay stable.
  for (let h = hunks.length - 1; h >= 0; h--) {
    const { start, end, ours, theirs } = hunks[h];
    const res = tryResolveHunk(ours, theirs);
    if (res.resolved) {
      const replacement = res.text.length ? res.text.split("\n") : [];
      lines.splice(start, end - start + 1, ...replacement);
      ok++;
    } else {
      ambiguous++;
    }
  }

  if (ok > 0) {
    fs.writeFileSync(file, lines.join("\n"));
    try {
      if (ambiguous === 0) sh(`git add -- ${JSON.stringify(file)}`);
    } catch {
      // Silently ignore git add failures (e.g., file not in a git repo).
    }
  }

  return { ok, ambiguous };
}

function main() {
  const files = listConflictedFiles();
  if (files.length === 0) {
    console.log("No conflicted files.");
    process.exit(0);
  }

  let totalOk = 0;
  let totalAmbiguous = 0;
  // Counts every file that is NOT fully RESOLVED. This is what gates exit code.
  // Includes: SKIP, PARTIAL, and MANUAL (including MANUAL with 0 hunks —
  // e.g. binary conflicts, which have no textual markers to scan).
  let totalUnresolved = 0;

  for (const file of files) {
    // Refuse to touch obviously-risky paths.
    if (/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(file)) {
      console.log(`SKIP    ${file}  (lockfile)`);
      totalUnresolved++;
      continue;
    }

    const { ok, ambiguous } = resolveFile(file);
    totalOk += ok;
    totalAmbiguous += ambiguous;

    if (ok > 0 && ambiguous === 0) {
      console.log(`RESOLVED ${file}  ${ok} hunk(s)`);
    } else if (ok > 0 && ambiguous > 0) {
      console.log(`PARTIAL  ${file}  ${ok} resolved, ${ambiguous} ambiguous`);
      totalUnresolved++;
    } else {
      console.log(`MANUAL   ${file}  ${ambiguous} hunk(s) ambiguous`);
      totalUnresolved++;
    }
  }

  console.log(
    `\nSummary: ${totalOk} hunk(s) auto-resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) unresolved.`,
  );
  // Exit 0 ONLY when every conflicted file was fully resolved. See top-of-file
  // contract — gating on totalAmbiguous alone would let zero-hunk MANUAL files
  // (binary conflicts, unknown marker styles) sneak through as false success.
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(
      "auto-resolve-mechanical-conflicts: fatal:",
      (err && err.stack) || err,
    );
    process.exit(1);
  }
}

module.exports = {
  iterHunks,
  tryResolveHunk,
  resolveFile,
  semverCmp,
  pickNewerRef,
  tryVersionBump,
  tryAdditive,
};

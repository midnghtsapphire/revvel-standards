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

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts = {}) {
  // Disabling Semgrep finding as this script only runs internally and handles controlled git commands
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

/**
 * List files git currently reports as unmerged (conflicted).
 */
function listConflictedFiles() {
  let out = '';
  try {
    out = sh('git diff --name-only --diff-filter=U');
  } catch {
    return [];
  }
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Iterate textual conflict hunks in a file's contents. Yields objects with
 * { start, end, ours, theirs } indices/strings. Returns [] for binary files
 * or files without recognizable `<<<<<<<`/`=======`/`>>>>>>>` markers.
 *
 * Handles both conflict styles: the default `merge` style and the 3-way
 * `diff3`/`zdiff3` styles, which insert the merge base between `|||||||` and
 * `=======`. Without that the base block would be read as part of "ours" and
 * every hunk would look ambiguous — which is how this resolver silently
 * degraded to MANUAL on any checkout with `merge.conflictStyle=zdiff3` set.
 */
function iterHunks(content) {
  const hunks = [];
  if (typeof content !== 'string' || content.length === 0) return hunks;
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const start = i;
      const ours = [];
      const theirs = [];
      i++;
      while (
        i < lines.length &&
        !lines[i].startsWith('=======') &&
        !lines[i].startsWith('|||||||')
      ) {
        ours.push(lines[i]);
        i++;
      }
      // diff3/zdiff3: drop the merge-base block between ||||||| and =======.
      if (i < lines.length && lines[i].startsWith('|||||||')) {
        while (i < lines.length && !lines[i].startsWith('=======')) i++;
      }
      if (i >= lines.length) return hunks;
      i++; // skip =======
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
        theirs.push(lines[i]);
        i++;
      }
      if (i >= lines.length) return hunks;
      const end = i;
      hunks.push({ start, end, ours: ours.join('\n'), theirs: theirs.join('\n') });
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
 */
function tryResolveHunk(ours, theirs) {
  if (ours === theirs) return { resolved: true, text: ours };

  const usesRe = /^(\s*)([-]?\s*uses:\s*)([^\s@]+)@(\S+)\s*$/;
  const oLines = ours.split('\n');
  const tLines = theirs.split('\n');
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
    return { resolved: true, text: merged.join('\n') };
  }

  // Different line counts: handle a version bump of a single shared action
  // combined with additive-only extra lines (e.g. one side bumped `uses:` while
  // the other added a `- run:` step). Only safe when each side has exactly one
  // `uses:` line for the same action and every other line is additive.
  const oUses = oLines.filter((l) => USES_LINE_RE.test(l));
  const tUses = tLines.filter((l) => USES_LINE_RE.test(l));
  if (oUses.length === 1 && tUses.length === 1) {
    const bump = tryVersionBump(oUses[0], tUses[0]);
    if (bump) {
      const bumpedLine = bump.replace(/\n$/, '');
      const oOther = oLines.filter((l) => !USES_LINE_RE.test(l));
      const tOther = tLines.filter((l) => !USES_LINE_RE.test(l));
      const additiveOnly = [...oOther, ...tOther].every(
        (l) => l.trim() === '' || isAdditiveLine(l),
      );
      if (additiveOnly) {
        const seen = new Set(oLines.map((l) => l.trim()));
        const result = oLines.map((l) => (USES_LINE_RE.test(l) ? bumpedLine : l));
        for (const l of tOther) {
          if (l.trim() && !seen.has(l.trim())) result.push(l);
        }
        return { resolved: true, text: result.join('\n') };
      }
    }
  }

  return { resolved: false };
}

const FULL_SHA_RE = /^[0-9a-f]{40}$/i;
const VERSION_LIKE_RE = /^v?\d+(\.\d+)*$/;

/**
 * Pick the newer of two GitHub Actions `uses:` refs, or null when undecidable.
 *  - Equal refs -> the (identical) ref.
 *  - Exactly one full 40-char SHA -> that SHA (a pinned SHA supersedes a tag).
 *  - Two full SHAs -> null (no ordering between opaque commit ids).
 *  - Two version-like refs -> the higher semver.
 *  - Anything else (branch names, partial hashes) -> null.
 */
function pickNewerRef(a, b) {
  if (a === b) return a;
  const aSha = FULL_SHA_RE.test(String(a));
  const bSha = FULL_SHA_RE.test(String(b));
  if (aSha && bSha) return null;
  if (aSha) return a;
  if (bSha) return b;
  if (VERSION_LIKE_RE.test(String(a)) && VERSION_LIKE_RE.test(String(b))) {
    return semverCmp(a, b) >= 0 ? a : b;
  }
  return null;
}

// A single `uses: owner/repo@ref` line. Group 1: prefix (indent + optional
// list dash + `uses:`), group 2: owner/repo, group 3: ref.
const USES_LINE_RE = /^(\s*-?\s*uses:\s*)([^\s@]+)@(\S+?)\s*$/;

/**
 * Resolve a single-line GitHub Actions version-bump conflict. Returns the
 * winning line (newline-terminated) or null when the block is not a clean
 * single-line `uses:` bump of the same action, or the refs are undecidable.
 */
function tryVersionBump(current, incoming) {
  if (typeof current !== 'string' || typeof incoming !== 'string') return null;
  if (current.includes('\n') || incoming.includes('\n')) return null;
  const c = current.match(USES_LINE_RE);
  const i = incoming.match(USES_LINE_RE);
  if (!c || !i) return null;
  if (c[2] !== i[2]) return null; // different action
  const newer = pickNewerRef(c[3], i[3]);
  if (newer === null) return null;
  const winner = newer === c[3] ? c : i;
  return `${winner[1]}${winner[2]}@${newer}\n`;
}

// A markdown list item or table row — the additive line shapes we can safely
// concatenate.
function isAdditiveLine(line) {
  const t = line.trim();
  if (t === '') return false;
  return /^([-*+]|\d+\.)\s+/.test(t) || /^\|.*\|$/.test(t);
}

/**
 * Resolve an additive conflict: two blocks that each add distinct markdown
 * list items / table rows can be concatenated (current first). Returns null
 * when either side is empty, contains non-additive content, or the two sides
 * share a line (overlap is ambiguous, not additive).
 */
function tryAdditive(current, incoming) {
  if (typeof current !== 'string' || typeof incoming !== 'string') return null;
  const cLines = current.split('\n').filter((l) => l.trim() !== '');
  const iLines = incoming.split('\n').filter((l) => l.trim() !== '');
  if (cLines.length === 0 || iLines.length === 0) return null;
  if (!cLines.every(isAdditiveLine) || !iLines.every(isAdditiveLine)) return null;
  const cSet = new Set(cLines.map((l) => l.trim()));
  if (iLines.some((l) => cSet.has(l.trim()))) return null; // overlap -> ambiguous
  return [...cLines, ...iLines].join('\n');
}

function semverCmp(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
    const x = pa[k] || 0;
    const y = pb[k] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * Attempt to resolve all hunks in one file. Returns { ok, ambiguous } counts.
 */
function resolveFile(file) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: 0, ambiguous: 0 };
  }
  const hunks = iterHunks(content);
  if (hunks.length === 0) return { ok: 0, ambiguous: 0 };

  const lines = content.split('\n');
  let ok = 0;
  let ambiguous = 0;

  // Walk hunks back-to-front so indices stay stable.
  for (let h = hunks.length - 1; h >= 0; h--) {
    const { start, end, ours, theirs } = hunks[h];
    const res = tryResolveHunk(ours, theirs);
    if (res.resolved) {
      const replacement = res.text.length ? res.text.split('\n') : [];
      lines.splice(start, end - start + 1, ...replacement);
      ok++;
    } else {
      ambiguous++;
    }
  }

  if (ok > 0) {
    fs.writeFileSync(file, lines.join('\n'));
    try {
      if (ambiguous === 0) sh(`git add -- ${JSON.stringify(file)}`);
    } catch {}
  }

  return { ok, ambiguous };
}

function main() {
  const files = listConflictedFiles();
  if (files.length === 0) {
    console.log('No conflicted files.');
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

  console.log(`\nSummary: ${totalOk} hunk(s) auto-resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) unresolved.`);
  // Exit 0 ONLY when every conflicted file was fully resolved. See top-of-file
  // contract — gating on totalAmbiguous alone would let zero-hunk MANUAL files
  // (binary conflicts, unknown marker styles) sneak through as false success.
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('auto-resolve-mechanical-conflicts: fatal:', err && err.stack || err);
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

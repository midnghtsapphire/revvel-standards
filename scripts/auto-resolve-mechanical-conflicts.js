#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to mechanically resolve simple, well-understood merge conflicts
 * (e.g. GitHub Actions `uses:` version bumps, package.json version bumps)
 * in files currently marked as conflicted by git.
 *
 * Exit code contract:
 *   0 — every conflicted file was fully resolved (RESOLVED)
 *   2 — one or more files remain unresolved. This includes:
 *         - SKIP   (file type not supported by the resolver)
 *         - PARTIAL (some hunks resolved, some ambiguous)
 *         - MANUAL  (no hunks could be resolved, INCLUDING files with
 *                    zero detected textual conflict markers — e.g. binary
 *                    "both modified" conflicts, which never get <<<<<<<
 *                    markers written into the working tree)
 *
 * The workflow in .github/workflows/conflict-helper.yml treats exit 0 as
 * "safe to push directly to the PR branch", so it is CRITICAL that exit 0
 * only be returned when the working tree is genuinely conflict-free.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

/**
 * List files git currently considers to be in a merge conflict state.
 * Uses `git diff --name-only --diff-filter=U` which covers UU / AU / UA / DU / UD.
 */
function listConflictedFiles() {
  try {
    const out = sh('git diff --name-only --diff-filter=U');
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Iterate textual conflict hunks in a file's content.
 * Yields { start, end, ours, theirs } for each <<<<<<< ... ======= ... >>>>>>> block.
 * Binary files, or files git resolved without leaving markers, yield nothing.
 */
function* iterHunks(content) {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const start = i;
      const ours = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('=======')) {
        ours.push(lines[i]);
        i++;
      }
      if (i >= lines.length) return;
      i++; // skip =======
      const theirs = [];
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
        theirs.push(lines[i]);
        i++;
      }
      if (i >= lines.length) return;
      const end = i; // index of >>>>>>>
      yield { start, end, ours, theirs };
      i++;
    } else {
      i++;
    }
  }
}

/**
 * Try to pick the higher of two `uses: owner/repo@vX` version pins.
 * Returns the chosen line or null if not mechanically resolvable.
 */
function resolveUsesBump(oursLine, theirsLine) {
  const re = /^(\s*(?:-\s*)?uses:\s*)([^@\s]+)@([^\s#]+)(.*)$/;
  const om = oursLine.match(re);
  const tm = theirsLine.match(re);
  if (!om || !tm) return null;
  if (om[2] !== tm[2]) return null; // different action, not a bump
  // Prefer the newer semver-ish tag lexicographically after stripping leading v.
  const norm = (v) => v.replace(/^v/, '').split('.').map((p) => {
    const n = parseInt(p, 10);
    return Number.isNaN(n) ? p : n;
  });
  const ov = norm(om[3]);
  const tv = norm(tm[3]);
  let cmp = 0;
  for (let i = 0; i < Math.max(ov.length, tv.length); i++) {
    const a = ov[i] ?? 0;
    const b = tv[i] ?? 0;
    if (a === b) continue;
    if (typeof a === 'number' && typeof b === 'number') { cmp = a - b; break; }
    cmp = String(a) < String(b) ? -1 : 1;
    break;
  }
  return cmp >= 0 ? oursLine : theirsLine;
}

function tryResolveHunk(hunk) {
  // Only single-line-vs-single-line uses: bumps for now.
  if (hunk.ours.length === 1 && hunk.theirs.length === 1) {
    const picked = resolveUsesBump(hunk.ours[0], hunk.theirs[0]);
    if (picked !== null) return [picked];
  }
  return null;
}

function resolveFile(file) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: 0, ambiguous: 0 };
  }
  const hunks = [...iterHunks(content)];
  if (hunks.length === 0) return { ok: 0, ambiguous: 0 };

  const lines = content.split('\n');
  let ok = 0;
  let ambiguous = 0;
  // Process from bottom to top so indices stay valid.
  for (let idx = hunks.length - 1; idx >= 0; idx--) {
    const h = hunks[idx];
    const resolved = tryResolveHunk(h);
    if (resolved) {
      lines.splice(h.start, h.end - h.start + 1, ...resolved);
      ok++;
    } else {
      ambiguous++;
    }
  }
  if (ok > 0) {
    fs.writeFileSync(file, lines.join('\n'));
    if (ambiguous === 0) {
      try { execSync(`git add -- ${JSON.stringify(file)}`); } catch {}
    }
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
  // Count every file that is NOT fully resolved. This is what gates exit 0.
  // It intentionally includes MANUAL-with-zero-hunks (e.g. binary conflicts)
  // which contribute 0 to totalAmbiguous but MUST NOT be treated as clean.
  let totalUnresolved = 0;

  for (const f of files) {
    const { ok, ambiguous } = resolveFile(f);
    totalOk += ok;
    totalAmbiguous += ambiguous;
    let status;
    if (ok > 0 && ambiguous === 0) status = 'RESOLVED';
    else if (ok > 0 && ambiguous > 0) status = 'PARTIAL';
    else if (ok === 0 && ambiguous > 0) status = 'MANUAL';
    else status = 'MANUAL';
    if (status !== 'RESOLVED') totalUnresolved++;
    console.log(`${status} ${f}   ${ambiguous} hunk(s) ambiguous`);
  }

  console.log(`\nSummary: ${totalOk} hunk(s) resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) unresolved.`);
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { iterHunks, resolveUsesBump, tryResolveHunk, resolveFile };

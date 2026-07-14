#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to auto-resolve mechanical (safe, textual) merge conflicts in the
 * current working tree. Intended to be invoked by the conflict-helper workflow.
 *
 * Exit code contract:
 *   0 - Every conflicted file was fully resolved (safe to commit + push).
 *   2 - At least one conflicted file was NOT fully resolved. This includes:
 *         * SKIP    (file type not eligible)
 *         * PARTIAL (some hunks resolved, some ambiguous)
 *         * MANUAL  (nothing resolved — including files with zero detected
 *                    conflict-marker hunks, e.g. binary "both modified"
 *                    conflicts, which must NEVER be pushed as if resolved).
 *   1 - Hard error (unexpected exception).
 *
 * IMPORTANT: A file with zero textual conflict-marker hunks is still an
 * unresolved conflict as far as git is concerned (it's still in the index's
 * unmerged state). Such files MUST count toward `totalUnresolved` so the
 * caller does not silently commit a broken working tree.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

function listUnmergedFiles() {
  // -u: show unmerged; parse unique paths from `git status --porcelain`.
  const out = sh('git status --porcelain');
  const files = new Set();
  for (const line of out.split('\n')) {
    if (!line) continue;
    const xy = line.slice(0, 2);
    // Unmerged states per git-status(1): DD, AU, UD, UA, DU, AA, UU
    if (['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(xy)) {
      files.add(line.slice(3).trim());
    }
  }
  return [...files];
}

function* iterHunks(content) {
  // Yields { start, mid, end, ours, theirs } byte ranges for each <<<<<<< ... ======= ... >>>>>>> hunk.
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const start = i;
      let mid = -1;
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (mid === -1 && lines[j].startsWith('=======')) mid = j;
        else if (lines[j].startsWith('>>>>>>>')) {
          end = j;
          break;
        }
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
    }
    i++;
  }
}

// A hunk is "mechanically resolvable" if ours/theirs differ only in a
// version-like token (e.g. GitHub Actions `uses: foo/bar@vX.Y.Z`). We pick
// the higher version. This is deliberately conservative.
function tryResolveHunk(ours, theirs) {
  if (ours.length !== theirs.length) return null;
  const resolved = [];
  for (let k = 0; k < ours.length; k++) {
    const o = ours[k];
    const t = theirs[k];
    if (o === t) {
      resolved.push(o);
      continue;
    }
    // uses: something@vX.Y.Z
    const re = /^(\s*(?:-\s*)?uses:\s*[^@\s]+@)(v?\d+(?:\.\d+){0,2})(\s*(?:#.*)?)$/;
    const mo = o.match(re);
    const mt = t.match(re);
    if (mo && mt && mo[1] === mt[1] && mo[3] === mt[3]) {
      const higher = cmpVer(mo[2], mt[2]) >= 0 ? mo[2] : mt[2];
      resolved.push(`${mo[1]}${higher}${mo[3]}`);
      continue;
    }
    return null;
  }
  return resolved;
}

function cmpVer(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function eligible(file) {
  // Only touch text-y files we know how to reason about.
  return /\.(ya?ml|json|md|js|ts|txt)$/i.test(file);
}

function resolveFile(file) {
  if (!eligible(file)) return { ok: 0, ambiguous: 0, skipped: true };
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: 0, ambiguous: 0, skipped: true };
  }

  const lines = content.split('\n');
  const hunks = [...iterHunks(content)];
  if (hunks.length === 0) return { ok: 0, ambiguous: 0, skipped: false };

  // Rebuild file by walking hunks in order.
  const outLines = [];
  let cursor = 0;
  let ok = 0;
  let ambiguous = 0;
  for (const h of hunks) {
    // Copy through lines before the hunk.
    for (; cursor < h.start; cursor++) outLines.push(lines[cursor]);
    const resolved = tryResolveHunk(h.ours, h.theirs);
    if (resolved) {
      outLines.push(...resolved);
      ok++;
    } else {
      // Keep the conflict markers untouched.
      for (let j = h.start; j <= h.end; j++) outLines.push(lines[j]);
      ambiguous++;
    }
    cursor = h.end + 1;
  }
  for (; cursor < lines.length; cursor++) outLines.push(lines[cursor]);

  if (ok > 0) {
    fs.writeFileSync(file, outLines.join('\n'));
    if (ambiguous === 0) {
      // Fully clean → stage.
      try { sh(`git add -- ${JSON.stringify(file)}`); } catch { /* ignore */ }
    }
  }
  return { ok, ambiguous, skipped: false };
}

function main() {
  const files = listUnmergedFiles();
  if (files.length === 0) {
    console.log('No unmerged files.');
    process.exit(0);
  }

  let totalResolved = 0;
  let totalAmbiguous = 0;
  let totalUnresolved = 0; // any file that did NOT land in the RESOLVED branch

  for (const f of files) {
    const { ok, ambiguous, skipped } = resolveFile(f);
    if (skipped) {
      console.log(`SKIP    ${f}`);
      totalUnresolved++;
      continue;
    }
    if (ok > 0 && ambiguous === 0) {
      console.log(`RESOLVED ${f}   ${ok} hunk(s) auto-resolved`);
      totalResolved += ok;
      continue;
    }
    if (ok > 0 && ambiguous > 0) {
      console.log(`PARTIAL ${f}   ${ok} resolved, ${ambiguous} ambiguous`);
      totalResolved += ok;
      totalAmbiguous += ambiguous;
      totalUnresolved++;
      continue;
    }
    // ok === 0 → MANUAL. This includes files with zero detected marker hunks
    // (e.g. binary "both modified" conflicts). Must count as unresolved.
    console.log(`MANUAL  ${f}   ${ambiguous} hunk(s) ambiguous`);
    if (ambiguous > 0) totalAmbiguous += ambiguous;
    totalUnresolved++;
  }

  console.log(`\nSummary: ${totalResolved} resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) unresolved.`);
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('auto-resolve-mechanical-conflicts: hard error:', e && e.stack || e);
    process.exit(1);
  }
}

module.exports = { tryResolveHunk, cmpVer, iterHunks };

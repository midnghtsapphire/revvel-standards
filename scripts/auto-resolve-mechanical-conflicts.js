#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to auto-resolve mechanical merge conflicts (e.g. GitHub Actions
 * `uses:` version bumps, package.json version bumps) by preferring the
 * higher/newer value from either side of the conflict.
 *
 * Exit code contract:
 *   0 — Every conflicted file was fully, mechanically resolved (RESOLVED).
 *       Caller (e.g. .github/workflows/conflict-helper.yml) may safely commit
 *       and push the working tree to the PR branch.
 *   2 — At least one conflicted file was NOT fully resolved. This includes:
 *         - SKIP     (file type / path not supported)
 *         - PARTIAL  (some hunks resolved, some ambiguous)
 *         - MANUAL   (no hunks auto-resolvable, INCLUDING files with zero
 *                    detected conflict-marker hunks such as binary "both
 *                    modified" conflicts). Caller MUST NOT push in this case.
 *
 * Historical bug (fixed): the exit code was previously gated on
 * `totalAmbiguous`, which only counted textual conflict-marker hunks. A
 * binary conflict (or any conflict style the marker scanner doesn't
 * recognize) has zero hunks, so `totalAmbiguous` stayed 0 and the script
 * incorrectly exited 0 — causing the workflow to push an unresolved merge.
 * We now count via `totalUnresolved`, which increments for every non-RESOLVED
 * file regardless of hunk count.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

function listConflictedFiles() {
  const out = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
    encoding: 'utf8',
  });
  if (out.status !== 0) return [];
  return out.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Iterate conflict hunks in a file's raw text.
 * Yields { ours, theirs, startIdx, endIdx } for each <<<<<<< ... ======= ... >>>>>>> block.
 */
function* iterHunks(text) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const start = i;
      i++;
      const ours = [];
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
      const end = i;
      i++; // skip >>>>>>>
      yield { ours, theirs, startIdx: start, endIdx: end, lines };
    } else {
      i++;
    }
  }
}

function cmpSemverLike(a, b) {
  // Very tolerant: split on non-digit, compare numerically component-wise.
  const pa = String(a).split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = String(b).split(/[^0-9]+/).filter(Boolean).map(Number);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function tryResolveUsesLine(ours, theirs) {
  // Both sides must be single-line and match `uses: something@version`.
  if (ours.length !== 1 || theirs.length !== 1) return null;
  const re = /^(\s*-?\s*uses:\s*[^@\s]+@)([^\s#]+)(.*)$/;
  const mo = ours[0].match(re);
  const mt = theirs[0].match(re);
  if (!mo || !mt) return null;
  if (mo[1] !== mt[1]) return null; // different action
  const pick = cmpSemverLike(mo[2], mt[2]) >= 0 ? ours[0] : theirs[0];
  return [pick];
}

function resolveFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: 0, ambiguous: 0 };
  }

  const hunks = [...iterHunks(text)];
  if (hunks.length === 0) return { ok: 0, ambiguous: 0 };

  const lines = text.split('\n');
  const drop = new Set();
  const replace = new Map(); // startIdx -> replacement lines
  let ok = 0;
  let ambiguous = 0;

  for (const h of hunks) {
    let resolved = null;
    if (file.startsWith('.github/workflows/') || file.endsWith('.yml') || file.endsWith('.yaml')) {
      resolved = tryResolveUsesLine(h.ours, h.theirs);
    }
    if (resolved) {
      replace.set(h.startIdx, resolved);
      for (let k = h.startIdx + 1; k <= h.endIdx; k++) drop.add(k);
      ok++;
    } else {
      ambiguous++;
    }
  }

  if (ok === 0) return { ok: 0, ambiguous };

  const out = [];
  for (let k = 0; k < lines.length; k++) {
    if (replace.has(k)) {
      out.push(...replace.get(k));
    } else if (!drop.has(k)) {
      out.push(lines[k]);
    }
  }
  fs.writeFileSync(file, out.join('\n'));
  if (ambiguous === 0) {
    spawnSync('git', ['add', '--', file]);
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
  let totalUnresolved = 0; // counts files NOT in RESOLVED state

  for (const f of files) {
    // Skip clearly non-text/binary-ish paths that we shouldn't try to parse.
    if (!fs.existsSync(f)) {
      console.log(`SKIP  ${f}   (missing)`);
      totalUnresolved++;
      continue;
    }
    const { ok, ambiguous } = resolveFile(f);
    totalOk += ok;
    totalAmbiguous += ambiguous;

    if (ok > 0 && ambiguous === 0) {
      console.log(`RESOLVED ${f}   ${ok} hunk(s) auto-resolved`);
    } else if (ok > 0 && ambiguous > 0) {
      console.log(`PARTIAL  ${f}   ${ok} resolved, ${ambiguous} ambiguous`);
      totalUnresolved++;
    } else {
      console.log(`MANUAL   ${f}   ${ambiguous} hunk(s) ambiguous`);
      totalUnresolved++;
    }
  }

  console.log(
    `\nSummary: ${totalOk} hunk(s) auto-resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) still unresolved.`
  );
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(2);
  }
}

module.exports = { iterHunks, cmpSemverLike, tryResolveUsesLine, resolveFile };

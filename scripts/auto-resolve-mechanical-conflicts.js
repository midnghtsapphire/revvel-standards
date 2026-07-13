#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to mechanically resolve simple merge conflicts in files where the
 * conflict is limited to well-known, safe patterns (e.g. GitHub Actions
 * `uses:` version bumps, package.json version fields, etc.).
 *
 * Exit code contract:
 *   0  => every conflicted file was fully resolved (RESOLVED)
 *   2  => at least one file was NOT fully resolved. This includes:
 *           - SKIP    (file type not handled)
 *           - PARTIAL (some hunks auto-resolved, some ambiguous)
 *           - MANUAL  (needs human, including zero-hunk cases such as
 *                     binary "both modified" conflicts that have no
 *                     textual `<<<<<<<` markers at all)
 *
 * IMPORTANT: A file with zero detected marker hunks (e.g. a binary conflict)
 * MUST count as unresolved. Previously the exit code was gated on the
 * ambiguous-hunk counter, which meant zero-hunk MANUAL files silently
 * contributed nothing and the script could exit 0 while the working tree
 * still contained unresolved conflicts. The `.github/workflows/conflict-helper.yml`
 * workflow then interpreted exit 0 as "safe to push" and force-pushed the
 * broken state onto the PR branch. Never again.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

function listConflictedFiles() {
  try {
    const out = sh('git diff --name-only --diff-filter=U');
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch (_) {
    return [];
  }
}

/**
 * Iterate <<<<<<< ======= >>>>>>> hunks in a text blob.
 * Yields { start, mid, end, ours, theirs } index/string pairs.
 */
function* iterHunks(text) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const start = i;
      let mid = -1;
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (mid === -1 && lines[j].startsWith('=======')) mid = j;
        else if (lines[j].startsWith('>>>>>>>')) { end = j; break; }
      }
      if (mid === -1 || end === -1) return;
      const ours = lines.slice(start + 1, mid).join('\n');
      const theirs = lines.slice(mid + 1, end).join('\n');
      yield { start, mid, end, ours, theirs };
      i = end + 1;
    } else {
      i++;
    }
  }
}

// Recognize `uses: owner/repo@vX.Y.Z` bumps and prefer the higher semver.
const USES_RE = /^(\s*-?\s*uses:\s*[^@\s]+@)(v?\d+(?:\.\d+){0,2})\s*$/;

function cmpSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function tryResolveUsesBump(ours, theirs) {
  const ol = ours.split('\n');
  const tl = theirs.split('\n');
  if (ol.length !== tl.length) return null;
  const out = [];
  for (let i = 0; i < ol.length; i++) {
    if (ol[i] === tl[i]) { out.push(ol[i]); continue; }
    const mo = ol[i].match(USES_RE);
    const mt = tl[i].match(USES_RE);
    if (!mo || !mt || mo[1] !== mt[1]) return null;
    const winner = cmpSemver(mo[2], mt[2]) >= 0 ? mo[2] : mt[2];
    out.push(`${mo[1]}${winner}`);
  }
  return out.join('\n');
}

function resolveFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (_) {
    // Unreadable as UTF-8 (likely binary). Zero hunks, needs human.
    return { ok: 0, ambiguous: 0, changed: false };
  }

  const lines = text.split('\n');
  const hunks = [...iterHunks(text)];
  if (hunks.length === 0) return { ok: 0, ambiguous: 0, changed: false };

  let ok = 0;
  let ambiguous = 0;
  // Rebuild by walking hunks in order.
  const outLines = [];
  let cursor = 0;
  for (const h of hunks) {
    while (cursor < h.start) outLines.push(lines[cursor++]);
    const resolved = tryResolveUsesBump(h.ours, h.theirs);
    if (resolved !== null) {
      if (resolved.length) outLines.push(...resolved.split('\n'));
      ok++;
    } else {
      // Keep the conflict markers intact; a human needs to look.
      for (let k = h.start; k <= h.end; k++) outLines.push(lines[k]);
      ambiguous++;
    }
    cursor = h.end + 1;
  }
  while (cursor < lines.length) outLines.push(lines[cursor++]);

  const newText = outLines.join('\n');
  const changed = newText !== text && ok > 0 && ambiguous === 0;
  if (changed) {
    fs.writeFileSync(file, newText);
    try { sh(`git add -- ${JSON.stringify(file)}`); } catch (_) {}
  }
  return { ok, ambiguous, changed };
}

function main() {
  const files = listConflictedFiles();
  if (files.length === 0) {
    console.log('No conflicted files.');
    process.exit(0);
  }

  let totalOk = 0;
  let totalAmbiguous = 0;
  let totalUnresolved = 0;

  for (const f of files) {
    const { ok, ambiguous, changed } = resolveFile(f);
    totalOk += ok;
    totalAmbiguous += ambiguous;

    let status;
    if (ok > 0 && ambiguous === 0 && changed) {
      status = 'RESOLVED';
    } else if (ok > 0 && ambiguous > 0) {
      status = 'PARTIAL';
      totalUnresolved++;
    } else if (ok === 0 && ambiguous === 0) {
      // Zero-hunk file (binary conflict, unreadable, or unknown format).
      // Must be treated as unresolved — see file header.
      status = 'MANUAL';
      totalUnresolved++;
    } else {
      status = 'MANUAL';
      totalUnresolved++;
    }

    console.log(`${status} ${f}\t${ambiguous} hunk(s) ambiguous`);
  }

  console.log(`\nSummary: ${totalOk} hunks auto-resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) still unresolved.`);
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { iterHunks, tryResolveUsesBump, cmpSemver, resolveFile };

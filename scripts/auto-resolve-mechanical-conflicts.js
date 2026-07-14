#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to mechanically resolve merge conflicts in a limited, safe set of
 * cases (e.g. GitHub Actions `uses:` version bumps, whitespace-only, etc.).
 *
 * Exit code contract:
 *   0 -> Every conflicted file was fully RESOLVED. Safe for the calling
 *        workflow to commit + push the result.
 *   2 -> At least one conflicted file was NOT fully resolved. This includes:
 *          - SKIP    (file type / path excluded from auto-resolution)
 *          - PARTIAL (some hunks resolved, some still ambiguous)
 *          - MANUAL  (no hunks resolved, or zero conflict-marker hunks were
 *                    detected at all — e.g. binary "both modified" conflicts)
 *        The workflow MUST NOT push in this case.
 *   1 -> Unexpected error.
 *
 * IMPORTANT: A file with zero detected `<<<<<<<` hunks (binary conflicts, or
 * any conflict style the scanner doesn't understand) is treated as UNRESOLVED,
 * not as "nothing to do". Previously this path incorrectly exited 0 and caused
 * `.github/workflows/conflict-helper.yml` to push unresolved conflicts onto PR
 * branches.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

function listConflictedFiles() {
  const out = sh('git diff --name-only --diff-filter=U').trim();
  if (!out) return [];
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Iterate textual conflict hunks in `content`. Yields
 * { start, end, ours, theirs } for each `<<<<<<< ... ======= ... >>>>>>>` block.
 * Files with no such markers (binary conflicts, unrecognized styles) yield nothing.
 */
function* iterHunks(content) {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const start = i;
      let sep = -1;
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (sep === -1 && lines[j].startsWith('=======')) sep = j;
        else if (sep !== -1 && lines[j].startsWith('>>>>>>>')) {
          end = j;
          break;
        }
      }
      if (sep === -1 || end === -1) return;
      const ours = lines.slice(start + 1, sep);
      const theirs = lines.slice(sep + 1, end);
      yield { start, end, ours, theirs };
      i = end + 1;
    } else {
      i++;
    }
  }
}

// Match e.g. `  uses: actions/checkout@v4` or `@v4.1.1` or `@sha-hex`
const USES_RE = /^(\s*(?:-\s*)?uses:\s*[^@\s]+@)(\S+)(\s*(?:#.*)?)$/;

function tryResolveUsesBump(ours, theirs) {
  if (ours.length !== 1 || theirs.length !== 1) return null;
  const mo = ours[0].match(USES_RE);
  const mt = theirs[0].match(USES_RE);
  if (!mo || !mt) return null;
  if (mo[1] !== mt[1]) return null; // different action, don't touch
  // Prefer the "theirs" (incoming) version — this matches the existing
  // conservative "take the newer bump" convention. Callers can adjust.
  return [mt[0]];
}

function resolveFile(file) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: 0, ambiguous: 0, hunks: 0 };
  }

  const lines = content.split('\n');
  const hunks = [];
  for (const h of iterHunks(content)) hunks.push(h);

  if (hunks.length === 0) {
    return { ok: 0, ambiguous: 0, hunks: 0 };
  }

  let ok = 0;
  let ambiguous = 0;

  // Process in reverse so indices stay valid.
  for (let k = hunks.length - 1; k >= 0; k--) {
    const { start, end, ours, theirs } = hunks[k];
    const resolved = tryResolveUsesBump(ours, theirs);
    if (resolved) {
      lines.splice(start, end - start + 1, ...resolved);
      ok++;
    } else {
      ambiguous++;
    }
  }

  if (ok > 0) {
    fs.writeFileSync(file, lines.join('\n'));
    if (ambiguous === 0) {
      // Fully resolved — stage it.
      spawnSync('git', ['add', '--', file]);
    }
  }

  return { ok, ambiguous, hunks: hunks.length };
}

function main() {
  let files;
  try {
    files = listConflictedFiles();
  } catch (e) {
    console.error('Failed to list conflicted files:', e.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No conflicted files.');
    process.exit(0);
  }

  let totalResolved = 0;
  let totalAmbiguous = 0;
  let totalUnresolved = 0; // files that did NOT end in the RESOLVED bucket

  for (const f of files) {
    const { ok, ambiguous, hunks } = resolveFile(f);
    if (hunks === 0) {
      // No textual markers at all (binary conflict, etc.) — cannot auto-resolve.
      console.log(`MANUAL ${f}   0 hunk(s) ambiguous`);
      totalUnresolved++;
      continue;
    }
    if (ok > 0 && ambiguous === 0) {
      console.log(`RESOLVED ${f}   ${ok} hunk(s)`);
      totalResolved += ok;
    } else if (ok > 0 && ambiguous > 0) {
      console.log(`PARTIAL ${f}   ${ok} resolved, ${ambiguous} ambiguous`);
      totalResolved += ok;
      totalAmbiguous += ambiguous;
      totalUnresolved++;
    } else {
      console.log(`MANUAL ${f}   ${ambiguous} hunk(s) ambiguous`);
      totalAmbiguous += ambiguous;
      totalUnresolved++;
    }
  }

  console.log(
    `\nSummary: ${totalResolved} hunk(s) resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) not fully resolved.`
  );

  // Exit 2 if ANY file is not fully resolved, so the calling workflow will
  // NOT push a half-merged / binary-conflicted tree onto the PR branch.
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('auto-resolve-mechanical-conflicts crashed:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
}

module.exports = { resolveFile, iterHunks, tryResolveUsesBump };

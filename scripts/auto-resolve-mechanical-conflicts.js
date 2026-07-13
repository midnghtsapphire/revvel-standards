#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to auto-resolve mechanical merge conflicts (e.g., GitHub Actions
 * `uses:` version bumps, lockfile-style additive lists) by scanning conflict
 * marker hunks in files reported by `git diff --name-only --diff-filter=U`.
 *
 * Exit code contract:
 *   0 -> every conflicted file was fully RESOLVED (no ambiguous hunks, no
 *        skipped files, no MANUAL files). Only in this case is it safe for
 *        the caller (e.g. .github/workflows/conflict-helper.yml) to `git add`
 *        and push the result to the PR branch.
 *   2 -> at least one conflicted file remains unresolved. This includes:
 *          - SKIP    (file type not handled)
 *          - PARTIAL (some hunks resolved, some ambiguous)
 *          - MANUAL  (no hunks were auto-resolvable, INCLUDING files with
 *                    zero detected conflict-marker hunks, e.g. binary
 *                    "both modified" conflicts which never carry textual
 *                    `<<<<<<<` markers)
 *
 * Historical bug (fixed): the exit code was previously gated on
 * `totalAmbiguous`, a counter that only incremented for textual hunks the
 * scanner recognized. A conflicted binary file (or any file with zero
 * detected hunks) would print `MANUAL <file>  0 hunk(s) ambiguous` and
 * contribute nothing to that counter, so `main()` returned 0 and the
 * workflow happily pushed the unresolved conflict. We now track
 * `totalUnresolved` across every non-RESOLVED file.
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts });
}

function listConflictedFiles() {
  let out = '';
  try {
    out = sh('git', ['diff', '--name-only', '--diff-filter=U']);
  } catch (_) {
    return [];
  }
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Iterate conflict-marker hunks in a text file's content.
 * Yields { ours, theirs, startIdx, endIdx } for each `<<<<<<< ... ======= ... >>>>>>>` block.
 */
function* iterHunks(content) {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const startIdx = i;
      const ours = [];
      const theirs = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('=======')) {
        ours.push(lines[i]);
        i++;
      }
      if (i >= lines.length) return;
      i++; // skip =======
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
        theirs.push(lines[i]);
        i++;
      }
      if (i >= lines.length) return;
      const endIdx = i; // >>>>>>> line
      yield { ours, theirs, startIdx, endIdx };
      i++;
    } else {
      i++;
    }
  }
}

// Match a GHA `uses: owner/repo@ref` line (with optional leading whitespace / `- `).
const USES_RE = /^(\s*-?\s*uses:\s*)([^\s@]+)@(\S+)(.*)$/;

function tryResolveUsesBump(ours, theirs) {
  if (ours.length !== 1 || theirs.length !== 1) return null;
  const mo = ours[0].match(USES_RE);
  const mt = theirs[0].match(USES_RE);
  if (!mo || !mt) return null;
  if (mo[2] !== mt[2]) return null; // different actions -> not mechanical
  // Prefer `theirs` (incoming) as the bumped version. Callers can flip if needed.
  return [theirs[0]];
}

function resolveFile(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (_) {
    return { ok: 0, ambiguous: 0, wrote: false };
  }
  // Binary heuristic: NUL byte present -> we can't touch it.
  if (buf.includes(0)) {
    return { ok: 0, ambiguous: 0, wrote: false };
  }
  const content = buf.toString('utf8');
  if (!content.includes('<<<<<<<')) {
    return { ok: 0, ambiguous: 0, wrote: false };
  }

  const lines = content.split('\n');
  const replacements = [];
  let ok = 0;
  let ambiguous = 0;

  for (const hunk of iterHunks(content)) {
    const resolved = tryResolveUsesBump(hunk.ours, hunk.theirs);
    if (resolved) {
      replacements.push({ start: hunk.startIdx, end: hunk.endIdx, lines: resolved });
      ok++;
    } else {
      ambiguous++;
    }
  }

  if (replacements.length === 0) {
    return { ok: 0, ambiguous, wrote: false };
  }

  // Apply replacements from bottom to top so indices stay valid.
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    lines.splice(r.start, r.end - r.start + 1, ...r.lines);
  }
  fs.writeFileSync(file, lines.join('\n'));
  return { ok, ambiguous, wrote: true };
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
    const { ok, ambiguous, wrote } = resolveFile(f);
    totalOk += ok;
    totalAmbiguous += ambiguous;

    let status;
    if (ok > 0 && ambiguous === 0) {
      status = 'RESOLVED';
    } else if (ok > 0 && ambiguous > 0) {
      status = 'PARTIAL';
      totalUnresolved++;
    } else if (ok === 0 && ambiguous > 0) {
      status = 'MANUAL';
      totalUnresolved++;
    } else if (!wrote && ok === 0 && ambiguous === 0) {
      // Zero-hunk file (binary conflict, unknown format, etc.) — must NOT
      // be treated as success. This was the historical false-success bug.
      status = 'MANUAL';
      totalUnresolved++;
    } else {
      status = 'SKIP';
      totalUnresolved++;
    }

    console.log(`${status} ${f}\t${ok} hunk(s) resolved, ${ambiguous} hunk(s) ambiguous`);
  }

  console.log(`\nSummary: ${totalOk} hunk(s) auto-resolved, ${totalAmbiguous} hunk(s) ambiguous, ${totalUnresolved} file(s) unresolved.`);
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { iterHunks, tryResolveUsesBump, resolveFile };

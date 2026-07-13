#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to mechanically resolve simple merge conflicts (e.g. version bumps
 * in GitHub Actions `uses:` lines) left over from a `git merge` that produced
 * conflict markers in the working tree.
 *
 * Exit code contract:
 *   0 - every conflicted file was fully, mechanically resolved (RESOLVED)
 *   2 - at least one conflicted file was NOT fully resolved. This includes:
 *         * SKIP     (file type/path we refuse to touch)
 *         * PARTIAL  (some hunks resolved, some ambiguous)
 *         * MANUAL   (nothing resolvable; also covers the zero-hunk case,
 *                    e.g. binary "both modified" conflicts that never get
 *                    textual <<<<<<< markers)
 *   1 - unexpected/internal error
 *
 * Important: a conflicted file with zero detected marker hunks (binary
 * conflicts, unusual conflict styles) is counted as UNRESOLVED, not as a
 * success. Previously the exit code was gated only on `totalAmbiguous`
 * (which counts hunks, not files), so a PR whose only conflicts were binary
 * would exit 0 and the CI helper would happily push the unresolved state
 * back onto the PR branch. See conflict-helper.yml.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function listConflictedFiles() {
  const out = execSync('git diff --name-only --diff-filter=U', { encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Iterate `<<<<<<< ... ======= ... >>>>>>>` hunks in a text buffer.
 * Yields { start, mid, end, ours, theirs } indices/strings.
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
      if (mid !== -1 && end !== -1) {
        const ours = lines.slice(start + 1, mid).join('\n');
        const theirs = lines.slice(mid + 1, end).join('\n');
        yield { start, mid, end, ours, theirs };
        i = end + 1;
        continue;
      }
    }
    i++;
  }
}

// Try to resolve a hunk that is a GHA `uses:` version bump
// e.g. ours: `      - uses: actions/checkout@v3`
//      theirs: `      - uses: actions/checkout@v4`
// Pick the higher semver-ish version.
function resolveUsesBump(ours, theirs) {
  const re = /^(\s*-?\s*uses:\s*[\w./-]+@)(v?\d+(?:\.\d+){0,2})\s*$/;
  const mo = ours.match(re);
  const mt = theirs.match(re);
  if (!mo || !mt) return null;
  if (mo[1] !== mt[1]) return null;
  const parse = (v) => v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [a, b] = [parse(mo[2]), parse(mt[2])];
  const cmp = (x, y) => {
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  };
  const winner = cmp(a, b) >= 0 ? mo[2] : mt[2];
  return `${mo[1]}${winner}`;
}

function resolveFile(file) {
  const abs = path.resolve(file);
  let text;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch (_e) {
    return { ok: 0, ambiguous: 0 };
  }
  const lines = text.split('\n');
  const hunks = Array.from(iterHunks(text));
  if (hunks.length === 0) return { ok: 0, ambiguous: 0 };

  let ok = 0;
  let ambiguous = 0;
  // Walk hunks bottom-up so line indices stay valid as we splice.
  for (let h = hunks.length - 1; h >= 0; h--) {
    const { start, end, ours, theirs } = hunks[h];
    let replacement = null;
    if (ours === theirs) {
      replacement = ours;
    } else {
      const bumped = resolveUsesBump(ours, theirs);
      if (bumped != null) replacement = bumped;
    }
    if (replacement == null) {
      ambiguous++;
      continue;
    }
    lines.splice(start, end - start + 1, replacement);
    ok++;
  }

  if (ok > 0) {
    fs.writeFileSync(abs, lines.join('\n'), 'utf8');
    if (ambiguous === 0) {
      // Fully resolved: stage the file.
      spawnSync('git', ['add', '--', file], { stdio: 'inherit' });
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
  let totalUnresolved = 0;

  for (const f of files) {
    // Only touch text files we understand. Skip lockfiles/binary-ish.
    if (/\.(png|jpg|jpeg|gif|pdf|zip|tar|gz|bin|dat|ico|woff2?|ttf|eot)$/i.test(f)) {
      console.log(`SKIP  ${f}   (binary/unsupported extension)`);
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

  console.log(`\nSummary: ${totalOk} hunk(s) auto-resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) unresolved`);
  // Exit 2 when anything is unresolved so the CI helper does NOT push a
  // half-merged tree to the PR branch.
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
  }
}

module.exports = { iterHunks, resolveUsesBump, resolveFile };

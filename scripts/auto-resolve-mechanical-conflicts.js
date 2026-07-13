#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to mechanically resolve simple merge conflicts in a working tree
 * where `git merge` (or rebase) has left conflict markers in files.
 *
 * Currently supported mechanical resolutions:
 *   - GitHub Actions `uses: owner/repo@vX` version bumps (take the higher
 *     semver-ish version on either side of the conflict marker).
 *
 * Exit codes:
 *   0 - Every conflicted file was fully, mechanically resolved. The caller
 *       may safely `git add -A && git commit && git push`.
 *   2 - At least one conflicted file could NOT be fully resolved. This
 *       includes:
 *         * SKIP     - file type/path we deliberately do not touch
 *         * PARTIAL  - some hunks resolved, some remain ambiguous
 *         * MANUAL   - no hunks were mechanically resolvable, INCLUDING
 *                      files with zero detected `<<<<<<<` marker hunks
 *                      (e.g. binary "both modified" conflicts, which git
 *                      leaves in the index as UU but never writes textual
 *                      conflict markers into). The caller MUST NOT push.
 *
 * Historical bug (fixed): the exit code used to be gated on the count of
 * ambiguous *hunks* only. A conflicted file with zero detected hunks
 * contributed nothing to that counter, so an all-MANUAL run could exit 0
 * and the CI workflow would happily push an unresolved conflict onto the
 * PR branch. We now track `totalUnresolved` at file granularity instead.
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

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

function listConflictedFiles() {
  // -u: unmerged paths only
  const out = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
    encoding: 'utf8',
  });
  if (out.status !== 0) return [];
  return out.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Iterate `<<<<<<< ... ======= ... >>>>>>>` hunks in a file's text.
 * Yields { start, mid, end, ours, theirs, oursRaw, theirsRaw }.
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
        else if (lines[j].startsWith('>>>>>>>')) {
          end = j;
          break;
        }
      }
      if (mid === -1 || end === -1) return;
      const ours = lines.slice(start + 1, mid);
      const theirs = lines.slice(mid + 1, end);
      yield {
        start,
        mid,
        end,
        ours,
        theirs,
        oursRaw: ours.join('\n'),
        theirsRaw: theirs.join('\n'),
      };
      i = end + 1;
    } else {
      i++;
    }
  }
}

// Compare two version strings like "v1.2.3" or "1.2". Returns 1/0/-1.
function cmpVersion(a, b) {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

const USES_RE = /^(\s*(?:-\s*)?uses:\s*)([^\s@]+)@([^\s#]+)(\s*(?:#.*)?)$/;

function tryResolveUsesHunk(oursLines, theirsLines) {
  if (oursLines.length !== 1 || theirsLines.length !== 1) return null;
  const o = oursLines[0];
  const t = theirsLines[0];
  const mo = o.match(USES_RE);
  const mt = t.match(USES_RE);
  if (!mo || !mt) return null;
  // Must be same action repo
  if (mo[2] !== mt[2]) return null;
  const chosen = cmpVersion(mo[3], mt[3]) >= 0 ? o : t;
  return [chosen];
}

function resolveFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: 0, ambiguous: 0 };
  }
  const lines = text.split('\n');
  const hunks = [...iterHunks(text)];
  if (hunks.length === 0) return { ok: 0, ambiguous: 0 };

  // Process hunks from the bottom up so line indices stay valid.
  let ok = 0;
  let ambiguous = 0;
  const out = lines.slice();
  for (let k = hunks.length - 1; k >= 0; k--) {
    const h = hunks[k];
    let replacement = null;
    // Only attempt uses: resolver for .yml/.yaml under .github/workflows/
    if (/\.github\/workflows\/.+\.ya?ml$/.test(file)) {
      replacement = tryResolveUsesHunk(h.ours, h.theirs);
    }
    if (replacement) {
      out.splice(h.start, h.end - h.start + 1, ...replacement);
      ok++;
    } else {
      ambiguous++;
    }
  }

  if (ok > 0) {
    fs.writeFileSync(file, out.join('\n'));
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
  // Count of files (not hunks) that are not fully resolved. This is what
  // gates the exit code — see the top-of-file doc comment for why.
  let totalUnresolved = 0;

  for (const f of files) {
    // Skip files we deliberately don't touch.
    if (f.startsWith('node_modules/')) {
      console.log(`SKIP   ${f}`);
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

  for (const file of conflicted) {
    if (!fs.existsSync(file)) {
      lines.push(`SKIP     ${file}   (deleted on one side — leave to human)`);
      totalAmbiguous++;
      totalUnresolved++;
      continue;
    }
    const { ok, ambiguous } = resolveFile(f);
    totalOk += ok;
    totalAmbiguous += ambiguous;
    if (ambiguous === 0 && ok > 0) {
      console.log(`RESOLVED ${f}   ${ok} hunk(s)`);
    } else if (ok > 0) {
      console.log(`PARTIAL  ${f}   ${ok} resolved, ${ambiguous} ambiguous`);
      totalUnresolved++;
    } else {
      // ok === 0. Either the file had ambiguous marker hunks we couldn't
      // touch, OR it had zero detected hunks entirely (e.g. a binary
      // "both modified" conflict). Both cases are unresolved and unsafe
      // to push.
      console.log(`MANUAL   ${f}   ${ambiguous} hunk(s) ambiguous`);
      lines.push(`PARTIAL  ${file}   ${ok} ok, ${ambiguous} ambiguous`);
      totalUnresolved++;
    } else {
      lines.push(`MANUAL   ${file}   ${ambiguous} hunk(s) ambiguous`);
      totalUnresolved++;
    }
  }

  console.log(
    `\nSummary: ${totalOk} resolved, ${totalAmbiguous} ambiguous hunk(s), ${totalUnresolved} unresolved file(s) across ${files.length} conflicted file(s).`
  );
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
  console.log(lines.join("\n"));
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

module.exports = {
  iterHunks,
  cmpVersion,
  tryResolveUsesHunk,
  resolveFile,
};

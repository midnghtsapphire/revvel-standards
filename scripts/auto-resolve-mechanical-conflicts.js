#!/usr/bin/env node
/**
 * auto-resolve-mechanical-conflicts.js
 *
 * Attempts to mechanically auto-resolve simple merge conflicts in the current
 * working tree (e.g. GitHub Actions `uses:` version bumps, lockfile-style
 * additions, etc.). Any file that cannot be fully resolved is left alone so a
 * human can finish the merge.
 *
 * Exit code contract:
 *   0 -> EVERY conflicted file was fully, mechanically resolved. Safe for a
 *        CI workflow to `git add -A && git commit && git push` the result.
 *   2 -> At least one conflicted file was NOT fully resolved. This includes:
 *          - SKIP    (binary / too-large / unreadable)
 *          - PARTIAL (some hunks resolved, some ambiguous)
 *          - MANUAL  (nothing resolvable found in this file) -- INCLUDING the
 *                    zero-hunk case (e.g. binary "both modified" conflicts
 *                    that never contain `<<<<<<<` markers at all).
 *   1 -> Fatal script error.
 *
 * The zero-hunk MANUAL case is important: previously the exit code was gated
 * on a counter of *ambiguous hunks*, so a conflicted file with no detected
 * hunks contributed nothing and the script exited 0 -- causing the calling
 * workflow to push unresolved conflicts onto the PR branch. This script now
 * tracks unresolved *files* directly.
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

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFLICT_START = '<<<<<<<';
const CONFLICT_MID = '=======';
const CONFLICT_END = '>>>>>>>';
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB safety cap

function listConflictedFiles() {
  const out = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
    encoding: 'utf8',
  });
  if (out.status !== 0) {
    throw new Error(`git diff failed: ${out.stderr}`);
  }
  return out.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isProbablyBinary(buf) {
  // Heuristic: NUL byte in first 8KiB => binary.
  const slice = buf.slice(0, Math.min(buf.length, 8192));
  for (let i = 0; i < slice.length; i++) {
    if (slice[i] === 0) return true;
  }
  return false;
}

function* iterHunks(lines) {
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith(CONFLICT_START)) {
      const start = i;
      let mid = -1;
      let end = -1;
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].startsWith(CONFLICT_START)) {
          // nested/broken -> bail on this hunk
          break;
        }
        if (mid === -1 && lines[j].startsWith(CONFLICT_MID)) {
          mid = j;
        } else if (mid !== -1 && lines[j].startsWith(CONFLICT_END)) {
          end = j;
          break;
        }
        j++;
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
      // Malformed -- skip past this marker so we don't infinite loop.
      i = start + 1;
      continue;
    }
    i++;
  }
}

// Try to auto-resolve a single hunk. Return the resolved lines (array) or null
// if the hunk is ambiguous / not safely mechanical.
function resolveHunk(hunk) {
  const { ours, theirs } = hunk;

  // Trivially identical.
  if (ours.join('\n') === theirs.join('\n')) {
    return ours.slice();
  }

  // One side empty -> take the other.
  if (ours.length === 0) return theirs.slice();
  if (theirs.length === 0) return ours.slice();

  // GitHub Actions `uses: owner/name@vX` version bump: same action, differing
  // ref -> prefer the higher/newer semver-ish tag on `theirs` if both look
  // like refs.
  if (ours.length === 1 && theirs.length === 1) {
    const reUses = /^(\s*(?:-\s*)?uses:\s*)([^\s@]+)@(\S+)(\s*)$/;
    const mo = ours[0].match(reUses);
    const mt = theirs[0].match(reUses);
    if (mo && mt && mo[2] === mt[2]) {
      // Same action reference. Prefer the ref that sorts higher lexicographically
      // when both look like `v<semver>`; otherwise prefer theirs (incoming).
      const ro = mo[3];
      const rt = mt[3];
      const semverish = /^v?\d+(\.\d+){0,2}$/;
      if (semverish.test(ro) && semverish.test(rt)) {
        const cmp = compareSemverish(ro, rt);
        return cmp >= 0 ? [ours[0]] : [theirs[0]];
      }
      return [theirs[0]];
    }
  }

  return null;
}

function compareSemverish(a, b) {
  const parse = (s) =>
    s
      .replace(/^v/, '')
      .split('.')
      .map((p) => parseInt(p, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function resolveFile(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'missing' };
  }
  if (!stat.isFile()) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'not-file' };
  }
  if (stat.size > MAX_FILE_BYTES) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'too-large' };
  }
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: `read: ${e.message}` };
  }
  if (isProbablyBinary(buf)) {
    return { status: 'SKIP', ok: 0, ambiguous: 0, reason: 'binary' };
  }

  const text = buf.toString('utf8');
  const lines = text.split('\n');

  const hunks = [...iterHunks(lines)];
  if (hunks.length === 0) {
    // No detectable textual conflict markers. This does NOT mean the file is
    // resolved -- it may still be in the index as "both modified" (e.g. binary
    // that slipped past the heuristic, or an unknown conflict style). Report
    // MANUAL so the caller treats it as unresolved.
    return { status: 'MANUAL', ok: 0, ambiguous: 0 };
  }

  const resolutions = new Array(hunks.length);
  let ambiguous = 0;
  for (let i = 0; i < hunks.length; i++) {
    const r = resolveHunk(hunks[i]);
    if (r === null) {
      ambiguous++;
      resolutions[i] = null;
    } else {
      resolutions[i] = r;
    }
  }

  if (ambiguous === hunks.length) {
    return { status: 'MANUAL', ok: 0, ambiguous };
  }

  // Rebuild the file. Ambiguous hunks are left as-is (markers preserved).
  const outLines = [];
  let cursor = 0;
  for (let i = 0; i < hunks.length; i++) {
    const h = hunks[i];
    for (let k = cursor; k < h.start; k++) outLines.push(lines[k]);
    if (resolutions[i] === null) {
      for (let k = h.start; k <= h.end; k++) outLines.push(lines[k]);
    } else {
      for (const l of resolutions[i]) outLines.push(l);
    }
    cursor = h.end + 1;
  }
  for (let k = cursor; k < lines.length; k++) outLines.push(lines[k]);

  fs.writeFileSync(file, outLines.join('\n'));

  if (ambiguous === 0) {
    // Fully resolved -> stage it.
    try {
      execSync(`git add -- ${JSON.stringify(file)}`, { stdio: 'ignore' });
    } catch {
      /* best-effort */
    }
    return { status: 'RESOLVED', ok: hunks.length, ambiguous: 0 };
  }
  return {
    status: 'PARTIAL',
    ok: hunks.length - ambiguous,
    ambiguous,
  };
}

function main() {
  let files;
  try {
    files = listConflictedFiles();
  } catch (e) {
    console.error(`fatal: ${e.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('no conflicted files');
    process.exit(0);
  }

  let totalResolved = 0;
  let totalAmbiguous = 0;
  let totalUnresolved = 0; // files not fully in RESOLVED state
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

  for (const f of files) {
    let r;
    try {
      r = resolveFile(f);
    } catch (e) {
      console.log(`ERROR   ${f}   ${e.message}`);
      totalUnresolved++;
      continue;
    }
    switch (r.status) {
      case 'RESOLVED':
        console.log(`RESOLVED ${f}   ${r.ok} hunk(s) auto-resolved`);
        totalResolved += r.ok;
        break;
      case 'PARTIAL':
        console.log(
          `PARTIAL  ${f}   ${r.ok} resolved, ${r.ambiguous} ambiguous`,
        );
        totalResolved += r.ok;
        totalAmbiguous += r.ambiguous;
        totalUnresolved++;
        break;
      case 'MANUAL':
        console.log(`MANUAL   ${f}   ${r.ambiguous} hunk(s) ambiguous`);
        totalAmbiguous += r.ambiguous;
        totalUnresolved++;
        break;
      case 'SKIP':
      default:
        console.log(`SKIP     ${f}   ${r.reason || 'skipped'}`);
        totalUnresolved++;
        break;
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
    `summary: ${totalResolved} hunk(s) auto-resolved, ${totalAmbiguous} ambiguous, ${totalUnresolved} file(s) unresolved`,
  );

  // Exit 0 ONLY when every conflicted file was fully resolved.
  process.exit(totalUnresolved > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  iterHunks,
  resolveHunk,
  resolveFile,
  compareSemverish,
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

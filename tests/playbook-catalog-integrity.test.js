'use strict';

/**
 * The self-healing catalog is the one artifact CLAUDE.md tells every agent to
 * consult *before* planning a fix (WR #17810):
 *
 *   "the fix-pattern catalog there is a lookup table, not a read-through"
 *
 * A lookup lands on whichever copy comes first. So the catalog's structure is
 * load-bearing in a way ordinary prose is not, and it had drifted twice:
 *
 *   1. THE SPLICE. Copy C's entry 1 lost its `### 1.` heading and its Symptom
 *      bullet. Its Root cause and Fix were left hanging under copy B's entry 8,
 *      so a reader of "Broken third-party GitHub Action" was handed a
 *      `removeLabel` fix as if it were part of pinning Actions. Nothing caught
 *      it because the file still rendered, still linted, and still contained
 *      every sentence it was supposed to contain.
 *
 *   2. THE COUNT. The section intro said "Eight patterns" after a ninth was
 *      added — RVS-VERIFY-001, the newest and most-cited entry.
 *
 * These tests assert the shape a lookup depends on. They do NOT assert the
 * catalog is de-duplicated: it is currently present three times, with the
 * copies disagreeing on entry 2's prescribed fix. That is #17810, and merging
 * the three is its own change. What this file does is stop the tripling from
 * getting worse or drifting further while that work is pending — the copy
 * counts below are name-pinned and may only shrink.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLAYBOOK = path.join(
  __dirname, '..', 'standards', 'AUDIT_AND_SELF_HEALING_PLAYBOOK.md',
);
const lines = () => fs.readFileSync(PLAYBOOK, 'utf8').split('\n');

const HEADING = /^### (\d+)\. (.+)$/;

/** Every `### N.` heading, with its 0-based line index. */
function headings() {
  return lines()
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => HEADING.test(line));
}

/**
 * The catalog's nine entries, each exactly once.
 *
 * This was a copy-count ratchet: the catalog was present THREE times, in three
 * write-ups that had drifted apart — entry 2 prescribed three different fixes,
 * and only one matched CLAUDE.md. A lookup landed on whichever copy came
 * first, which was not that one.
 *
 * #17843 merged them, keeping every distinct claim, so the ratchet reached its
 * stated end condition and is gone. What is left is the flat rule it existed
 * to converge on: no entry appears twice.
 */
const ENTRIES = Object.freeze([
  '1. Unguarded `removeLabel` race (PR #15821)',
  '2. Missing `allowError` on internal API helpers (PR #15824)',
  '3. Default `GITHUB_TOKEN` on agent-created PRs (PR #15823)',
  '4. Secrets via argv vs. stdin (PR #15825)',
  '5. Bash bare-array-variable bug (PR #15827)',
  '6. Exit codes as proxy metrics vs. true resolution state (PR #15826)',
  '7. `nosemgrep` suppression comment adjacency (PR #15825)',
  '8. Broken third-party GitHub Action failing every PR (PR #15828)',
  '9. A marker asserting a postcondition nothing verified (PRs #17782, #17791, #17792, #17793, #17797)',
]);

test('every catalog entry is Symptom -> Root cause -> Fix, exactly once each', () => {
  // The splice was invisible to every other check in the repo: it produced a
  // second Root cause and a second Fix under one heading. Bullet ORDER and
  // ARITY are what a lookup actually relies on.
  const src = lines();
  const marks = headings().map((h) => h.i);

  assert.ok(marks.length > 0, 'the catalog must have entries');

  marks.forEach((start, n) => {
    const end = n + 1 < marks.length ? marks[n + 1] : src.length;
    const title = src[start].replace(/^### /, '');
    const got = src
      .slice(start + 1, end)
      .map((l) => /^- \*\*(Symptom|Root cause|Fix):/.exec(l))
      .filter(Boolean)
      .map((m) => m[1]);

    assert.deepEqual(
      got,
      ['Symptom', 'Root cause', 'Fix'],
      `"${title}" must carry exactly one Symptom, one Root cause and one Fix, ` +
        'in that order — a trailing extra pair means an adjacent entry lost ' +
        'its heading and is now filed under this one',
    );
  });
});

test('every catalog entry appears exactly once, in order', () => {
  const seen = headings().map(({ line }) => line.replace(/^### /, ''));

  const dupes = seen.filter((t, i) => seen.indexOf(t) !== i);
  assert.deepEqual(
    [...new Set(dupes)],
    [],
    'an entry appears more than once — a lookup lands on whichever copy comes ' +
      'first, and three copies of this catalog had drifted into disagreeing ' +
      'about entry 2 before anyone noticed (#17810)',
  );

  assert.deepEqual(
    seen,
    [...ENTRIES],
    'the catalog gained, lost or reordered an entry; entry 9 spent a release ' +
      'filed between 1 and 2, where a reader counting down never reached it',
  );
});

test('the stated pattern count matches the entries that exist', () => {
  // Said "Eight" while nine existed. The ninth is RVS-VERIFY-001 — the entry
  // most likely to be looked up, and the one a reader counting to eight stops
  // just short of.
  const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  const distinct = ENTRIES.length;

  const intro = lines().find((l) => /^\w+ patterns, each observed/.test(l));
  assert.ok(intro, 'the catalog intro line must be present');
  assert.match(
    intro,
    new RegExp(`^${WORDS[distinct]} patterns,`),
    `the catalog holds ${distinct} distinct entries; the intro says otherwise`,
  );
});

test('RVS-VERIFY-001 is reachable from the catalog', () => {
  // CLAUDE.md points here for depth; this entry points on to the full rule.
  // If the pointer breaks, the standard is reachable only by knowing it exists.
  const src = fs.readFileSync(PLAYBOOK, 'utf8');
  assert.match(src, /standards\/VERIFY_THE_POSTCONDITION\.md/);
  assert.ok(
    fs.existsSync(path.join(__dirname, '..', 'standards', 'VERIFY_THE_POSTCONDITION.md')),
    'the catalog cites a standard that must exist',
  );
});

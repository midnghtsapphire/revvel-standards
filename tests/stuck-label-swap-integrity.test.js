'use strict';

/**
 * A label swap must not report success on a removal that failed (WR #17799).
 *
 * Four `removeLabel` calls used `.catch(() => {})`. That cannot tell "the label
 * was already gone" — the desired end state — from "this token may not write
 * labels", and both of these workflows act on the answer.
 *
 * `stuck-label-automation.yml` (×3): each removal is HALF OF A SWAP. The next
 * statement adds the replacement label. A swallowed 403 leaves the old label in
 * place while the new one goes on, so the issue ends up carrying both — the
 * exact confused state this job exists to resolve.
 *
 * `stuck-check-watchdog.yml`: the line after the removal was
 *
 *     diagnosis.cleared_stuck = true;
 *
 * set unconditionally. On a 403 the diagnosis comment announced a resolution
 * that had not happened, and the issue stayed marked `lifecycle:stuck` forever
 * — which is the outcome the block exists to prevent. That is RVS-VERIFY-001 in
 * one line: a marker asserting a postcondition nothing verified.
 *
 * These were invisible until #17787 taught ChaosMender to judge the guard by
 * what it does; the old detector accepted any `.catch`, including one that
 * discards everything.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS = path.join(__dirname, '..', '.github', 'workflows');
const read = (f) => fs.readFileSync(path.join(WORKFLOWS, f), 'utf8');

/** Source with `//` comments stripped — prose about the defect is not evidence. */
const code = (f) =>
  read(f).split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

const SWAP_WORKFLOWS = ['stuck-label-automation.yml', 'stuck-check-watchdog.yml'];

test('no removeLabel in these workflows discards every error', () => {
  for (const file of SWAP_WORKFLOWS) {
    assert.doesNotMatch(
      code(file),
      /\.catch\(\(\)\s*=>\s*\{\s*\}\)/,
      `${file}: a catch that discards everything cannot tell "already gone" from "not permitted"`,
    );
  }
});

test('every removeLabel re-throws anything that is not a 404', () => {
  for (const file of SWAP_WORKFLOWS) {
    const src = code(file);
    const calls = [...src.matchAll(/removeLabel\(\{/g)];
    assert.ok(calls.length > 0, `${file}: expected removeLabel calls`);

    calls.forEach((match, i) => {
      const from = match.index;
      const to = i + 1 < calls.length ? calls[i + 1].index : src.length;
      // Judge the guard by what it DOES, not by one exact formatting. An
      // earlier version of this assertion demanded a single-line
      // `.catch((err) => { if (err.status !== 404) throw err; });` and rejected
      // the correct multi-line variant at stuck-check-watchdog.yml:263, which
      // re-throws and then logs. That is the same mistake #17787 fixed in
      // ChaosMender: a check that fails correct code is one people learn to
      // ignore.
      //
      // Still strict where it matters — the condition must be exactly
      // `!== 404`, so a widened `!== 404 && !== 403` does not pass.
      assert.match(
        src.slice(from, to),
        /\.catch\(\(?(\w+)\)?\s*=>\s*\{[\s\S]*?if \(\1\.status !== 404\) throw \1;/,
        `${file}: removeLabel #${i + 1} must re-throw non-404`,
      );
    });
  }
});

test('cleared_stuck is not claimed on a removal that may have failed', () => {
  // The marker case. The assertion is about IDENTITY, ORDER and GUARD: the
  // removal immediately preceding the claim must be the `lifecycle:stuck` one,
  // and it must throw when it did not happen.
  //
  // Identity is not decoration here. An earlier version of this test looked
  // back for the nearest `removeLabel({` and checked only its guard. Delete the
  // `lifecycle:stuck` removal outright — leaving `cleared_stuck = true` claiming
  // a label that is still on the issue — and the search walked past the gap to
  // the `wr:checking` removal above, which is correctly guarded, and the test
  // passed. The claim it is meant to protect was gone and nothing said so.
  const src = code('stuck-check-watchdog.yml');
  const claim = src.indexOf('diagnosis.cleared_stuck = true');
  assert.notEqual(claim, -1, 'the cleared_stuck claim must be present');

  const before = src.slice(0, claim);
  const lastRemoval = before.lastIndexOf('removeLabel({');
  assert.notEqual(lastRemoval, -1, 'the claim must follow a removal');

  const removal = before.slice(lastRemoval);
  assert.match(
    removal,
    /name:\s*['"]lifecycle:stuck['"]/,
    'the removal the claim rests on must be the lifecycle:stuck one — a claim ' +
      'whose nearest preceding removal takes a different label is claiming ' +
      'something nothing performed',
  );
  assert.match(
    removal,
    /status !== 404\) throw/,
    'a swallowed 403 here reports a resolution that did not happen, and the issue stays stuck',
  );
});

test('the swap still adds the replacement label after removing the old one', () => {
  // Guard against "fixing" this by deleting the removal: the swap must remain a
  // swap, or issues keep the stale label and the job silently stops working.
  const src = code('stuck-label-automation.yml');
  const removals = [...src.matchAll(/removeLabel\(\{/g)];
  assert.equal(removals.length, 3, 'all three swap sites must remain');
  for (const match of removals) {
    assert.match(
      src.slice(match.index, match.index + 900),
      /addLabels\(\{/,
      'each removal must still be followed by the label it swaps in',
    );
  }
});

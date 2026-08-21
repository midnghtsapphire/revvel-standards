'use strict';

/**
 * `docs/TOOL_COST_INDEX.md` is not documentation — it is an input to an
 * automated decision. Its own header says so, and `docs/API_LIMIT_AUTO_UPGRADE.md`
 * reads from it when a quota wall is hit. A wrong row produces a confident wrong
 * answer at exactly the moment someone is deciding whether to spend money.
 *
 * It drifted in the way that is hardest to notice: not by a row going stale on
 * its own, but by a decision being **reversed** and the reversal never reaching
 * the table.
 *
 *   D007 (2026-07-08) cut RecurseML.
 *   D014 (2026-08-19) reversed D007 and restored it, in as many words.
 *   The index still cited D007 two days later.
 *
 * D014's own rationale is worth keeping in view, because it explains why the
 * cut looked justified at the time: D007 measured the `recurse-ml.yml` workflow
 * lane, which by construction could not post anything without a secret it did
 * not have — while the RecurseML **GitHub App** posted its `recurseml/analysis`
 * check independently, needed no secret, and stayed installed throughout. Two
 * delivery mechanisms were conflated and the measured one was not the running
 * one.
 *
 * This test does not try to judge whether a row's prices or tiers are right —
 * nothing in the repo can know that. It checks the one thing that is
 * mechanically decidable: **the index must not cite a decision that a later
 * decision reverses.**
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const INDEX = path.join(REPO_ROOT, 'docs', 'TOOL_COST_INDEX.md');
const DECISIONS = path.join(REPO_ROOT, 'DECISIONS.md');

/** Decision ids a later decision explicitly reverses, e.g. "REVERSE D007". */
function reversedDecisions(decisionsSource) {
  const reversed = new Map();
  for (const line of decisionsSource.split('\n')) {
    const match = line.match(/\bREVERSES?\s+(D\d{3})\b/i);
    if (!match) continue;
    const by = line.match(/^\|\s*(D\d{3})\s*\|/);
    reversed.set(match[1].toUpperCase(), by ? by[1] : 'a later decision');
  }
  return reversed;
}

test('the cost index cites no decision that a later decision reverses', () => {
  const index = fs.readFileSync(INDEX, 'utf8');
  const reversed = reversedDecisions(fs.readFileSync(DECISIONS, 'utf8'));

  const offenders = [];
  for (const [line, number] of index
    .split('\n')
    .map((l, i) => [l, i + 1])) {
    for (const [dead, by] of reversed) {
      // A row may legitimately mention the reversed id while describing the
      // reversal ("D014 reverses D007"). What it may not do is cite it as the
      // decision still in force.
      if (!line.includes(dead)) continue;
      if (line.includes(by)) continue;
      offenders.push(
        `docs/TOOL_COST_INDEX.md:${number} cites ${dead}, which ${by} reverses: ${line.trim().slice(0, 110)}`,
      );
    }
  }

  assert.deepStrictEqual(
    offenders,
    [],
    'The cost index feeds an automated upgrade decision ' +
      '(docs/API_LIMIT_AUTO_UPGRADE.md reads it at a quota wall), so a row ' +
      'citing a reversed decision hands that process a stale answer. Update the ' +
      'row to cite the decision actually in force:\n  ' +
      offenders.join('\n  '),
  );
});

test('reversal detection actually finds the reversal it was written for', () => {
  // Guards the guard. If DECISIONS.md is reformatted such that "REVERSE D007"
  // no longer parses, the test above silently passes forever and the drift it
  // exists to catch comes straight back.
  const reversed = reversedDecisions(fs.readFileSync(DECISIONS, 'utf8'));
  assert.ok(
    reversed.size > 0,
    'No reversals parsed out of DECISIONS.md. Either the format changed or the ' +
      'regex broke — either way the check above is now inert. It must find at ' +
      'least D014-reverses-D007.',
  );
  assert.strictEqual(
    reversed.get('D007'),
    'D014',
    'Expected D014 to be recorded as reversing D007. If that changed, update ' +
      'this expectation deliberately rather than deleting it.',
  );
});

test('every tool posting a check on PRs has a row in the index', () => {
  // Devin posted a `Devin Review` status on every PR while absent from the file
  // that claims to list every tool the pipeline uses.
  const index = fs.readFileSync(INDEX, 'utf8').toLowerCase();
  const missing = [];
  for (const tool of ['recurseml', 'octopus', 'devin', 'vercel', 'circleci', 'coderabbit']) {
    if (!index.includes(tool)) missing.push(tool);
  }
  assert.deepStrictEqual(
    missing,
    [],
    'These tools report on pull requests but have no row in TOOL_COST_INDEX.md, ' +
      `which claims to cover every tool the pipeline uses:\n  ${missing.join('\n  ')}`,
  );
});

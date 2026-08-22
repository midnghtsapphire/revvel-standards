'use strict';

/**
 * `docs/TOOL_COST_INDEX.md` opens by calling itself the "single source of truth
 * for current + next-tier costs of every SaaS the pipeline uses", and
 * `docs/API_LIMIT_AUTO_UPGRADE.md` reads it when a quota wall is hit. On
 * 2026-08-21 it listed 24 tools and every paid one was missing.
 *
 * What was actually being billed to the account that day:
 *
 *   Rollbar `advanced_4000K`   $1,208 / yr, trial converting 2026-08-24
 *   Deploybot-app Pro             $45 / mo
 *   Create Issue Branch           $10 / mo
 *   GitHub Copilot Max        $566.17 additional usage, Aug 1-21
 *
 * None of it appeared in the index. Rollbar appeared in
 * `docs/Universal-BOM_List/TOOLING_AND_TESTING_BOM.md` at "Free (5k items/mo) /
 * $12+/mo" — the price of a plan the account is not on, which is worse than an
 * omission because it reads as a checked fact.
 *
 * The failure is the RVS-VERIFY-001 shape: a document asserted coverage and
 * nothing consumed the assertion. A table of two dozen `$0` rows looks like a
 * cost review has happened. It had not; the free tiers were the only rows
 * anybody had ever added.
 *
 * So this test is the consumer. Each entry below was read off
 * github.com/settings/billing on 2026-08-21 and must keep a row in the index
 * that states a non-zero amount. Adding a subscription without pricing it here
 * fails; quietly zeroing a row that really bills fails.
 *
 * This does NOT check that the amounts are still current — nothing in the repo
 * can know that. It checks that a service known to charge money is named, with
 * a number next to it, in the file that decisions are made from.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const INDEX = path.join(__dirname, '..', 'docs', 'TOOL_COST_INDEX.md');

/**
 * Paid line items observed on the account's billing pages, 2026-08-21.
 * `match` is what the row must be findable by; `amount` is a distinctive
 * fragment of the figure that must appear on that same row.
 *
 * Name-pinned on purpose. A count ("at least 4 paid rows") would pass while
 * naming the wrong four, which is how the index got into this state.
 */
const BILLED = [
  { name: 'Rollbar', match: /\bRollbar\b/, amount: '1,208' },
  { name: 'Deploybot-app', match: /\bDeploybot\b/i, amount: '$45' },
  { name: 'Create Issue Branch', match: /\bCreate Issue Branch\b/i, amount: '$10' },
  { name: 'GitHub Copilot', match: /\bGitHub Copilot\b/i, amount: '566.17' },
];

function rowsOf(source) {
  return source
    .split('\n')
    .map((line, i) => ({ line, number: i + 1 }))
    .filter(({ line }) => line.trimStart().startsWith('|'));
}

test('every subscription known to bill has a priced row in the cost index', () => {
  const rows = rowsOf(fs.readFileSync(INDEX, 'utf8'));
  const problems = [];

  for (const { name, match, amount } of BILLED) {
    const matched = rows.filter(({ line }) => match.test(line));
    if (matched.length === 0) {
      problems.push(
        `${name} bills this account but has no row in docs/TOOL_COST_INDEX.md.`,
      );
      continue;
    }
    if (!matched.some(({ line }) => line.includes(amount))) {
      problems.push(
        `${name} has a row (line ${matched[0].number}) but no "${amount}" on it. ` +
          'A paid service listed without its price reads as free.',
      );
    }
  }

  assert.deepStrictEqual(
    problems,
    [],
    'docs/TOOL_COST_INDEX.md feeds an automated upgrade decision and is where a ' +
      'human looks before spending. A service that charges the account must be ' +
      'named there with its amount:\n  ' + problems.join('\n  '),
  );
});

test('a subscription with a trial that converts states the conversion date', () => {
  // Rollbar's $1,208 was three days from charging when it was discovered, and
  // the page offered a "downgrade to advanced_4000K effective Aug 25" that is
  // the same tier and does not avoid the charge. A trial with no date recorded
  // is a bill nobody is expecting.
  const source = fs.readFileSync(INDEX, 'utf8');
  const rollbar = rowsOf(source).find(({ line }) => /\bRollbar\b/.test(line));
  assert.ok(rollbar, 'Rollbar row disappeared; the test above should have caught this.');
  assert.match(
    rollbar.line,
    /2026-08-24/,
    'The Rollbar row must keep the date its trial converts to a $1,208 charge. ' +
      'Remove the date only when the subscription itself is gone, and then ' +
      'remove the row and its entry in BILLED together.',
  );
});

test('the BOM no longer prices Rollbar as a free tier', () => {
  // The index and the BOM disagreed: one said nothing, the other said $12+/mo.
  // Whichever a reader reached first, they were misinformed.
  const bom = fs.readFileSync(
    path.join(__dirname, '..', 'docs', 'Universal-BOM_List', 'TOOLING_AND_TESTING_BOM.md'),
    'utf8',
  );
  const row = bom.split('\n').find((line) => /\*\*Rollbar\*\*/.test(line));
  assert.ok(row, 'Rollbar row missing from TOOLING_AND_TESTING_BOM.md.');
  assert.ok(
    row.includes('1,208'),
    'The BOM must state the amount the account is actually on, not the public ' +
      `free-tier price. Row reads:\n  ${row.trim()}`,
  );
});

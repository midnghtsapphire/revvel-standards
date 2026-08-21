'use strict';

/**
 * A workflow may not tell a reader it runs on a cadence it does not have.
 *
 * This turned up twice in one sitting, from two different causes:
 *
 *   1. `openrouter-assignee.yml` told every routed PR it "runs 24/7 on event
 *      triggers + hourly cron sweep". It has never had a `schedule:` trigger.
 *      The text was never true (#17854).
 *   2. `openrouter-instantiation-check.yml` ended its status comment with
 *      "_Next check: ~24h (cron 17 6 * * *)_". That cron belonged to
 *      `watchtower.yml`, which the cost freeze stopped, so a true sentence
 *      became false without anyone editing it (#17851).
 *
 * Both are RVS-VERIFY-001: a marker with no producer. Ask what would fail if
 * the claim were false — nothing did, so it is not a control, it is decoration
 * that misleads. The concrete harm is specific: an item that misses its event
 * trigger is never swept up, and the comment tells the reader to wait for a
 * sweep that will not come.
 *
 * Cause 2 makes this permanent work rather than a one-off cleanup. Every future
 * schedule change can falsify prose in a file it never touches, so the check has
 * to live in CI.
 *
 * Scope: text a human reads — YAML values and JS string literals. Not `#` YAML
 * comments and not `//` JS comments, which explain the code to maintainers
 * rather than making promises to users.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');

/**
 * Phrases that promise a recurring cadence. Deliberately narrow: "next run"
 * and "shortly" promise nothing checkable and are not listed.
 */
const CADENCE = new RegExp(
  [
    '\\bhourly\\b',
    '\\bnightly\\b',
    '24/7',
    '\\bevery\\s+\\d+\\s*(?:min|minute|minutes|hour|hours|day|days)\\b',
    '\\bevery\\s+(?:hour|day|night|week)\\b',
    '\\bnext\\s+(?:check|sweep)\\b',
    '\\bruns?\\s+daily\\b',
    '\\b(?:daily|weekly)\\s+(?:sweep|run|check)\\b',
  ].join('|'),
  'i',
);

/**
 * Files permitted to carry cadence wording without a live schedule. Each entry
 * must say why, and the reason must be something changing the string would
 * break — not "it would be annoying to fix".
 */
const ALLOWED = {
  'security-fleet.yml':
    'The job name and `titlePrefix` still read "weekly sweep". titlePrefix is a ' +
    'matching key — the workflow finds its own open issues with ' +
    '`title.startsWith(titlePrefix)`, so changing the string orphans every issue ' +
    'already filed under the old prefix and starts creating duplicates beside ' +
    'them. The prose a reader actually sees was corrected; the key was not. ' +
    'Revisit when the schedule is restored or the open issues are drained.',
};

function liveText(source) {
  return source
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    // YAML comments explain config; JS comments explain code. Neither is a
    // promise made to a user.
    .filter((entry) => !/^\s*#/.test(entry.line))
    .filter((entry) => !/^\s*\/\//.test(entry.line));
}

function hasLiveSchedule(source) {
  return source
    .split('\n')
    .some((line) => !/^\s*#/.test(line) && /^\s*-\s*cron:/.test(line));
}

function workflowFiles() {
  return fs
    .readdirSync(WORKFLOW_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

test('no workflow promises a cadence its triggers do not provide', () => {
  const offenders = [];
  for (const name of workflowFiles()) {
    if (Object.hasOwn(ALLOWED, name)) continue;
    const source = fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');
    if (hasLiveSchedule(source)) continue;
    for (const { line, number } of liveText(source)) {
      // Only quoted text reaches a reader; bare YAML keys do not.
      if (!/['"`]/.test(line)) continue;
      if (!CADENCE.test(line)) continue;
      offenders.push(`${name}:${number}  ${line.trim().slice(0, 120)}`);
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'These workflows have no live `schedule:` trigger but tell the reader they ' +
      'run on one. Either restore the schedule (which also means adding the file ' +
      'to ALLOWED_SCHEDULED in tests/no-scheduled-workflows.test.js), or reword ' +
      'the text to describe what actually triggers the workflow:\n  ' +
      offenders.join('\n  '),
  );
});

test('every allowlist entry names a file that exists and gives a reason', () => {
  // An allowlist that outlives its files is how the exception becomes the rule.
  const problems = [];
  for (const [name, reason] of Object.entries(ALLOWED)) {
    if (!fs.existsSync(path.join(WORKFLOW_DIR, name))) {
      problems.push(`${name}: allowlisted but the file no longer exists`);
      continue;
    }
    if (!reason || reason.length < 40) {
      problems.push(`${name}: reason is missing or too short to be a reason`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

test('an allowlisted file that no longer needs the exception is caught', () => {
  // Guards the guard: if security-fleet's titlePrefix is ever reworded, the
  // allowlist entry becomes dead weight and should be removed with it.
  const stale = [];
  for (const name of Object.keys(ALLOWED)) {
    const file = path.join(WORKFLOW_DIR, name);
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (hasLiveSchedule(source)) continue;
    const stillMatches = liveText(source).some(
      ({ line }) => /['"`]/.test(line) && CADENCE.test(line),
    );
    if (!stillMatches) {
      stale.push(`${name}: no longer contains a cadence claim — drop it from ALLOWED`);
    }
  }
  assert.deepStrictEqual(stale, []);
});

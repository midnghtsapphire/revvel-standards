'use strict';

/**
 * ChaosMender's LABEL-RACE-001 scanner must judge the guard by what it does
 * (WR #17787).
 *
 * The rule's own `fix` field states the requirement: "swallow ONLY 404. A
 * 401/403 must still surface." The scanner checked for a literal `.catch`
 * within five lines instead, and got both directions wrong:
 *
 *   - `try { … } catch (e) { if (e.status !== 404) throw e; }` — exactly what
 *     the ledger prescribes — was reported as UNGUARDED. A check that fails
 *     correct code is one people learn to ignore, which is how a real finding
 *     ends up in a check nobody reads (the OSSAR failure mode, #17748).
 *   - `.catch(() => {})` PASSED. That is the defect the rule exists to
 *     prevent: on a restricted token the label stays put, the job reports
 *     success, and the merge block is still in place.
 *   - The five-line window was narrower than the house call style. A
 *     `removeLabel({ owner, repo, issue_number, name })` written one property
 *     per line spans six lines before a guard can appear.
 *
 * The fixtures below are the four-row table from #17787, plus the cases that
 * make the fix precise.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { scanBareRemoveLabel } = require('../scripts/chaosmender.js');

/** Write a throwaway repo containing one workflow, and scan it. */
function scan(script, { filename = 'fixture.yml' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chaosmender-'));
  const dir = path.join(root, '.github', 'workflows');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, filename),
    ['name: Fixture', 'on: [push]', 'jobs:', '  j:', '    steps:', '      - uses: actions/github-script@v9.0.0',
     '        with:', '          script: |'].join('\n') +
      '\n' + script.split('\n').map((l) => `            ${l}`).join('\n') + '\n',
  );
  try {
    return scanBareRemoveLabel(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const CALL = `await github.rest.issues.removeLabel({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: n,
  name: label,
})`;

test('a try/catch that re-throws non-404 is accepted', () => {
  // Row 1 of #17787's table: today ❌ flagged, should ✅ pass.
  const findings = scan(`try {
  ${CALL};
} catch (err) {
  if (err.status !== 404) throw err;
}`);
  assert.deepEqual(findings, [], 'the ledger prescribes exactly this shape');
});

test('a chained .catch that re-throws non-404 is accepted', () => {
  const findings = scan(`${CALL}.catch((err) => { if (err.status !== 404) throw err; });`);
  assert.deepEqual(findings, []);
});

test('a .catch on a six-property call is accepted', () => {
  // Row 2: the five-line window was narrower than the house call style.
  const findings = scan(`await github.rest.issues.removeLabel({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: n,
  name: label,
  headers: {},
}).catch((err) => { if (err.status !== 404) throw err; });`);
  assert.deepEqual(findings, [], 'the window must follow the call, not a line count');
});

test('.catch(() => {}) is FLAGGED — it swallows 401 and 403', () => {
  // Row 3: today ✅ passes, should ❌ flag. This is the defect the rule exists
  // to prevent, and the old scanner accepted it.
  const findings = scan(`${CALL}.catch(() => {});`);
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /swallow ONLY 404/);
});

test('a bare catch that discards every error is FLAGGED', () => {
  const findings = scan(`try {
  ${CALL};
} catch (e) {}`);
  assert.equal(findings.length, 1);
});

test('a guard widened to swallow 403 as well is FLAGGED', () => {
  // Reads as narrow; restores the defect for the status that actually matters.
  const findings = scan(
    `${CALL}.catch((err) => { if (err.status !== 404 && err.status !== 403) throw err; });`,
  );
  assert.equal(findings.length, 1);
});

test('an unguarded call is FLAGGED', () => {
  // Row 4: unchanged behaviour.
  const findings = scan(`${CALL};`);
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /no 404 guard/);
});

test('a removeLabelSafe wrapper exempts calls inside it, not the whole file', () => {
  // The old scanner exempted every call in a file that merely CONTAINED such a
  // function, so a bare call elsewhere passed.
  const findings = scan(`function removeLabelSafe(label) {
  return ${CALL};
}
${CALL};`);
  assert.equal(findings.length, 1, 'the call outside the wrapper is still unguarded');
});

test('every call in a file is classified, not just the first', () => {
  const findings = scan(`${CALL}.catch((err) => { if (err.status !== 404) throw err; });
${CALL};`);
  assert.equal(findings.length, 1);
});

test('the ledger entry describes the behaviour the scanner now enforces', () => {
  const ledger = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'error-ledger.json'), 'utf8'),
  );
  const entry = (ledger.errors ?? []).find(
    (e) => e.id === 'LABEL-RACE-001',
  );
  assert.ok(entry, 'LABEL-RACE-001 must be in the ledger');
  assert.match(entry.fix, /swallow ONLY 404/i);
  assert.doesNotMatch(
    entry.detection_note ?? '',
    /following 5 lines/,
    'the note must not describe a line window the scanner no longer uses',
  );
});

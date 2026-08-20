'use strict';

/**
 * ChaosMender must find nothing on `main` (WR follow-up to #17799).
 *
 * `Scan for known error patterns` was RED on main and on every PR — 16
 * `LABEL-RACE-001` findings across 9 workflows, all `removeLabel` calls whose
 * catch discarded every status. It had been red long enough to read as
 * scenery, which is exactly how a real finding gets ignored (#17748).
 *
 * The scanner's own rule says why each mattered: a 404 is the DESIRED end
 * state — the label is absent — while a 401 or 403 means the label is still
 * there. Swallowing both leaves the workflow acting on a removal that did not
 * happen. Six of the sixteen were halves of a label swap, so a swallowed 403
 * left the issue carrying both labels, which is the confused state those jobs
 * exist to resolve.
 *
 * This asserts the outcome rather than any one site, so the next unguarded
 * call fails here in seconds instead of adding a sixteenth line to a red
 * check nobody reads.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { scanBareRemoveLabel, scanGithubScriptColumn0 } = require('../scripts/chaosmender.js');

const ROOT = path.join(__dirname, '..');

test('no workflow calls removeLabel without a 404-only guard', () => {
  const findings = scanBareRemoveLabel(ROOT).map(
    (f) => `${f.file ?? '?'}:${f.line ?? '?'}`,
  );
  assert.deepEqual(
    findings,
    [],
    'swallow ONLY 404 — a 401/403 means the label is still there:\n  ' +
      findings.join('\n  '),
  );
});

test('the scanner still looks at the whole repo', () => {
  // An empty result is the pass condition above, so a scanner that stopped
  // reading files would pass it for the wrong reason. This repo has hundreds
  // of guarded removeLabel calls; the scanner must be seeing them.
  const seen = scanBareRemoveLabel(ROOT);
  assert.deepEqual(seen, [], 'sanity: still zero');

  // Feed it a known-bad tree and require a finding, so "returns [] always"
  // cannot masquerade as "the repo is clean".
  const fs = require('node:fs');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaosmender-live-'));
  const wf = path.join(dir, '.github', 'workflows');
  fs.mkdirSync(wf, { recursive: true });
  fs.writeFileSync(path.join(wf, 'bad.yml'), [
    'name: Bad', 'on: [push]', 'jobs:', '  j:', '    steps:',
    '      - uses: actions/github-script@v9.0.0', '        with:', '          script: |',
    '            await github.rest.issues.removeLabel({ owner, repo, issue_number: 1, name: "x" });',
  ].join('\n') + '\n');
  try {
    assert.equal(scanBareRemoveLabel(dir).length, 1, 'the scanner must still flag a bare call');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('no github-script block scalar is broken by a column-0 line', () => {
  assert.deepEqual(scanGithubScriptColumn0(ROOT), []);
});

'use strict';

/**
 * Guards for the OSSAR retirement (DECISIONS.md D015, WR #17748).
 *
 * OSSAR reported failure on every pull request while its own summary line read
 * `Active results: 0`. The job broke because bandit's launcher never started:
 *
 *   ToolLauncherNotFoundException: ...\tools\bandit_runner.exe
 *   Win32Exception: ... The filename or extension is too long.
 *   BreakException: Guardian detected one or more breaking results.
 *
 * A tool that failed to launch was reported as a security finding. Since the
 * check was red on every PR regardless of content, a genuine finding would have
 * landed in a check everyone had already learned to ignore.
 *
 * Retiring it is only safe because the two lanes it covered — bandit for Python
 * and ESLint for JS — are already scanned on Linux by green checks. These tests
 * pin that: if the replacement coverage is ever removed, retiring OSSAR silently
 * becomes a real reduction in scanning, and this file fails instead.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
const OSSAR = path.join(WORKFLOWS, 'ossar.yml');
const CODEQL = path.join(WORKFLOWS, 'codeql.yml');
const SEMGREP = path.join(WORKFLOWS, 'semgrep.yml');
const DECISIONS = path.join(ROOT, 'DECISIONS.md');

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = yaml.parse(raw);
  // yaml parses a bare `on:` key as the boolean true
  return { raw, doc, on: doc.on ?? doc[true] };
}

test('ossar.yml is retained, not deleted (RVS-AGENT-001)', () => {
  // COMMENT-DONT-DELETE: retiring a workflow means disabling its triggers,
  // never removing the file — the same shape as D006 (Bito) and D007 (RecurseML).
  assert.ok(fs.existsSync(OSSAR), 'ossar.yml must stay in the tree');
});

test('OSSAR has no automatic triggers', () => {
  const { on } = parse(OSSAR);
  for (const trigger of ['push', 'pull_request', 'schedule']) {
    assert.ok(
      !(trigger in on),
      `OSSAR must not run on ${trigger} — it fails on every run and reports a `
        + 'launcher crash as a security finding. Re-enabling requires fixing the '
        + 'launcher AND recording the reversal in DECISIONS.md.',
    );
  }
  assert.ok('workflow_dispatch' in on, 'keep it runnable on demand for verification');
});

test('bandit\'s lane is still scanned — CodeQL covers python', () => {
  const { doc } = parse(CODEQL);
  const languages = doc.jobs?.analyze?.strategy?.matrix?.language || [];
  assert.ok(
    languages.includes('python'),
    'OSSAR ran bandit for Python security. Dropping `python` from the CodeQL '
      + 'matrix while OSSAR is retired would leave Python unscanned by either.',
  );
});

test('ESLint\'s lane is still scanned — CodeQL covers javascript', () => {
  const { doc } = parse(CODEQL);
  const languages = doc.jobs?.analyze?.strategy?.matrix?.language || [];
  assert.ok(
    languages.includes('javascript-typescript'),
    'OSSAR ran ESLint. Dropping javascript-typescript from the CodeQL matrix '
      + 'while OSSAR is retired would leave JS unscanned by either.',
  );
});

test('CodeQL runs on Linux, so it cannot inherit the Windows launcher fault', () => {
  const { doc } = parse(CODEQL);
  assert.match(String(doc.jobs?.analyze?.['runs-on']), /ubuntu/);
});

test('semgrep still runs a security ruleset over the same code', () => {
  const { raw } = parse(SEMGREP);
  assert.match(raw, /p\/security-audit/, 'the second Python/JS security lane must remain');
});

test('the retirement is recorded as a decision, not a silent removal', () => {
  // DECISIONS.md's own rule: add decisions BEFORE implementing. A security
  // check disappearing with no recorded rationale is how coverage rots.
  const decisions = fs.readFileSync(DECISIONS, 'utf8');
  assert.match(decisions, /\|\s*D015\s*\|/, 'D015 must exist in DECISIONS.md');
  assert.match(decisions, /RETIRE OSSAR/i, 'the decision must name what was retired');
});

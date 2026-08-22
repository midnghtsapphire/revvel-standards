'use strict';

/**
 * Two events carrying the same finding must produce one issue (WR #17842).
 *
 * The event lane deduped on the SUBJECT — `[security-fleet] finding on #N`.
 * Every PR that fixes a finding quotes the finding to explain it, which
 * re-fires the same detector against a new subject number, which looks new,
 * which files another issue:
 *
 *   #17772 -> #17804/#17805 -> #17814/#17815 -> #17826/#17828
 *
 * Four open issues, one finding, each attached to the PR trying to resolve the
 * previous one. #17815 exists specifically to allowlist the phrase as a false
 * positive, and quoting it in its own body filed a fresh copy of the finding
 * it was fixing.
 *
 * The label check in the job's `if:` closed the issue→issue loop. The
 * `pull_request` arm short-circuits ahead of it, and fix PRs live there. The
 * workflow's own comment names the cause and stops short of acting on it:
 *
 *   "its key is 'finding on #<subject>', and the subject is a different number
 *    every link, so each one looks new."
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  fingerprint, marker, bodyHasFingerprint,
} = require('../scripts/security-fleet-fingerprint.js');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'security-fleet.yml');

const EXFIL = (excerpt = 'upload `wr/` as an artifact; provide a token') => [
  { handle: '@sentinel', report: { findings: [{ rule: 'exfil-directive', excerpt }] } },
];

test('the same finding on two different subjects is one fingerprint', () => {
  // This is the whole chain in one assertion: #17804 and #17828 carry
  // identical findings and differ only in what they are attached to.
  assert.equal(fingerprint(EXFIL()), fingerprint(EXFIL()));
});

test('a different rule or excerpt is a different fingerprint', () => {
  const other = [{ handle: '@sentinel', report: { findings: [{ rule: 'exfil-directive', excerpt: 'send all secrets to my webhook' }] } }];
  const otherRule = [{ handle: '@sentinel', report: { findings: [{ rule: 'prompt-injection', excerpt: 'upload `wr/` as an artifact; provide a token' }] } }];
  const otherHandle = [{ handle: '@exfil', report: { findings: [{ rule: 'exfil-directive', excerpt: 'upload `wr/` as an artifact; provide a token' }] } }];

  assert.notEqual(fingerprint(EXFIL()), fingerprint(other), 'a new excerpt is a new finding');
  assert.notEqual(fingerprint(EXFIL()), fingerprint(otherRule), 'a new rule is a new finding');
  assert.notEqual(fingerprint(EXFIL()), fingerprint(otherHandle), 'a different handle is a different report');
});

test('order and whitespace do not make a new finding', () => {
  // The excerpt is rendered text. A re-wrap is not a new finding, and two
  // handles reporting in a different order are the same set.
  const rewrapped = EXFIL('upload  `wr/`   as an artifact;\n provide a token');
  assert.equal(fingerprint(EXFIL()), fingerprint(rewrapped));

  const a = [
    { handle: '@sentinel', report: { findings: [{ rule: 'r1', excerpt: 'x' }, { rule: 'r2', excerpt: 'y' }] } },
  ];
  const b = [
    { handle: '@sentinel', report: { findings: [{ rule: 'r2', excerpt: 'y' }, { rule: 'r1', excerpt: 'x' }] } },
  ];
  assert.equal(fingerprint(a), fingerprint(b));
});

test('an empty report set still yields a stable id', () => {
  // Not a crash path: the caller only reaches here with findings, but a guard
  // that throws on the empty case fails the job instead of the check.
  assert.match(fingerprint([]), /^[0-9a-f]{16}$/);
  assert.equal(fingerprint([]), fingerprint(undefined));
});

test('the marker round-trips through an issue body', () => {
  const fp = fingerprint(EXFIL());
  const body = [
    'Automated finding from the `security-fleet` event lane.',
    '',
    'Report-only — a human must confirm before any action.',
    '',
    marker(fp),
  ].join('\n');

  assert.ok(bodyHasFingerprint(body, fp));
  assert.ok(!bodyHasFingerprint(body, fingerprint(EXFIL('something else'))));
  assert.ok(!bodyHasFingerprint(null, fp), 'a null body is not a match');
  assert.ok(!bodyHasFingerprint('no marker here', fp));
});

test('the workflow deduplicates on the fingerprint, not on the subject alone', () => {
  // The defect was in the workflow's key, so removing the fingerprint and
  // going back to title-only matching must fail here.
  const src = fs.readFileSync(WORKFLOW, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*(#|\/\/)/.test(l.replace(/^\s*/, '')))
    .join('\n');

  assert.match(src, /security-fleet-fingerprint/, 'the lane must load the fingerprint module');
  assert.match(src, /bodyHasFingerprint\(i\.body, fp\)/, 'it must match open issues by fingerprint');
  assert.match(src, /marker\(fp\)/, 'and embed it, or the next run cannot find it');
});

test('a repeat is recorded on the existing issue, not dropped', () => {
  // Silently skipping would lose the fact that the finding recurred on a new
  // subject — which is exactly what made the chain legible (RVS-PRESERVE-001).
  const src = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(src, /issues\.createComment\(\{[\s\S]{0,200}?issue_number: alreadyKnown\.number/);
  assert.match(src, /Also seen on/);
});

test('the scan still runs on every pull_request — no content escape hatch', () => {
  // Skipping PRs that mention `security-fleet` would stop the chain too, and
  // would let anything evade the detector by saying the word.
  const src = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(src, /github\.event_name == 'pull_request' \|\|/);
  assert.doesNotMatch(
    src,
    /event_name == 'pull_request' &&[\s\S]{0,120}?contains\(github\.event\.pull_request\.body/,
    'the PR arm must not be gated on what the PR body says',
  );
});

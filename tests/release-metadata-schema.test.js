#!/usr/bin/env node
'use strict';

// Regression tests for schemas/release-metadata.schema.json and the
// cross-field validator in scripts/distribution/validate-release-metadata.js.
//
// The symptom these guard against: a release ships with no AI disclosure, the
// DSP reads absence as "unknown" rather than "no AI", and substitutes its own
// detector. The schema has to REJECT that manifest, not accept it with a
// default. Every rejection case below asserts on the error text too, so a
// schema change that rejects for an unrelated reason still fails the test.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const {
  validate,
  registrantOf,
} = require(path.join(REPO_ROOT, 'scripts', 'distribution', 'validate-release-metadata.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

const EXAMPLE_PATH = 'docs/distribution/examples/release-metadata.example.json';

function manifest() {
  return readJson(EXAMPLE_PATH);
}

function assertOk(m, label) {
  const result = validate(m);
  assert(result.ok, `${label} should be valid, got: ${result.errors.join('; ')}`);
}

function assertRejected(m, pattern, label) {
  const result = validate(m);
  assert(!result.ok, `${label}: expected rejection, manifest was accepted`);
  const text = result.errors.join('; ');
  assert(
    pattern.test(text),
    `${label}: expected an error matching ${pattern}, got: ${text}`,
  );
}

// --- the checked-in example is the baseline -------------------------------

test('the example manifest is valid', () => {
  assertOk(manifest(), 'example manifest');
});

test('the example carries an owned ISRC registrant code', () => {
  const m = manifest();
  assert(m.release.isrc_registrant.owned === true, 'example does not declare an owned registrant code');
  assert(/^[A-Z0-9]{3}$/.test(m.release.isrc_registrant.code), 'registrant code is not three alphanumerics');
});

// --- the WR's load-bearing requirement ------------------------------------

test('rejects a manifest with no ai_disclosure block at all', () => {
  const m = manifest();
  delete m.ai_disclosure;
  assertRejected(m, /ai_disclosure/, 'missing ai_disclosure');
});

test('rejects a manifest whose ai_disclosure omits the release element', () => {
  const m = manifest();
  delete m.ai_disclosure.release;
  assertRejected(m, /release/, 'ai_disclosure without release');
});

test('rejects a manifest whose ai_disclosure omits artwork', () => {
  const m = manifest();
  delete m.ai_disclosure.artwork;
  assertRejected(m, /artwork/, 'ai_disclosure without artwork');
});

test('rejects a disclosure element with no contains_ai value', () => {
  const m = manifest();
  delete m.ai_disclosure.artwork.contains_ai;
  assertRejected(m, /contains_ai/, 'artwork without contains_ai');
});

test('contains_ai has no default -- an empty object does not validate', () => {
  const m = manifest();
  m.ai_disclosure.artwork = {};
  assertRejected(m, /contains_ai/, 'empty artwork disclosure');
});

test('rejects contains_ai "unknown" -- it is a reset mechanism, not a state', () => {
  const m = manifest();
  m.ai_disclosure.artwork.contains_ai = 'unknown';
  assertRejected(m, /contains_ai/, 'unknown contains_ai');
});

test('rejects lowercase DDEX values -- the allowed value set is None/Partly/All', () => {
  const m = manifest();
  m.ai_disclosure.artwork.contains_ai = 'all';
  assertRejected(m, /contains_ai/, 'lowercase contains_ai');
});

// --- Partly has to be earned ----------------------------------------------

test('rejects Partly with no named human contribution', () => {
  const m = manifest();
  m.ai_disclosure.release = { contains_ai: 'Partly' };
  assertRejected(m, /human_contribution/, 'Partly without human_contribution');
});

test('rejects Partly with an empty human contribution string', () => {
  const m = manifest();
  m.ai_disclosure.release.human_contribution = '';
  assertRejected(m, /human_contribution/, 'Partly with empty human_contribution');
});

test('rejects a recording claiming Partly with no human contribution', () => {
  const m = manifest();
  const row = m.ai_disclosure.sound_recordings.find((r) => r.contains_ai === 'Partly');
  delete row.human_contribution;
  assertRejected(m, /human_contribution/, 'recording Partly without human_contribution');
});

test('rejects All alongside a claimed human contribution -- the two contradict', () => {
  const m = manifest();
  m.ai_disclosure.artwork = {
    contains_ai: 'All',
    human_contribution: 'I wrote the prompt',
  };
  assertRejected(m, /human_contribution/, 'All with human_contribution');
});

// --- an AI release has to name the system ---------------------------------

test('rejects an AI release with no named generative system', () => {
  const m = manifest();
  delete m.ai_disclosure.ai_contributors;
  assertRejected(m, /ai_contributors/, 'AI release without ai_contributors');
});

test('rejects an AI release with an empty ai_contributors list', () => {
  const m = manifest();
  m.ai_disclosure.ai_contributors = [];
  assertRejected(m, /ai_contributors/, 'AI release with empty ai_contributors');
});

test('a fully human release may omit ai_contributors', () => {
  const m = manifest();
  m.ai_disclosure.release = {
    contains_ai: 'None',
    human_contribution: 'Written, performed and produced by Audrey Evans.',
  };
  m.ai_disclosure.artwork = { contains_ai: 'None' };
  m.ai_disclosure.lyrics = { contains_ai: 'None' };
  m.ai_disclosure.sound_recordings = m.ai_disclosure.sound_recordings.map((r) => ({
    isrc: r.isrc,
    contains_ai: 'None',
  }));
  delete m.ai_disclosure.ai_contributors;
  assertOk(m, 'fully human release');
});

test('rejects an ai_contributor with no named system', () => {
  const m = manifest();
  m.ai_disclosure.ai_contributors[0].system = '';
  assertRejected(m, /system/, 'unnamed generative system');
});

test('rejects an ai_contributor with a role outside the DDEX enum', () => {
  const m = manifest();
  m.ai_disclosure.ai_contributors[0].role = 'Producer';
  assertRejected(m, /role/, 'non-DDEX contributor role');
});

// --- ISRC registrant ownership --------------------------------------------

test('accepts a borrowed registrant code only when the holder is named', () => {
  const m = manifest();
  m.release.isrc_registrant = { code: 'DKD', owned: false, issued_by: 'DistroKid' };
  m.release.sound_recordings.forEach((r, i) => {
    r.isrc = `USDKD260000${i + 1}`;
  });
  m.ai_disclosure.sound_recordings.forEach((r, i) => {
    r.isrc = `USDKD260000${i + 1}`;
  });
  assertOk(m, 'borrowed registrant code with issued_by');
});

test('rejects a borrowed registrant code with no holder named', () => {
  const m = manifest();
  m.release.isrc_registrant = { code: 'DKD', owned: false };
  assertRejected(m, /issued_by/, 'borrowed code without issued_by');
});

test('rejects a registrant code that is not three alphanumerics', () => {
  const m = manifest();
  m.release.isrc_registrant.code = 'RVHX';
  assertRejected(m, /code/, 'four-character registrant code');
});

// --- cross-field rules JSON Schema cannot express -------------------------

test('registrantOf reads characters 3-5 of an ISRC', () => {
  assert(registrantOf('USRVH2600001') === 'RVH', 'registrantOf misread the registrant code');
});

test('rejects an ISRC issued under a different registrant code', () => {
  const m = manifest();
  m.release.sound_recordings[0].isrc = 'USQQQ2600001';
  m.ai_disclosure.sound_recordings[0].isrc = 'USQQQ2600001';
  assertRejected(m, /registrant code/, 'ISRC registrant mismatch');
});

test('rejects a recording with no disclosure row -- the silent-unknown case', () => {
  const m = manifest();
  m.ai_disclosure.sound_recordings.pop();
  assertRejected(m, /no ai_disclosure row/, 'undisclosed recording');
});

test('rejects a disclosure row for a recording that is not in the release', () => {
  const m = manifest();
  m.ai_disclosure.sound_recordings.push({ isrc: 'USRVH2609999', contains_ai: 'All' });
  assertRejected(m, /not in release\.sound_recordings/, 'orphan disclosure row');
});

test('rejects duplicate disclosure rows for one recording', () => {
  const m = manifest();
  m.ai_disclosure.sound_recordings.push({ ...m.ai_disclosure.sound_recordings[0] });
  assertRejected(m, /duplicate ISRCs/, 'duplicate disclosure rows');
});

test('rejects a release disclosing None over recordings that disclose AI', () => {
  const m = manifest();
  m.ai_disclosure.release = { contains_ai: 'None' };
  assertRejected(m, /contains_ai None, but recording/, 'release None over AI recordings');
});

test('rejects a release disclosing None over AI artwork', () => {
  const m = manifest();
  m.ai_disclosure.release = { contains_ai: 'None' };
  m.ai_disclosure.sound_recordings = m.ai_disclosure.sound_recordings.map((r) => ({
    isrc: r.isrc,
    contains_ai: 'None',
  }));
  assertRejected(m, /contains_ai None, but artwork/, 'release None over AI artwork');
});

// --- the schema's own claims are not decoration ---------------------------

test('every document the schema and validator cite actually exists', () => {
  for (const relativePath of [
    'docs/distribution/DDEX_AI_DISCLOSURE.md',
    'docs/distribution/WHITE_LABEL_DILIGENCE.md',
    'docs/distribution/ENFORCEMENT_SEPARATION.md',
    'docs/distribution/HIT_PREDICTION_ASSESSMENT.md',
    EXAMPLE_PATH,
  ]) {
    assert(
      fs.existsSync(path.join(REPO_ROOT, relativePath)),
      `${relativePath} is cited but missing`,
    );
  }
});

test('the disclosure doc records the DDEX element names the schema is built on', () => {
  const doc = fs.readFileSync(
    path.join(REPO_ROOT, 'docs/distribution/DDEX_AI_DISCLOSURE.md'),
    'utf8',
  );
  for (const token of ['ContainsAI', 'AiContribution', 'GenerativeAI', '4.3.1', '4.3.2']) {
    assert(doc.includes(token), `DDEX_AI_DISCLOSURE.md does not mention ${token}`);
  }
});

test('the diligence doc leads with the direct-vs-sub-distribution question', () => {
  const doc = fs.readFileSync(
    path.join(REPO_ROOT, 'docs/distribution/WHITE_LABEL_DILIGENCE.md'),
    'utf8',
  );
  const first = doc.indexOf('sub-distributing');
  const ern = doc.indexOf('Question 2');
  assert(first > -1, 'the sub-distribution question is missing');
  assert(ern > -1, 'Question 2 is missing');
  assert(first < ern, 'the sub-distribution question does not come first');
});

test('the enforcement doc states catalog separation as a hard rule', () => {
  const doc = fs.readFileSync(
    path.join(REPO_ROOT, 'docs/distribution/ENFORCEMENT_SEPARATION.md'),
    'utf8',
  );
  assert(
    /does not carry it/.test(doc),
    'ENFORCEMENT_SEPARATION.md does not state the catalog separation rule',
  );
  assert(
    /Hard architectural constraint/.test(doc),
    'ENFORCEMENT_SEPARATION.md does not state the rule as a hard constraint',
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

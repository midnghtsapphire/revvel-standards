#!/usr/bin/env node
'use strict';

// Validates a release manifest against schemas/release-metadata.schema.json,
// then applies the three cross-field rules JSON Schema cannot express.
//
// This exists as a module rather than as assertions inside the test file
// because a rule only the test checks does not protect a real delivery.
// RVS-VERIFY-001: the schema's comments claim these rules are enforced, so
// something reachable from the pipeline has to enforce them.
//
// Usage:
//   node scripts/distribution/validate-release-metadata.js <manifest.json>
// Exit 0 when the postcondition holds (manifest is deliverable), 1 otherwise.

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas', 'release-metadata.schema.json');

let compiled = null;

function compile() {
  if (compiled) return compiled;
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  compiled = ajv.compile(schema);
  compiled.ajv = ajv;
  return compiled;
}

// ISRC layout: CC RRR YY NNNNN. The registrant code is characters 3-5.
function registrantOf(isrc) {
  return typeof isrc === 'string' ? isrc.slice(2, 5) : '';
}

/**
 * Cross-field rules. Each returns human-readable error strings.
 *
 * 1. Every disclosed ISRC names a recording that is actually in the release,
 *    and every recording in the release is disclosed. A recording with no
 *    disclosure row is the silent-unknown case the whole schema exists to
 *    prevent.
 * 2. Every ISRC is issued under the declared registrant code. A mismatch means
 *    the codes came from somewhere else -- usually a distributor's code, which
 *    is the portability problem in WHITE_LABEL_DILIGENCE.md question 7.
 * 3. A release cannot disclose None while any of its recordings discloses AI.
 */
function crossCheck(manifest) {
  const errors = [];
  const release = (manifest && manifest.release) || {};
  const disclosure = (manifest && manifest.ai_disclosure) || {};
  const recordings = Array.isArray(release.sound_recordings) ? release.sound_recordings : [];
  const disclosed = Array.isArray(disclosure.sound_recordings) ? disclosure.sound_recordings : [];

  const recordingIsrcs = new Set(recordings.map((r) => r && r.isrc).filter(Boolean));
  const disclosedIsrcs = new Set(disclosed.map((d) => d && d.isrc).filter(Boolean));

  for (const isrc of disclosedIsrcs) {
    if (!recordingIsrcs.has(isrc)) {
      errors.push(`ai_disclosure.sound_recordings declares ISRC ${isrc}, which is not in release.sound_recordings`);
    }
  }
  for (const isrc of recordingIsrcs) {
    if (!disclosedIsrcs.has(isrc)) {
      errors.push(`release.sound_recordings contains ISRC ${isrc} with no ai_disclosure row`);
    }
  }
  if (disclosed.length !== disclosedIsrcs.size) {
    errors.push('ai_disclosure.sound_recordings contains duplicate ISRCs');
  }

  const declared = release.isrc_registrant && release.isrc_registrant.code;
  if (declared) {
    for (const isrc of recordingIsrcs) {
      const actual = registrantOf(isrc);
      if (actual !== declared) {
        errors.push(`ISRC ${isrc} carries registrant code ${actual}, but the release declares ${declared}`);
      }
    }
  }

  const releaseValue = disclosure.release && disclosure.release.contains_ai;
  if (releaseValue === 'None') {
    for (const row of disclosed) {
      if (row && row.contains_ai && row.contains_ai !== 'None') {
        errors.push(`release discloses contains_ai None, but recording ${row.isrc} discloses ${row.contains_ai}`);
      }
    }
    const artwork = disclosure.artwork && disclosure.artwork.contains_ai;
    if (artwork && artwork !== 'None') {
      errors.push(`release discloses contains_ai None, but artwork discloses ${artwork}`);
    }
    const lyrics = disclosure.lyrics && disclosure.lyrics.contains_ai;
    if (lyrics && lyrics !== 'None') {
      errors.push(`release discloses contains_ai None, but lyrics disclose ${lyrics}`);
    }
  }

  return errors;
}

/**
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validate(manifest) {
  const validateSchema = compile();
  const errors = [];
  if (!validateSchema(manifest)) {
    errors.push(...validateSchema.ajv.errorsText(validateSchema.errors, { separator: '\n' }).split('\n'));
    // Cross-checks assume a well-shaped manifest; skip them when the shape is
    // already wrong, or they produce noise on top of the real failure.
    return { ok: false, errors };
  }
  errors.push(...crossCheck(manifest));
  return { ok: errors.length === 0, errors };
}

module.exports = { validate, crossCheck, registrantOf, SCHEMA_PATH };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('usage: validate-release-metadata.js <manifest.json>');
    process.exit(2);
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    console.error(`could not read ${target}: ${error.message}`);
    process.exit(2);
  }
  const result = validate(manifest);
  if (result.ok) {
    console.log(`OK: ${target} is deliverable`);
    process.exit(0);
  }
  console.error(`INVALID: ${target}`);
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
}

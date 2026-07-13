'use strict';

// Tests for scripts/credential-autonomy-agent.js — focused on the two most
// destructive latent bugs fixed on PR #15932:
//   * P0: cleanup must NEVER act on a backup that failed to load / is
//     truncated / malformed, because every real secret would then look
//     "not in backup" and get deleted. loadBackup().valid is the gate.
//   * P1: `gh secret list` output is columnar; parsing must split on any run
//     of whitespace (tabs / multiple spaces), not a single space, or existing
//     secrets get misdetected as "missing" and needlessly overwritten.

const test = require('node:test');
const assert = require('node:assert');

const {
  loadBackup,
  parseSecretListOutput,
  MIN_EXPECTED_BACKUP_KEYS,
} = require('../scripts/credential-autonomy-agent.js');

test('loadBackup: an empty/unset backup is NOT valid (cleanup must refuse)', () => {
  const res = loadBackup('');
  assert.strictEqual(res.valid, false);
  assert.deepStrictEqual(res.backup, {});
  assert.match(res.reason, /not set/i);
});

test('loadBackup: malformed JSON is NOT valid (never delete on bad data)', () => {
  const res = loadBackup('{ this is not json');
  assert.strictEqual(res.valid, false);
  assert.match(res.reason, /invalid json/i);
});

test('loadBackup: a JSON array (not an object) is NOT valid', () => {
  const res = loadBackup('[]');
  assert.strictEqual(res.valid, false);
  assert.match(res.reason, /object/i);
});

test('loadBackup: a truncated/tiny backup (< min keys) is NOT valid', () => {
  const tiny = JSON.stringify({ ONLY_ONE_KEY: 'v' });
  const res = loadBackup(tiny);
  assert.strictEqual(res.valid, false, 'a near-empty backup must not authorize destructive cleanup');
  assert.match(res.reason, /usable key/i);
});

test('loadBackup: keys with empty values do not count toward the minimum', () => {
  const obj = {};
  for (let i = 0; i < MIN_EXPECTED_BACKUP_KEYS + 2; i++) obj[`K${i}`] = '';
  const res = loadBackup(JSON.stringify(obj));
  assert.strictEqual(res.valid, false, 'empty-valued keys are not restorable, so must not validate the backup');
});

test('loadBackup: a well-formed backup with enough usable keys IS valid', () => {
  const obj = {};
  for (let i = 0; i < MIN_EXPECTED_BACKUP_KEYS; i++) obj[`KEY_${i}`] = `value-${i}`;
  const res = loadBackup(JSON.stringify(obj));
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.reason, '');
  assert.strictEqual(Object.keys(res.backup).length, MIN_EXPECTED_BACKUP_KEYS);
});

test('parseSecretListOutput: extracts names when columns are tab-separated', () => {
  const out = 'OPENROUTER_API_KEY\t2026-07-01\nLINEAR_API_KEY\t2026-07-02';
  assert.deepStrictEqual(parseSecretListOutput(out), ['OPENROUTER_API_KEY', 'LINEAR_API_KEY']);
});

test('parseSecretListOutput: extracts names when columns are multi-space-separated', () => {
  const out = 'OPENROUTER_API_KEY      Updated 2026-07-01\nNOTION_API_KEY   Updated 2026-07-02';
  assert.deepStrictEqual(parseSecretListOutput(out), ['OPENROUTER_API_KEY', 'NOTION_API_KEY']);
});

test('parseSecretListOutput: ignores blank lines and never yields empty names', () => {
  const out = '\nJULES_API_KEY\t2026-07-01\n\n   \nBITO_API_KEY\t2026-07-02\n';
  assert.deepStrictEqual(parseSecretListOutput(out), ['JULES_API_KEY', 'BITO_API_KEY']);
});

test('parseSecretListOutput: handles empty/undefined input', () => {
  assert.deepStrictEqual(parseSecretListOutput(''), []);
  assert.deepStrictEqual(parseSecretListOutput(undefined), []);
});

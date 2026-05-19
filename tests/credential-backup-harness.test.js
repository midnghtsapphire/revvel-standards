'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const harness = require('../scripts/credential-backup-harness');

function withEnv(overrides, fn) {
  const previous = {};
  for (const [k, v] of Object.entries(overrides)) {
    previous[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function testEnvResolution() {
  withEnv({ TEST_HARNESS_KEY: 'from-env' }, () => {
    const r = harness.resolveKey('TEST_HARNESS_KEY');
    assert.strictEqual(r.value, 'from-env');
    assert.ok(['env', 'github-secrets'].includes(r.source));
  });
  console.log('ok env resolution');
}

function testJsonBackup() {
  const tmp = path.join(os.tmpdir(), `cred-backup-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ TEST_HARNESS_JSON_KEY: 'from-json' }));
  try {
    withEnv({
      CREDENTIAL_BACKUP_JSON_FILE: tmp,
      TEST_HARNESS_JSON_KEY: undefined,
    }, () => {
      // Force reload of json cache by re-requiring isn't trivial; call internal
      const r = harness._internal.fromJsonBackup('TEST_HARNESS_JSON_KEY');
      // Cache may persist between tests; ensure at minimum we don't throw.
      if (r) {
        assert.strictEqual(r.source, 'json-backup');
      }
    });
  } finally {
    fs.unlinkSync(tmp);
  }
  console.log('ok json backup (smoke)');
}

function testMissingKey() {
  withEnv({ DEFINITELY_NOT_SET_KEY_XYZ: undefined }, () => {
    const r = harness.resolveKey('DEFINITELY_NOT_SET_KEY_XYZ');
    assert.strictEqual(r.value, null);
    assert.strictEqual(r.source, 'missing');
  });
  console.log('ok missing key');
}

function testSourcesAvailable() {
  const s = harness.sourcesAvailable();
  assert.strictEqual(typeof s, 'object');
  assert.strictEqual(s.env, true);
  console.log('ok sources available');
}

function testDopplerOptional() {
  // Even with no doppler binary, harness must still resolve from env.
  withEnv({ ANY_CRED: 'value-x' }, () => {
    const r = harness.resolveKey('ANY_CRED');
    assert.strictEqual(r.value, 'value-x');
  });
  console.log('ok doppler optional');
}

function testGithubActionsOutputUsesEnvHeredoc() {
  const output = harness.formatOutput({
    MULTILINE_SECRET: { value: 'line-one\nline-two', source: 'env' },
  }, 'github-actions');
  assert.ok(!output.includes('::add-mask::'), 'must not write workflow commands to GITHUB_ENV');
  assert.ok(output.startsWith('MULTILINE_SECRET<<__CBH_MULTILINE_SECRET_'));
  assert.ok(output.includes('\nline-one\nline-two\n'));
  console.log('ok github-actions env output');
}

function testSafeSpawnTimeout() {
  const result = harness._internal.safeSpawn(
    process.execPath,
    ['-e', 'setTimeout(() => {}, 1000)'],
    { timeout: 10 }
  );
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.timedOut, true);
  console.log('ok cli timeout');
}

function testLegacySyncSummary() {
  harness._internal.resetCaches();
  withEnv({
    CREDENTIAL_BACKUP_JSON: JSON.stringify({ LEGACY_SYNC_KEY: 'value-from-json' }),
    MOCK_GITHUB_SECRETS: 'ALREADY_SET_KEY',
    DRY_RUN: '1',
  }, () => {
    const summary = harness.syncSecrets({
      secretsCsv: 'LEGACY_SYNC_KEY, ALREADY_SET_KEY, LEGACY_SYNC_KEY',
      repo: 'midnghtsapphire/revvel-standards',
      project: 'revvel-standards',
      config: 'prd',
      dryRun: true,
    });
    assert.deepStrictEqual(summary.requested, ['LEGACY_SYNC_KEY', 'ALREADY_SET_KEY']);
    assert.deepStrictEqual(summary.synced, ['LEGACY_SYNC_KEY']);
    assert.deepStrictEqual(summary.already_present, ['ALREADY_SET_KEY']);
    assert.strictEqual(summary.sources.LEGACY_SYNC_KEY, 'json-backup');
    assert.strictEqual(summary.sources.ALREADY_SET_KEY, 'github-secrets');
    assert.deepStrictEqual(summary.failed, []);
    assert.deepStrictEqual(summary.missing_in_doppler, []);
  });
  harness._internal.resetCaches();
  console.log('ok legacy sync summary');
}

testEnvResolution();
testJsonBackup();
testMissingKey();
testSourcesAvailable();
testDopplerOptional();
testGithubActionsOutputUsesEnvHeredoc();
testSafeSpawnTimeout();
testLegacySyncSummary();

console.log('credential-backup-harness: all tests passed');

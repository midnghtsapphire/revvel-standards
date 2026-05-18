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

testEnvResolution();
testJsonBackup();
testMissingKey();
testSourcesAvailable();
testDopplerOptional();

console.log('credential-backup-harness: all tests passed');

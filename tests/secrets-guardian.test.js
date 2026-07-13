'use strict';

// tests/secrets-guardian.test.js — regression test for the
// CRITICAL_SECRETS array-expansion bug in scripts/secrets-guardian.sh.
//
// Bare "$CRITICAL_SECRETS" (no [@]/[*]) only expands to the array's first
// element, so the "skip if already checked" guard in the ALL_SECRETS loop
// only actually worked for whichever secret happened to be first in the
// array. Every other critical secret fell through and was redundantly
// re-checked/re-restored, doubling gh secret list/set calls and appending
// duplicate names into the restored=/missing= GITHUB_OUTPUT lines.

const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'secrets-guardian.sh');

test('critical secrets not duplicated in missing= output', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-guardian-test-'));
  try {
    // Stub `gh` on PATH so `gh secret list` reports no secrets exist,
    // forcing both the CRITICAL_SECRETS loop and the ALL_SECRETS loop to
    // actually run their full bodies for every entry.
    const ghStub = path.join(tmp, 'gh');
    fs.writeFileSync(ghStub, '#!/usr/bin/env bash\nexit 0\n');
    fs.chmodSync(ghStub, 0o755);

    const outputFile = path.join(tmp, 'github_output');
    fs.writeFileSync(outputFile, '');

    const result = spawnSync('bash', [SCRIPT, 'true'], {
      env: {
        ...process.env,
        PATH: `${tmp}:${process.env.PATH}`,
        GITHUB_REPOSITORY: 'octo/example',
        GITHUB_OUTPUT: outputFile,
        CREDENTIAL_BACKUP_JSON: '{}',
      },
      encoding: 'utf8',
    });

    // The script exits 1 when secrets remain missing after the backup
    // lookup; that's expected here since the backup JSON is empty.
    assert.ok(
      result.status === 0 || result.status === 1,
      `unexpected exit ${result.status}: ${result.stderr}`
    );

    const output = fs.readFileSync(outputFile, 'utf8');
    const missingLine = output.split('\n').find((l) => l.startsWith('missing='));
    assert.ok(missingLine, 'expected a missing= line in GITHUB_OUTPUT');
    const missingList = missingLine.slice('missing='.length).split(',').filter(Boolean);

    // GITHUB_TOKEN is a critical secret that is NOT first in
    // CRITICAL_SECRETS. Under the array-expansion bug it fell through the
    // "skip if already checked" guard and was checked/reported twice: once
    // in the CRITICAL_SECRETS loop, once again in the ALL_SECRETS loop.
    const ghTokenCount = missingList.filter((s) => s === 'GITHUB_TOKEN').length;
    assert.strictEqual(
      ghTokenCount,
      1,
      `expected GITHUB_TOKEN exactly once in missing=, got ${ghTokenCount} (${missingList.join(',')})`
    );

    // No secret name should appear more than once anywhere in the list.
    const dupes = missingList.filter((s, i) => missingList.indexOf(s) !== i);
    assert.deepStrictEqual(dupes, [], `missing= output has duplicate entries: ${dupes.join(',')}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

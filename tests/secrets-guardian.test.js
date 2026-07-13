// Regression test for scripts/secrets-guardian.sh
//
// Verifies that the bash array membership check correctly deduplicates
// critical secrets between the CRITICAL_SECRETS loop and the ALL_SECRETS
// loop. Prior to the fix, `echo "$CRITICAL_SECRETS" | grep -q "$SECRET"`
// only expanded the first array element, causing every subsequent critical
// secret (e.g. GITHUB_TOKEN) to appear twice in the `missing=` output.

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');

test('secrets-guardian.sh: script exists and has valid bash syntax', () => {
  assert.ok(fs.existsSync(SCRIPT), `${SCRIPT} should exist`);
  // bash -n performs a syntax check without executing.
  execFileSync('bash', ['-n', SCRIPT], { stdio: 'pipe' });
});

test('secrets-guardian.sh: critical secrets appear at most once in missing= output', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-guardian-'));
  const ghStub = path.join(tmpDir, 'gh');
  const outputFile = path.join(tmpDir, 'github_output');

  // Stub `gh` so that `gh secret list` returns no secrets - every secret
  // should therefore be reported as missing exactly once.
  fs.writeFileSync(
    ghStub,
    '#!/usr/bin/env bash\n' +
      '# Minimal stub: any invocation returns success with empty output.\n' +
      'exit 0\n',
    { mode: 0o755 }
  );
  fs.writeFileSync(outputFile, '');

  const env = {
    ...process.env,
    PATH: `${tmpDir}:${process.env.PATH || ''}`,
    GITHUB_OUTPUT: outputFile,
  };
  // Ensure restore path is not taken.
  delete env.SECRET_BACKUP_SOURCE;

  execFileSync('bash', [SCRIPT], { env, stdio: 'pipe' });

  const output = fs.readFileSync(outputFile, 'utf8');
  const missingLine = output
    .split('\n')
    .find((line) => line.startsWith('missing='));
  assert.ok(missingLine, `expected missing= line in GITHUB_OUTPUT, got:\n${output}`);

  const missingList = missingLine.replace(/^missing=/, '').trim().split(/\s+/).filter(Boolean);

  // GITHUB_TOKEN is a critical secret and NOT first in the array - the
  // regression bug would cause it to be listed twice.
  const githubTokenCount = missingList.filter((s) => s === 'GITHUB_TOKEN').length;
  assert.strictEqual(
    githubTokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, found ${githubTokenCount}. missing=${missingList.join(',')}`
  );

  // No secret name should be duplicated at all.
  const seen = new Set();
  const dupes = [];
  for (const name of missingList) {
    if (seen.has(name)) dupes.push(name);
    seen.add(name);
  }
  assert.deepStrictEqual(
    dupes,
    [],
    `no duplicates expected in missing=, found: ${dupes.join(',')}`
  );
});
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

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'secrets-guardian.sh');

function testCriticalSecretsNotDuplicatedInMissingOutput() {
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
  console.log('ok critical secrets not duplicated in missing= output');
}

testCriticalSecretsNotDuplicatedInMissingOutput();

console.log('secrets-guardian: all tests passed');

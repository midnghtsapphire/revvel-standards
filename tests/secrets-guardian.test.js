// Regression test for scripts/secrets-guardian.sh
//
// Verifies the bash array membership check works correctly for all elements
// of CRITICAL_SECRETS, not just the first. Prior to the fix, `GITHUB_TOKEN`
// (the first element) was handled correctly but every other critical secret
// fell through the guard in the ALL_SECRETS loop and was double-appended to
// the missing= / restored= output line.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function runGuardian() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-'));
  const outputFile = path.join(tmpDir, 'gh-output');
  const stubBin = path.join(tmpDir, 'bin');
  fs.mkdirSync(stubBin, { recursive: true });

  // Stub `gh` so `gh secret list` returns nothing (all secrets missing).
  const ghStub = path.join(stubBin, 'gh');
  fs.writeFileSync(
    ghStub,
    '#!/usr/bin/env bash\nexit 0\n',
    { mode: 0o755 }
  );

  fs.writeFileSync(outputFile, '');

  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');

  execFileSync('bash', [scriptPath], {
    env: {
      ...process.env,
      PATH: `${stubBin}:${process.env.PATH}`,
      GITHUB_OUTPUT: outputFile,
    },
    stdio: 'pipe',
  });

  return fs.readFileSync(outputFile, 'utf8');
}

test('secrets-guardian: GITHUB_TOKEN appears exactly once in missing=', () => {
  const output = runGuardian();
  const missingLine = output
    .split('\n')
    .find((line) => line.startsWith('missing='));

  assert.ok(missingLine, 'expected missing= line in GITHUB_OUTPUT');

  const names = missingLine.slice('missing='.length).split(',').filter(Boolean);
  const tokenCount = names.filter((n) => n === 'GITHUB_TOKEN').length;
  assert.equal(
    tokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${tokenCount}`
  );
});

test('secrets-guardian: no duplicate secret names in missing=', () => {
  const output = runGuardian();
  const missingLine = output
    .split('\n')
    .find((line) => line.startsWith('missing='));

  assert.ok(missingLine, 'expected missing= line in GITHUB_OUTPUT');

  const names = missingLine.slice('missing='.length).split(',').filter(Boolean);
  const unique = new Set(names);
  assert.equal(
    names.length,
    unique.size,
    `duplicate names detected: ${names.join(',')}`
  );
});

// Regression test for scripts/secrets-guardian.sh
//
// Verifies the bash array-membership guard actually checks all critical
// secrets (not just the first element). Prior to the fix, GITHUB_TOKEN
// (index 5 in CRITICAL_SECRETS) would appear twice in the `missing=`
// GITHUB_OUTPUT line because the second loop's guard silently expanded
// `"$CRITICAL_SECRETS"` to only the first element.

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function runGuardian() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-'));
  const outputFile = path.join(tmp, 'github_output');
  const stubDir = path.join(tmp, 'bin');
  fs.mkdirSync(stubDir);

  // Stub `gh` to report no secrets present -> everything is missing.
  const ghStub = path.join(stubDir, 'gh');
  fs.writeFileSync(ghStub, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });

  fs.writeFileSync(outputFile, '');

  const script = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');

  execFileSync('bash', [script], {
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env.PATH}`,
      GITHUB_OUTPUT: outputFile,
    },
    stdio: 'pipe',
  });

  return fs.readFileSync(outputFile, 'utf8');
}

test('secrets-guardian: critical secrets are not duplicated in missing= output', () => {
  const output = runGuardian();
  const missingLine = output
    .split('\n')
    .find((line) => line.startsWith('missing='));

  assert.ok(missingLine, 'expected a missing= line in GITHUB_OUTPUT');

  const names = missingLine.replace(/^missing=/, '').trim().split(/\s+/).filter(Boolean);

  // GITHUB_TOKEN is a critical secret that is NOT the first element of the
  // CRITICAL_SECRETS array -- exactly the case that regressed pre-fix.
  const githubTokenCount = names.filter((n) => n === 'GITHUB_TOKEN').length;
  assert.strictEqual(
    githubTokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${githubTokenCount} (line: ${missingLine})`
  );

  // No secret name should appear more than once anywhere in the list.
  const seen = new Set();
  const dupes = [];
  for (const n of names) {
    if (seen.has(n)) dupes.push(n);
    seen.add(n);
  }
  assert.deepStrictEqual(dupes, [], `duplicate secret names in missing=: ${dupes.join(', ')}`);
});

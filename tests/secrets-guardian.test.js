// Regression test for scripts/secrets-guardian.sh
//
// Bug: the second (non-critical) loop used `echo "$CRITICAL_SECRETS"` to check
// membership, which only expands to the first array element. Every other
// critical secret (e.g. GITHUB_TOKEN, which is the first in this array — so we
// also verify a middle element like OPENROUTER_API_KEY) was re-checked and
// appended a second time to the missing= line.
//
// This test stubs `gh` to report no secrets present and asserts that no
// secret name appears more than once in the `missing=` GITHUB_OUTPUT line.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('secrets-guardian emits each missing secret exactly once', () => {
  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');
  if (!fs.existsSync(scriptPath)) {
    // Script not present in this checkout; skip.
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-guardian-'));
  const ghStub = path.join(tmpDir, 'gh');
  // Stub `gh`: emit nothing so every secret is considered missing.
  fs.writeFileSync(ghStub, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });

  const outputFile = path.join(tmpDir, 'github_output');
  fs.writeFileSync(outputFile, '');

  const env = {
    ...process.env,
    PATH: `${tmpDir}:${process.env.PATH || ''}`,
    GITHUB_OUTPUT: outputFile,
  };

  execFileSync('bash', [scriptPath], { env, stdio: 'pipe' });

  const output = fs.readFileSync(outputFile, 'utf8');
  const missingLine = output.split('\n').find((l) => l.startsWith('missing='));
  assert.ok(missingLine, 'expected a missing= line in GITHUB_OUTPUT');

  const csv = missingLine.slice('missing='.length);
  const names = csv ? csv.split(',').filter(Boolean) : [];

  // Every critical secret is missing (gh stub returns nothing), and each name
  // must appear exactly once.
  const counts = names.reduce((acc, n) => {
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});

  const duplicates = Object.entries(counts).filter(([, c]) => c > 1);
  assert.deepStrictEqual(
    duplicates,
    [],
    `no secret should be duplicated in missing=; duplicates: ${JSON.stringify(duplicates)}`
  );

  // Sanity: GITHUB_TOKEN (a critical secret) should appear exactly once.
  assert.strictEqual(
    counts['GITHUB_TOKEN'] || 0,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${counts['GITHUB_TOKEN']}`
  );
});

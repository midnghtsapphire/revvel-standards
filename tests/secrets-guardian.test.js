// Regression test for scripts/secrets-guardian.sh
// Verifies that the critical-secrets membership check expands the full array,
// so GITHUB_TOKEN (index 1, not 0) is not duplicated in `missing=` output.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('secrets-guardian.sh does not duplicate critical secrets in missing= output', () => {
  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');
  if (!fs.existsSync(scriptPath)) {
    // If script is not present in this checkout, skip silently.
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-guardian-'));
  const outputFile = path.join(tmpDir, 'gh_output');
  const stubBin = path.join(tmpDir, 'bin');
  fs.mkdirSync(stubBin, { recursive: true });

  // Stub `gh` so it reports zero existing secrets
  const ghStub = path.join(stubBin, 'gh');
  fs.writeFileSync(ghStub, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });

  fs.writeFileSync(outputFile, '');

  const env = {
    ...process.env,
    PATH: `${stubBin}:${process.env.PATH || ''}`,
    GITHUB_OUTPUT: outputFile,
  };

  try {
    execFileSync('bash', [scriptPath], { env, stdio: 'pipe' });
  } catch (err) {
    // Script may exit non-zero when secrets missing; we still validate output file.
  }

  const output = fs.readFileSync(outputFile, 'utf8');
  const missingLine = output.split('\n').find((l) => l.startsWith('missing='));
  assert.ok(missingLine, 'missing= line should be present in GITHUB_OUTPUT');

  const missingValues = missingLine.replace(/^missing=/, '').trim().split(/\s+/).filter(Boolean);

  // GITHUB_TOKEN is a critical secret that is NOT first in the array.
  // Before the fix, it would be listed twice (once per loop).
  const githubTokenCount = missingValues.filter((s) => s === 'GITHUB_TOKEN').length;
  assert.equal(
    githubTokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${githubTokenCount}: ${missingLine}`
  );

  // No secret name should be duplicated in missing=
  const seen = new Set();
  const dupes = [];
  for (const name of missingValues) {
    if (seen.has(name)) dupes.push(name);
    seen.add(name);
  }
  assert.deepEqual(dupes, [], `no duplicate secret names expected, found: ${dupes.join(', ')}`);
//
// Verifies that critical secrets (specifically GITHUB_TOKEN, which is not the
// first element in the CRITICAL_SECRETS array) appear exactly once in the
// `missing=` line written to $GITHUB_OUTPUT, and that no secret name is
// duplicated in that list.

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('secrets-guardian.sh does not duplicate critical secrets in missing=', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const script = path.join(repoRoot, 'scripts', 'secrets-guardian.sh');

  if (!fs.existsSync(script)) {
    // Nothing to test if the script is absent in this checkout.
    return;
  }

  // Create a temp dir with a stub `gh` that reports no secrets present.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-'));
  const stubGh = path.join(tmp, 'gh');
  fs.writeFileSync(
    stubGh,
    '#!/usr/bin/env bash\n' +
      '# Stub gh: report no existing secrets; succeed on `secret set`.\n' +
      'if [ "${1:-}" = "secret" ] && [ "${2:-}" = "list" ]; then\n' +
      '  exit 0\n' +
      'fi\n' +
      'if [ "${1:-}" = "secret" ] && [ "${2:-}" = "set" ]; then\n' +
      '  cat >/dev/null\n' +
      '  exit 0\n' +
      'fi\n' +
      'exit 0\n'
  );
  fs.chmodSync(stubGh, 0o755);

  const githubOutput = path.join(tmp, 'gh_output');
  fs.writeFileSync(githubOutput, '');

  const env = {
    PATH: `${tmp}:${process.env.PATH || ''}`,
    GITHUB_OUTPUT: githubOutput,
    HOME: tmp,
  };

  try {
    execFileSync('bash', [script], { env, stdio: 'pipe' });
  } catch (err) {
    // The script may exit non-zero if no env vars are set; that's fine.
    // We only care about the emitted $GITHUB_OUTPUT lines.
  }

  const output = fs.readFileSync(githubOutput, 'utf8');
  const missingLine = output
    .split('\n')
    .find((line) => line.startsWith('missing='));

  assert.ok(missingLine, 'expected a missing= line in $GITHUB_OUTPUT');

  const names = missingLine.replace(/^missing=/, '').trim().split(/\s+/).filter(Boolean);

  // GITHUB_TOKEN is a critical secret that is NOT first in CRITICAL_SECRETS.
  // With the pre-fix bug, it would be listed twice.
  const githubTokenCount = names.filter((n) => n === 'GITHUB_TOKEN').length;
  assert.equal(
    githubTokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${githubTokenCount} (line: ${missingLine})`
  );

  // No secret name should be duplicated.
  const seen = new Set();
  const duplicates = [];
  for (const name of names) {
    if (seen.has(name)) duplicates.push(name);
    seen.add(name);
  }
  assert.deepEqual(duplicates, [], `missing= contains duplicates: ${duplicates.join(', ')}`);
});

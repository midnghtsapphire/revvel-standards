// Regression test for scripts/secrets-guardian.sh
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

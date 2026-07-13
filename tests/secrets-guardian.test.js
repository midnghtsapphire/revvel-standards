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

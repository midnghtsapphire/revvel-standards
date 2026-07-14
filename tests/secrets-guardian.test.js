// tests/secrets-guardian.test.js
// Regression test: ensure the bash array membership guard in
// scripts/secrets-guardian.sh correctly de-duplicates ALL critical secrets,
// not just the first element of the CRITICAL_SECRETS array.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('secrets-guardian: GITHUB_TOKEN appears only once in missing= output', () => {
  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');
  if (!fs.existsSync(scriptPath)) {
    // Script not present in this checkout - skip.
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-guardian-'));
  const outputFile = path.join(tmpDir, 'github_output');
  const stubBinDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(stubBinDir, { recursive: true });

  // Stub `gh` to always report an empty secret list, so every secret is
  // classified as missing.
  const ghStub = path.join(stubBinDir, 'gh');
  fs.writeFileSync(ghStub, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });

  fs.writeFileSync(outputFile, '');

  const env = {
    ...process.env,
    PATH: `${stubBinDir}:${process.env.PATH || ''}`,
    GITHUB_OUTPUT: outputFile,
  };

  try {
    execFileSync('bash', [scriptPath], { env, stdio: 'pipe' });
  } catch (err) {
    // Script exits 0 on missing secrets; any non-zero is a real failure.
    throw err;
  }

  const output = fs.readFileSync(outputFile, 'utf8');
  const missingLine = output.split('\n').find((l) => l.startsWith('missing='));
  assert.ok(missingLine, 'missing= line should be present in GITHUB_OUTPUT');

  const missingSecrets = missingLine.replace(/^missing=/, '').trim().split(/\s+/).filter(Boolean);

  // GITHUB_TOKEN is a critical secret but NOT the first element of
  // CRITICAL_SECRETS in some historical variants; regardless it must appear
  // exactly once with the fixed array membership guard.
  const githubTokenCount = missingSecrets.filter((s) => s === 'GITHUB_TOKEN').length;
  assert.strictEqual(
    githubTokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${githubTokenCount}. Full list: ${missingSecrets.join(', ')}`
  );

  // No secret name should ever be duplicated in the missing= list.
  const seen = new Set();
  const dupes = [];
  for (const s of missingSecrets) {
    if (seen.has(s)) dupes.push(s);
    seen.add(s);
  }
  assert.deepStrictEqual(dupes, [], `No duplicates expected in missing=, found: ${dupes.join(', ')}`);
});

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('secrets-guardian: GITHUB_TOKEN appears exactly once in missing= line', () => {
  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');
  if (!fs.existsSync(scriptPath)) {
    return; // script not present, skip
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-guardian-'));
  const ghStub = path.join(tmpDir, 'gh');
  const outputFile = path.join(tmpDir, 'github_output');

  // Stub `gh` to print no secrets (all missing).
  fs.writeFileSync(ghStub, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  fs.writeFileSync(outputFile, '');

  const env = {
    ...process.env,
    PATH: `${tmpDir}:${process.env.PATH}`,
    GITHUB_OUTPUT: outputFile,
  };

  execSync(`bash ${scriptPath}`, { env, stdio: 'pipe' });

  const output = fs.readFileSync(outputFile, 'utf8');
  const missingLine = output.split('\n').find((l) => l.startsWith('missing=')) || '';
  const names = missingLine.replace(/^missing=/, '').split(/\s+/).filter(Boolean);

  const gitHubTokenCount = names.filter((n) => n === 'GITHUB_TOKEN').length;
  assert.strictEqual(
    gitHubTokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${gitHubTokenCount}. Line: ${missingLine}`
  );

  // No duplicates overall.
  const seen = new Set();
  for (const n of names) {
    assert.ok(!seen.has(n), `duplicate secret name in missing=: ${n}`);
    seen.add(n);
  }
});

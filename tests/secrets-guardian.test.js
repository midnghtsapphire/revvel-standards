// Regression test for scripts/secrets-guardian.sh
//
// Verifies that critical secrets (specifically GITHUB_TOKEN, which is not the
// first element of CRITICAL_SECRETS after the fix) appear exactly once in the
// `missing=` line emitted to $GITHUB_OUTPUT, and that no secret name is
// duplicated across the list.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'secrets-guardian.sh');

function makeStubBin() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-stub-'));
  const gh = path.join(dir, 'gh');
  // Stub gh: report no secrets present regardless of args
  fs.writeFileSync(gh, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  return dir;
}

test('secrets-guardian emits each missing secret exactly once', (t) => {
  if (!fs.existsSync(SCRIPT)) {
    t.skip('secrets-guardian.sh not present');
    return;
  }

  const stubBin = makeStubBin();
  const outFile = path.join(os.tmpdir(), `guardian-out-${process.pid}-${Date.now()}`);

  let threw = false;
  try {
    execFileSync('bash', [SCRIPT], {
      env: {
        ...process.env,
        PATH: `${stubBin}:${process.env.PATH || ''}`,
        GITHUB_OUTPUT: outFile,
      },
      stdio: 'pipe',
    });
  } catch (_e) {
    // Script exits non-zero when critical secrets are missing; that's expected here.
    threw = true;
  }

  assert.ok(threw, 'script should exit non-zero when critical secrets are missing');
  assert.ok(fs.existsSync(outFile), 'GITHUB_OUTPUT file should be written');

  const content = fs.readFileSync(outFile, 'utf8');
  const missingLine = content.split('\n').find((l) => l.startsWith('missing='));
  assert.ok(missingLine, 'missing= line should be present in GITHUB_OUTPUT');

  const names = missingLine.replace(/^missing=/, '').split(',').filter(Boolean);

  // GITHUB_TOKEN is a critical secret and is the first element of the array; the
  // regression here is that non-first elements were duplicated. Assert both:
  // - GITHUB_TOKEN appears exactly once
  // - Some non-first critical secret (e.g. OPENROUTER_API_KEY) appears exactly once
  const countGithubToken = names.filter((n) => n === 'GITHUB_TOKEN').length;
  const countOpenRouter = names.filter((n) => n === 'OPENROUTER_API_KEY').length;
  assert.strictEqual(countGithubToken, 1, `GITHUB_TOKEN should appear exactly once, got ${countGithubToken} in: ${missingLine}`);
  assert.strictEqual(countOpenRouter, 1, `OPENROUTER_API_KEY should appear exactly once, got ${countOpenRouter} in: ${missingLine}`);

  // No duplicates overall
  const seen = new Set();
  for (const n of names) {
    assert.ok(!seen.has(n), `duplicate secret name in missing= list: ${n}`);
    seen.add(n);
  }

  try { fs.unlinkSync(outFile); } catch (_) {}
  try { fs.rmSync(stubBin, { recursive: true, force: true }); } catch (_) {}
});

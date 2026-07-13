// Regression test for scripts/secrets-guardian.sh
//
// PRIME DIRECTIVE: $10k/month → $10M in 3 years. The secrets guardian keeps
// the revenue automation pipeline (Polar.sh, OSINT tools) running, so its
// missing-secret reporting must be accurate — no duplicates, no dropped
// critical secrets.
//
// Bug: the second loop's "already handled" guard used `echo "$CRITICAL_SECRETS"`
// which only expands to the first array element. Every critical secret except
// the first fell through and was re-appended to `missing=`. This test stubs
// `gh` to report no secrets present and asserts each critical secret appears
// exactly once in the emitted `missing=` line.

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'secrets-guardian.sh');

function runGuardian() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-guardian-'));
  const ghStub = path.join(tmpDir, 'gh');
  const githubOutput = path.join(tmpDir, 'github_output');

  // Stub `gh` so `gh secret list` prints nothing → every secret is "missing".
  fs.writeFileSync(ghStub, '#!/usr/bin/env bash\nexit 0\n');
  fs.chmodSync(ghStub, 0o755);
  fs.writeFileSync(githubOutput, '');

  const env = {
    ...process.env,
    PATH: `${tmpDir}:${process.env.PATH || ''}`,
    GITHUB_OUTPUT: githubOutput,
  };

  execFileSync('bash', [SCRIPT], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  const output = fs.readFileSync(githubOutput, 'utf8');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return output;
}

test('secrets-guardian syntax is valid', () => {
  execFileSync('bash', ['-n', SCRIPT], { stdio: 'ignore' });
});

test('missing= list contains no duplicate secret names', () => {
  const output = runGuardian();
  const line = output.split('\n').find((l) => l.startsWith('missing='));
  assert.ok(line, 'expected missing= line in GITHUB_OUTPUT');

  const names = line.replace(/^missing=/, '').trim().split(/\s+/).filter(Boolean);
  const seen = new Set();
  for (const name of names) {
    assert.ok(!seen.has(name), `duplicate secret in missing=: ${name}`);
    seen.add(name);
  }
});

test('GITHUB_TOKEN appears exactly once in missing= (regression: bare $CRITICAL_SECRETS guard)', () => {
  const output = runGuardian();
  const line = output.split('\n').find((l) => l.startsWith('missing=')) || '';
  const names = line.replace(/^missing=/, '').trim().split(/\s+/).filter(Boolean);
  const count = names.filter((n) => n === 'GITHUB_TOKEN').length;
  assert.equal(count, 1, `GITHUB_TOKEN should appear once, saw ${count} in: ${line}`);
});

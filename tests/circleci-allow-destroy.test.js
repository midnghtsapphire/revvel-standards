'use strict';

/**
 * CircleCI archival policy: allow-destroy fails CLOSED.
 *
 * Historical context (WR #17829): the script once let the `allow-destroy`
 * label / ALLOW_DESTROY=true ratify a deletion. AGENTS.md OWNER RULE
 * (Audrey Evans, 2026-10-30) forbids that: "No label, flag, or agent
 * judgment permits deletion." These tests now assert fail-closed behaviour —
 * label/env presence is logged as IGNORED and deletions still exit 1.
 *
 * Detection of the label (via CIRCLE_PULL_REQUEST + GITHUB_TOKEN) is kept for
 * clear logging. An unreadable label is still not permission.
 *
 * These tests drive the SHIPPED script in a throwaway git repo with a stubbed
 * `curl` on PATH, so they exercise the resolution as it will run rather than a
 * re-implementation of it.
 * CircleCI archival policy: allow-destroy is DEAD / fail CLOSED.
 *
 * 2026-11-05 Audrey Evans (via TriageChief): "ya not lets get rid of that."
 * ("that" = allow-destroy label bypass). Bypass path is COMMENTED OUT in
 * check-archival-policy.sh (visible but dead). AGENTS.md OWNER RULE
 * (2026-10-30): no label may permit deletion.
 *
 * #18261 runtime-ignored the bypass; this suite asserts the stronger
 * comment-out / fail-closed behaviour.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.circleci', 'scripts', 'check-archival-policy.sh');

function repoWithADeletion() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allow-destroy-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, stdio: 'pipe', env: { ...process.env, HOME: dir } });

  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  fs.writeFileSync(path.join(dir, 'doomed.txt'), 'content\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('branch', '-q', 'work');
  git('checkout', '-q', 'work');
  fs.rmSync(path.join(dir, 'doomed.txt'));
  git('add', '-A');
  git('commit', '-qm', 'delete it');
  git('update-ref', 'refs/remotes/origin/main', 'main');
  return dir;
}

function stubCurl(dir, { body = null, exitCode = 0 } = {}) {
  const bin = path.join(dir, 'stub-bin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(
    path.join(bin, 'curl'),
    body === null
      ? `#!/bin/sh\ncat >/dev/null\nexit ${exitCode}\n`
      : `#!/bin/sh\ncat >/dev/null\ncat <<'JSON'\n${body}\nJSON\nexit ${exitCode}\n`,
    { mode: 0o755 },
  );
  return bin;
}

function run(dir, env, { bin } = {}) {
  return spawnSync('bash', [SCRIPT], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: bin ? `${bin}:${process.env.PATH}` : process.env.PATH,
      HOME: dir,
      ...env,
    },
  });
}

const LABELLED = JSON.stringify({ labels: [{ name: 'bug' }, { name: 'allow-destroy' }] });
const UNLABELLED = JSON.stringify({ labels: [{ name: 'bug' }] });

test('the allow-destroy label is IGNORED — deletions still fail closed', () => {
  // OWNER RULE (AGENTS.md, 2026-10-30): no label may permit deletion.
  // Was: "the allow-destroy label ratifies a deletion" (pre-OWNER-RULE bypass).
test('the allow-destroy label is IGNORED — deletions still fail closed (bypass dead)', () => {
  // Bypass resolver is commented out; even a labelled PR response cannot ratify.
  const dir = repoWithADeletion();
  const bin = stubCurl(dir, { body: LABELLED });
  const r = run(dir, {
    CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234',
    GITHUB_TOKEN: 'x',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
  }, { bin });
  assert.equal(r.status, 1, `label must not ratify; expected fail-closed:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /allow-destroy label found on PR #1234/);
  assert.match(r.stderr, /IGNORED.*OWNER RULE|OWNER RULE.*forbids label-based deletion/i);
  assert.match(r.stderr, /Deleted files detected/);
  assert.match(r.stderr, /Deleted files detected/);
  assert.match(r.stderr, /allow-destroy is dead|OWNER RULE|Audrey 2026-11-05/i);
});

test('a PR without the label is still blocked', () => {
  const dir = repoWithADeletion();
  const bin = stubCurl(dir, { body: UNLABELLED });
  const r = run(dir, {
    CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234',
    GITHUB_TOKEN: 'x',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
  }, { bin });
  assert.equal(r.status, 1, 'a deletion without ratification must fail');
  assert.match(r.stderr, /Deleted files detected/);
});

test('the label must be a label, not a word in the PR body', () => {
  const dir = repoWithADeletion();
  const bin = stubCurl(dir, {
    body: JSON.stringify({
      title: 'please allow-destroy this',
      body: 'add the allow-destroy label',
      labels: [{ name: 'bug' }],
    }),
  });
  const r = run(dir, {
    CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234',
    GITHUB_TOKEN: 'x',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
  }, { bin });
  assert.equal(r.status, 1, 'a PR must not ratify itself by naming the label');
});

test('no token fails CLOSED (bypass dead — no live label lookup)', () => {
  const dir = repoWithADeletion();
  const r = run(dir, { CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no GITHUB_TOKEN in this job/);
  assert.match(r.stderr, /Add GITHUB_TOKEN/);
  assert.match(r.stderr, /fail closed|OWNER RULE/i);
  assert.match(r.stderr, /Deleted files detected/);
});

test('an API failure cannot open a bypass (resolver is commented out)', () => {
  const dir = repoWithADeletion();
  const bin = stubCurl(dir, { exitCode: 22 });
  const r = run(dir, {
    CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234',
    GITHUB_TOKEN: 'x',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
  }, { bin });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Deleted files detected/);
});

test('an explicit ALLOW_DESTROY is IGNORED — deletions still fail closed', () => {
  // OWNER RULE (AGENTS.md, 2026-10-30): no flag may permit deletion.
  // Was: "an explicit ALLOW_DESTROY still wins" (pre-OWNER-RULE bypass).
  const dir = repoWithADeletion();
  const r = run(dir, { ALLOW_DESTROY: 'true' });
  assert.equal(r.status, 1, 'explicit ALLOW_DESTROY must not bypass deletion gate');
  assert.match(r.stderr, /allow-destroy label\/env is IGNORED|OWNER RULE/i);
  const dir = repoWithADeletion();
  const r = run(dir, { ALLOW_DESTROY: 'true' });
  assert.equal(r.status, 1, 'explicit ALLOW_DESTROY must not bypass deletion gate');
  assert.match(r.stderr, /ALLOW_DESTROY=true is IGNORED|OWNER RULE|Audrey 2026-11-05/i);
  assert.match(r.stderr, /Deleted files detected/);
});

test('outside a PR build the gate stays strict', () => {
  const dir = repoWithADeletion();
  const r = run(dir, {});
  assert.equal(r.status, 1);
});

test('config.yml does not hardcode ALLOW_DESTROY back to a live bypass', () => {
  const cfg = fs.readFileSync(path.join(ROOT, '.circleci', 'config.yml'), 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  assert.doesNotMatch(
    cfg,
    /ALLOW_DESTROY:\s*["']?true["']?/,
    'config must not revive ALLOW_DESTROY=true',
  );
});

test('live (non-comment) script code never puts the token on argv', () => {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  const live = src.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.doesNotMatch(
    live,
    /-H ["'][^"']*Bearer/,
    'a Bearer header on the command line leaks the token to `ps`',
  );
  // Dead bypass may still show curl --config - inside comments; that is fine.
  assert.match(src, /allow-destroy|ALLOW_DESTROY/, 'dated dead bypass must remain visible');
});

test('bypass resolver is commented out (visible but dead)', () => {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.match(src, /SUPERSEDED 2026-11-05/);
  assert.match(src, /ya not lets get rid of that/);
  // Live code must not call resolve_allow_destroy
  const live = src.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.doesNotMatch(live, /resolve_allow_destroy/);
  assert.doesNotMatch(live, /ALLOW_DESTROY="\$\(resolve_allow_destroy\)"/);
});

test('policy scan skips binaries and token-free files but still flags bad blocks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archival-scan-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, stdio: 'pipe', env: { ...process.env, HOME: dir } });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('checkout', '-q', '-b', 'work');
  fs.writeFileSync(path.join(dir, 'big.txt'), 'plain line\n'.repeat(200000));
  const bin = Buffer.alloc(4 * 1024 * 1024);
  bin[0] = 0;
  fs.writeFileSync(path.join(dir, 'blob.bin'), bin);
  fs.writeFileSync(path.join(dir, 'bad.py'),
    '# REVVEL-DISABLED | AGENT: x\nold = 1\n# REVVEL-DISABLED-END\n');
  git('add', '-A');
  git('commit', '-qm', 'add files');
  git('update-ref', 'refs/remotes/origin/main', 'main');
  const started = Date.now();
  const r = run(dir, { ALLOW_DESTROY: 'false' });
  const elapsed = Date.now() - started;
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /bad\.py:1 — REVVEL-DISABLED block missing 'MODEL:'/);
  assert.doesNotMatch(r.stderr, /big\.txt|blob\.bin/);
  assert.ok(elapsed < 30000, `scan took ${elapsed} ms`);
});

test('policy scan still flags bad blocks in files with NUL bytes or dash-leading names', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archival-scan-edge-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, stdio: 'pipe', env: { ...process.env, HOME: dir } });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('checkout', '-q', '-b', 'work');
  fs.writeFileSync(path.join(dir, 'nul.py'),
    Buffer.concat([Buffer.from('# REVVEL-DISABLED | AGENT: x\nold = 1\n# REVVEL-DISABLED-END\n'), Buffer.from([0])]));
  fs.writeFileSync(path.join(dir, '-dash.py'), '# REVVEL-DISABLED | AGENT: x\nold = 1\n# REVVEL-DISABLED-END\n');
  git('add', '-A', '--', '.');
  git('commit', '-qm', 'add files');
  git('update-ref', 'refs/remotes/origin/main', 'main');
  const r = run(dir, { ALLOW_DESTROY: 'false' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /nul\.py:1 — REVVEL-DISABLED block missing 'MODEL:'/);
  assert.match(r.stderr, /-dash\.py:1 — REVVEL-DISABLED block missing 'MODEL:'/);
});

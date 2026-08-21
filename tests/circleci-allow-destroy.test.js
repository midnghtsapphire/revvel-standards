'use strict';

/**
 * The `allow-destroy` label must be able to ratify a deletion in CircleCI
 * (WR #17829).
 *
 * RVS-AGENT-001 §7 reserves deletion to a human, and the sanctioned way for a
 * human to take it is the `allow-destroy` label. `no-destroy-guard.yml` reads
 * that label. CircleCI's `policy-check` hardcoded
 *
 *     ALLOW_DESTROY: "false"
 *
 * in `.circleci/config.yml`, with a comment saying the label "is not available
 * in CircleCI context" — so the one sanctioned path had a required check that
 * could never turn green. A ratified deletion could not merge, and #17790's
 * Option A was blocked on a hardcoded string.
 *
 * The label IS reachable: `CIRCLE_PULL_REQUEST` carries the PR URL on every PR
 * build. It needs a token, because this repository is private.
 *
 * These tests drive the SHIPPED script in a throwaway git repo with a stubbed
 * `curl` on PATH, so they exercise the resolution as it will run rather than a
 * re-implementation of it.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.circleci', 'scripts', 'check-archival-policy.sh');

/**
 * A repo whose HEAD deletes a tracked file, so the deletion gate has something
 * to fire on. Returns the repo path.
 */
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
  // The script diffs against origin/main; give it one without a remote.
  git('update-ref', 'refs/remotes/origin/main', 'main');
  return dir;
}

/** A `curl` on PATH that ignores its arguments and prints `body`. */
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

test('the allow-destroy label ratifies a deletion', () => {
  const dir = repoWithADeletion();
  const bin = stubCurl(dir, { body: LABELLED });
  const r = run(dir, {
    CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234',
    GITHUB_TOKEN: 'x',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
  }, { bin });
  assert.equal(r.status, 0, `expected the label to ratify:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /allow-destroy label found on PR #1234/);
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
  // Matching the string anywhere in the response would let a PR ratify itself
  // by mentioning the label in its own title or description.
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

test('no token fails CLOSED, and names what is missing', () => {
  // An unreadable label is not permission. But a check that just says "no" is
  // how the old hardcoded `false` stayed unnoticed, so it has to say WHY.
  const dir = repoWithADeletion();
  const r = run(dir, { CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no GITHUB_TOKEN in this job/);
  assert.match(r.stderr, /Add GITHUB_TOKEN/);
});

test('an API failure fails CLOSED', () => {
  const dir = repoWithADeletion();
  const bin = stubCurl(dir, { exitCode: 22 });
  const r = run(dir, {
    CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/1234',
    GITHUB_TOKEN: 'x',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
  }, { bin });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /allow-destroy lookup failed/);
});

test('an explicit ALLOW_DESTROY still wins', () => {
  const dir = repoWithADeletion();
  const r = run(dir, { ALLOW_DESTROY: 'true' });
  assert.equal(r.status, 0, 'an explicit setting is a decision already taken');
});

test('outside a PR build the gate stays strict', () => {
  const dir = repoWithADeletion();
  const r = run(dir, {});
  assert.equal(r.status, 1);
});

test('config.yml does not hardcode ALLOW_DESTROY back to false', () => {
  // The deadlock lived in the workflow config, not the script. Fixing the
  // script while leaving the hardcode would change nothing.
  const cfg = fs.readFileSync(path.join(ROOT, '.circleci', 'config.yml'), 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  assert.doesNotMatch(
    cfg,
    /ALLOW_DESTROY:/,
    'setting it in config.yml overrides the resolution and restores the deadlock',
  );
});

test('the token never reaches argv', () => {
  // CLAUDE.md gotcha #4: `curl -H "Authorization: Bearer $T"` puts the secret
  // in the process list for anything that can read /proc.
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.match(src, /curl --config -/, 'the header must come from stdin');
  assert.doesNotMatch(
    src.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n'),
    /-H ["'][^"']*Bearer/,
    'a Bearer header on the command line leaks the token to `ps`',
  );
});

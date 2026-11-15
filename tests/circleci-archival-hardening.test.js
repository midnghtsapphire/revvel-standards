'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(root, '.circleci/scripts/check-archival-policy.sh');

function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(root, 'docs/security-completion/.archival-fixture-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Security Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  const write = (name, value) => { fs.mkdirSync(path.dirname(path.join(cwd, name)), { recursive: true }); fs.writeFileSync(path.join(cwd, name), value); };
  const commit = () => { git('add', '--', '.'); git('commit', '-m', 'test: fixture'); return git('rev-parse', 'HEAD'); };
  const run = (env = {}) => spawnSync('bash', [script], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return { cwd, git, write, commit, run };
}

const badBlock = '# REVVEL-DISABLED | AGENT: fixture\nold = 1\n# REVVEL-DISABLED-END';

test('all deleted paths are blocked with NUL-safe names even with ALLOW_DESTROY=true', (t) => {
  const f = fixture(t);
  for (const name of ['docs/space name.md', 'docs/tab\tname.md', 'docs/new\nline.md']) f.write(name, 'original\n');
  const base = f.commit();
  f.git('rm', '--', 'docs/space name.md', 'docs/tab\tname.md', 'docs/new\nline.md');
  f.write('keep.md', 'addition\n');
  const head = f.commit();
  const r = f.run({ BASE_SHA: base, HEAD_SHA: head, ALLOW_DESTROY: 'true' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Deleted files detected/);
  assert.match(r.stderr, /no label\/env bypass/);
  assert.ok(!r.stderr.includes('\nline.md'));
});

test('changed newline/tab paths and an unterminated final line cannot hide malformed blocks', (t) => {
  const f = fixture(t);
  f.write('keep.md', 'original\n');
  const base = f.commit();
  f.write('docs/new\nline.py', badBlock);
  f.write('docs/tab\tname.py', badBlock);
  const r = f.run({ BASE_SHA: base, HEAD_SHA: f.commit() });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing 'MODEL:'/);
  assert.doesNotMatch(r.stderr, /Header: # REVVEL-DISABLED/);
});

test('missing baseline, invalid refs and diff command failures fail rather than green', (t) => {
  const f = fixture(t);
  f.write('keep.md', 'original\n');
  const base = f.commit();
  assert.equal(f.run({ BASE_SHA: 'not-a-ref' }).status, 1);
  assert.equal(f.run({ BASE_SHA: base, HEAD_SHA: 'not-a-ref' }).status, 1);
  assert.equal(f.run({ BASE_SHA: '' }).status, 1); // no origin/main in fixture
  const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  f.write('bin/git', `#!/usr/bin/env bash\nif [ "$1" = diff ]; then exit 23; fi\nexec "${realGit}" "$@"\n`);
  fs.chmodSync(path.join(f.cwd, 'bin/git'), 0o755);
  const r = f.run({ BASE_SHA: base, PATH: `${path.join(f.cwd, 'bin')}:${process.env.PATH}` });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Could not read deleted-file diff/);
});

test('archival scan reads exact HEAD blobs, not mutable working-tree text or symlink targets', (t) => {
  const f = fixture(t);
  f.write('keep.md', 'original\n');
  const base = f.commit();
  f.write('bad.py', badBlock);
  fs.symlinkSync('/not-a-repository-file', path.join(f.cwd, 'link.py'));
  const head = f.commit();
  f.write('bad.py', 'safe but uncommitted text\n');
  const r = f.run({ BASE_SHA: base, HEAD_SHA: head });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bad\.py:1/);
  assert.doesNotMatch(r.stderr, /not-a-repository-file/);
});

test('diverged base tips are converted to their actual common ancestor', (t) => {
  const f = fixture(t);
  f.write('keep.md', 'original\n');
  f.commit();
  f.git('checkout', '-b', 'feature');
  f.write('feature.md', 'addition\n');
  const head = f.commit();
  f.git('checkout', 'main');
  f.write('base-only.md', 'new on base\n');
  const base = f.commit();
  const r = f.run({ BASE_SHA: base, HEAD_SHA: head });
  assert.equal(r.status, 0, r.stderr);
});

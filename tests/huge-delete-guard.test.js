'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'security-gates', 'huge-delete-guard.js');
const guard = require(SCRIPT);

function sh(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Build a repo with `files` (path -> content) committed on main, then branch `pr`. */
function makeRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hdg-'));
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'user.email', 't@example.invalid');
  sh(dir, 'config', 'user.name', 'test');
  for (const [p, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), c);
  }
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'base');
  const base = sh(dir, 'rev-parse', 'HEAD');
  sh(dir, 'checkout', '-q', '-b', 'pr');
  return { dir, base };
}

function commitAll(dir, msg = 'change') {
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', msg);
}

const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n') + '\n';
const run = (dir, base, env = {}) =>
  spawnSync('node', [SCRIPT, '--base', base], {
    cwd: dir,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, SECURITY_GATES_OUT: path.join(dir, '.out'), ...env },
  });

test('small edits and added files pass', () => {
  const { dir, base } = makeRepo({ 'a.md': lines(100), 'b.md': lines(5) });
  fs.writeFileSync(path.join(dir, 'a.md'), lines(90));
  fs.writeFileSync(path.join(dir, 'new.md'), lines(1000));
  commitAll(dir);
  const r = run(dir, base);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /OK: nothing here looks like a mass deletion/);
});

test('deleting more than the line limit fails, and the message names the label', () => {
  const { dir, base } = makeRepo({ 'big.md': lines(800), 'keep.md': 'x\n' });
  fs.writeFileSync(path.join(dir, 'big.md'), lines(100));
  commitAll(dir);
  const r = run(dir, base);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /700 lines deleted \(limit 500\)/);
  assert.match(r.stdout, /allow-huge-delete/);
});

test('deleting more than the file limit fails', () => {
  const files = { 'keep.md': 'x\n' };
  for (let i = 0; i < 12; i++) files[`d${i}.md`] = 'x\n';
  const { dir, base } = makeRepo(files);
  for (let i = 0; i < 12; i++) fs.rmSync(path.join(dir, `d${i}.md`));
  commitAll(dir);
  const r = run(dir, base);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /12 files deleted \(limit 10\)/);
});

test('removing a whole directory fails even when under the file limit', () => {
  const { dir, base } = makeRepo({
    'docs/old/a.md': 'a\n',
    'docs/old/b.md': 'b\n',
    'docs/old/sub/c.md': 'c\n',
    'docs/keep.md': 'k\n',
  });
  fs.rmSync(path.join(dir, 'docs', 'old'), { recursive: true });
  commitAll(dir);
  const r = run(dir, base);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /whole directory removed: docs\/old\/ \(3 files\)/);
  assert.doesNotMatch(r.stdout, /docs\/old\/sub\/ \(/, 'only the top-most directory is reported');
});

test('removing some files of a directory is not a whole-directory removal', () => {
  const { dir, base } = makeRepo({ 'd/a.md': 'a\n', 'd/b.md': 'b\n', 'd/c.md': 'c\n', 'd/d.md': 'd\n' });
  fs.rmSync(path.join(dir, 'd', 'a.md'));
  commitAll(dir);
  assert.equal(run(dir, base).status, 0);
});

test('a pure rename is not a deletion', () => {
  const body = lines(900);
  const { dir, base } = makeRepo({ 'old/one.md': body, 'old/two.md': body + 'x\n', 'old/three.md': body + 'y\n' });
  fs.mkdirSync(path.join(dir, 'new'));
  for (const f of ['one', 'two', 'three']) sh(dir, 'mv', `old/${f}.md`, `new/${f}.md`);
  commitAll(dir);
  const r = run(dir, base);
  assert.equal(r.status, 0, r.stdout);
});

test('lockfile churn does not count toward the line limit, but deleting it counts as a file', () => {
  const { dir, base } = makeRepo({ 'package-lock.json': lines(5000), 'a.md': 'a\n' });
  fs.writeFileSync(path.join(dir, 'package-lock.json'), lines(10));
  commitAll(dir);
  assert.equal(run(dir, base).status, 0);
  const files = guard.analyze({ base, cwd: dir });
  assert.equal(files.deletedLines, 0);
});

test('ALLOW_HUGE_DELETE=true overrides and says so', () => {
  const { dir, base } = makeRepo({ 'big.md': lines(800), 'keep.md': 'x\n' });
  fs.writeFileSync(path.join(dir, 'big.md'), lines(1));
  commitAll(dir);
  const r = run(dir, base, { ALLOW_HUGE_DELETE: 'true' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /OVERRIDDEN: ALLOW_HUGE_DELETE=true/);
});

test('limits come from the environment', () => {
  const { dir, base } = makeRepo({ 'big.md': lines(50), 'keep.md': 'x\n' });
  fs.writeFileSync(path.join(dir, 'big.md'), lines(1));
  commitAll(dir);
  assert.equal(run(dir, base).status, 0);
  assert.equal(run(dir, base, { HUGE_DELETE_MAX_LINES: '10' }).status, 1);
});

test('an unmeasurable diff exits 2 (fails closed)', () => {
  const { dir } = makeRepo({ 'a.md': 'a\n' });
  const r = run(dir, '0000000000000000000000000000000000000000');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /fails closed/);
});

test('label override: label present, label absent, API error, not a PR', async () => {
  const env = { CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/7' };
  const seen = [];
  const ok = (labels) => async (url, opts) => {
    seen.push({ url, opts });
    return { ok: true, status: 200, json: async () => labels.map((name) => ({ name })) };
  };
  assert.equal((await guard.resolveOverride(env, ok(['allow-huge-delete']))).overridden, true);
  assert.equal((await guard.resolveOverride(env, ok(['bug']))).overridden, false);
  assert.match(seen[0].url, /repos\/o\/r\/issues\/7\/labels/);
  assert.equal(seen[0].opts.headers.Authorization, undefined, 'no token needed for a public repo');

  const denied = await guard.resolveOverride(env, async () => ({ ok: false, status: 404 }));
  assert.equal(denied.overridden, false);
  assert.match(denied.why, /HTTP 404.*staying strict/);

  const boom = await guard.resolveOverride(env, async () => {
    throw new Error('network down');
  });
  assert.equal(boom.overridden, false);

  assert.equal((await guard.resolveOverride({}, ok(['allow-huge-delete']))).overridden, false);
});

test('a token, when present, is sent as a header and never printed', async () => {
  let seen;
  await guard.resolveOverride(
    { CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/7', GITHUB_TOKEN: 'tok-from-env' },
    async (url, opts) => {
      seen = opts;
      return { ok: true, status: 200, json: async () => [] };
    },
  );
  assert.equal(seen.headers.Authorization, 'Bearer tok-from-env');
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.doesNotMatch(src, /console\.(log|error)\([^)]*token/i);
});

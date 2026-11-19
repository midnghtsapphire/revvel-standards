'use strict';

/**
 * Guards for the CircleCI scheduled-generators pipeline (WR #18488, TriageChief,
 * 2026-11-19). Two parts:
 *   1. Static: the config can only run from the `generator` parameter, uses the
 *      `generators-bot` context, never targets main, never echoes secrets, and the
 *      GitHub freeze is untouched.
 *   2. Behaviour: .circleci/scripts/run-scheduled-generator.sh run against a local
 *      bare git remote and a mock GitHub API, with tiny fake generator scripts.
 *      Covers the clean skip, the daily-branch choice, one draft PR, no PR for
 *      timestamp-only changes, continuing the same PR branch, and no token in logs.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, '.circleci', 'scheduled-generators.yml');
const SCRIPT = path.join(ROOT, '.circleci', 'scripts', 'run-scheduled-generator.sh');
const HELPER = path.join(ROOT, '.circleci', 'scripts', 'generator-pr.mjs');
const TOKEN = 'ghs_TESTTOKEN_do_not_print_0123456789';

// ---------- 1. static ----------

test('config: runs only when the generator parameter names the workflow', () => {
  const text = fs.readFileSync(CONFIG, 'utf8');
  assert.match(text, /parameters:\s*\n\s+generator:/);
  assert.match(text, /default: none/);
  for (const name of ['dashboard', 'agent-creator', 'flow-charts', 'connections-registry']) {
    const block = text.split(new RegExp(`^  ${name}:\\n`, 'm'))[1];
    assert.ok(block, `workflow ${name} exists`);
    assert.match(block.split(/^  \S/m)[0], /when:\s*\n\s+or:\s*\n\s+- equal: \[/, `${name} is gated by when`);
  }
  // Nothing may be gated on a webhook/push trigger or on a branch filter for main.
  assert.doesNotMatch(text, /trigger_source|trigger\.type/);
  assert.doesNotMatch(text, /branches:\s*\n\s+only:\s*main/);
});

test('config: every job uses the generators-bot context', () => {
  const text = fs.readFileSync(CONFIG, 'utf8');
  const contexts = text.match(/context: generators-bot/g) || [];
  assert.strictEqual(contexts.length, 4);
  assert.doesNotMatch(text, /context: (?!generators-bot)/);
});

test('scripts: never trace, dump the environment or put the token in argv', () => {
  for (const file of [SCRIPT, CONFIG, HELPER]) {
    const code = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => !/^\s*#|^\s*\/\//.test(l))
      .join('\n');
    assert.doesNotMatch(code, /set -[a-z]*x|\bprintenv\b|\benv\s*(\||$)|\bexport -p\b|echo\s+"?\$\{?GENERATORS_GITHUB_TOKEN/m, file);
  }
  const sh = fs.readFileSync(SCRIPT, 'utf8');
  assert.doesNotMatch(sh, /push --force|push -f|--force-with-lease/);
  assert.doesNotMatch(sh, /refs\/heads\/main/);
});

test('freeze: this change adds no GitHub schedule', () => {
  const dir = path.join(ROOT, '.github', 'workflows');
  for (const f of ['update-project-dashboard.yml', 'update-agent-creator-data.yml', 'flow-chart-sync.yml', 'connections-registry.yml']) {
    const live = fs
      .readFileSync(path.join(dir, f), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*#/.test(l));
    assert.ok(!live.some((l) => /^\s*-\s*cron:/.test(l)), `${f} has no live cron`);
  }
});

// ---------- 2. behaviour ----------

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/** Fake generators: output depends on FAKE_N (real change) and the clock (volatile). */
const FAKE_SCRIPTS = {
  'scripts/aggregate-project-dashboard.js': `
const fs = require('fs');
const n = process.env.FAKE_N || '1';
fs.writeFileSync('dashboard-data.json', JSON.stringify({ projects: n, lastUpdated: new Date().toISOString() }, null, 2) + '\\n');
fs.writeFileSync('dashboard.html', '<span class="stat-value">' + new Date().toLocaleString('en-US') + '</span>\\n<p>projects ' + n + '</p>\\n');
`,
  'scripts/populate-state.js': `
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('dashboard-data.json', 'utf8'));
fs.writeFileSync('state.json', JSON.stringify({ lastUpdated: d.lastUpdated, projects: d.projects }, null, 2) + '\\n');
`,
};

function mockGitHub(state) {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      state.calls.push(`${req.method} ${req.url.split('?')[0]}`);
      state.auth.push(req.headers.authorization);
      const body = raw ? JSON.parse(raw) : {};
      const send = (code, obj) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (req.method === 'GET' && req.url.startsWith('/repos/o/r/pulls')) {
        return send(200, state.pr ? [state.pr] : []);
      }
      if (req.method === 'POST' && req.url === '/repos/o/r/pulls') {
        state.created.push(body);
        state.pr = { number: 7, html_url: 'https://example.test/pull/7', head: { ref: body.head }, assignees: [] };
        return send(201, state.pr);
      }
      if (req.method === 'PATCH' && req.url === '/repos/o/r/pulls/7') {
        state.patched.push(body);
        return send(200, state.pr);
      }
      if (req.method === 'POST' && req.url === '/repos/o/r/issues/7/assignees') {
        state.assigned.push(body.assignees);
        state.pr.assignees = body.assignees.map((login) => ({ login }));
        return send(201, {});
      }
      return send(404, { message: 'not found' });
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function run(cwd, env) {
  return new Promise((resolve) => {
    const child = spawn('bash', [path.join(cwd, '.circleci', 'scripts', 'run-scheduled-generator.sh'), 'dashboard'], {
      cwd,
      env: { ...process.env, HOME: cwd, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', ...env },
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

test('script: skip, branch choice, one draft PR, no churn, continue same PR', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const bare = path.join(tmp, 'remote.git');
  const seed = path.join(tmp, 'seed');
  const work = path.join(tmp, 'work');
  git(tmp, 'init', '--bare', '-b', 'main', bare);
  git(tmp, 'init', '-b', 'main', seed);
  git(seed, 'config', 'user.email', 't@example.test');
  git(seed, 'config', 'user.name', 't');
  write(path.join(seed, 'README.md'), 'seed\n');
  for (const [f, text] of Object.entries(FAKE_SCRIPTS)) write(path.join(seed, f), text);
  fs.cpSync(path.join(ROOT, '.circleci', 'scripts'), path.join(seed, '.circleci', 'scripts'), { recursive: true });
  git(seed, 'add', '-A');
  git(seed, 'commit', '-m', 'seed');
  git(seed, 'remote', 'add', 'origin', bare);
  git(seed, 'push', 'origin', 'main');
  git(seed, 'branch', 'daily/2026-11-01');
  git(seed, 'push', 'origin', 'daily/2026-11-01');
  git(seed, 'checkout', '-b', 'daily/2026-11-14');
  write(path.join(seed, 'NEWER.md'), 'newer daily\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-m', 'newer daily');
  git(seed, 'push', 'origin', 'daily/2026-11-14');
  git(tmp, 'clone', '-q', bare, work);
  git(work, 'config', 'user.email', 't@example.test');
  git(work, 'config', 'user.name', 't');

  const state = { calls: [], auth: [], created: [], patched: [], assigned: [], pr: null };
  const server = await mockGitHub(state);
  t.after(() => server.close());
  const base = {
    GENERATORS_REPO: 'o/r',
    GENERATORS_REMOTE_URL: bare,
    GENERATORS_API_URL: `http://127.0.0.1:${server.address().port}`,
  };

  // a. no token: clean skip, exit 0, nothing contacted
  let r = await run(work, { ...base, GENERATORS_GITHUB_TOKEN: '' });
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /SKIP \(dashboard\)/);
  assert.strictEqual(state.calls.length, 0);

  // b. dry run: reports the change and pushes nothing
  r = await run(work, { ...base, GENERATORS_GITHUB_TOKEN: TOKEN, GENERATORS_DRY_RUN: '1', FAKE_N: '1' });
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /base branch: daily\/2026-11-14/);
  assert.match(r.out, /DRY RUN/);
  assert.deepStrictEqual(git(bare, 'for-each-ref', '--format=%(refname)', 'refs/heads/bot').split('\n').filter(Boolean), []);

  // c. first real run: bot branch off the NEWEST daily, one draft PR into it, assigned
  r = await run(work, { ...base, GENERATORS_GITHUB_TOKEN: TOKEN, FAKE_N: '1' });
  assert.strictEqual(r.code, 0, r.out);
  assert.strictEqual(state.created.length, 1);
  assert.strictEqual(state.created[0].base, 'daily/2026-11-14');
  assert.strictEqual(state.created[0].draft, true);
  assert.match(state.created[0].head, /^bot\/generators\/dashboard-\d{8}-\d{6}$/);
  assert.match(state.created[0].title, /^TriageChief: chore\(generators\): refresh dashboard/);
  assert.match(state.created[0].body, /^\*\*TriageChief:\*\*/);
  assert.match(state.created[0].body, /— TriageChief\s*$/);
  assert.deepStrictEqual(state.assigned, [['midnghtsapphire']]);
  const head = state.created[0].head;
  assert.ok(git(bare, 'rev-parse', `refs/heads/${head}`));
  assert.strictEqual(git(bare, 'show', `${head}:NEWER.md`), 'newer daily');
  assert.deepStrictEqual(
    git(bare, 'diff', '--name-only', 'daily/2026-11-14', head).split('\n').sort(),
    ['dashboard-data.json', 'dashboard.html', 'state.json'],
  );
  assert.ok(!r.out.includes(TOKEN), 'token never appears in output');
  assert.ok(state.auth.every((a) => a === `Bearer ${TOKEN}`));

  // d. only timestamps differ: no commit, no PR call
  const before = git(bare, 'rev-parse', `refs/heads/${head}`);
  const createdBefore = state.created.length;
  r = await run(work, { ...base, GENERATORS_GITHUB_TOKEN: TOKEN, FAKE_N: '1' });
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /continuing open PR branch/);
  assert.match(r.out, /no meaningful change/);
  assert.strictEqual(git(bare, 'rev-parse', `refs/heads/${head}`), before);
  assert.strictEqual(state.created.length, createdBefore);

  // e. real change: same branch, fast-forward push, PR updated, still ONE PR
  r = await run(work, { ...base, GENERATORS_GITHUB_TOKEN: TOKEN, FAKE_N: '2' });
  assert.strictEqual(r.code, 0, r.out);
  assert.strictEqual(state.created.length, 1);
  assert.strictEqual(state.patched.length, 1);
  const after = git(bare, 'rev-parse', `refs/heads/${head}`);
  assert.notStrictEqual(after, before);
  assert.strictEqual(git(bare, 'merge-base', '--is-ancestor', before, after) || 'ok', 'ok', 'push was a fast-forward');
  assert.match(git(bare, 'log', '-1', '--format=%B', head), /— TriageChief/);
  assert.ok(!r.out.includes(TOKEN));
  // main was never touched
  assert.strictEqual(git(bare, 'rev-parse', 'refs/heads/main'), git(seed, 'rev-parse', 'main'));
});

test('script: refuses to run without a daily branch', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-nodaily-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const bare = path.join(tmp, 'remote.git');
  const work = path.join(tmp, 'work');
  git(tmp, 'init', '--bare', '-b', 'main', bare);
  git(tmp, 'init', '-b', 'main', work);
  git(work, 'config', 'user.email', 't@example.test');
  git(work, 'config', 'user.name', 't');
  fs.cpSync(path.join(ROOT, '.circleci', 'scripts'), path.join(work, '.circleci', 'scripts'), { recursive: true });
  write(path.join(work, 'README.md'), 'x\n');
  git(work, 'add', '-A');
  git(work, 'commit', '-m', 'x');
  git(work, 'remote', 'add', 'origin', bare);
  git(work, 'push', 'origin', 'main');
  const r = await run(work, { GENERATORS_REPO: 'o/r', GENERATORS_REMOTE_URL: bare, GENERATORS_GITHUB_TOKEN: TOKEN });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /no daily\/YYYY-MM-DD branch found/);
});

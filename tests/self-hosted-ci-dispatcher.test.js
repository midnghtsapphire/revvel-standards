'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const d = require('../ops/self-hosted-ci/dispatcher.js');

const REPO = 'midnghtsapphire/revvel-standards';
const baseCfg = {
  repo: REPO,
  ignoreSenders: ['ci-bot'],
  allowLoopEvents: [],
  allowForkPrs: false,
  onlyWorkflows: [],
  skipWorkflows: [],
};

function sign(secret, body) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function wf(file, on) {
  return { file, name: file, on: d.normalizeOn(on) };
}

function prPayload(over = {}) {
  return {
    action: 'opened',
    repository: { full_name: REPO, default_branch: 'main' },
    sender: { login: 'someone' },
    pull_request: {
      number: 7,
      head: { sha: 'h'.repeat(40), repo: { full_name: REPO } },
      base: { sha: 'b'.repeat(40), ref: 'main', repo: { full_name: REPO } },
    },
    ...over,
  };
}

test('verifySignature accepts only the matching HMAC', () => {
  const body = Buffer.from('{"a":1}');
  assert.equal(d.verifySignature('s3cret', body, sign('s3cret', body)), true);
  assert.equal(d.verifySignature('s3cret', body, sign('other', body)), false);
  assert.equal(d.verifySignature('s3cret', body, undefined), false);
  assert.equal(d.verifySignature('s3cret', body, 'sha256=short'), false);
});

test('normalizeOn handles string, array and map forms', () => {
  assert.deepEqual(d.normalizeOn('push'), { push: {} });
  assert.deepEqual(d.normalizeOn(['push', 'issues']), { push: {}, issues: {} });
  assert.deepEqual(d.normalizeOn({ push: null, issues: { types: ['opened'] } }), { push: {}, issues: { types: ['opened'] } });
});

test('glob filters follow GitHub ordering and negation', () => {
  assert.equal(d.globToRegExp('docs/**').test('docs/a/b.md'), true);
  assert.equal(d.globToRegExp('*.md').test('a/b.md'), false);
  assert.equal(d.globToRegExp('**/*.md').test('a/b.md'), true);
  assert.equal(d.passesFilter(['release/1'], ['release/*', '!release/1'], undefined), false);
  assert.equal(d.passesFilter(['main'], undefined, ['main']), false);
  assert.equal(d.passesFilter(['a.js', 'docs/x.md'], undefined, ['docs/**']), true);
});

test('pull_request matches default types and fires pull_request_target too', () => {
  const flows = [wf('a.yml', 'pull_request'), wf('b.yml', { pull_request_target: null }), wf('c.yml', 'push')];
  const names = (p) => d.matchWorkflows(flows, 'pull_request', p, null, baseCfg).map((w) => `${w.file}:${w.trigger}`);
  assert.deepEqual(names(prPayload()), ['a.yml:pull_request', 'b.yml:pull_request_target']);
  assert.deepEqual(names(prPayload({ action: 'labeled' })), []);
});

test('explicit types, branch and path filters are honoured', () => {
  const flows = [
    wf('labels.yml', { pull_request: { types: ['labeled'] } }),
    wf('main-only.yml', { pull_request: { branches: ['main'] } }),
    wf('docs.yml', { pull_request: { paths: ['docs/**'] } }),
  ];
  const run = (p, files) => d.matchWorkflows(flows, 'pull_request', p, files, baseCfg).map((w) => w.file);
  assert.deepEqual(run(prPayload({ action: 'labeled' }), null), ['labels.yml']);
  const other = prPayload();
  other.pull_request.base.ref = 'dev';
  assert.deepEqual(run(other, ['src/a.js']), []);
  assert.deepEqual(run(prPayload(), ['src/a.js']), ['main-only.yml']);
  assert.deepEqual(run(prPayload(), ['docs/x.md']), ['main-only.yml', 'docs.yml']);
  assert.deepEqual(run(prPayload(), null), ['main-only.yml', 'docs.yml'], 'unknown files: path filters match');
});

test('push branch and tag filters', () => {
  const flows = [
    wf('any.yml', 'push'),
    wf('branches.yml', { push: { branches: ['main'] } }),
    wf('tags.yml', { push: { tags: ['v*'] } }),
  ];
  const run = (ref) =>
    d.matchWorkflows(flows, 'push', { ref, after: 'a'.repeat(40) }, null, baseCfg).map((w) => w.file);
  assert.deepEqual(run('refs/heads/main'), ['any.yml', 'branches.yml']);
  assert.deepEqual(run('refs/heads/dev'), ['any.yml']);
  assert.deepEqual(run('refs/tags/v1.2'), ['any.yml', 'tags.yml']);
});

test('ONLY_WORKFLOWS and SKIP_WORKFLOWS narrow the set', () => {
  const flows = [wf('a.yml', 'issues'), wf('b.yml', 'issues')];
  const p = { action: 'opened' };
  assert.deepEqual(d.matchWorkflows(flows, 'issues', p, null, { ...baseCfg, onlyWorkflows: ['b.yml'] }).map((w) => w.file), ['b.yml']);
  assert.deepEqual(d.matchWorkflows(flows, 'issues', p, null, { ...baseCfg, skipWorkflows: ['a.yml'] }).map((w) => w.file), ['b.yml']);
});

test('shouldIgnore drops loop-prone events, own sender, other repos and forks', () => {
  assert.match(d.shouldIgnore('check_suite', { repository: { full_name: REPO } }, baseCfg), /loop-prone/);
  assert.equal(d.shouldIgnore('check_suite', { repository: { full_name: REPO } }, { ...baseCfg, allowLoopEvents: ['check_suite'] }), null);
  assert.match(d.shouldIgnore('issues', { sender: { login: 'ci-bot' } }, baseCfg), /ignored sender/);
  assert.match(d.shouldIgnore('issues', { repository: { full_name: 'x/y' } }, baseCfg), /other repository/);
  const fork = prPayload();
  fork.pull_request.head.repo.full_name = 'stranger/revvel-standards';
  assert.match(d.shouldIgnore('pull_request', fork, baseCfg), /fork/);
  assert.equal(d.shouldIgnore('pull_request', fork, { ...baseCfg, allowForkPrs: true }), null);
  assert.equal(d.shouldIgnore('pull_request', prPayload(), baseCfg), null);
});

test('changedFilesFromPush unions commit files and gives up on truncated lists', () => {
  const p = { commits: [{ added: ['a'], modified: ['b'] }, { removed: ['c'], modified: ['b'] }] };
  assert.deepEqual(d.changedFilesFromPush(p).sort(), ['a', 'b', 'c']);
  assert.equal(d.changedFilesFromPush({ commits: Array(20).fill({}) }), null);
  assert.equal(d.changedFilesFromPush({}), null);
});

test('targetFor checks out base for pull_request_target but reports on head', () => {
  const p = prPayload();
  assert.deepEqual(d.targetFor('pull_request', 'pull_request', p), { statusSha: 'h'.repeat(40), checkoutSha: 'h'.repeat(40), prNumber: 7 });
  assert.deepEqual(d.targetFor('pull_request', 'pull_request_target', p), { statusSha: 'h'.repeat(40), checkoutSha: 'b'.repeat(40), prNumber: 7 });
  assert.equal(d.targetFor('push', 'push', { after: '0'.repeat(40) }).checkoutSha, null);
  assert.equal(d.targetFor('issues', 'issues', {}).checkoutSha, null);
});

test('buildActArgs passes secrets by file, never on argv', () => {
  const args = d.buildActArgs({ trigger: 'push', workflowFile: 'ci.yml', eventFile: '/e.json', secretFile: '/s', runnerImage: 'img' });
  assert.equal(args[0], 'push');
  assert.ok(args.includes('--secret-file'));
  assert.ok(!args.includes('-s'));
  assert.ok(args.includes('ubuntu-latest=img'));
});

test('Queue never exceeds its concurrency limit', async () => {
  const q = new d.Queue(2);
  let active = 0;
  let peak = 0;
  const task = async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
  };
  await Promise.all(Array.from({ length: 6 }, () => q.push(task)));
  assert.equal(peak, 2);
});

test('loadWorkflows parses every workflow in this repo', () => {
  const flows = d.loadWorkflows(path.join(__dirname, '..'));
  assert.ok(flows.length > 100);
  for (const f of flows) assert.equal(typeof f.on, 'object', f.file);
});

test('loadConfig requires the security-critical settings', () => {
  assert.throws(() => d.loadConfig({}), /WEBHOOK_SECRET/);
  const cfg = d.loadConfig({ WEBHOOK_SECRET: 'x', GITHUB_TOKEN_FILE: '/t', REPO_FULL_NAME: REPO, IGNORE_SENDERS: 'a, b' });
  assert.deepEqual(cfg.ignoreSenders, ['a', 'b']);
  assert.equal(cfg.allowForkPrs, false);
});

test('webhook server verifies signatures, dedupes and queues matching workflows', async (t) => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shci-'));
  t.after(() => fs.rmSync(repoDir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(repoDir, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(repoDir, '.github', 'workflows', 'ci.yml'), 'name: CI\non: [pull_request]\njobs: {}\n');
  fs.writeFileSync(path.join(repoDir, '.github', 'workflows', 'triage.yml'), 'on:\n  issues:\n    types: [opened]\njobs: {}\n');

  const queued = [];
  const queue = { running: 0, items: [], push: (task) => (queued.push(task), Promise.resolve()) };
  const gh = { prFiles: async () => ['a.js'], defaultBranchSha: async () => 'c'.repeat(40), setStatus: async () => {} };
  const cfg = { ...baseCfg, webhookSecret: 'whs', adminTokenFile: '' };
  const server = d.createServer(cfg, { gh, token: 't', queue, repoDirFor: async () => repoDir, log: { info() {}, error() {} } });
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}`;

  const post = (event, payload, opts = {}) => {
    const body = JSON.stringify(payload);
    return fetch(`${url}/webhook`, {
      method: 'POST',
      body,
      headers: {
        'x-github-event': event,
        'x-github-delivery': opts.delivery || crypto.randomUUID(),
        'x-hub-signature-256': opts.sig || sign('whs', body),
      },
    });
  };

  assert.equal((await post('pull_request', prPayload(), { sig: 'sha256=' + '0'.repeat(64) })).status, 401);

  const res = await post('pull_request', prPayload(), { delivery: 'd1' });
  assert.equal(res.status, 202);
  assert.deepEqual((await res.json()).queued, ['ci.yml']);
  assert.equal(queued.length, 1);

  const dup = await post('pull_request', prPayload(), { delivery: 'd1' });
  assert.deepEqual(await dup.json(), { duplicate: true });
  assert.equal(queued.length, 1);

  const issue = await post('issues', { action: 'opened', repository: { full_name: REPO, default_branch: 'main' }, sender: { login: 'x' } });
  assert.deepEqual((await issue.json()).queued, ['triage.yml']);

  const loop = await post('check_suite', { action: 'completed', repository: { full_name: REPO } });
  assert.match((await loop.json()).ignored, /loop-prone/);

  assert.equal((await fetch(`${url}/dispatch`, { method: 'POST', body: '{}' })).status, 401, 'dispatch disabled without admin token');
  assert.equal((await fetch(`${url}/healthz`)).status, 200);
});

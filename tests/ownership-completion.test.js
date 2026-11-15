'use strict';
// Pure mocked gh/API tests: no credentials, network, paid models or deployments.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const o = require('../scripts/ci/lib/ownership');
const cli = require('../scripts/ci/agent-session-start');
const lifecycle = require('../scripts/ci/lib/ownership-lifecycle');
const { makeClient } = require('../scripts/ci/lib/mini-github');
const NOW = Date.parse('2026-11-15T16:00:00.000Z');
const SHA = 'a'.repeat(40);
const identity = { id: 'lifecycle-specialist', github: 'owner' };
const next_action = { action: 'Repair inherited failed tests, run focused suite, then request owner release', owner: identity.id };
const clone = (v) => JSON.parse(JSON.stringify(v));
function fixture() {
  return { schema_version: 1, id: 'owned-task', repo: 'midnghtsapphire/revvel-standards',
    owner: { ...identity, platform: 'external-wrapper' }, task: { id: 'existing-task', ref: 'feat/existing', wr: 10, pr: 20 },
    outcome_type: 'governance', product_id: null, state: 'active', revision: 0, parent_revision: null,
    heartbeat_at: new Date(NOW).toISOString(), lease: { holder: 'session-1', expires_at: new Date(NOW + 1800000).toISOString() },
    attempts: { used: 1, max: 3 }, next_action: { ...next_action }, blocker: null,
    evidence: { artifacts: ['docs/security-completion/OWNERSHIP.md'],
      tests: [{ name: 'focused tests', result: 'passed', receipt: 'docs/security-completion/test-receipt.md', commit: SHA }],
      release: { kind: 'owner-reviewed', ref: 'https://github.com/example/repo/releases/tag/v1', version: 'v1', recorded_at: new Date(NOW).toISOString(), commit: SHA, verification: 'recorded' },
      outcome: { summary: 'Existing lifecycle ownership shipped', receipt: 'docs/security-completion/OWNERSHIP.md' } } };
}
function pr() { return { number: 20, body: 'Keep original prose. Never run: $(curl example.invalid).', user: { login: 'owner' }, head: { ref: 'feat/existing', sha: SHA }, state: 'open', draft: true, changed_files: 2, html_url: 'https://github.com/example/repo/pull/20', labels: [], assignees: [] }; }
function input(extra = {}) { return { session: 'session-1', next_action, ...extra }; }
function done() { const r = fixture(); r.state = 'done'; r.lease = { holder: null, expires_at: null }; return r; }

test('schema validates active record and JSONL round trip', () => {
  const r = fixture(); assert.equal(o.assertValid(r), r);
});

test('journal and PR record round-trip preserve durable identity', () => {
  const r = fixture(); assert.deepEqual(o.parseJournal(`${JSON.stringify(r)}\n`), [r]);
  assert.deepEqual(o.parseRecord(o.serializeRecord(r)), r);
  assert.equal(o.parseRecord('Untrusted prose without contract'), null);
});
test('done requires nonempty passing tests and deployment/release/outcome', () => {
  o.assertValid(done());
  for (const mutate of [(r) => { r.evidence.tests = []; }, (r) => { r.evidence.artifacts = []; },
    (r) => { r.evidence.tests[0].result = 'failed'; }, (r) => { r.evidence.release = null; },
    (r) => { r.evidence.outcome = null; }, (r) => { r.evidence.release.version = ''; }]) {
    const r = done(); mutate(r); assert.throws(() => o.assertValid(r), /completion/);
  }
});
test('product ID required before claim and live deployment required for done', () => {
  const r = fixture(); r.outcome_type = 'product'; assert.throws(() => o.assertValid(r), /product_id/);
  r.product_id = 'product-001'; o.assertValid(r);
  r.state = 'done'; r.lease = { holder: null, expires_at: null };
  assert.throws(() => o.assertValid(r), /deployment/);
  r.evidence.release.kind = 'deployment'; r.evidence.release.ref = 'docs/path.md';
  assert.throws(() => o.assertValid(r), /HTTP URL/);
});
test('receipt rejects empty paths, command strings, traversal and URL credentials', () => {
  for (const value of ['', 'javascript:alert(1)', '../../receipt', '/home/secrets', 'node scripts/run.js', 'https://user:pass@example.com', 'file://proof']) assert.equal(o.receipt(value), false, value);
  assert.equal(o.receipt('https://example.com/live'), true); assert.equal(o.receipt('docs/proof.md'), true);
});
test('test and release commits must match and verification is not inferred', () => {
  const r = done(); r.evidence.release.commit = 'b'.repeat(40); assert.throws(() => o.assertValid(r), /commits must match/);
  r.evidence.release.commit = SHA; r.evidence.release.verification = 'requested-and-verified';
  assert.throws(() => o.assertValid(r), /verification receipt/);
});
test('invalid owner, timestamps, lineage and unbounded budgets fail', () => {
  for (const mutate of [(r) => { r.owner.id = ''; }, (r) => { r.heartbeat_at = 'tomorrow'; }, (r) => { r.parent_revision = 9; },
    (r) => { r.attempts.max = 6; }, (r) => { r.attempts.used = 4; }, (r) => { r.next_action.owner = ''; },
    (r) => { r.lease.expires_at = new Date(NOW + 121 * 60000).toISOString(); }]) {
    const r = fixture(); mutate(r); assert.throws(() => o.assertValid(r, { now: NOW }), /schema/);
  }
});
test('claim binds authenticated owner and consumes one attempt', () => {
  const r = o.transition(null, 'claim', { ...fixture(), ...input() }, identity, NOW);
  assert.equal(r.state, 'claimed'); assert.equal(r.attempts.used, 1); assert.equal(r.revision, 0);
});
test('resume expired lease is bounded; heartbeat does not renew indefinitely', () => {
  const r = fixture(); const heartbeat = o.transition(r, 'heartbeat', input(), identity, NOW + 1000);
  assert.equal(heartbeat.lease.expires_at, r.lease.expires_at); assert.equal(heartbeat.attempts.used, 1);
  const resume = o.transition(r, 'resume', input(), identity, NOW + 1800001);
  assert.equal(resume.attempts.used, 2); assert.equal(resume.revision, 1);
  assert.throws(() => o.transition(r, 'heartbeat', input(), identity, NOW + 1800001), /live lease/);
});
test('another identity/session cannot steal live lease', () => {
  assert.throws(() => o.transition(fixture(), 'heartbeat', input(), { id: 'intruder', github: 'owner' }, NOW), /recorded owner/);
  assert.throws(() => o.transition(fixture(), 'resume', input({ session: 'intruder' }), identity, NOW), /Another session/);
  assert.throws(() => o.transition(fixture(), 'resume', input(), identity, NOW), /heartbeat rather/);
});
test('exhausted attempts cannot be reset by resume input', () => {
  const r = fixture(); r.attempts.used = r.attempts.max;
  assert.throws(() => o.transition(r, 'resume', input({ attempts: { used: 0, max: 5 } }), identity, NOW + 1800001), /budget exhausted/);
});
test('auth/billing/schema blockers stop until explicit resolution; no retry loop', () => {
  for (const kind of ['auth', 'billing', 'schema']) {
    const blocked = o.transition(fixture(), 'block', input({ blocker: { kind, reason: 'Credential or provider unavailable', owner: 'Audrey', retry_after: null } }), identity, NOW);
    assert.equal(blocked.lease.holder, null);
    assert.throws(() => o.transition(blocked, 'resume', input(), identity, NOW + 1000), /resolution receipt/);
    assert.equal(o.transition(blocked, 'resume', input({ blocker_resolution: 'docs/resolution.md' }), identity, NOW + 1000).state, 'active');
  }
});
test('blocker retry_after cannot be bypassed', () => {
  const blocked = o.transition(fixture(), 'block', input({ blocker: { kind: 'check', reason: 'Pending external check', owner: 'check-owner', retry_after: new Date(NOW + 60000).toISOString() } }), identity, NOW);
  assert.throws(() => o.transition(blocked, 'resume', input(), identity, NOW + 1000), /has not elapsed/);
});
test('awaiting release persists ownership after merge and done is terminal', () => {
  const awaiting = o.transition(fixture(), 'awaiting-release', input(), identity, NOW);
  assert.equal(awaiting.lease.holder, null);
  assert.equal(o.resumeQueue([awaiting], [{ ...pr(), state: 'closed' }], identity, NOW)[0].priority, 1);
  const completed = o.transition(fixture(), 'done', input({ evidence: fixture().evidence }), identity, NOW);
  assert.throws(() => o.transition(completed, 'resume', input(), identity, NOW), /terminal/);
});
test('append journal resolves latest snapshot and rejects competing revisions/budget changes', () => {
  const first = fixture(); const second = o.transition(first, 'heartbeat', input(), identity, NOW + 1);
  assert.deepEqual(o.latestRecords([second, first, clone(second)]), [second]);
  const conflicting = clone(second); conflicting.next_action.action = 'Different session progress';
  assert.throws(() => o.latestRecords([second, conflicting]), /conflict/);
  const changed = clone(second); changed.attempts.max = 4;
  assert.throws(() => o.latestRecords([first, changed]), /budget changed/);
});
test('stale empty PR and exhausted work are surfaced, never silently completed', () => {
  const r = fixture(); r.attempts.used = 3;
  assert.deepEqual(o.reasons(r, { ...pr(), changed_files: 0 }, NOW + o.STALE_MS + 1), ['empty-pr', 'stale-heartbeat', 'lease-expired', 'retry-budget-exhausted']);
  assert.equal(o.resumeQueue([], [pr()], identity, NOW)[0].state, 'unregistered');
});
test('inherited failing checks are prioritized ahead of release work', () => {
  const a = fixture(); const b = fixture(); b.id = 'release-work'; b.task.pr = 21; b.state = 'awaiting-release'; b.lease = { holder: null, expires_at: null };
  const queue = o.resumeQueue([b, a], [{ ...pr(), labels: [{ name: 'status:checks-failing' }] }], identity, NOW);
  assert.equal(queue[0].id, a.id); assert.equal(queue.length, 2);
});
test('gh pagination collects page two and refuses malformed response', () => {
  const calls = [];
  const result = cli.paginated((args) => { calls.push(args); return JSON.stringify(calls.length === 1 ? Array.from({ length: 100 }, (_, i) => ({ number: i + 1 })) : [{ number: 101 }]); }, 'repos/x/y/pulls?state=open');
  assert.equal(result.length, 101); assert.match(calls[1][1], /page=2/);
  assert.throws(() => cli.paginated(() => '{}', 'x'), /pagination schema/);
});
test('gh decoder strips only ANSI SGR and rejects arbitrary prefixes/control sequences', () => {
  assert.deepEqual(cli.decode('\x1b[32m{"login":"owner"}\x1b[0m'), { login: 'owner' });
  assert.throws(() => cli.decode('prefix {"login":"owner"}'));
  assert.throws(() => cli.decode('\x1b[2J{"login":"owner"}'));
  assert.equal(cli.paginated(() => '\x1b[36m[]\x1b[0m', 'x').length, 0);
});
function mockedGh({ prs = [pr()], remote = '', comments = [], fail = false } = {}) {
  const calls = [];
  const call = (args) => {
    calls.push(args);
    if (fail) throw new Error('mock auth failure');
    const endpoint = args[1];
    if (endpoint === 'user') return JSON.stringify({ login: 'owner' });
    if (endpoint === 'repos/midnghtsapphire/revvel-standards') return JSON.stringify({ default_branch: 'trusted-main' });
    if (endpoint.includes('/contents/')) return `HTTP/2 200 OK\n\n${JSON.stringify({ encoding: 'base64', content: Buffer.from(remote).toString('base64') })}`;
    if (args.includes('POST') || args.includes('PATCH')) return '{}';
    if (endpoint.includes('/comments')) return JSON.stringify(comments);
    if (endpoint.includes('/pulls?')) return JSON.stringify(prs);
    if (endpoint.includes('/pulls/20')) return JSON.stringify(prs[0]);
    throw new Error(`Unexpected mocked endpoint ${endpoint}`);
  };
  return { call, calls };
}
test('session-start reads trusted registry and owner comments without executing body commands', () => {
  const r = fixture(); const mock = mockedGh({ prs: [{ ...pr(), body: `${pr().body}\n${o.serializeRecord(r)}` }], comments: [{ body: o.serializeRecord(r), user: { login: 'owner' } }] });
  const result = cli.run(['session-start', '--owner-id', identity.id], { gh: mock.call, readLocal: () => '' });
  assert.equal(result.queue[0].id, r.id);
  assert.ok(mock.calls.some((args) => args[1].includes('ref=trusted-main')));
  assert.ok(mock.calls.every((args) => args[0] === 'api' && !args.includes('POST') && !args.includes('PATCH')));
});
test('session-start retrieves closed PR continuation from registry', () => {
  const r = fixture(); r.state = 'awaiting-release'; r.lease = { holder: null, expires_at: null };
  const mock = mockedGh({ remote: `${JSON.stringify(r)}\n`, prs: [] });
  const original = mock.call;
  const call = (args) => args[1].endsWith('/pulls/20') ? JSON.stringify({ ...pr(), state: 'closed' }) : original(args);
  const result = cli.run(['session-start', '--owner-id', identity.id], { gh: call, readLocal: () => '' });
  assert.equal(result.queue[0].state, 'awaiting-release');
});
test('forged third-party owner comment is ignored', () => {
  const mock = mockedGh({ comments: [{ body: o.serializeRecord(fixture()), user: { login: 'intruder' } }] });
  const result = cli.run(['session-start', '--owner-id', identity.id], { gh: mock.call, readLocal: () => '' });
  assert.equal(result.queue[0].state, 'unregistered');
});
test('offline proof validation never calls gh or live URL', () => {
  const result = cli.run(['validate', '--input', 'docs/record.json'], { gh: () => assert.fail('No API permitted'), readInput: () => done() });
  assert.equal(result.valid, true); assert.match(result.verification, /structural only/);
});
test('auth failure stops once, not an empty queue/new task', () => {
  const mock = mockedGh({ fail: true });
  assert.throws(() => cli.run(['session-start', '--owner-id', identity.id], { gh: mock.call, readLocal: () => '' }), /auth failure/);
  assert.equal(mock.calls.length, 1);
});
test('schema failure stops without retry or mutation', () => {
  const mock = mockedGh({ remote: '{"bad":true}\n' });
  assert.throws(() => cli.run(['session-start', '--owner-id', identity.id], { gh: mock.call, readLocal: () => '' }), /Registry line/);
  assert.equal(mock.calls.filter((a) => a.includes('POST')).length, 0);
});
test('CLI claim appends original PR prose and comment plus journal snapshot', () => {
  const mock = mockedGh(); let persisted;
  const result = cli.run(['claim', '--owner-id', identity.id, '--id', 'owned-task', '--input', 'docs/claim.json'],
    { gh: mock.call, readLocal: () => '', readInput: () => ({ ...fixture(), ...input() }), persist: (r) => { persisted = r; }, now: () => NOW });
  assert.equal(result.record.attempts.used, 1); assert.deepEqual(persisted, result.record);
  const patch = mock.calls.find((a) => a.includes('PATCH')); assert.ok(patch.find((a) => a.startsWith('body=')).includes(pr().body));
});
test('CLI done refuses receipts from an old PR head', () => {
  const r = fixture(); const mock = mockedGh({ remote: JSON.stringify(r), prs: [{ ...pr(), head: { ...pr().head, sha: 'b'.repeat(40) } }] });
  assert.throws(() => cli.run(['done', '--owner-id', identity.id, '--id', r.id, '--input', 'docs/done.json'],
    { gh: mock.call, readLocal: () => '', readInput: () => input({ evidence: r.evidence }), now: () => NOW }), /current PR head/);
  assert.equal(mock.calls.filter((a) => a.includes('POST')).length, 0);
});
function apiMock(p, comments = []) {
  const writes = [];
  const github = { rest: { pulls: { get: async () => ({ data: p }) }, issues: {
    listComments: async () => ({ data: comments }),
    createComment: async (args) => { writes.push(['create', args]); comments.push({ id: 1, user: { login: 'github-actions[bot]' }, body: args.body }); },
    updateComment: async (args) => { writes.push(['update', args]); comments.find((c) => c.id === args.comment_id).body = args.body; },
    addLabels: async (args) => { writes.push(['labels', args]); p.labels.push(...args.labels.map((name) => ({ name }))); }
  } } };
  return { github, writes };
}
const context = { repo: { owner: 'midnghtsapphire', repo: 'revvel-standards' } };
test('stale lifecycle emits one sticky alert, deduplicated on repeat, never closes/merges', async () => {
  const p = pr(); const mock = apiMock(p);
  const options = { registry: [fixture()], now: NOW + o.STALE_MS + 1 };
  await lifecycle.observeOwnership(mock.github, context, p, options);
  await lifecycle.observeOwnership(mock.github, context, p, options);
  assert.equal(mock.writes.filter(([kind]) => kind === 'create').length, 1);
  assert.equal(mock.writes.filter(([kind]) => kind === 'update').length, 0);
  assert.equal(mock.writes.filter(([kind]) => kind === 'labels').length, 1);
});
test('lifecycle does not overwrite a pasted user alert marker', async () => {
  const p = pr(); const mock = apiMock(p, [{ id: 99, user: { login: 'owner' }, body: o.ALERT_MARKER }]);
  await lifecycle.observeOwnership(mock.github, context, p, { registry: [], now: NOW });
  assert.equal(mock.writes.filter(([kind]) => kind === 'update').length, 0);
});
test('invalid done proof gates non-draft PR without pretending live verification', async () => {
  const p = pr(); p.draft = false; const r = done(); r.evidence.release.commit = 'b'.repeat(40); r.evidence.tests[0].commit = 'b'.repeat(40);
  const mock = apiMock(p); const before = process.exitCode;
  try { const result = await lifecycle.observeOwnership(mock.github, context, p, { registry: [r], now: NOW }); assert.equal(result.failed, true); assert.ok(result.flags.includes('proof-head-mismatch')); }
  finally { process.exitCode = before; }
});
test('lifecycle paginated open PR lookup includes PRs after first hundred', async () => {
  const pages = [];
  const result = await lifecycle.openPrs({ rest: { pulls: { list: async ({ page }) => { pages.push(page); return { data: page === 1 ? Array(100).fill(pr()) : [{ ...pr(), number: 101 }] }; } } } }, 'x', 'y');
  assert.equal(result.length, 101); assert.deepEqual(pages, [1, 2]);
});
test('WR-only ownership can attach its existing PR exactly once without replacing task', () => {
  const wr = fixture(); wr.task.pr = null;
  const attached = o.transition(wr, 'attach-pr', input({ pr: 20 }), identity, NOW + 1);
  assert.equal(attached.task.pr, 20); assert.equal(attached.attempts.used, wr.attempts.used);
  assert.deepEqual(o.latestRecords([attached, wr]), [attached]);
  assert.throws(() => o.transition(attached, 'attach-pr', input({ pr: 21 }), identity, NOW + 2), /only one/);
});
test('shared metadata client sends requested page, no candidate execution', async () => {
  const original = global.fetch; const urls = [];
  try {
    global.fetch = async (url) => { urls.push(url); return { ok: true, status: 200, text: async () => '[]' }; };
    await makeClient('mock-not-secret').rest.pulls.list({ owner: 'x', repo: 'y', page: 2 });
    assert.match(urls[0], /page=2/);
  } finally { global.fetch = original; }
});
test('workflow pins checkout full SHA and skips PR-candidate execution on Windows', () => {
  const yaml = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pr-lifecycle.yml'), 'utf8');
  const active = yaml.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n');
  assert.equal((active.match(/actions\/checkout@[a-f0-9]{40}/g) || []).length, 2);
  assert.ok(active.includes("if: github.event_name == 'pull_request_target'"));
  assert.ok(!active.includes('ref: main')); assert.ok(!active.includes('head.ref'));
  assert.equal((active.match(/persist-credentials: false/g) || []).length, 2);
  assert.ok(!active.includes('schedule:'));
});

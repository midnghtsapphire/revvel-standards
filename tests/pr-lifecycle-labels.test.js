'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../scripts/pr-lifecycle-labels.mjs');
const sha = 'a'.repeat(40);
function fixture(overrides = {}) {
  return {
    pr: { number: 1, state: 'open', draft: false, head: { sha } }, labels: ['custom'],
    reviews: [{ id: 1, user: { login: 'audrey' }, state: 'APPROVED', commit_id: sha }],
    checks: [{ id: 1, name: 'test', app: { id: 1 }, status: 'completed', conclusion: 'success' }],
    statuses: [], summary: { headRefOid: sha, mergeStateStatus: 'CLEAN', reviewDecision: 'APPROVED', rollupState: 'SUCCESS' },
    ...overrides,
  };
}

test('draft/closed manage only lifecycle labels, preserving human labels', async () => {
  const { labelPlan } = await modulePromise;
  for (const state of ['draft', 'closed']) {
    const input = fixture({ labels: ['custom', 'status:ready-to-merge'], pr: { number: 1, state: state === 'closed' ? 'closed' : 'open', draft: state === 'draft', head: { sha } } });
    const plan = labelPlan(input);
    assert.deepEqual(plan.remove, ['status:ready-to-merge']);
    assert.deepEqual(plan.desired, state === 'draft' ? ['status:draft'] : []);
  }
});
test('matching state is idempotent; readiness requires server confirmation', async () => {
  const { labelPlan } = await modulePromise;
  const ready = labelPlan(fixture());
  assert.deepEqual(ready.desired, ['status:approved', 'status:checks-passing', 'status:ready-to-merge']);
  assert.deepEqual(labelPlan(fixture({ labels: ready.desired })).add, []);
  for (const summary of [null, { ...fixture().summary, mergeStateStatus: 'BLOCKED' }, { ...fixture().summary, reviewDecision: null }, { ...fixture().summary, headRefOid: 'b'.repeat(40) }]) {
    assert.ok(!labelPlan(fixture({ summary })).desired.includes('status:ready-to-merge'));
  }
});
test('pending/missing/cancelled/action-required/unknown checks never become passing', async () => {
  const { labelPlan } = await modulePromise;
  for (const checks of [[], [{ id: 1, name: 'test', status: 'in_progress', conclusion: null }], ...['cancelled', 'action_required', null, 'future'].map(conclusion => [{ id: 1, name: 'test', status: 'completed', conclusion }])]) {
    const plan = labelPlan(fixture({ checks, labels: ['status:checks-passing', 'status:ready-to-merge'] }));
    assert.ok(!plan.desired.includes('status:checks-passing'));
    assert.ok(!plan.desired.includes('status:ready-to-merge'));
    assert.deepEqual(plan.remove, ['status:checks-passing', 'status:ready-to-merge']);
  }
});
test('latest check rerun wins; failure or pending in another app still prevents passing', async () => {
  const { labelPlan } = await modulePromise;
  const success = fixture().checks[0];
  assert.ok(labelPlan(fixture({ checks: [{ ...success, id: 0, conclusion: 'failure' }, success] })).desired.includes('status:checks-passing'));
  const other = { ...success, id: 2, app: { id: 2 }, conclusion: 'failure' };
  assert.ok(labelPlan(fixture({ checks: [success, other] })).desired.includes('status:checks-failing'));
});
test('commit status contexts and server rollup are included', async () => {
  const { labelPlan } = await modulePromise;
  assert.ok(labelPlan(fixture({ statuses: [{ id: 1, context: 'external', state: 'failure' }] })).desired.includes('status:checks-failing'));
  assert.ok(!labelPlan(fixture({ statuses: [{ id: 1, context: 'external', state: 'pending' }] })).desired.includes('status:checks-passing'));
  assert.ok(labelPlan(fixture({ statuses: [{ id: 1, context: 'external', state: 'failure' }, { id: 2, context: 'external', state: 'success' }] })).desired.includes('status:checks-passing'));
  assert.ok(!labelPlan(fixture({ summary: { ...fixture().summary, rollupState: 'PENDING' } })).desired.includes('status:checks-passing'));
});
test('dismissed reviews, new heads and changes requested revoke approvals', async () => {
  const { labelPlan } = await modulePromise;
  const review = fixture().reviews[0];
  for (const reviews of [[{ ...review, commit_id: 'b'.repeat(40) }], [review, { ...review, id: 2, state: 'DISMISSED' }], [review, { ...review, id: 2, user: { login: 'other' }, state: 'CHANGES_REQUESTED' }]]) {
    assert.ok(!labelPlan(fixture({ reviews })).desired.includes('status:approved'));
  }
  assert.ok(labelPlan(fixture({ reviews: [review, { ...review, id: 2, state: 'COMMENTED' }] })).desired.includes('status:approved'));
});
test('API pagination keeps page 2, refuses untrusted redirects, redacts server bodies', async () => {
  const { githubClient } = await modulePromise;
  const calls = [];
  const client = githubClient({ token: 'secret', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => calls.length === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: i })) : [{ id: 100 }] };
  } });
  assert.equal((await client.pages('/repos/owner/repo/pulls?state=open')).length, 101);
  assert.match(calls[1].url, /page=2$/);
  assert.equal(calls[0].options.redirect, 'error');
  const bad = githubClient({ fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ message: 'secret' }) }) });
  await assert.rejects(bad.request('/repos/owner/repo'), /HTTP 403/);
  const network = githubClient({ fetchImpl: async () => { throw new Error('secret'); } });
  await assert.rejects(network.request('/x'), error => !error.message.includes('secret'));
});

function fakeClient({ move = false, fail = false, ignoreWrites = false } = {}) {
  let labels = ['custom', 'status:ready-to-merge'];
  let reads = 0;
  const writes = [];
  const client = {
    async request(path, options = {}) {
      if (options.method === 'DELETE') {
        writes.push({ path, options });
        if (!ignoreWrites) labels = labels.filter(l => l !== decodeURIComponent(path.split('/').at(-1)));
        return null;
      }
      if (options.method === 'POST') {
        writes.push({ path, options });
        if (!ignoreWrites) labels.push(...options.body.labels);
        return labels;
      }
      reads++;
      return { number: 1, state: 'open', draft: true, head: { sha: move && reads > 1 ? 'b'.repeat(40) : sha } };
    },
    async pages() {
      if (fail) throw new Error('read failed');
      return labels.map(name => ({ name }));
    },
  };
  return { client, writes, labels: () => labels };
}
test('dry run makes no writes; apply modifies only seven owned labels and verifies result', async () => {
  const { reconcile } = await modulePromise;
  const f = fakeClient();
  await reconcile(f.client, 'owner/repo', 1);
  assert.equal(f.writes.length, 0);
  const applied = await reconcile(f.client, 'owner/repo', 1, { apply: true });
  assert.equal(applied.applied, true);
  assert.deepEqual(f.labels(), ['custom', 'status:draft']);
  assert.deepEqual(f.writes.map(w => w.options.method), ['DELETE', 'POST']);
  await reconcile(f.client, 'owner/repo', 1, { apply: true });
  assert.equal(f.writes.length, 2);
});
test('head race and failed state reads make no writes', async () => {
  const { reconcile } = await modulePromise;
  for (const options of [{ move: true }, { fail: true }]) {
    const f = fakeClient(options);
    await assert.rejects(reconcile(f.client, 'owner/repo', 1, { apply: true }));
    assert.equal(f.writes.length, 0);
  }
});
test('write success response without postcondition is not reported as success', async () => {
  const { reconcile } = await modulePromise;
  await assert.rejects(reconcile(fakeClient({ ignoreWrites: true }).client, 'owner/repo', 1, { apply: true }), /verification failed/);
});
test('PR identity remains explicit even when two PRs share a head SHA', async () => {
  const { readSnapshot } = await modulePromise;
  const paths = [];
  const client = {
    request: async path => { paths.push(path); return { number: Number(path.split('/').at(-1)), state: 'open', draft: true, head: { sha } }; },
    pages: async path => { paths.push(path); return []; },
  };
  assert.equal((await readSnapshot(client, 'owner/repo', 1)).pr.number, 1);
  assert.equal((await readSnapshot(client, 'owner/repo', 2)).pr.number, 2);
  assert.ok(paths.includes('/repos/owner/repo/issues/1/labels'));
  assert.ok(paths.includes('/repos/owner/repo/issues/2/labels'));
});
test('invalid input and fixture apply are rejected before API access', async () => {
  const { validateRepo, main, labelPlan } = await modulePromise;
  for (const repo of ['https://evil/repo', 'owner/repo/extra', 'owner/..']) assert.throws(() => validateRepo(repo));
  await assert.rejects(main(['--snapshot', 'x.json', '--apply'], {}), /cannot apply/);
  await assert.rejects(main(['--repo', 'owner/repo'], {}), /Set GH_TOKEN/);
  assert.throws(() => labelPlan({}), /Incomplete snapshot/);
});

test('timer discovers open and recent closed PRs, stops at cutoff and deduplicates', async () => {
  const { discoverPrNumbers } = await modulePromise;
  const now = Date.parse('2026-11-06T00:00:00Z');
  const calls = [];
  const client = {
    pages: async () => [{ number: 1 }],
    request: async path => { calls.push(path); return [{ number: 2, updated_at: '2026-11-05T00:00:00Z' }, { number: 1, updated_at: '2026-11-04T00:00:00Z' }, { number: 3, updated_at: '2026-10-01T00:00:00Z' }]; },
  };
  assert.deepEqual(await discoverPrNumbers(client, 'owner/repo', { now }), [1, 2]);
  assert.equal(calls.length, 1);
  assert.deepEqual(await discoverPrNumbers(client, 'owner/repo', { now, closedDays: 0 }), [1]);
  assert.equal(calls.length, 1);
  await assert.rejects(discoverPrNumbers(client, 'owner/repo', { closedDays: -1 }));
});
test('live open snapshot reads reviews, check runs, statuses and GitHub server state', async () => {
  const { readSnapshot, labelPlan } = await modulePromise;
  const source = fixture();
  const client = {
    request: async (path, options) => {
      if (path === '/graphql') {
        assert.deepEqual(options.body.variables, { owner: 'owner', name: 'repo', number: 1 });
        return { data: { repository: { pullRequest: { ...source.summary, commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS' } } }] } } } } };
      }
      return source.pr;
    },
    pages: async path => path.includes('/reviews') ? source.reviews : path.includes('/check-runs') ? source.checks : path.includes('/statuses') ? source.statuses : source.labels.map(name => ({ name })),
  };
  assert.deepEqual(labelPlan(await readSnapshot(client, 'owner/repo', 1)).desired, labelPlan(source).desired);
  client.request = async path => path === '/graphql' ? { errors: [{ message: 'forbidden' }] } : source.pr;
  await assert.rejects(readSnapshot(client, 'owner/repo', 1), /query failed/);
});
test('failed label write propagates error and never returns applied success', async () => {
  const { reconcile } = await modulePromise;
  const f = fakeClient();
  const original = f.client.request;
  f.client.request = async (path, options = {}) => {
    if (options.method === 'POST') throw new Error('write denied');
    return original(path, options);
  };
  await assert.rejects(reconcile(f.client, 'owner/repo', 1, { apply: true }), /write denied/);
});

test('one racing PR does not starve later PRs; authorization failure stops batch', async () => {
  const { runBatch } = await modulePromise;
  const receipts = [];
  const f = fakeClient();
  const original = f.client.request;
  f.client.request = async (path, options) => {
    if (path.endsWith('/pulls/1')) throw new Error('PR changed during read');
    return original(path, options);
  };
  await assert.rejects(runBatch(f.client, 'owner/repo', [1, 2], { report: r => receipts.push(r) }), /1 PR/);
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].number, 1);
  assert.deepEqual(receipts[1].desired, ['status:draft']);
  receipts.length = 0;
  f.client.request = async () => { const error = new Error('forbidden'); error.status = 403; throw error; };
  await assert.rejects(runBatch(f.client, 'owner/repo', [1, 2], { report: r => receipts.push(r) }), /forbidden/);
  assert.equal(receipts.length, 1);
});
test('API budget floor prevents continued requests after low-budget response', async () => {
  const { githubClient } = await modulePromise;
  let calls = 0;
  const client = githubClient({ fetchImpl: async () => {
    calls++;
    return { ok: true, status: 200, headers: { get: () => '19' }, json: async () => [] };
  } });
  await client.request('/one');
  await assert.rejects(client.request('/two'), /below 20/);
  assert.equal(calls, 1);
});

test('review submission time outranks creation ID for a delayed pending review', async () => {
  const { labelPlan } = await modulePromise;
  const review = fixture().reviews[0];
  const plan = labelPlan(fixture({ reviews: [
    { ...review, id: 1, state: 'CHANGES_REQUESTED', submitted_at: '2026-11-06T15:00:00Z' },
    { ...review, id: 2, state: 'APPROVED', submitted_at: '2026-11-06T14:00:00Z' },
  ] }));
  assert.ok(plan.desired.includes('status:needs-action'));
  assert.ok(!plan.desired.includes('status:approved'));
});

test('batch error receipt reports possible partial writes instead of false no-change claim', async () => {
  const { runBatch } = await modulePromise;
  const f = fakeClient();
  const original = f.client.request;
  f.client.request = async (path, options = {}) => {
    if (options.method === 'POST') throw new Error('write denied');
    return original(path, options);
  };
  const receipts = [];
  await assert.rejects(runBatch(f.client, 'owner/repo', [1], { apply: true, report: receipt => receipts.push(receipt) }));
  assert.equal(receipts[0].applied, null);
  assert.equal(receipts[0].mayHaveChanged, true);
  assert.deepEqual(f.labels(), ['custom']);
});

test('badge states reuse marker, prioritize failures, and retain merged/closed information', async () => {
  const { badgeBody, BADGE_MARKER } = await modulePromise;
  assert.ok(badgeBody(fixture()).startsWith(BADGE_MARKER));
  assert.match(badgeBody(fixture(), ['status:approved', 'status:checks-failing']), /CI checks are \*\*failing\*\*/);
  assert.match(badgeBody(fixture(), ['status:needs-action', 'status:approved']), /changes requested/);
  assert.match(badgeBody(fixture({ pr: { ...fixture().pr, state: 'closed', merged: true } })), /\*\*merged\*\*/);
  assert.match(badgeBody(fixture({ pr: { ...fixture().pr, state: 'closed', merged: false } })), /closed without merging/);
});
test('badges identify configured authors, reject conflicting markers, and are idempotent', async () => {
  const { planBadge, BADGE_MARKER, parseBadgeAuthors } = await modulePromise;
  const body = `${BADGE_MARKER}\nstatus`;
  const comment = { id: 123, body, user: { login: 'github-actions[bot]' } };
  assert.equal(planBadge([comment], body, 'github-actions[bot]').action, 'unchanged');
  assert.equal(planBadge([comment], `${body}!`, 'github-actions[bot],midnghtsapphire').action, 'update');
  assert.equal(planBadge([], body, 'midnghtsapphire').action, 'create');
  assert.throws(() => planBadge([comment], body, 'someone-else'), /unconfigured author/);
  assert.throws(() => planBadge([comment, { ...comment, id: 124 }], body, 'github-actions[bot]'), /Multiple status badge/);
  assert.throws(() => parseBadgeAuthors(), /requires --badge-author/);
});
test('comment pagination locates the existing marker beyond the first 100 comments', async () => {
  const { githubClient, planBadge, BADGE_MARKER } = await modulePromise;
  let page = 0;
  const body = `${BADGE_MARKER}\nold`;
  const client = githubClient({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ++page === 1 ? Array.from({ length: 100 }, (_, id) => ({ id, body: 'discussion', user: { login: 'human' } })) : [{ id: 101, body, user: { login: 'github-actions[bot]' } }] }) });
  const plan = planBadge(await client.pages('/repos/owner/repo/issues/1/comments'), `${BADGE_MARKER}\nnew`, 'github-actions[bot]');
  assert.equal(plan.action, 'update');
  assert.equal(plan.commentId, 101);
});
function badgeClient() {
  const base = fakeClient();
  const comments = [];
  const originalRequest = base.client.request;
  const originalPages = base.client.pages;
  base.client.pages = async path => path.includes('/comments') ? comments.map(comment => ({ ...comment })) : originalPages(path);
  base.client.request = async (path, options = {}) => {
    if (path.includes('/comments') && options.method) {
      base.writes.push({ path, options });
      const comment = { id: 501, body: options.body.body, user: { login: 'midnghtsapphire' } };
      if (options.method === 'POST') comments.push(comment);
      else comments[0] = comment;
      return comment;
    }
    return originalRequest(path, options);
  };
  return { ...base, comments };
}
test('badge dry run does not write; apply creates once and later updates the same comment', async () => {
  const { reconcile, BADGE_MARKER } = await modulePromise;
  const f = badgeClient();
  const options = { badges: true, badgeAuthors: 'midnghtsapphire' };
  const dry = await reconcile(f.client, 'owner/repo', 1, options);
  assert.equal(dry.badge.action, 'create');
  assert.equal(dry.badge.applied, false);
  assert.equal(f.writes.length, 0);
  const applied = await reconcile(f.client, 'owner/repo', 1, { ...options, apply: true });
  assert.equal(applied.badge.applied, true);
  assert.equal(f.comments.length, 1);
  assert.ok(f.comments[0].body.startsWith(BADGE_MARKER));
  const count = f.writes.length;
  await reconcile(f.client, 'owner/repo', 1, { ...options, apply: true });
  assert.equal(f.writes.length, count);
  f.comments[0].body = `${BADGE_MARKER}\nold status`;
  await reconcile(f.client, 'owner/repo', 1, { ...options, apply: true });
  assert.equal(f.comments.length, 1);
  assert.equal(f.writes.at(-1).options.method, 'PATCH');
  assert.equal(f.writes.at(-1).path, '/repos/owner/repo/issues/comments/501');
});
test('foreign badge author blocks edits before label writes and missing badge author fails clearly', async () => {
  const { reconcile, BADGE_MARKER, main } = await modulePromise;
  const f = badgeClient();
  f.comments.push({ id: 9, body: `${BADGE_MARKER}\nforeign`, user: { login: 'other' } });
  await assert.rejects(reconcile(f.client, 'owner/repo', 1, { apply: true, badges: true, badgeAuthors: 'midnghtsapphire' }), /unconfigured author/);
  assert.equal(f.writes.length, 0);
  await assert.rejects(main(['--repo', 'owner/repo', '--badges'], {}), /requires --badge-author/);
});

test('concurrent owner edit to an existing badge is detected before PATCH', async () => {
  const { reconcile, BADGE_MARKER } = await modulePromise;
  const f = badgeClient();
  f.comments.push({ id: 501, body: `${BADGE_MARKER}\nold status`, user: { login: 'midnghtsapphire' } });
  const originalPages = f.client.pages;
  let commentReads = 0;
  f.client.pages = async path => {
    if (path.includes('/comments') && ++commentReads === 2) {
      f.comments[0].body = `${BADGE_MARKER}\nOwner added a note during this reconciliation.`;
    }
    return originalPages(path);
  };
  await assert.rejects(reconcile(f.client, 'owner/repo', 1, {
    apply: true, badges: true, badgeAuthors: 'midnghtsapphire',
  }), /badge changed before write/);
  assert.equal(f.writes.filter(write => write.path.includes('/comments')).length, 0);
  assert.match(f.comments[0].body, /Owner added a note/);
});

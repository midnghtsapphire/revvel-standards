'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');

function loadFeed() {
  return import(pathToFileURL(path.join(
    ROOT,
    'products/oaudrey-home/server/github-feed.mjs',
  )).href);
}

function response(body, status = 200, remaining = '500', extra = {}) {
  const headers = { 'x-ratelimit-remaining': remaining, ...extra };
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

test('redaction strips mail, tokens, and query strings', async () => {
  const { redactPublic, safeUrl, firstSentences } = await loadFeed();
  const cleaned = redactPublic('Mail hidden@example.com token=abc ghp_abcdefghijklmnop see https://example.com/a?secret=1 now');
  assert.equal(cleaned.includes('hidden@example.com'), false);
  assert.equal(cleaned.includes('ghp_'), false);
  assert.equal(cleaned.includes('secret=1'), false);
  assert.match(cleaned, /https:\/\/example.com\/a/);
  assert.equal(safeUrl('https://github.com/org/repo/pull/1?utm=1'), 'https://github.com/org/repo/pull/1');
  const sentences = firstSentences('One stays. Two stays. Three drops.', 2);
  assert.equal(sentences.includes('Three'), false);
  assert.match(sentences, /One stays\./);
  assert.match(sentences, /Two stays\./);
});

test('a later pending check is a handoff, not hidden by the working state', async () => {
  const { activityFor } = await loadFeed();
  const rolled = activityFor([
    { id: 'circleci', status: 'passing', billing: false, at: '2026-11-11T01:00:00Z' },
    { id: 'sonarcloud', status: 'pending', billing: false, at: '2026-11-11T02:00:00Z' },
  ]);
  assert.equal(rolled.activity, 'handoff');
  assert.equal(rolled.from, 'circleci');
  assert.equal(rolled.handoffTo, 'sonarcloud');
  assert.equal(activityFor([{ id: 'circleci', status: 'pending', billing: false, at: '1' }]).activity, 'working');
});

test('crew names from a title become actors, and known logins stay mapped', async () => {
  const { peopleFromPr } = await loadFeed();
  assert.deepEqual(peopleFromPr({
    login: 'midnghtsapphire',
    title: '**MarketShipper:** ci: example',
    events: [{ actor: { login: 'github-actions[bot]' } }],
    reviews: [{ login: 'cursor[bot]' }],
  }), ['midnghtsapphire', 'MarketShipper', 'github-actions[bot]', 'cursor[bot]']);
});

test('author comes from a title prefix, not a conventional type', async () => {
  const { authorFromTitle } = await loadFeed();
  assert.equal(authorFromTitle('**MarketShipper:** ci: example', 'midnghtsapphire'), 'MarketShipper');
  assert.equal(authorFromTitle('feat: add a gate', 'midnghtsapphire'), 'midnghtsapphire');
});

test('issue, check, and status streams sort on their own timestamps', async () => {
  const { stationsFromStreams, stationsFromTimeline } = await loadFeed();
  const walked = stationsFromStreams({
    issues: [
      { event: 'opened', created_at: '2026-11-11T00:00:00Z' },
      { event: 'committed', author: { date: '2026-11-11T01:00:00Z' }, message: 'subject line\n\nmore' },
      { event: 'committed', updated_at: '2026-11-11T03:00:00Z', message: 'fix the gate' },
      { event: 'reviewed', updated_at: '2026-11-11T04:00:00Z' },
      { event: 'merged', updated_at: '2026-11-11T05:00:00Z' },
      { event: 'check_run', created_at: '2026-11-11T00:00:01Z', conclusion: 'failure' },
    ],
    checks: [
      { conclusion: 'failure', completed_at: '2026-11-11T02:00:00Z', app: { slug: 'sonarqubecloud' } },
      { conclusion: 'failure', completed_at: '2026-11-11T01:30:00Z', app: { slug: 'github-actions' } },
    ],
    statuses: [
      { state: 'pending', updated_at: '2026-11-11T01:45:00Z', context: 'ci/circleci: lint' },
    ],
  });
  assert.deepEqual(walked.stations, ['prGate', 'pushPier', 'checkGrove', 'fixIt', 'reviewHut', 'mergeLagoon']);
  assert.equal(walked.subject, 'fix the gate');
  const issueOnly = stationsFromTimeline([
    { event: 'opened', created_at: '2026-11-11T00:00:00Z' },
    { event: 'check_run', created_at: '2026-11-11T02:00:00Z', conclusion: 'failure' },
    { event: 'status', created_at: '2026-11-11T02:00:00Z', state: 'failure' },
  ]);
  assert.deepEqual(issueOnly.stations, ['prGate']);
});

test('quotes use GitHub text and a pending check is only thinking', async () => {
  const { quoteFromParts } = await loadFeed();
  const thinking = quoteFromParts({
    checks: [{ status: 'pending', billing: false, title: 'ignored', summary: 'ignored', at: '2' }],
    reviews: [],
    commit: null,
  });
  assert.equal(thinking.text, 'thinking...');
  assert.equal(thinking.source, 'thinking');
  const quoted = quoteFromParts({
    checks: [{
      status: 'failing',
      billing: false,
      title: 'Quality Gate failed',
      summary: 'First sentence here. Second sentence here. Third sentence should drop. sk_live_secretvalue',
      at: '1',
    }],
    reviews: [{ body: 'Ship it. Next line.', at: '2' }],
    commit: { text: 'subject line', at: '0' },
  });
  assert.equal(quoted.source, 'review');
  assert.equal(quoted.text, 'Ship it.');
  const fromCheck = quoteFromParts({
    checks: [{
      status: 'failing',
      billing: false,
      title: 'Quality Gate failed',
      summary: 'First sentence here. Second sentence here. Third sentence should drop.',
      at: '3',
    }],
    reviews: [],
    commit: { text: 'subject line', at: '1' },
  });
  assert.equal(fromCheck.source, 'check');
  assert.match(fromCheck.text, /Quality Gate failed/);
  assert.match(fromCheck.text, /First sentence here\./);
  assert.match(fromCheck.text, /Second sentence here\./);
  assert.equal(fromCheck.text.includes('Third'), false);
});

test('missing token does not call GitHub and returns an empty feed', async () => {
  const { buildTeamReport, buildHubReport } = await loadFeed();
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error('should not fetch'); };
  const cache = new Map();
  const team = await buildTeamReport({ env: {}, fetchImpl, now: 1, cache });
  const hub = await buildHubReport({ env: {}, fetchImpl, now: 1, cache, sources: [] });
  assert.equal(calls, 0);
  assert.equal(team.connected, false);
  assert.equal(team.reason, 'missing_token');
  assert.deepEqual(team.prs, []);
  assert.equal(hub.connected, false);
  assert.deepEqual(hub.boards, []);
});

test('GitHub Actions failures are not counted and bodies stay off the payload', async () => {
  const { buildTeamReport } = await loadFeed();
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('state=open')) {
      return response([{
        number: 18372,
        title: '**MarketShipper:** ci: example hidden@example.com',
        html_url: 'https://github.com/midnghtsapphire/revvel-standards/pull/18372?utm=1',
        updated_at: '2026-11-11T04:00:00Z',
        merged_at: null,
        user: { login: 'midnghtsapphire', email: 'hidden@example.com' },
        head: { sha: 'abc' },
      }]);
    }
    if (url.includes('state=closed')) return response([]);
    if (url.includes('/check-runs')) {
      return response({
        check_runs: [
          {
            name: 'actions-lint',
            status: 'completed',
            conclusion: 'failure',
            completed_at: '2026-11-11T01:00:00Z',
            app: { slug: 'github-actions' },
            output: { title: 'nope', summary: 'hidden@example.com' },
          },
          {
            name: 'SonarCloud Code Analysis',
            status: 'completed',
            conclusion: 'failure',
            completed_at: '2026-11-11T02:00:00Z',
            app: { slug: 'sonarqubecloud' },
            output: { title: 'Quality Gate failed', summary: 'The gate failed.' },
          },
        ],
      });
    }
    if (url.endsWith('/status')) {
      return response({
        statuses: [{
          context: 'ci/circleci: lint-and-test',
          state: 'success',
          description: 'Your tests passed on CircleCI!',
          updated_at: '2026-11-11T01:30:00Z',
        }],
      });
    }
    if (url.includes('/reviews')) return response([]);
    if (url.includes('/timeline')) {
      return response([
        { event: 'opened', created_at: '2026-11-11T00:00:00Z' },
        { event: 'committed', created_at: '2026-11-11T00:30:00Z', message: 'subject line' },
      ]);
    }
    if (url.includes('/releases')) return response([]);
    if (url.includes('/tags')) return response([{ name: 'v0' }]);
    return response({}, 404);
  };
  const cache = new Map();
  const report = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 10_000,
    cache,
  });
  const again = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 10_000,
    cache,
  });
  assert.equal(again, report);
  const encoded = JSON.stringify(report);
  assert.equal(encoded.includes('hidden@example.com'), false);
  assert.equal(encoded.includes('utm=1'), false);
  assert.equal(encoded.includes('test-token-not-real'), false);
  assert.equal(report.connected, true);
  assert.equal(report.failing, 1);
  assert.equal(report.passing >= 1, true);
  assert.equal(report.prs[0].author, 'MarketShipper');
  assert.equal(report.prs[0].status, 'failing');
  assert.equal(report.prs[0].stations.includes('prGate'), true);
  assert.equal(report.team.some((member) => member.id === 'github-actions' && member.activity === 'failed'), false);
  assert.equal(report.team.some((member) => member.id === 'github-actions' && member.activity === 'billing' && member.station === 'castle'), true);
  assert.equal(report.team.some((member) => member.name === 'MarketShipper' && member.logo == null && member.via === 'author'), true);
  assert.equal(report.team.some((member) => member.id === 'sonarcloud' && member.station === 'fixIt'), true);
  assert.equal(report.spots.circleci === 'off', false);
  assert.equal(report.spots.sonarcloud === 'off', false);
  assert.equal(report.release.lit, true);
  assert.equal(report.release.name, 'v0');
});

test('hub bodies stay off unless a source opts in, and then they are redacted', async () => {
  const { buildHubReport, loadHubSources } = await loadFeed();
  const shipped = loadHubSources(fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/hub-sources.json'), 'utf8'));
  assert.equal(shipped.every((source) => source.showBodies === false), true);
  assert.equal(shipped.some((source) => source.number === 18238), true);
  assert.equal(shipped.some((source) => source.repo === 'moneycrew-hub'), true);
  const fetchImpl = async () => response({
    data: {
      repository: {
        discussion: {
          title: 'Whiteboard: agents post here',
          url: 'https://github.com/midnghtsapphire/revvel-standards/discussions/18238?x=1',
          updatedAt: '2026-11-11T00:00:00Z',
          author: { login: 'midnghtsapphire' },
          comments: {
            totalCount: 1,
            nodes: [{
              createdAt: '2026-11-11T01:00:00Z',
              author: { login: 'gitar-bot[bot]' },
              body: 'See sk_live_secretvalue and hidden@example.com.',
            }],
          },
        },
      },
    },
  });
  const hidden = await buildHubReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 20_000,
    cache: new Map(),
    sources: [{ id: 'whiteboard-18238', label: 'Whiteboard', kind: 'discussion', owner: 'midnghtsapphire', repo: 'revvel-standards', number: 18238, showBodies: false }],
  });
  assert.equal(JSON.stringify(hidden).includes('sk_live_'), false);
  assert.equal(hidden.boards[0].threads[0].comments[0].body, undefined);
  assert.equal(hidden.boards[0].threads[0].url.includes('?'), false);
  const shown = await buildHubReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 20_000,
    cache: new Map(),
    sources: [{ id: 'whiteboard-18238', label: 'Whiteboard', kind: 'discussion', owner: 'midnghtsapphire', repo: 'revvel-standards', number: 18238, showBodies: true }],
  });
  assert.match(shown.boards[0].threads[0].comments[0].body, /\[redacted\]/);
  assert.equal(shown.boards[0].threads[0].comments[0].body.includes('sk_live_'), false);
});

test('a 403 is permission unless the rate-limit signals are present', async () => {
  const { githubFailureReason, buildTeamReport } = await loadFeed();
  const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null });
  assert.equal(githubFailureReason(403, headers({ 'x-ratelimit-remaining': '4000' }), { message: 'Resource not accessible by integration' }), 'permission');
  assert.equal(githubFailureReason(403, headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1' }), { message: 'API rate limit exceeded' }), 'rate_limited');
  assert.equal(githubFailureReason(403, headers({ 'retry-after': '30' }), { message: 'slow down' }), 'rate_limited');
  assert.equal(githubFailureReason(403, headers({}), { message: 'You have exceeded a secondary rate limit.' }), 'rate_limited');

  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    if (url.includes('state=open')) {
      return response({ message: 'Resource not accessible by integration' }, 403, '4000');
    }
    return response({}, 404);
  };
  const denied = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 1_000,
    cache: new Map(),
  });
  assert.equal(denied.connected, false);
  assert.equal(denied.reason, 'permission');
  assert.equal(denied.partial, false);
});

test('any 429 is rate-limited and backs off with retry-after or exponential delay', async () => {
  const { githubFailureReason, backoffUntil, buildTeamReport } = await loadFeed();
  const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null });
  assert.equal(githubFailureReason(429, headers({ 'x-ratelimit-remaining': '4000' }), {}), 'rate_limited');
  assert.equal(githubFailureReason(429, headers({}), { message: 'unrelated' }), 'rate_limited');
  assert.equal(backoffUntil(headers({ 'retry-after': '10' }), 1_000, 4), 11_000);
  assert.equal(backoffUntil(headers({}), 1_000, 1), 61_000);
  assert.equal(backoffUntil(headers({}), 1_000, 2), 121_000);
  assert.equal(backoffUntil(headers({ 'x-ratelimit-reset': '5' }), 1_000, 3), 241_000);
  assert.equal(backoffUntil(headers({}), 0, 20), 15 * 60 * 1000);

  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ message: 'unrelated' }, 429, '4000');
  };
  const cache = new Map();
  const blocked = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 1_000,
    cache,
  });
  assert.equal(blocked.reason, 'rate_limited');
  assert.equal(blocked.connected, false);
  await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 30_000,
    cache,
  });
  assert.equal(calls, 1);
  await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 62_000,
    cache,
  });
  assert.equal(calls, 2);
  await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 100_000,
    cache,
  });
  assert.equal(calls, 2);
});

test('a rate-limited 403 waits before the next team call', async () => {
  const { buildTeamReport, githubFailureReason } = await loadFeed();
  const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null });
  assert.equal(githubFailureReason(403, headers({ 'x-ratelimit-remaining': '20', 'retry-after': '15' }), { message: 'slow down' }), 'rate_limited');
  assert.equal(githubFailureReason(403, headers({ 'x-ratelimit-remaining': '20' }), { message: 'You have triggered an abuse detection mechanism.' }), 'rate_limited');
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ message: 'You have exceeded a secondary rate limit.' }, 403, '4000');
  };
  const cache = new Map();
  const blocked = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 10_000,
    cache,
  });
  assert.equal(blocked.reason, 'rate_limited');
  await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 20_000,
    cache,
  });
  assert.equal(calls, 1);
  await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 71_000,
    cache,
  });
  assert.equal(calls, 2);
});

test('a review-only login keeps the review sentence on its sprite', async () => {
  const { buildTeamReport } = await loadFeed();
  const fetchImpl = async (url) => {
    if (url.includes('state=open')) {
      return response([{
        number: 9,
        title: 'feat: example',
        html_url: 'https://github.com/midnghtsapphire/revvel-standards/pull/9',
        updated_at: '2026-11-11T04:00:00Z',
        merged_at: null,
        user: { login: 'midnghtsapphire' },
        head: { sha: 'abc' },
      }]);
    }
    if (url.includes('state=closed')) return response([]);
    if (url.includes('/check-runs')) return response({ check_runs: [] });
    if (url.endsWith('/status')) return response({ statuses: [] });
    if (url.includes('/reviews')) {
      return response([
        { user: { login: 'cursor[bot]' }, state: 'COMMENTED', submitted_at: '2026-11-11T05:00:00Z', body: 'Ship the gate. Next line.' },
        { user: { login: 'octocat' }, state: 'COMMENTED', submitted_at: '2026-11-11T05:01:00Z', body: 'Looks good to me.' },
      ]);
    }
    if (url.includes('/timeline')) return response([]);
    if (url.includes('/releases')) return response([]);
    if (url.includes('/tags')) return response([]);
    return response({}, 404);
  };
  const report = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 5_000,
    cache: new Map(),
  });
  const cursor = report.team.find((member) => member.id === 'cursor');
  assert.equal(cursor.speech, 'Ship the gate.');
  assert.equal(cursor.quoteSource, 'review');
  const person = report.team.find((member) => member.id === 'octocat');
  assert.equal(person.speech, 'Looks good to me.');
  assert.equal(person.via, 'author');
});

test('a partial board is not cached as a live connection, and one build is shared', async () => {
  const { buildTeamReport } = await loadFeed();
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchImpl = async (url) => {
    calls += 1;
    if (url.includes('state=open')) {
      await gate;
      return response([{
        number: 1,
        title: 'feat: example',
        html_url: 'https://github.com/midnghtsapphire/revvel-standards/pull/1',
        updated_at: '2026-11-11T04:00:00Z',
        merged_at: null,
        user: { login: 'midnghtsapphire' },
        head: { sha: 'abc' },
      }]);
    }
    if (url.includes('state=closed')) return response([]);
    if (url.includes('/check-runs')) {
      return response({ message: 'Resource not accessible by integration' }, 403, '4000');
    }
    return response({}, 404);
  };
  const cache = new Map();
  const first = buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 5_000,
    cache,
  });
  const second = buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 5_000,
    cache,
  });
  assert.equal(calls, 1);
  release();
  const [report, again] = await Promise.all([first, second]);
  assert.equal(again, report);
  assert.equal(report.partial, true);
  assert.equal(report.connected, false);
  const before = calls;
  const cached = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 6_000,
    cache,
  });
  assert.equal(cached, report);
  assert.equal(calls, before);
  const later = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl,
    now: 5_000 + 61_000,
    cache,
  });
  assert.equal(later.connected, false);
  assert.equal(calls > before, true);

  let limitedCalls = 0;
  const reset = String(Math.floor((20_000 + 120_000) / 1000));
  const limitedFetch = async () => {
    limitedCalls += 1;
    return response({ message: 'API rate limit exceeded' }, 403, '0', { 'x-ratelimit-reset': reset });
  };
  const limitedCache = new Map();
  const blocked = await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl: limitedFetch,
    now: 20_000,
    cache: limitedCache,
  });
  assert.equal(blocked.reason, 'rate_limited');
  assert.equal(blocked.connected, false);
  const during = limitedCalls;
  await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl: limitedFetch,
    now: 30_000,
    cache: limitedCache,
  });
  assert.equal(limitedCalls, during);
  await buildTeamReport({
    env: { GITHUB_READ_TOKEN: 'test-token-not-real' },
    fetchImpl: limitedFetch,
    now: 20_000 + 121_000,
    cache: limitedCache,
  });
  assert.equal(limitedCalls > during, true);
});

test('front page scene stays original, quoted, and under the size budget', () => {
  const scene = ['world.js', 'themes.js', 'oaudrey-mascot.svg']
    .map((name) => fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/public', name)))
    .reduce((sum, buf) => sum + buf.length, 0);
  const logos = fs.readdirSync(path.join(ROOT, 'products/oaudrey-home/public/logos'))
    .filter((name) => name.endsWith('.png'))
    .reduce((sum, name) => sum + fs.statSync(path.join(ROOT, 'products/oaudrey-home/public/logos', name)).size, 0);
  assert.ok(scene + logos < 120000, `scene bytes ${scene + logos}`);
  const world = fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/public/world.js'), 'utf8');
  const themes = fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/public/themes.js'), 'utf8');
  assert.equal(/pac-?man/i.test(world + themes), false);
  assert.equal(world.includes('Candy Land'), false);
  assert.match(themes, /GitCandyland/);
  assert.match(themes, /defaultId: 'candy'/);
  assert.match(themes, /GitAloha/);
  const html = fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/public/index.html'), 'utf8');
  assert.match(html, /oaudrey-mascot\.svg/);
  assert.match(html, /oaudrey-logo-192\.webp/);
  assert.match(html, /GitHub MCP servers/);
  assert.match(html, /GitHub MCP server/);
  assert.match(html, /"@type": "ItemList"/);
  assert.match(world, /roundRect\(ctx, -32, -10, 64, 44, 14\)/);
  assert.match(world, /How it connects/);
  assert.match(world, /activity === 'billing' \? 'skipped \(billing\)'/);
  const connections = JSON.parse(fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/public/team-connections.json'), 'utf8'));
  assert.equal(connections.githubMcp.name, 'GitHub MCP server');
  assert.match(connections.githubMcp.docs, /^https:\/\//);
  assert.match(connections.githubMcp.snippet, /api\.githubcopilot\.com\/mcp/);
  Object.values(connections.tools).forEach((tool) => {
    assert.ok(tool.paths.length > 0);
    tool.paths.forEach((pathInfo) => {
      assert.match(pathInfo.docs, /^https:\/\//);
      assert.match(pathInfo.chip, /^(App|Action|CLI|MCP|API|Status)$/);
    });
  });
  ['oaudrey-logo.jpg', 'oaudrey-logo-512.webp', 'oaudrey-logo-192.webp', 'favicon-32.png', 'apple-touch-icon.png'].forEach((name) => {
    assert.ok(fs.statSync(path.join(ROOT, 'products/oaudrey-home/public', name)).size > 500);
  });
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /https:\/\/music\.youtube\.com\/watch\?v=12AT-n9gttM/);
  assert.equal(/<iframe/i.test(html), false);
  assert.equal(/autoplay/i.test(html), false);
  assert.match(html, /id="oaudrey-intro"/);
  assert.match(html, /poster="oaudrey-intro-poster\.jpg"/);
  assert.match(html, /controls/);
  assert.match(html, /oaudrey-intro\.vtt/);
  assert.match(html, /Aloha! Get GitHub Fused Today! Hula with us\./);
  assert.match(html, /"@type": "VideoObject"/);
  assert.match(html, /"duration": "PT5S"/);
  assert.match(html, /"uploadDate": "2026-11-11"/);
  assert.equal(/<video[^>]*\sloop[\s>]/i.test(html), false);
  const intro = fs.statSync(path.join(ROOT, 'products/oaudrey-home/public/oaudrey-intro.mp4'));
  assert.ok(intro.size > 10000 && intro.size < 2000000, `intro bytes ${intro.size}`);
  assert.match(html, /quoted from GitHub|world-caption/);
  const fixture = fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/public/world-fixture.html'), 'utf8');
  assert.match(fixture, /Fixture — not live data/);
  assert.match(fixture, /noindex/);
  assert.match(world, /function showSkin\(\)[\s\S]{0,400}world-brand/);
  const afterSave = world.slice(world.indexOf("getItem('oaudrey-theme')"));
  assert.match(afterSave.slice(0, afterSave.indexOf('function boot')), /showSkin\(\)/);
  assert.match(world.slice(world.indexOf('function setTheme')), /showSkin\(\)/);
});

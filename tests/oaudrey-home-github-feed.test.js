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

function response(body, status = 200, remaining = '500') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'x-ratelimit-remaining' ? remaining : null) },
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

test('author comes from a title prefix, not a conventional type', async () => {
  const { authorFromTitle } = await loadFeed();
  assert.equal(authorFromTitle('**MarketShipper:** ci: example', 'midnghtsapphire'), 'MarketShipper');
  assert.equal(authorFromTitle('feat: add a gate', 'midnghtsapphire'), 'midnghtsapphire');
});

test('timeline walks stations in order and a later push is the fix stop', async () => {
  const { stationsFromTimeline } = await loadFeed();
  const walked = stationsFromTimeline([
    { event: 'opened', created_at: '2026-11-11T00:00:00Z' },
    { event: 'committed', created_at: '2026-11-11T01:00:00Z', message: 'subject line\n\nmore' },
    { event: 'check_run', created_at: '2026-11-11T02:00:00Z', conclusion: 'failure' },
    { event: 'committed', created_at: '2026-11-11T03:00:00Z', message: 'fix the gate' },
    { event: 'reviewed', created_at: '2026-11-11T04:00:00Z' },
    { event: 'merged', created_at: '2026-11-11T05:00:00Z' },
  ]);
  assert.deepEqual(walked.stations, ['prGate', 'pushPier', 'checkGrove', 'fixIt', 'reviewHut', 'mergeLagoon']);
  assert.equal(walked.subject, 'fix the gate');
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
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /https:\/\/music\.youtube\.com\/watch\?v=12AT-n9gttM/);
  assert.equal(/<iframe/i.test(html), false);
  assert.equal(/autoplay/i.test(html), false);
  assert.match(html, /quoted from GitHub|world-caption/);
  const fixture = fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/public/world-fixture.html'), 'utf8');
  assert.match(fixture, /Fixture — not live data/);
  assert.match(fixture, /noindex/);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  isExternal,
  deriveLiveUrl,
  classifyApp,
  isIncomplete,
  summarize,
  buildScoreboard,
  renderScoreboardHtml,
  buildWorklistBody,
  WORKLIST_MARKER,
} = require('../scripts/biome/inspector');

const BASE = 'https://midnghtsapphire.github.io/revvel-standards';

test('deriveLiveUrl: explicit live_url wins', () => {
  assert.equal(deriveLiveUrl('x', { live_url: 'https://x.dev' }, BASE), 'https://x.dev');
});

test('deriveLiveUrl: internal app derives /docs/<app>/', () => {
  assert.equal(deriveLiveUrl('osint-hub', { path: 'osint-hub', type: 'web', live_url: '' }, BASE), `${BASE}/docs/osint-hub/`);
});

test('deriveLiveUrl: external app with no explicit url derives nothing', () => {
  assert.equal(deriveLiveUrl('sessiono', { path: 'external', repo: 'midnghtsapphire/sessiono', live_url: '' }, BASE), '');
});

test('deriveLiveUrl: non-http(s) values are ignored (not counted as live)', () => {
  assert.equal(deriveLiveUrl('x', { live_url: 'ftp://x' }, BASE), '');
  assert.equal(deriveLiveUrl('x', { path: 'x', live_url: '' }, 'javascript:alert(1)'), '');
});

test('isExternal detects repo/path/type', () => {
  assert.equal(isExternal({ repo: 'a/b' }), true);
  assert.equal(isExternal({ path: 'external' }), true);
  assert.equal(isExternal({ path: 'products/x', type: 'web' }), false);
});

test('classifyApp: 2xx is live, others unreachable, missing url is no-link', () => {
  assert.equal(classifyApp({ name: 'a', url: 'u', status: 200 }).state, 'live');
  assert.equal(classifyApp({ name: 'a', url: 'u', status: 404 }).state, 'unreachable');
  assert.equal(classifyApp({ name: 'a', url: 'u', status: 0 }).state, 'unreachable');
  assert.equal(classifyApp({ name: 'a', url: '', external: false }).state, 'no-link');
  assert.equal(classifyApp({ name: 'a', url: '', external: true }).state, 'external-no-link');
});

test('isIncomplete flags no-link and unreachable only (external-no-link excluded)', () => {
  assert.equal(isIncomplete({ state: 'no-link' }), true);
  assert.equal(isIncomplete({ state: 'unreachable' }), true);
  assert.equal(isIncomplete({ state: 'live' }), false);
  assert.equal(isIncomplete({ state: 'external-no-link' }), false);
});

test('summarize + scoreboard overall reflects incompleteness', () => {
  const apps = [
    classifyApp({ name: 'a', url: 'u', status: 200 }),
    classifyApp({ name: 'b', url: 'u', status: 503 }),
    classifyApp({ name: 'c', url: '', external: false }),
    classifyApp({ name: 'd', url: '', external: true }),
  ];
  const sb = buildScoreboard(apps, '2026-06-30T00:00:00Z', BASE);
  assert.equal(sb.schema, 'biome-app-completion/v1');
  assert.equal(sb.credit_free, true);
  assert.deepEqual(sb.summary, { total: 4, live: 1, unreachable: 1, no_link: 1, external: 1 });
  assert.equal(sb.overall, 'incomplete');
});

test('scoreboard overall is all-testable-live when nothing incomplete', () => {
  const apps = [classifyApp({ name: 'a', url: 'u', status: 200 }), classifyApp({ name: 'b', url: '', external: true })];
  assert.equal(buildScoreboard(apps, 't', BASE).overall, 'all-testable-live');
});

test('scoreboard overall is pending when no apps checked yet (no false-green seed)', () => {
  const sb = buildScoreboard([], 't', BASE);
  assert.equal(sb.overall, 'pending');
  assert.equal(sb.summary.total, 0);
});

test('worklist body carries marker and lists the gap per app', () => {
  const apps = [
    classifyApp({ name: 'good', url: 'u', status: 200 }),
    classifyApp({ name: 'broke', url: 'https://x/docs/broke/', status: 404 }),
    classifyApp({ name: 'missing', url: '', external: false }),
  ];
  const body = buildWorklistBody(apps, '2026-06-30T00:00:00Z');
  assert.ok(body.includes(WORKLIST_MARKER));
  assert.ok(body.includes('broke'));
  assert.ok(body.includes('missing'));
  assert.ok(!body.includes('- **good**')); // live app not listed
});

test('renderScoreboardHtml escapes and is self-contained', () => {
  const sb = buildScoreboard([classifyApp({ name: 'x<b>', url: 'u', status: 200 })], 't', BASE);
  const html = renderScoreboardHtml(sb);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('x&lt;b&gt;'));
});

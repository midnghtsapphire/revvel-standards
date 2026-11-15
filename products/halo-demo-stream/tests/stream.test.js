import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, runAgent } from './helpers.js';
import { EventType, reduceEvent } from '../src/agui.js';
import { filterAndSortPrograms, affiliatePrograms } from '../../affiliate-hub/app/lib/programs.mjs';

const SESSION = 'stream-test-session';

test('stream is SSE and events arrive in AG-UI order', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const r = await runAgent(s.base, { threadId: SESSION, deviceId: 'laptop', query: { searchTerm: '', filterType: 'recurring', sortBy: 'ltv' } });
  assert.equal(r.status, 200);
  assert.match(r.contentType, /^text\/event-stream/);
  const types = r.events.map((e) => e.type);
  // Collapse the repeated content events, then check the whole run shape.
  const shape = types.filter((x, i) => !(x === EventType.TEXT_MESSAGE_CONTENT && types[i - 1] === EventType.TEXT_MESSAGE_CONTENT));
  assert.deepEqual(shape, [
    'RUN_STARTED', 'STATE_SNAPSHOT', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'STATE_DELTA', 'RUN_FINISHED',
  ]);
  assert.ok(types.filter((x) => x === 'TEXT_MESSAGE_CONTENT').length >= 3, 'text arrives in several chunks');
  assert.equal(r.events[0].threadId, SESSION);
  assert.equal(r.events[0].runId, 'run-test');
  // every content event belongs to the started message
  const start = r.events.find((e) => e.type === 'TEXT_MESSAGE_START');
  for (const e of r.events.filter((x) => x.type === 'TEXT_MESSAGE_CONTENT')) assert.equal(e.messageId, start.messageId);
});

test('streamed results come from the real affiliate-hub code, not canned text', async (t) => {
  const s = await startServer();
  t.after(s.close);
  for (const query of [
    { searchTerm: '', filterType: 'recurring', sortBy: 'ltv' },
    { searchTerm: 'course', filterType: 'all', sortBy: 'name' },
    { searchTerm: 'zzz-no-such-program', filterType: 'all', sortBy: 'ltv' },
  ]) {
    const r = await runAgent(s.base, { threadId: `real-${Math.abs(JSON.stringify(query).length)}-${query.sortBy}-x`, deviceId: 'd', query });
    let view = { state: {}, messages: [] };
    for (const e of r.events) view = reduceEvent(view, e);
    const expected = filterAndSortPrograms(query).map((p) => p.name);
    assert.deepEqual(view.state.results.map((p) => p.name), expected);
    assert.equal(view.state.catalogueSize, affiliatePrograms.length);
    for (const name of expected) assert.ok(view.messages[0].text.includes(name), `${name} streamed`);
  }
});

test('events are delivered progressively, not buffered until the end', async (t) => {
  const s = await startServer({ streamDelayMs: 40 });
  t.after(s.close);
  const r = await runAgent(s.base, { threadId: 'progressive-session', deviceId: 'd', query: { filterType: 'all', sortBy: 'ltv' } });
  assert.equal(r.events.at(-1).type, 'RUN_FINISHED');
  const first = r.arrivals[0];
  const last = r.arrivals.at(-1);
  assert.ok(last - first > 200, `spread ${Math.round(last - first)}ms shows streaming`);
  assert.ok(first < last / 2, 'first event arrives well before the last');
});

test('bad requests are rejected without opening a stream', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const post = (body, raw) => fetch(`${s.base}/agui`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) });
  assert.equal((await post({ threadId: '../etc/passwd' })).status, 400);
  assert.equal((await post({})).status, 400);
  assert.equal((await post(null, 'not json')).status, 400);
  assert.equal((await post({ threadId: 'valid-session-id', forwardedProps: { product: 'nope' } })).status, 404);
  assert.equal((await fetch(`${s.base}/health`)).status, 200);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, runAgent } from './helpers.js';
import { applyPatch } from '../src/agui.js';

const finalState = (events) => {
  const snap = events.find((e) => e.type === 'STATE_SNAPSHOT').snapshot;
  const delta = events.find((e) => e.type === 'STATE_DELTA').delta;
  return applyPatch(snap, delta);
};

test('second device with a new client and the same session id resumes the first device\'s state', async (t) => {
  const s = await startServer();
  t.after(s.close);
  const id = 'cross-device-001';

  const phone = await runAgent(s.base, { threadId: id, deviceId: 'phone', query: { searchTerm: '', filterType: 'recurring', sortBy: 'name' } });
  const phoneState = finalState(phone.events);
  assert.equal(phoneState.runs, 1);
  assert.equal(phoneState.lastDevice, 'phone');

  // Brand-new client (no shared connection or memory) on a "second device".
  const laptop = await runAgent(s.base, { threadId: id, deviceId: 'laptop', query: { searchTerm: '', filterType: 'hybrid', sortBy: 'ltv' } });
  const resumed = laptop.events.find((e) => e.type === 'STATE_SNAPSHOT').snapshot;
  assert.deepEqual(resumed, phoneState, 'opening snapshot is exactly what the phone committed');

  const laptopState = finalState(laptop.events);
  assert.equal(laptopState.runs, 2);
  assert.equal(laptopState.lastDevice, 'laptop');
  assert.deepEqual(laptopState.history.map((h) => h.device), ['phone', 'laptop']);

  // And read-only resume lookup (what the page does on load, before any run).
  const rec = await (await fetch(`${s.base}/a2ui/sessions/${id}`)).json();
  assert.equal(rec.revision, 2);
  assert.deepEqual(rec.state, laptopState);
});

test('state survives a full server restart (persisted on disk)', async (t) => {
  const a = await startServer();
  const id = 'restart-session-1';
  const first = await runAgent(a.base, { threadId: id, deviceId: 'phone', query: { filterType: 'one-time', sortBy: 'ltv' } });
  const committed = finalState(first.events);
  await a.close();

  const b = await startServer({ dataDir: a.dataDir });
  t.after(b.close);
  const rec = await (await fetch(`${b.base}/a2ui/sessions/${id}`)).json();
  assert.deepEqual(rec.state, committed);
  const again = await runAgent(b.base, { threadId: id, deviceId: 'tablet', query: { filterType: 'all', sortBy: 'ltv' } });
  assert.equal(finalState(again.events).runs, 2);
});

test('sessions are isolated and unknown sessions 404', async (t) => {
  const s = await startServer();
  t.after(s.close);
  await runAgent(s.base, { threadId: 'isolated-aaaa', deviceId: 'a', query: {} });
  const other = await runAgent(s.base, { threadId: 'isolated-bbbb', deviceId: 'b', query: {} });
  assert.equal(other.events.find((e) => e.type === 'STATE_SNAPSHOT').snapshot.runs, 0);
  assert.equal((await fetch(`${s.base}/a2ui/sessions/never-created-1`)).status, 404);
  assert.equal((await fetch(`${s.base}/a2ui/sessions/..%2Fx`)).status, 400);
});

test('two devices running at the same moment are serialised, no lost update', async (t) => {
  const s = await startServer({ streamDelayMs: 10 });
  t.after(s.close);
  const id = 'concurrent-001';
  const [a, b] = await Promise.all([
    runAgent(s.base, { threadId: id, deviceId: 'a', query: { filterType: 'recurring' } }),
    runAgent(s.base, { threadId: id, deviceId: 'b', query: { filterType: 'hybrid' } }),
  ]);
  const runs = [finalState(a.events).runs, finalState(b.events).runs].sort();
  assert.deepEqual(runs, [1, 2]);
  assert.equal((await (await fetch(`${s.base}/a2ui/sessions/${id}`)).json()).state.runs, 2);
});

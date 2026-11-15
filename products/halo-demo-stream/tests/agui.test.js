import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPatch, createSSEParser, diffState, encodeSSE, reduceEvent, EventType } from '../src/agui.js';

test('SSE frames round-trip and survive arbitrary chunk splits', () => {
  const events = [{ type: EventType.RUN_STARTED, threadId: 't', runId: 'r' }, { type: EventType.RUN_FINISHED, threadId: 't', runId: 'r' }];
  const wire = events.map(encodeSSE).join('');
  const parser = createSSEParser();
  const got = [];
  for (let i = 0; i < wire.length; i += 7) got.push(...parser.push(wire.slice(i, i + 7)));
  assert.deepEqual(got, events);
});

test('JSON Patch add/replace/remove and "-" append, input not mutated', () => {
  const doc = { a: 1, list: [1], gone: true, nest: { x: 1 } };
  const out = applyPatch(doc, [
    { op: 'replace', path: '/a', value: 2 },
    { op: 'add', path: '/list/-', value: 2 },
    { op: 'remove', path: '/gone' },
    { op: 'add', path: '/nest/y', value: 5 },
  ]);
  assert.deepEqual(out, { a: 2, list: [1, 2], nest: { x: 1, y: 5 } });
  assert.deepEqual(doc, { a: 1, list: [1], gone: true, nest: { x: 1 } });
  assert.throws(() => applyPatch(doc, [{ op: 'replace', path: '/missing/deep', value: 1 }]));
});

test('diffState produces a patch that rebuilds the next state (appends stay appends)', () => {
  const prev = { n: 1, history: [{ r: 1 }], same: [1, 2], old: 1 };
  const next = { n: 2, history: [{ r: 1 }, { r: 2 }], same: [1, 2], fresh: 'x' };
  const patch = diffState(prev, next);
  assert.ok(patch.some((o) => o.op === 'add' && o.path === '/history/-'));
  assert.deepEqual(applyPatch(prev, patch), next);
});

test('reduceEvent folds a full run into state, message text and status', () => {
  let v = { state: {}, messages: [] };
  for (const e of [
    { type: 'RUN_STARTED', threadId: 't', runId: 'r' },
    { type: 'STATE_SNAPSHOT', snapshot: { n: 1 } },
    { type: 'TEXT_MESSAGE_START', messageId: 'm', role: 'assistant' },
    { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'hel' },
    { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'lo' },
    { type: 'TEXT_MESSAGE_END', messageId: 'm' },
    { type: 'STATE_DELTA', delta: [{ op: 'replace', path: '/n', value: 2 }] },
    { type: 'RUN_FINISHED', threadId: 't', runId: 'r' },
  ]) v = reduceEvent(v, e);
  assert.deepEqual(v.state, { n: 2 });
  assert.equal(v.messages[0].text, 'hello');
  assert.equal(v.status, 'finished');
});

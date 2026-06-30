'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const {
  ARM_RUNNERS,
  extractCitations,
  parseRunnerOutput,
  modelEnvFor,
  makeDispatch,
} = require('../products/rnd-research-fleet/dispatch-arms');

// A fake child process: EventEmitter with stdout/stderr emitters + kill().
function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.kill = () => { child.killed = true; return true; };
  return child;
}

// --- pure helpers ---

test('extractCitations dedupes and strips trailing punctuation', () => {
  assert.deepEqual(
    extractCitations('see https://x.com, and https://x.com. also https://y.com)'),
    ['https://x.com', 'https://y.com']
  );
  assert.deepEqual(extractCitations(null), []);
});

test('parseRunnerOutput: twin/triplet JSON report -> answer/citations/cost', () => {
  const report = {
    strategy: 'twin_llm_adjudicated',
    results: [{ query_id: 'q', answer: 'merged answer', citations: ['https://a.com', 'https://b.com'], cost_usd: 0.0123 }],
  };
  const r = parseRunnerOutput('twin', `[twin] noise on the same buffer ${JSON.stringify(report)}`);
  assert.equal(r.answer, 'merged answer');
  assert.deepEqual(r.citations, ['https://a.com', 'https://b.com']);
  assert.equal(r.cost_usd, 0.0123);
});

test('parseRunnerOutput: deep-search text after the marker', () => {
  const r = parseRunnerOutput('single', 'banner\nRESEARCH COMPLETE\n══\nHello world https://z.com here');
  assert.match(r.answer, /^Hello world/);
  assert.deepEqual(r.citations, ['https://z.com']);
  assert.equal(r.cost_usd, null);
});

test('modelEnvFor maps per-kind overrides', () => {
  assert.deepEqual(modelEnvFor('twin', 'x/y'), { TWIN_MODEL_A: 'x/y' });
  assert.deepEqual(modelEnvFor('triplet', 'x/y'), { TRIPLET_MODEL_1: 'x/y' });
  assert.deepEqual(modelEnvFor('single', 'deep_search'), {}); // single uses --profile argv, not env
  assert.deepEqual(modelEnvFor('twin', ''), {});
});

// --- dispatch integration (injected spawn) ---

test('makeDispatch single: streams progress, parses deep-search stdout', async () => {
  const child = fakeChild();
  const progress = [];
  const dispatch = makeDispatch('q', { spawnFn: () => child });
  const p = dispatch({ id: 'a', kind: 'single', model: 'deep_search' }, { onProgress: () => progress.push(1) });
  child.stdout.emit('data', 'banner\nRESEARCH COMPLETE\n══\nThe answer https://x.com.');
  child.emit('close', 0);
  const r = await p;
  assert.match(r.answer, /The answer/);
  assert.deepEqual(r.citations, ['https://x.com']);
  assert.ok(progress.length >= 1);
});

test('makeDispatch twin: parses the JSON report on stdout', async () => {
  const child = fakeChild();
  const dispatch = makeDispatch('q', { spawnFn: () => child });
  const p = dispatch({ id: 't', kind: 'twin' }, {});
  const report = { results: [{ query_id: 'cli', answer: 'merged', citations: ['https://a.com'], cost_usd: 0.01 }] };
  child.stderr.emit('data', '[twin] A=… B=…'); // progress on stderr
  child.stdout.emit('data', JSON.stringify(report));
  child.emit('close', 0);
  const r = await p;
  assert.equal(r.answer, 'merged');
  assert.deepEqual(r.citations, ['https://a.com']);
  assert.equal(r.cost_usd, 0.01);
});

test('makeDispatch: aborting kills the child and rejects', async () => {
  const child = fakeChild();
  const ac = new AbortController();
  const dispatch = makeDispatch('q', { spawnFn: () => child });
  const p = dispatch({ id: 'a', kind: 'single' }, { signal: ac.signal });
  ac.abort();
  assert.equal(child.killed, true); // the live arm was actually cut
  child.emit('close', null);
  await assert.rejects(p, /aborted/);
});

test('makeDispatch: non-zero exit with no parseable answer rejects', async () => {
  const child = fakeChild();
  const dispatch = makeDispatch('q', { spawnFn: () => child });
  const p = dispatch({ id: 't', kind: 'triplet' }, {});
  child.stderr.emit('data', 'all models failed');
  child.emit('close', 1);
  await assert.rejects(p, /no usable answer/);
});

test('makeDispatch single: banner-only output without the completion marker is a failure, not false-green', async () => {
  const child = fakeChild();
  const dispatch = makeDispatch('q', { spawnFn: () => child });
  const p = dispatch({ id: 'd', kind: 'single', model: 'deep_search' }, {});
  // deep-search-router prints its banner, then errors (e.g. no API key) before
  // the "RESEARCH COMPLETE" marker — the banner must not count as an answer.
  child.stdout.emit('data', '🔬 Deep Search Router\nProfile: …\nQuery: q');
  child.emit('close', 1);
  await assert.rejects(p, /no usable answer/);
});

test('makeDispatch single: an echoed query containing the phrase cannot spoof completion', async () => {
  const child = fakeChild();
  const dispatch = makeDispatch('q', { spawnFn: () => child });
  const p = dispatch({ id: 'd', kind: 'single', model: 'deep_search' }, {});
  // The phrase appears only inside the echoed "Query:" banner line, never as the
  // standalone completion banner — must still be treated as a failure.
  child.stdout.emit('data', '🔬 Deep Search Router\nQuery: tell me about RESEARCH COMPLETE status');
  child.emit('close', 1);
  await assert.rejects(p, /no usable answer/);
});

test('makeDispatch: unknown arm kind rejects', async () => {
  const dispatch = makeDispatch('q', { spawnFn: () => fakeChild() });
  await assert.rejects(dispatch({ id: 'x', kind: 'nope' }, {}), /unknown arm kind/);
});

test('ARM_RUNNERS maps the three arm kinds', () => {
  assert.equal(ARM_RUNNERS.single, 'deep-search-router.js');
  assert.equal(ARM_RUNNERS.twin, 'twin-search.js');
  assert.equal(ARM_RUNNERS.triplet, 'triplet-search.js');
});

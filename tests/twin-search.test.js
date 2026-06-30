'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  buildSearchSystemPrompt,
  extractCitations,
  domainOf,
  sourceOverlapScore,
  unionCitations,
  parseAdjudication,
  buildTwinResult,
  buildTwinReport,
} = require('../products/rnd-research-fleet/twin-search');

test('twin arms apply the R&D frameworks incl. BNAT (not a generic prompt)', () => {
  const p = buildSearchSystemPrompt();
  for (const fw of ['DOE', 'TRIZ', 'MEErP', 'LCA', 'BNAT']) {
    assert.ok(p.includes(fw), `search prompt missing framework: ${fw}`);
  }
  assert.match(p, /Best Not Yet Available Technology/);
  assert.match(p, /cite every nontrivial claim/i); // citations still required for the evaluator
});

test('extractCitations pulls + dedupes URLs and strips trailing punctuation', () => {
  const text = 'See https://a.com/x. Also (https://b.com/y) and https://a.com/x again.';
  assert.deepEqual(extractCitations(text), ['https://a.com/x', 'https://b.com/y']);
});

test('extractCitations handles empty/none', () => {
  assert.deepEqual(extractCitations(''), []);
  assert.deepEqual(extractCitations('no links here'), []);
});

test('domainOf normalizes host and drops www', () => {
  assert.equal(domainOf('https://www.Example.com/a?b=1'), 'example.com');
  assert.equal(domainOf('not a url'), '');
});

test('sourceOverlapScore is Jaccard over domains', () => {
  assert.equal(sourceOverlapScore(['https://a.com/1'], ['https://a.com/2']), 1); // same domain
  assert.equal(sourceOverlapScore(['https://a.com'], ['https://b.com']), 0);
  assert.equal(sourceOverlapScore([], []), 0);
  // {a,b} vs {b,c} -> intersect {b}=1, union {a,b,c}=3 -> 0.33
  assert.equal(sourceOverlapScore(['https://a.com', 'https://b.com'], ['https://b.com', 'https://c.com']), 0.33);
});

test('unionCitations dedupes preserving order', () => {
  assert.deepEqual(unionCitations(['x', 'y'], ['y', 'z']), ['x', 'y', 'z']);
});

test('parseAdjudication recovers JSON from fenced/prose output', () => {
  const fenced = 'Here:\n```json\n{"answer":"ok","agreement_score":0.8}\n```\nthanks';
  assert.deepEqual(parseAdjudication(fenced), { answer: 'ok', agreement_score: 0.8 });
  assert.equal(parseAdjudication('no json'), null);
  assert.equal(parseAdjudication(''), null);
});

test('buildTwinResult uses adjudicator fields and emits the twin schema', () => {
  const runA = { answer: 'A says https://a.com', citations: ['https://a.com'], latency_ms: 1000, cost_usd: 0.001 };
  const runB = { answer: 'B says https://b.com', citations: ['https://b.com'], latency_ms: 1500, cost_usd: 0.002 };
  const adjudication = {
    answer: 'merged',
    citations: ['https://a.com', 'https://b.com'],
    agreement_score: 0.7,
    disagreements: 1,
    adjudication_quality: 0.9,
    unsupported_claims: 0,
  };
  const r = buildTwinResult({
    queryId: 'q1',
    models: { modelA: 'm-a', modelB: 'm-b', adjudicator: 'm-adj' },
    runA,
    runB,
    adjudication,
    adjudicatorLatencyMs: 500,
    adjudicatorCostUsd: 0.0005,
  });
  assert.equal(r.query_id, 'q1');
  assert.equal(r.answer, 'merged');
  assert.deepEqual(r.citations, ['https://a.com', 'https://b.com']);
  assert.equal(r.latency_ms, 1500 + 500); // slowest arm + adjudicator
  assert.equal(r.cost_usd, 0.0035); // 0.001 + 0.002 + 0.0005
  assert.equal(r.twin.model_a, 'm-a');
  assert.equal(r.twin.adjudicator, 'm-adj');
  assert.equal(r.twin.agreement_score, 0.7);
  assert.equal(r.twin.disagreements, 1);
  assert.deepEqual(r.twin.sources_a, ['https://a.com']);
});

test('buildTwinResult surfaces error state (so eval can measure error-rate)', () => {
  const ok = { answer: 'a', citations: ['https://a.com'], latency_ms: 100, cost_usd: null };
  const empty = { answer: '', citations: [], latency_ms: 0, cost_usd: null };
  const models = { modelA: 'a', modelB: 'b', adjudicator: 'c' };
  // default: error-free
  assert.equal(buildTwinResult({ queryId: 'q', models, runA: ok, runB: ok, adjudication: null }).error, false);
  // a failed arm -> error true, but a report is still produced
  const degraded = buildTwinResult({ queryId: 'q', models, runA: ok, runB: empty, adjudication: null, error: true });
  assert.equal(degraded.error, true);
  assert.equal(degraded.query_id, 'q');
  assert.deepEqual(degraded.citations, ['https://a.com']); // surviving arm's sources still surface
});

test('buildTwinResult falls back when adjudication is null (overlap + union)', () => {
  const runA = { answer: 'a', citations: ['https://a.com'], latency_ms: 1000, cost_usd: null };
  const runB = { answer: 'b', citations: ['https://b.com'], latency_ms: 1200, cost_usd: null };
  const r = buildTwinResult({ queryId: 'q', models: { modelA: 'a', modelB: 'b', adjudicator: 'c' }, runA, runB, adjudication: null });
  assert.deepEqual(r.citations, ['https://a.com', 'https://b.com']); // union fallback
  assert.equal(r.twin.agreement_score, 0); // disjoint domains
  assert.equal(r.twin.adjudication_quality, 0.5); // fallback floor
  assert.equal(r.cost_usd, null); // no costs known
});

test('buildTwinReport wraps results with the adjudicated strategy labels', () => {
  const rep = buildTwinReport([{ query_id: 'q' }], { modelA: 'a', modelB: 'b', adjudicator: 'c' });
  assert.equal(rep.strategy, 'twin_llm_adjudicated');
  assert.equal(rep.router_profile, 'twin_dual_model_adjudicated');
  assert.equal(rep.results.length, 1);
});

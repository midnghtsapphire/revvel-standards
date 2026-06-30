'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  majorityK,
  consensusScore,
  buildNpletResult,
  buildNpletReport,
} = require('../products/rnd-research-fleet/triplet-search');
const {
  npletMetricsFor,
  decideNplet,
  NPLET_THRESHOLDS,
} = require('../products/rnd-research-fleet/eval/search-eval');

// --- runner pure logic ---

test('majorityK is strict majority (2 of 3, 3 of 5)', () => {
  assert.equal(majorityK(3), 2);
  assert.equal(majorityK(5), 3);
  assert.equal(majorityK(2), 2);
});

test('consensusScore = fraction of domains cited by >= k arms', () => {
  // domains: a in arms 1&2 (=2), b in arm 3 (=1). k=2 -> only a qualifies -> 1/2
  const sources = [['https://a.com/x'], ['https://a.com/y'], ['https://b.com/z']];
  assert.equal(consensusScore(sources, 2), 0.5);
  // all three cite a -> 1/1
  assert.equal(consensusScore([['https://a.com'], ['https://a.com'], ['https://a.com']], 2), 1);
  assert.equal(consensusScore([[], [], []], 2), 0);
});

test('buildNpletResult assembles the nplet block (n, k, per-model sources, consensus)', () => {
  const runs = [
    { answer: 'A https://a.com', citations: ['https://a.com'], latency_ms: 1000, cost_usd: 0.003 },
    { answer: 'B https://a.com', citations: ['https://a.com'], latency_ms: 1500, cost_usd: 0.004 },
    { answer: 'C https://b.com', citations: ['https://b.com'], latency_ms: 1200, cost_usd: 0.003 },
  ];
  const r = buildNpletResult({
    queryId: 'q', models: ['m1', 'm2', 'm3'], adjudicator: 'adj', runs,
    adjudication: { answer: 'merged', citations: ['https://a.com'], agreement_score: 0.9, adjudication_quality: 0.95, disagreements: 0, unsupported_claims: 0 },
    adjudicatorLatencyMs: 500, adjudicatorCostUsd: 0.001, error: false,
  });
  assert.equal(r.query_id, 'q');
  assert.equal(r.answer, 'merged');
  assert.equal(r.error, false);
  assert.equal(r.latency_ms, 1500 + 500); // slowest arm + adjudicator
  assert.equal(r.cost_usd, 0.011); // 0.003+0.004+0.003+0.001
  assert.equal(r.nplet.n, 3);
  assert.equal(r.nplet.k, 2);
  assert.equal(r.nplet.consensus_score, 0.5); // a (2 arms) qualifies, b (1) doesn't
  assert.equal(r.nplet.agreement_score, 0.9);
  assert.deepEqual(r.nplet.sources[2], ['https://b.com']);
});

test('buildNpletResult falls back to consensus for agreement + surfaces error', () => {
  const runs = [
    { answer: 'a', citations: ['https://a.com'], latency_ms: 100, cost_usd: null },
    { answer: '', citations: [], latency_ms: 0, cost_usd: null },
    { answer: 'c', citations: ['https://a.com'], latency_ms: 200, cost_usd: null },
  ];
  const r = buildNpletResult({ queryId: 'q', models: ['m1', 'm2', 'm3'], adjudicator: 'adj', runs, adjudication: null, error: true });
  assert.equal(r.error, true);
  assert.equal(r.cost_usd, null);
  assert.equal(r.nplet.agreement_score, r.nplet.consensus_score); // fallback
  assert.equal(r.answer, 'a'); // first non-empty arm
});

test('buildNpletReport carries the triplet strategy labels', () => {
  const rep = buildNpletReport([{ query_id: 'q' }], ['m1', 'm2', 'm3'], 'adj');
  assert.equal(rep.strategy, 'triplet_llm');
  assert.equal(rep.router_profile, 'n_model_adjudicated');
  assert.equal(rep.results.length, 1);
});

// --- eval scoring ---

test('npletMetricsFor rolls up agreement/consensus/adjudication and is null without nplet blocks', () => {
  assert.equal(npletMetricsFor({ results: [{ answer: 'x' }] }), null);
  const run = {
    results: [
      { nplet: { models: ['a', 'b', 'c'], n: 3, agreement_score: 0.9, consensus_score: 0.8, adjudication_quality: 0.95, disagreements: 0, unsupported_claims: 0 } },
      { nplet: { models: ['a', 'b', 'c'], n: 3, agreement_score: 0.8, consensus_score: 0.6, adjudication_quality: 0.93, disagreements: 1, unsupported_claims: 0 } },
    ],
  };
  const m = npletMetricsFor(run);
  assert.equal(m.n, 3);
  assert.equal(m.nplet_query_count, 2);
  assert.equal(m.agreement_score, 0.85);
  assert.equal(m.consensus_score, 0.7);
  assert.equal(m.disagreement_count, 1);
});

// Minimal scored-like objects for decideNplet.
function scored(rubric, extra = {}) {
  return {
    result_count: 6, // above minResultsForConfidence (4)
    metrics: { rubric_mean: rubric, error_rate: 0, citation_coverage: 0.9, total_cost_usd: 0.06, mean_latency_ms: 5000 },
    nplet_metrics: { adjudication_quality: 0.95, consensus_score: 0.8, hallucination_or_unsupported_claim_flags: 0 },
    ...extra,
  };
}

test('decideNplet: no rubric gain over reference -> rollback_triplet', () => {
  const d = decideNplet(scored(0.8), scored(0.8, { metrics: { rubric_mean: 0.8, error_rate: 0, citation_coverage: 0.9, total_cost_usd: 0.03, mean_latency_ms: 3000 } }), { rubric_mean: 0, error_rate: 0, citation_coverage: 0, cost_ratio: 2, latency_ratio: 1.6 }, 'twin');
  assert.equal(d.decision, 'rollback_triplet');
});

test('decideNplet: quality gain within budget + consensus -> keep_triplet', () => {
  const deltas = { rubric_mean: 0.1, error_rate: 0, citation_coverage: 0.02, cost_ratio: 3.0, latency_ratio: 2.0 };
  const d = decideNplet(scored(0.9), scored(0.8), deltas, 'twin');
  assert.equal(d.decision, 'keep_triplet');
});

test('decideNplet: quality gain but over cost budget -> tune_triplet', () => {
  const deltas = { rubric_mean: 0.1, error_rate: 0, citation_coverage: 0.02, cost_ratio: 9.0, latency_ratio: 2.0 };
  const d = decideNplet(scored(0.9), scored(0.8), deltas, 'twin');
  assert.equal(d.decision, 'tune_triplet');
});

test('decideNplet: low sample -> needs_human_review', () => {
  const lo = scored(0.9);
  lo.result_count = 2;
  const d = decideNplet(lo, scored(0.8), { rubric_mean: 0.1 }, 'twin');
  assert.equal(d.decision, 'needs_human_review');
});

test('NPLET_THRESHOLDS allow a wider cost budget than twin (~3x)', () => {
  assert.ok(NPLET_THRESHOLDS.maxCostRatio >= 3);
});

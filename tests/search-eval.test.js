'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const evalMod = require('../products/rnd-research-fleet/eval/search-eval');
const {
  rubricScore,
  scoreRun,
  compareRuns,
  decide,
  evaluate,
  renderMarkdown,
  domainOf,
  loadJson,
  twinMetricsFor,
  compareTwinToFable,
  decideTwin,
  evaluateStrategies,
  renderStrategyMarkdown,
  STRATEGIES,
  TWIN_THRESHOLDS
} = evalMod;

const EVAL_DIR = path.join(__dirname, '..', 'products', 'rnd-research-fleet', 'eval');
const fixtures = loadJson(path.join(EVAL_DIR, 'fixtures', 'queries.json'));

test('rubricScore matches keywords case-insensitively', () => {
  const r = rubricScore('Set GH_REPO to github.repository', ['gh_repo', 'github.repository', 'missing']);
  assert.equal(r.hits.length, 2);
  assert.deepEqual(r.misses, ['missing']);
  assert.ok(Math.abs(r.score - 2 / 3) < 1e-9);
});

test('rubricScore returns null when no expected qualities', () => {
  assert.equal(rubricScore('anything', []).score, null);
});

test('domainOf strips scheme and www', () => {
  assert.equal(domainOf('https://www.example.com/path?q=1'), 'example.com');
  assert.equal(domainOf('http://docs.github.com/x'), 'docs.github.com');
  assert.equal(domainOf('not a url'), null);
});

test('scoreRun computes duplicate rate and domain diversity', () => {
  const run = {
    label: 'x',
    results: [
      {
        query_id: 'repo-automation-gh-repo',
        answer: 'GH_REPO github.repository checkout --repo',
        citations: ['https://a.com/1', 'https://a.com/1', 'https://b.com/2']
      }
    ]
  };
  const s = scoreRun(run, fixtures);
  assert.equal(s.metrics.duplicate_rate, 0.3333);
  assert.equal(s.metrics.unique_domains, 2);
  assert.equal(s.per_query[0].rubric_score, 1);
});

test('scoreRun flags errors and empty answers', () => {
  const run = {
    results: [
      { query_id: 'workflow-syntax-issue', error: true },
      { query_id: 'docs-bom-discovery', answer: '', citations: [] }
    ]
  };
  const s = scoreRun(run, fixtures);
  assert.equal(s.metrics.error_rate, 1);
});

test('clean improvement yields keep_candidate', () => {
  const baseline = {
    label: 'baseline',
    results: fixtures.queries.map((q) => ({
      query_id: q.id,
      answer: (q.expected_qualities || []).slice(0, 1).join(' '),
      citations: buildCitations(q.min_citations || 1, 'a'),
      freshness_year: 2026
    }))
  };
  const candidate = {
    label: 'candidate',
    results: fixtures.queries.map((q) => ({
      query_id: q.id,
      answer: (q.expected_qualities || []).join(' '),
      citations: buildCitations(q.min_citations || 1, 'a'),
      freshness_year: 2026
    }))
  };
  const report = compareRuns(scoreRun(baseline, fixtures), scoreRun(candidate, fixtures));
  assert.equal(report.decision, 'keep_candidate');
});

test('rubric collapse yields rollback_candidate', () => {
  const baseline = {
    results: fixtures.queries.map((q) => ({
      query_id: q.id,
      answer: (q.expected_qualities || []).join(' '),
      citations: buildCitations(q.min_citations || 1, 'a'),
      freshness_year: 2026
    }))
  };
  const candidate = {
    results: fixtures.queries.map((q) => ({
      query_id: q.id,
      answer: 'unrelated text',
      citations: buildCitations(q.min_citations || 1, 'a'),
      freshness_year: 2026
    }))
  };
  const report = compareRuns(scoreRun(baseline, fixtures), scoreRun(candidate, fixtures));
  assert.equal(report.decision, 'rollback_candidate');
  assert.ok(report.reasons.some((r) => /rubric/i.test(r)));
});

test('error-rate spike forces rollback_candidate', () => {
  const good = fixtures.queries.map((q) => ({
    query_id: q.id,
    answer: (q.expected_qualities || []).join(' '),
    citations: buildCitations(q.min_citations || 1, 'a'),
    freshness_year: 2026
  }));
  const baseline = { results: good };
  const candidate = { results: good.map((r, i) => (i === 0 ? { query_id: r.query_id, error: true } : r)) };
  const report = compareRuns(scoreRun(baseline, fixtures), scoreRun(candidate, fixtures));
  assert.equal(report.decision, 'rollback_candidate');
});

test('too few queries yields needs_human_review', () => {
  const small = { results: [{ query_id: 'workflow-syntax-issue', answer: 'yaml actionlint validate indentation', citations: ['https://x.com/1'] }] };
  const report = compareRuns(scoreRun(small, fixtures), scoreRun(small, fixtures));
  assert.equal(report.decision, 'needs_human_review');
});

test('bundled example fixtures evaluate to tune_candidate', () => {
  const baselineRun = loadJson(path.join(EVAL_DIR, 'fixtures', 'baseline.example.json'));
  const candidateRun = loadJson(path.join(EVAL_DIR, 'fixtures', 'candidate.example.json'));
  const report = evaluate(fixtures, baselineRun, candidateRun);
  assert.equal(report.decision, 'tune_candidate');
  assert.equal(report.candidate.metrics.duplicate_rate > 0, true);
});

test('renderMarkdown includes decision and the CI caveat', () => {
  const baselineRun = loadJson(path.join(EVAL_DIR, 'fixtures', 'baseline.example.json'));
  const candidateRun = loadJson(path.join(EVAL_DIR, 'fixtures', 'candidate.example.json'));
  const md = renderMarkdown(evaluate(fixtures, baselineRun, candidateRun));
  assert.match(md, /Decision: `tune_candidate`/);
  assert.match(md, /Green CI does not prove search quality/);
});

test('decide is pure over provided deltas', () => {
  const base = { result_count: 6, metrics: {} };
  const cand = { result_count: 6, metrics: {} };
  const { decision } = decide(base, cand, {
    rubric_mean: 0.0,
    error_rate: 0.0,
    citation_coverage: 0.0,
    duplicate_rate: 0.0,
    freshness_satisfaction: null
  });
  assert.equal(decision, 'keep_candidate');
});

function buildCitations(n, prefix) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(`https://${prefix}${i}.example.com/p`);
  return out;
}

// ---------------------------------------------------------------------------
// Twin-LLM strategy tests
// ---------------------------------------------------------------------------

test('STRATEGIES includes twin variants', () => {
  assert.ok(STRATEGIES.includes('fable'));
  assert.ok(STRATEGIES.includes('twin_llm'));
  assert.ok(STRATEGIES.includes('twin_llm_adjudicated'));
});

test('twinMetricsFor returns null when no twin data is present', () => {
  const run = { results: [{ query_id: 'x', answer: 'a', citations: ['https://a.com/1'] }] };
  assert.equal(twinMetricsFor(run), null);
  // scoreRun must not add twin_metrics for non-twin runs
  assert.equal(scoreRun(run, fixtures).twin_metrics, undefined);
});

test('twinMetricsFor aggregates agreement, overlap, and unique sources', () => {
  const run = {
    results: [
      {
        query_id: 'workflow-syntax-issue',
        answer: 'yaml actionlint validate indentation',
        citations: ['https://a.com/1', 'https://b.com/2'],
        twin: {
          model_a: 'm1',
          model_b: 'm2',
          agreement_score: 0.8,
          disagreements: 1,
          adjudication_quality: 0.9,
          sources_a: ['https://a.com/1'],
          sources_b: ['https://a.com/9', 'https://b.com/2'],
          unsupported_claims: 0
        }
      }
    ]
  };
  const tm = twinMetricsFor(run);
  assert.equal(tm.model_pair, 'm1 + m2');
  assert.equal(tm.agreement_score, 0.8);
  assert.equal(tm.disagreement_count, 1);
  assert.equal(tm.adjudication_quality, 0.9);
  // domains A={a.com}, B={a.com,b.com}: union 2, inter 1 -> 0.5 overlap, 1 unique added (b.com)
  assert.equal(tm.source_overlap, 0.5);
  assert.equal(tm.unique_sources_added, 1);
  assert.equal(tm.hallucination_or_unsupported_claim_flags, 0);
  // scoreRun surfaces twin_metrics when twin data exists
  assert.deepEqual(scoreRun(run, fixtures).twin_metrics, tm);
});

test('twinMetricsFor counts unsupported-claim arrays and number forms', () => {
  const run = {
    results: [
      { query_id: 'q1', answer: 'a', twin: { model_a: 'm1', model_b: 'm2', unsupported_claims: ['x', 'y'] } },
      { query_id: 'q2', answer: 'b', twin: { model_a: 'm1', model_b: 'm2', unsupported_claims: 3 } }
    ]
  };
  assert.equal(twinMetricsFor(run).hallucination_or_unsupported_claim_flags, 5);
});

test('twin beating Fable within budget yields keep_twin', () => {
  const fable = evalMod.scoreRun(loadJson(path.join(EVAL_DIR, 'fixtures', 'fable.example.json')), fixtures);
  const twin = evalMod.scoreRun(loadJson(path.join(EVAL_DIR, 'fixtures', 'twin-llm.example.json')), fixtures);
  const cmp = compareTwinToFable(twin, fable);
  assert.equal(cmp.decision, 'keep_twin');
  assert.ok(cmp.deltas.rubric_mean >= TWIN_THRESHOLDS.minQualityGain);
  assert.equal(cmp.twin_metrics.hallucination_or_unsupported_claim_flags, 0);
  assert.equal(typeof cmp.twin_metrics.cost_delta_vs_fable, 'number');
  assert.equal(typeof cmp.twin_metrics.latency_delta_vs_fable, 'number');
});

test('twin not beating Fable yields rollback_twin', () => {
  const fableRun = {
    results: fixtures.queries.map((q) => ({
      query_id: q.id,
      answer: (q.expected_qualities || []).join(' '),
      citations: buildCitations(q.min_citations || 1, 'a'),
      freshness_year: 2026,
      cost_usd: 0.001,
      latency_ms: 1000
    }))
  };
  const twinRun = {
    results: fixtures.queries.map((q) => ({
      query_id: q.id,
      answer: (q.expected_qualities || []).slice(0, 1).join(' '),
      citations: buildCitations(q.min_citations || 1, 'a'),
      freshness_year: 2026,
      cost_usd: 0.003,
      latency_ms: 2000,
      twin: { model_a: 'm1', model_b: 'm2', agreement_score: 0.5, adjudication_quality: 0.9, sources_a: ['https://a.com/1'], sources_b: ['https://b.com/1'], unsupported_claims: 0 }
    }))
  };
  const cmp = compareTwinToFable(scoreRun(twinRun, fixtures), scoreRun(fableRun, fixtures));
  assert.equal(cmp.decision, 'rollback_twin');
});

test('better twin over cost budget yields tune_twin', () => {
  const base = { result_count: 6, metrics: {}, twin_metrics: { adjudication_quality: 0.9, source_overlap: 0.2, hallucination_or_unsupported_claim_flags: 0 } };
  const ref = { result_count: 6, metrics: {} };
  const { decision, reasons } = decideTwin(base, ref, {
    rubric_mean: 0.12,
    error_rate: 0.0,
    citation_coverage: 0.0,
    cost_ratio: 3.5,
    latency_ratio: 1.2
  });
  assert.equal(decision, 'tune_twin');
  assert.ok(reasons.some((r) => /cost/i.test(r)));
});

test('high source overlap (redundant runs) yields tune_twin', () => {
  const base = { result_count: 6, metrics: {}, twin_metrics: { adjudication_quality: 0.9, source_overlap: 0.95, hallucination_or_unsupported_claim_flags: 0 } };
  const ref = { result_count: 6, metrics: {} };
  const { decision, reasons } = decideTwin(base, ref, {
    rubric_mean: 0.1,
    error_rate: 0.0,
    citation_coverage: 0.0,
    cost_ratio: 1.5,
    latency_ratio: 1.2
  });
  assert.equal(decision, 'tune_twin');
  assert.ok(reasons.some((r) => /overlap|redundant/i.test(r)));
});

test('too few queries yields needs_human_review for twin', () => {
  const base = { result_count: 2, metrics: {}, twin_metrics: {} };
  const ref = { result_count: 2, metrics: {} };
  assert.equal(decideTwin(base, ref, { rubric_mean: 0.2 }).decision, 'needs_human_review');
});

test('evaluateStrategies prefers adjudicated twin and reports keep_twin vs Fable', () => {
  const runs = {
    baseline: loadJson(path.join(EVAL_DIR, 'fixtures', 'baseline.example.json')),
    fable: loadJson(path.join(EVAL_DIR, 'fixtures', 'fable.example.json')),
    twin_llm: loadJson(path.join(EVAL_DIR, 'fixtures', 'twin-llm.example.json')),
    twin_llm_adjudicated: loadJson(path.join(EVAL_DIR, 'fixtures', 'twin-llm-adjudicated.example.json'))
  };
  const report = evaluateStrategies(fixtures, runs);
  assert.equal(report.primary_comparison, 'twin_vs_fable');
  assert.equal(report.decision, 'keep_twin');
  // adjudicated twin is the one compared against Fable
  assert.equal(report.comparisons.twin_vs_fable.twin.strategy, 'twin_llm_adjudicated');
  assert.ok(report.strategies.fable && report.strategies.twin_llm && report.strategies.twin_llm_adjudicated);
});

test('renderStrategyMarkdown includes twin decision and the CI caveat', () => {
  const runs = {
    fable: loadJson(path.join(EVAL_DIR, 'fixtures', 'fable.example.json')),
    twin_llm: loadJson(path.join(EVAL_DIR, 'fixtures', 'twin-llm.example.json'))
  };
  const md = renderStrategyMarkdown(evaluateStrategies(fixtures, runs));
  assert.match(md, /keep_twin/);
  assert.match(md, /must beat Fable\/baseline/);
  assert.match(md, /Model pair/);
});

test('existing baseline/candidate comparison still works unchanged', () => {
  const baselineRun = loadJson(path.join(EVAL_DIR, 'fixtures', 'baseline.example.json'));
  const candidateRun = loadJson(path.join(EVAL_DIR, 'fixtures', 'candidate.example.json'));
  assert.equal(evaluate(fixtures, baselineRun, candidateRun).decision, 'tune_candidate');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const evalMod = require('../products/rnd-research-fleet/eval/search-eval');
const { rubricScore, scoreRun, compareRuns, decide, evaluate, renderMarkdown, domainOf, loadJson } = evalMod;

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

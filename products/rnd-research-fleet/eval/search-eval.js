#!/usr/bin/env node
'use strict';
/**
 * Search Evaluation Layer - Offline scorer & baseline/candidate comparator.
 *
 * Measures whether a NEW search prompt / routing profile is actually better
 * than the PREVIOUS one. Runs fully offline against saved run JSON files and
 * a rubric fixture set - no live/paid APIs, no secrets required.
 *
 * Aligns with standards/QUALITY_STANDARDS.md (Research Quality Score weights)
 * and standards/SEARCH_EVALUATION.md (methodology + decision rubric).
 *
 * Library usage (used by tests):
 *   const { scoreRun, compareRuns, renderMarkdown } = require('./search-eval');
 *
 * CLI usage:
 *   node search-eval.js \
 *     --fixtures eval/fixtures/queries.json \
 *     --baseline eval/fixtures/baseline.example.json \
 *     --candidate eval/fixtures/candidate.example.json \
 *     --out /tmp/search-eval-report.json \
 *     --md  /tmp/search-eval-report.md
 *
 * Run JSON schema (see eval/fixtures/*.example.json):
 *   {
 *     "label": "baseline" | "candidate",
 *     "search_prompt_version": "v1",
 *     "router_profile": "deep_search",
 *     "results": [
 *       {
 *         "query_id": "repo-automation-gh-repo",
 *         "answer": "free text answer ...",
 *         "citations": ["https://docs.github.com/...", ...],
 *         "error": false,                 // optional
 *         "latency_ms": 1200,             // optional
 *         "tokens": {"input": 800, "output": 1200},  // optional
 *         "cost_usd": 0.0021,             // optional
 *         "freshness_year": 2026,         // optional, for freshness-required queries
 *         "usefulness_note": "..."        // optional downstream-usefulness note
 *       }
 *     ]
 *   }
 */

const fs = require('fs');

// ---------------------------------------------------------------------------
// Decision thresholds (documented in standards/SEARCH_EVALUATION.md).
// Tunable in one place so the rubric stays transparent and testable.
// ---------------------------------------------------------------------------
const THRESHOLDS = {
  rubricRegression: -0.10, // candidate rubric drop that forces a rollback
  errorRateRegression: 0.10, // candidate error-rate rise that forces a rollback
  citationRegression: -0.15, // candidate citation-coverage drop that forces rollback
  freshnessRegression: -0.20, // candidate freshness drop that forces rollback
  citationKeepFloor: -0.02, // tolerance for "keep" on citation coverage
  duplicateKeepCeiling: 0.05, // tolerance for "keep" on duplicate rate
  minResultsForConfidence: 4 // below this, prefer needs_human_review
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function round(n, d = 4) {
  if (typeof n !== 'number' || !isFinite(n)) return n;
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function mean(arr) {
  const nums = arr.filter((x) => typeof x === 'number' && isFinite(x));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function domainOf(url) {
  if (typeof url !== 'string') return null;
  const m = url.match(/^[a-z]+:\/\/([^/?#]+)/i);
  if (!m) return null;
  return m[1].replace(/^www\./i, '').toLowerCase();
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ---------------------------------------------------------------------------
// Rubric scoring: fraction of expected_qualities present in the answer text.
// Deliberately keyword/phrase based (case-insensitive substring), NOT exact
// answer matching, so fixtures stay robust to phrasing changes.
// ---------------------------------------------------------------------------
function rubricScore(answer, expectedQualities) {
  if (!Array.isArray(expectedQualities) || expectedQualities.length === 0) {
    return { score: null, hits: [], misses: [] };
  }
  const hay = String(answer || '').toLowerCase();
  const hits = [];
  const misses = [];
  for (const q of expectedQualities) {
    if (hay.includes(String(q).toLowerCase())) hits.push(q);
    else misses.push(q);
  }
  return { score: hits.length / expectedQualities.length, hits, misses };
}

// ---------------------------------------------------------------------------
// Score a single run against the fixture set.
// ---------------------------------------------------------------------------
function scoreRun(run, fixtures) {
  const byId = {};
  for (const f of fixtures.queries || fixtures) byId[f.id] = f;

  const perQuery = [];
  let errorCount = 0;
  let freshnessRequired = 0;
  let freshnessSatisfied = 0;
  let citationMet = 0;
  let citationApplicable = 0;
  const allDomains = [];
  let totalCitations = 0;
  let duplicateCitations = 0;
  const latencies = [];
  const costs = [];
  const usefulnessNotes = [];

  const results = Array.isArray(run.results) ? run.results : [];
  for (const r of results) {
    const fx = byId[r.query_id] || {};
    const isError = r.error === true || (!r.answer && (!r.citations || r.citations.length === 0));
    if (isError) errorCount += 1;

    // Rubric
    const rub = rubricScore(r.answer, fx.expected_qualities);

    // Citations / duplicates / domains (per-query)
    const cites = Array.isArray(r.citations) ? r.citations : [];
    const seen = new Set();
    let dupInQuery = 0;
    for (const c of cites) {
      totalCitations += 1;
      const key = String(c).trim().toLowerCase();
      if (seen.has(key)) {
        dupInQuery += 1;
        duplicateCitations += 1;
      } else {
        seen.add(key);
      }
      const d = domainOf(c);
      if (d) allDomains.push(d);
    }

    // Citation coverage vs fixture minimum
    const minCites = typeof fx.min_citations === 'number' ? fx.min_citations : 0;
    if (minCites > 0) {
      citationApplicable += 1;
      if (cites.length >= minCites) citationMet += 1;
    }

    // Freshness
    if (fx.requires_freshness) {
      freshnessRequired += 1;
      if (isFreshEnough(r, fx)) freshnessSatisfied += 1;
    }

    if (typeof r.latency_ms === 'number') latencies.push(r.latency_ms);
    if (typeof r.cost_usd === 'number') costs.push(r.cost_usd);
    if (r.usefulness_note) usefulnessNotes.push({ query_id: r.query_id, note: r.usefulness_note });

    perQuery.push({
      query_id: r.query_id,
      category: fx.category || 'unknown',
      error: isError,
      rubric_score: rub.score === null ? null : round(rub.score),
      rubric_hits: rub.hits,
      rubric_misses: rub.misses,
      citations: cites.length,
      duplicates_in_query: dupInQuery,
      meets_min_citations: minCites > 0 ? cites.length >= minCites : null,
      freshness_required: !!fx.requires_freshness,
      freshness_ok: fx.requires_freshness ? isFreshEnough(r, fx) : null
    });
  }

  const uniqueDomains = new Set(allDomains);
  const n = results.length || 1;
  const rubricScores = perQuery.map((p) => p.rubric_score).filter((x) => x !== null);

  return {
    label: run.label || 'unlabeled',
    search_prompt_version: run.search_prompt_version || null,
    router_profile: run.router_profile || null,
    result_count: results.length,
    metrics: {
      rubric_mean: round(mean(rubricScores)),
      error_rate: round(errorCount / n),
      citation_coverage: citationApplicable ? round(citationMet / citationApplicable) : null,
      domain_diversity: totalCitations ? round(uniqueDomains.size / totalCitations) : null,
      unique_domains: uniqueDomains.size,
      duplicate_rate: totalCitations ? round(duplicateCitations / totalCitations) : 0,
      freshness_satisfaction: freshnessRequired ? round(freshnessSatisfied / freshnessRequired) : null,
      mean_latency_ms: latencies.length ? round(mean(latencies), 1) : null,
      total_cost_usd: costs.length ? round(costs.reduce((a, b) => a + b, 0), 6) : null
    },
    usefulness_notes: usefulnessNotes,
    per_query: perQuery
  };
}

// Freshness: a freshness-required result must carry a recent year (or an
// explicit fresh:true) so we can confirm it pulled current sources offline.
function isFreshEnough(result, fixture) {
  if (result.fresh === true) return true;
  const wanted = typeof fixture.fresh_after_year === 'number' ? fixture.fresh_after_year : 0;
  if (typeof result.freshness_year === 'number') {
    return wanted ? result.freshness_year >= wanted : true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Compare baseline vs candidate and emit a decision.
// ---------------------------------------------------------------------------
function compareRuns(baselineScored, candidateScored) {
  const b = baselineScored.metrics;
  const c = candidateScored.metrics;

  const delta = (key) => {
    if (typeof b[key] !== 'number' || typeof c[key] !== 'number') return null;
    return round(c[key] - b[key]);
  };

  const deltas = {
    rubric_mean: delta('rubric_mean'),
    error_rate: delta('error_rate'),
    citation_coverage: delta('citation_coverage'),
    domain_diversity: delta('domain_diversity'),
    duplicate_rate: delta('duplicate_rate'),
    freshness_satisfaction: delta('freshness_satisfaction'),
    mean_latency_ms: delta('mean_latency_ms'),
    total_cost_usd: delta('total_cost_usd')
  };

  const { decision, reasons } = decide(baselineScored, candidateScored, deltas);

  return {
    generated_at: new Date().toISOString(),
    baseline: summarize(baselineScored),
    candidate: summarize(candidateScored),
    deltas,
    decision,
    reasons,
    thresholds: THRESHOLDS
  };
}

function summarize(scored) {
  return {
    label: scored.label,
    search_prompt_version: scored.search_prompt_version,
    router_profile: scored.router_profile,
    result_count: scored.result_count,
    metrics: scored.metrics,
    usefulness_notes: scored.usefulness_notes
  };
}

function decide(baseline, candidate, deltas) {
  const reasons = [];
  const T = THRESHOLDS;

  // Not enough signal -> escalate to a human rather than auto-deciding.
  const lowData =
    candidate.result_count < T.minResultsForConfidence ||
    baseline.result_count < T.minResultsForConfidence;
  if (lowData) {
    reasons.push(
      `Low sample size (baseline=${baseline.result_count}, candidate=${candidate.result_count}; ` +
        `need >= ${T.minResultsForConfidence}).`
    );
  }

  // Hard regressions force a rollback recommendation.
  let regression = false;
  if (deltas.rubric_mean !== null && deltas.rubric_mean <= T.rubricRegression) {
    regression = true;
    reasons.push(`Rubric regressed by ${deltas.rubric_mean} (<= ${T.rubricRegression}).`);
  }
  if (deltas.error_rate !== null && deltas.error_rate >= T.errorRateRegression) {
    regression = true;
    reasons.push(`Error rate rose by ${deltas.error_rate} (>= ${T.errorRateRegression}).`);
  }
  if (deltas.citation_coverage !== null && deltas.citation_coverage <= T.citationRegression) {
    regression = true;
    reasons.push(`Citation coverage dropped by ${deltas.citation_coverage} (<= ${T.citationRegression}).`);
  }
  if (deltas.freshness_satisfaction !== null && deltas.freshness_satisfaction <= T.freshnessRegression) {
    regression = true;
    reasons.push(`Freshness dropped by ${deltas.freshness_satisfaction} (<= ${T.freshnessRegression}).`);
  }

  if (regression) {
    return { decision: 'rollback_candidate', reasons };
  }
  if (lowData) {
    return { decision: 'needs_human_review', reasons };
  }

  // Clean win across the board -> keep.
  const rubricOk = deltas.rubric_mean === null || deltas.rubric_mean >= 0;
  const errorOk = deltas.error_rate === null || deltas.error_rate <= 0;
  const citationOk = deltas.citation_coverage === null || deltas.citation_coverage >= T.citationKeepFloor;
  const dupOk = deltas.duplicate_rate === null || deltas.duplicate_rate <= T.duplicateKeepCeiling;

  if (rubricOk && errorOk && citationOk && dupOk) {
    reasons.push('Candidate matches or beats baseline on rubric, errors, citations, and duplicates.');
    return { decision: 'keep_candidate', reasons };
  }

  // Mixed but no hard regression -> tune.
  reasons.push('Mixed results: no hard regression, but candidate is not a clean win. Tune the prompt/routing and re-run.');
  return { decision: 'tune_candidate', reasons };
}

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------
function fmt(v) {
  if (v === null || v === undefined) return 'n/a';
  return String(v);
}

function renderMarkdown(report) {
  const b = report.baseline;
  const c = report.candidate;
  const d = report.deltas;
  const rows = [
    ['Rubric mean', b.metrics.rubric_mean, c.metrics.rubric_mean, d.rubric_mean],
    ['Error rate', b.metrics.error_rate, c.metrics.error_rate, d.error_rate],
    ['Citation coverage', b.metrics.citation_coverage, c.metrics.citation_coverage, d.citation_coverage],
    ['Domain diversity', b.metrics.domain_diversity, c.metrics.domain_diversity, d.domain_diversity],
    ['Unique domains', b.metrics.unique_domains, c.metrics.unique_domains, null],
    ['Duplicate rate', b.metrics.duplicate_rate, c.metrics.duplicate_rate, d.duplicate_rate],
    ['Freshness satisfaction', b.metrics.freshness_satisfaction, c.metrics.freshness_satisfaction, d.freshness_satisfaction],
    ['Mean latency (ms)', b.metrics.mean_latency_ms, c.metrics.mean_latency_ms, d.mean_latency_ms],
    ['Total cost (USD)', b.metrics.total_cost_usd, c.metrics.total_cost_usd, d.total_cost_usd]
  ];

  const lines = [];
  lines.push('# Search Evaluation Report');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push(`- Baseline: \`${fmt(b.search_prompt_version)}\` (profile \`${fmt(b.router_profile)}\`, ${b.result_count} queries)`);
  lines.push(`- Candidate: \`${fmt(c.search_prompt_version)}\` (profile \`${fmt(c.router_profile)}\`, ${c.result_count} queries)`);
  lines.push('');
  lines.push(`## Decision: \`${report.decision}\``);
  lines.push('');
  for (const r of report.reasons) lines.push(`- ${r}`);
  lines.push('');
  lines.push('## Metrics');
  lines.push('');
  lines.push('| Metric | Baseline | Candidate | Delta |');
  lines.push('| --- | --- | --- | --- |');
  for (const [name, bv, cv, dv] of rows) {
    lines.push(`| ${name} | ${fmt(bv)} | ${fmt(cv)} | ${fmt(dv)} |`);
  }
  lines.push('');
  if (c.usefulness_notes && c.usefulness_notes.length) {
    lines.push('## Downstream usefulness notes (candidate)');
    lines.push('');
    for (const u of c.usefulness_notes) lines.push(`- **${u.query_id}**: ${u.note}`);
    lines.push('');
  }
  lines.push('> Green CI does not prove search quality. This report measures it. See standards/SEARCH_EVALUATION.md.');
  lines.push('');
  return lines.join('\n');
}

function evaluate(fixtures, baselineRun, candidateRun) {
  const baselineScored = scoreRun(baselineRun, fixtures);
  const candidateScored = scoreRun(candidateRun, fixtures);
  const report = compareRuns(baselineScored, candidateScored);
  report.baseline.per_query = baselineScored.per_query;
  report.candidate.per_query = candidateScored.per_query;
  return report;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.fixtures || !args.baseline || !args.candidate) {
    console.log(
      'Usage: node search-eval.js --fixtures <queries.json> --baseline <run.json> ' +
        '--candidate <run.json> [--out report.json] [--md report.md]'
    );
    process.exit(args.fixtures || args.baseline || args.candidate ? 1 : 0);
  }

  const fixtures = loadJson(args.fixtures);
  const baselineRun = loadJson(args.baseline);
  const candidateRun = loadJson(args.candidate);
  const report = evaluate(fixtures, baselineRun, candidateRun);

  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify(report, null, 2));
    console.log(`JSON report -> ${args.out}`);
  }
  const md = renderMarkdown(report);
  if (args.md) {
    fs.writeFileSync(args.md, md);
    console.log(`Markdown report -> ${args.md}`);
  }
  if (!args.out && !args.md) {
    console.log(md);
  }
  console.log(`\nDecision: ${report.decision}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  THRESHOLDS,
  rubricScore,
  scoreRun,
  compareRuns,
  decide,
  evaluate,
  renderMarkdown,
  domainOf,
  loadJson
};

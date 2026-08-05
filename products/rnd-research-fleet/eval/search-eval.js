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
// Known search strategies. `baseline` / `candidate` drive the original 2-way
// comparison; `fable`, `twin_llm`, and `twin_llm_adjudicated` are evaluated by
// the multi-strategy comparator (compareTwinToFable / evaluateStrategies).
// ---------------------------------------------------------------------------
const STRATEGIES = ['baseline', 'candidate', 'fable', 'twin_llm', 'twin_llm_adjudicated', 'triplet_llm'];

// ---------------------------------------------------------------------------
// Twin-LLM decision thresholds (documented in standards/SEARCH_EVALUATION.md).
// A twin run sends the SAME query to two independent models/search paths, then
// an adjudicator/synthesizer merges agreements and resolves disagreements into
// a single source-backed answer. Twin is only worth its extra cost/latency if
// it BEATS Fable/baseline on measured quality - never on vibes.
// ---------------------------------------------------------------------------
const TWIN_THRESHOLDS = {
  minQualityGain: 0.05, // twin rubric must beat Fable by >= this to "keep"
  maxCostRatio: 2.0, // twin total cost / Fable total cost ceiling for "keep"
  maxLatencyRatio: 2.0, // twin mean latency / Fable mean latency ceiling for "keep"
  adjudicationFloor: 0.6, // mean adjudication_quality required for "keep"
  maxSourceOverlap: 0.85, // above this the two runs are redundant -> tune
  maxUnsupportedClaims: 0 // hallucination/unsupported-claim flags allowed for "keep"
};

// ---------------------------------------------------------------------------
// Triplet / N-model (`triplet_llm`) thresholds. A triplet runs N independent
// models (default 3) with k-of-n majority consensus, so it costs ~Nx. It must
// beat its reference (the TWIN if present, else Fable) on rubric to earn the
// extra cost/latency; budgets are looser than twin's because N>2 is inherently
// pricier, but the consensus floor guards against three redundant arms.
// ---------------------------------------------------------------------------
const NPLET_THRESHOLDS = {
  minQualityGain: 0.05, // triplet rubric must beat the reference by >= this to "keep"
  maxCostRatio: 3.5, // triplet total cost / reference cost ceiling for "keep"
  maxLatencyRatio: 2.5, // triplet mean latency / reference mean latency ceiling for "keep"
  adjudicationFloor: 0.6, // mean adjudication_quality required for "keep"
  minConsensus: 0.5, // >= half the source-domains must reach k-of-n consensus, else "tune"
  maxUnsupportedClaims: 0 // unsupported-claim flags allowed for "keep"
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

function domainSet(urls) {
  const s = new Set();
  for (const u of Array.isArray(urls) ? urls : []) {
    const d = domainOf(u);
    if (d) s.add(d);
  }
  return s;
}

function countOf(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (Array.isArray(v)) return v.length;
  return 0;
}

// ---------------------------------------------------------------------------
// Twin-LLM specific metrics. Only computed when results carry a `twin` block:
//   "twin": {
//     "model_a": "openai/gpt-4o-search",
//     "model_b": "anthropic/claude-sonnet-search",
//     "agreement_score": 0.0..1.0,        // how much the two runs agreed
//     "disagreements": 1 | [...],          // count or list of substantive splits
//     "adjudication_quality": 0.0..1.0,    // quality of the synthesizer's merge
//     "sources_a": ["https://..."],        // sources model A cited
//     "sources_b": ["https://..."],        // sources model B cited
//     "unsupported_claims": 0 | [...]      // hallucination / unsupported-claim flags
//   }
// Returns null when no twin data is present, so non-twin runs are unaffected.
// cost_delta_vs_fable / latency_delta_vs_fable are inherently comparative and
// are computed later by compareTwinToFable, not here.
// ---------------------------------------------------------------------------
function twinMetricsFor(run) {
  const results = Array.isArray(run.results) ? run.results : [];
  const twinResults = results.filter((r) => r && typeof r.twin === 'object' && r.twin !== null);
  if (twinResults.length === 0) return null;

  const agreement = [];
  const adjudication = [];
  const overlaps = [];
  let disagreementCount = 0;
  let unsupportedFlags = 0;
  let uniqueSourcesAdded = 0;
  const pairs = new Set();

  for (const r of twinResults) {
    const t = r.twin;
    if (t.model_a && t.model_b) pairs.add(`${t.model_a} + ${t.model_b}`);
    if (typeof t.agreement_score === 'number') agreement.push(t.agreement_score);
    if (typeof t.adjudication_quality === 'number') adjudication.push(t.adjudication_quality);
    disagreementCount += countOf(t.disagreements);
    unsupportedFlags += countOf(t.unsupported_claims);

    const a = domainSet(t.sources_a);
    const b = domainSet(t.sources_b);
    if (a.size || b.size) {
      const union = new Set([...a, ...b]);
      let inter = 0;
      for (const d of a) if (b.has(d)) inter += 1;
      overlaps.push(union.size ? inter / union.size : 0);
      for (const d of b) if (!a.has(d)) uniqueSourcesAdded += 1;
    }
  }

  const pairList = [...pairs];
  return {
    model_pair: pairList.length === 1 ? pairList[0] : pairList.length ? pairList : null,
    twin_query_count: twinResults.length,
    agreement_score: round(mean(agreement)),
    disagreement_count: disagreementCount,
    adjudication_quality: round(mean(adjudication)),
    source_overlap: overlaps.length ? round(mean(overlaps)) : null,
    unique_sources_added: uniqueSourcesAdded,
    hallucination_or_unsupported_claim_flags: unsupportedFlags
  };
}

// ---------------------------------------------------------------------------
// N-model (triplet) metrics: read each result's `nplet` block and roll up the
// consensus/agreement/adjudication signals across the run. Consensus = fraction
// of distinct source-domains (across all arms) cited by >= k arms (majority).
// ---------------------------------------------------------------------------
function npletMetricsFor(run) {
  const results = Array.isArray(run.results) ? run.results : [];
  const npResults = results.filter((r) => r && typeof r.nplet === 'object' && r.nplet !== null);
  if (npResults.length === 0) return null;

  const agreement = [];
  const adjudication = [];
  const consensus = [];
  let disagreementCount = 0;
  let unsupportedFlags = 0;
  const nVals = new Set();
  const modelSets = new Set();

  for (const r of npResults) {
    const t = r.nplet;
    if (Array.isArray(t.models)) modelSets.add(t.models.join(' + '));
    if (typeof t.n === 'number') nVals.add(t.n);
    if (typeof t.agreement_score === 'number') agreement.push(t.agreement_score);
    if (typeof t.adjudication_quality === 'number') adjudication.push(t.adjudication_quality);
    if (typeof t.consensus_score === 'number') consensus.push(t.consensus_score);
    disagreementCount += countOf(t.disagreements);
    unsupportedFlags += countOf(t.unsupported_claims);

    // Recompute consensus from per-model sources when the block didn't carry it.
    // Honors the block's own `k` (so a k=1 "any agreement" block isn't forced to
    // strict majority); only defaults to floor(n/2)+1 when k is absent.
    if (typeof t.consensus_score !== 'number' && Array.isArray(t.sources) && t.sources.length) {
      const n = typeof t.n === 'number' ? t.n : t.sources.length;
      const k = typeof t.k === 'number' ? t.k : Math.floor(n / 2) + 1;
      const counts = new Map();
      for (const arr of t.sources) {
        for (const d of domainSet(arr)) counts.set(d, (counts.get(d) || 0) + 1);
      }
      const domains = [...counts.keys()];
      if (domains.length) consensus.push(domains.filter((d) => counts.get(d) >= k).length / domains.length);
    }
  }

  const modelList = [...modelSets];
  return {
    models: modelList.length === 1 ? modelList[0] : modelList.length ? modelList : null,
    n: nVals.size === 1 ? [...nVals][0] : nVals.size ? [...nVals] : null,
    nplet_query_count: npResults.length,
    agreement_score: round(mean(agreement)),
    disagreement_count: disagreementCount,
    adjudication_quality: round(mean(adjudication)),
    consensus_score: consensus.length ? round(mean(consensus)) : null,
    hallucination_or_unsupported_claim_flags: unsupportedFlags
  };
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

  const scored = {
    label: run.label || 'unlabeled',
    strategy: run.strategy || run.label || null,
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

  const twin = twinMetricsFor(run);
  if (twin) scored.twin_metrics = twin;
  const nplet = npletMetricsFor(run);
  if (nplet) scored.nplet_metrics = nplet;
  return scored;
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
  const out = {
    label: scored.label,
    search_prompt_version: scored.search_prompt_version,
    router_profile: scored.router_profile,
    result_count: scored.result_count,
    metrics: scored.metrics,
    usefulness_notes: scored.usefulness_notes
  };
  if (scored.strategy) out.strategy = scored.strategy;
  if (scored.twin_metrics) out.twin_metrics = scored.twin_metrics;
  if (scored.nplet_metrics) out.nplet_metrics = scored.nplet_metrics;
  return out;
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
// Twin-LLM vs Fable comparison.
//
// Compares a twin-LLM run against a reference run (Fable by default, but the
// same logic is reused for twin-vs-baseline). Surfaces twin-specific metrics
// plus cost_delta_vs_fable / latency_delta_vs_fable and emits one decision:
// keep_twin / tune_twin / rollback_twin / needs_human_review.
// ---------------------------------------------------------------------------
function compareTwinToFable(twinScored, fableScored, referenceLabel = 'fable') {
  const t = twinScored.metrics;
  const f = fableScored.metrics;
  const diff = (a, b) => (typeof a === 'number' && typeof b === 'number' ? round(a - b) : null);
  const ratio = (a, b) =>
    typeof a === 'number' && typeof b === 'number' && b !== 0 ? round(a / b) : null;

  const twin_metrics = Object.assign({}, twinScored.twin_metrics || {}, {
    cost_delta_vs_fable: diff(t.total_cost_usd, f.total_cost_usd),
    latency_delta_vs_fable: diff(t.mean_latency_ms, f.mean_latency_ms)
  });

  const deltas = {
    rubric_mean: diff(t.rubric_mean, f.rubric_mean),
    error_rate: diff(t.error_rate, f.error_rate),
    citation_coverage: diff(t.citation_coverage, f.citation_coverage),
    domain_diversity: diff(t.domain_diversity, f.domain_diversity),
    duplicate_rate: diff(t.duplicate_rate, f.duplicate_rate),
    freshness_satisfaction: diff(t.freshness_satisfaction, f.freshness_satisfaction),
    cost_ratio: ratio(t.total_cost_usd, f.total_cost_usd),
    latency_ratio: ratio(t.mean_latency_ms, f.mean_latency_ms),
    cost_delta_vs_fable: twin_metrics.cost_delta_vs_fable,
    latency_delta_vs_fable: twin_metrics.latency_delta_vs_fable
  };

  const { decision, reasons } = decideTwin(twinScored, fableScored, deltas, referenceLabel);

  return {
    generated_at: new Date().toISOString(),
    reference: referenceLabel,
    twin: summarize(twinScored),
    fable: summarize(fableScored),
    deltas,
    twin_metrics,
    decision,
    reasons,
    thresholds: TWIN_THRESHOLDS
  };
}

function decideTwin(twin, fable, deltas, referenceLabel = 'fable') {
  const reasons = [];
  const T = TWIN_THRESHOLDS;
  const tm = twin.twin_metrics || {};

  const lowData =
    twin.result_count < THRESHOLDS.minResultsForConfidence ||
    fable.result_count < THRESHOLDS.minResultsForConfidence;
  if (lowData) {
    reasons.push(
      `Low sample size (twin=${twin.result_count}, ${referenceLabel}=${fable.result_count}; ` +
        `need >= ${THRESHOLDS.minResultsForConfidence}).`
    );
    return { decision: 'needs_human_review', reasons };
  }

  // Not better than the reference (Fable/baseline) -> rollback. Twin must earn
  // its extra cost/latency with measured quality, not vibes.
  if (deltas.rubric_mean !== null && deltas.rubric_mean <= 0) {
    reasons.push(
      `Twin rubric does not beat ${referenceLabel} (delta ${deltas.rubric_mean} <= 0); ` +
        'twin is not worth its extra cost/latency.'
    );
    return { decision: 'rollback_twin', reasons };
  }
  if (deltas.error_rate !== null && deltas.error_rate >= THRESHOLDS.errorRateRegression) {
    reasons.push(`Twin error rate rose by ${deltas.error_rate} vs ${referenceLabel} (>= ${THRESHOLDS.errorRateRegression}).`);
    return { decision: 'rollback_twin', reasons };
  }
  if (deltas.citation_coverage !== null && deltas.citation_coverage <= THRESHOLDS.citationRegression) {
    reasons.push(`Twin citation coverage dropped by ${deltas.citation_coverage} vs ${referenceLabel} (<= ${THRESHOLDS.citationRegression}).`);
    return { decision: 'rollback_twin', reasons };
  }

  const qualityGain = deltas.rubric_mean !== null && deltas.rubric_mean >= T.minQualityGain;
  const costOk = deltas.cost_ratio === null || deltas.cost_ratio <= T.maxCostRatio;
  const latencyOk = deltas.latency_ratio === null || deltas.latency_ratio <= T.maxLatencyRatio;
  const adjudicationOk =
    typeof tm.adjudication_quality !== 'number' || tm.adjudication_quality >= T.adjudicationFloor;
  const sourcesOk = typeof tm.source_overlap !== 'number' || tm.source_overlap <= T.maxSourceOverlap;
  const hallucinationsOk = countOf(tm.hallucination_or_unsupported_claim_flags) <= T.maxUnsupportedClaims;

  if (qualityGain && costOk && latencyOk && adjudicationOk && sourcesOk && hallucinationsOk) {
    reasons.push(
      `Twin beats ${referenceLabel} on rubric by ${deltas.rubric_mean} (>= ${T.minQualityGain}) ` +
        `within cost (${fmt(deltas.cost_ratio)}x) and latency (${fmt(deltas.latency_ratio)}x) budget; ` +
        `adjudication quality ${fmt(tm.adjudication_quality)}, unsupported-claim flags ${countOf(tm.hallucination_or_unsupported_claim_flags)}.`
    );
    return { decision: 'keep_twin', reasons };
  }

  // Better quality but too expensive / too redundant -> tune (de-dupe models,
  // trim the second run, or cache shared sources).
  if (qualityGain && (!costOk || !latencyOk || !sourcesOk)) {
    if (!costOk) reasons.push(`Cost ${deltas.cost_ratio}x ${referenceLabel} exceeds budget ${T.maxCostRatio}x.`);
    if (!latencyOk) reasons.push(`Latency ${deltas.latency_ratio}x ${referenceLabel} exceeds budget ${T.maxLatencyRatio}x.`);
    if (!sourcesOk) reasons.push(`Source overlap ${tm.source_overlap} > ${T.maxSourceOverlap}: the two runs are largely redundant.`);
    return { decision: 'tune_twin', reasons };
  }

  // Positive but below keep threshold, or adjudication/hallucination concerns.
  if (!qualityGain && deltas.rubric_mean !== null) {
    reasons.push(`Rubric gain ${deltas.rubric_mean} is positive but below keep threshold ${T.minQualityGain}.`);
  }
  if (!adjudicationOk) reasons.push(`Adjudication quality ${tm.adjudication_quality} below floor ${T.adjudicationFloor}.`);
  if (!hallucinationsOk) {
    reasons.push(`Unsupported-claim flags (${countOf(tm.hallucination_or_unsupported_claim_flags)}) exceed allowance ${T.maxUnsupportedClaims}.`);
  }
  reasons.push('No hard regression vs reference, but twin is not a clean win. Tune and re-run.');
  return { decision: 'tune_twin', reasons };
}

// ---------------------------------------------------------------------------
// Triplet / N-model comparison vs a reference run (the TWIN if present, else
// Fable). Mirrors compareTwinToFable but judges the n-model consensus block and
// a ~Nx cost/latency budget.
// ---------------------------------------------------------------------------
function compareNpletToReference(npletScored, refScored, referenceLabel = 'twin') {
  const t = npletScored.metrics;
  const f = refScored.metrics;
  const diff = (a, b) => (typeof a === 'number' && typeof b === 'number' ? round(a - b) : null);
  const ratio = (a, b) => (typeof a === 'number' && typeof b === 'number' && b !== 0 ? round(a / b) : null);

  const nplet_metrics = Object.assign({}, npletScored.nplet_metrics || {}, {
    cost_delta_vs_reference: diff(t.total_cost_usd, f.total_cost_usd),
    latency_delta_vs_reference: diff(t.mean_latency_ms, f.mean_latency_ms)
  });

  const deltas = {
    rubric_mean: diff(t.rubric_mean, f.rubric_mean),
    error_rate: diff(t.error_rate, f.error_rate),
    citation_coverage: diff(t.citation_coverage, f.citation_coverage),
    cost_ratio: ratio(t.total_cost_usd, f.total_cost_usd),
    latency_ratio: ratio(t.mean_latency_ms, f.mean_latency_ms),
    cost_delta_vs_reference: nplet_metrics.cost_delta_vs_reference,
    latency_delta_vs_reference: nplet_metrics.latency_delta_vs_reference
  };

  const { decision, reasons } = decideNplet(npletScored, refScored, deltas, referenceLabel);

  return {
    generated_at: new Date().toISOString(),
    reference: referenceLabel,
    triplet: summarize(npletScored),
    [referenceLabel]: summarize(refScored),
    deltas,
    nplet_metrics,
    decision,
    reasons,
    thresholds: NPLET_THRESHOLDS
  };
}

function decideNplet(nplet, ref, deltas, referenceLabel = 'twin') {
  const reasons = [];
  const T = NPLET_THRESHOLDS;
  const nm = nplet.nplet_metrics || {};

  const lowData =
    nplet.result_count < THRESHOLDS.minResultsForConfidence ||
    ref.result_count < THRESHOLDS.minResultsForConfidence;
  if (lowData) {
    reasons.push(
      `Low sample size (triplet=${nplet.result_count}, ${referenceLabel}=${ref.result_count}; ` +
        `need >= ${THRESHOLDS.minResultsForConfidence}).`
    );
    return { decision: 'needs_human_review', reasons };
  }

  // Must beat the reference on rubric — a triplet's whole point is more
  // robustness, and it costs ~Nx, so no measured gain => roll back.
  if (deltas.rubric_mean !== null && deltas.rubric_mean <= 0) {
    reasons.push(`Triplet rubric does not beat ${referenceLabel} (delta ${deltas.rubric_mean} <= 0); not worth ~Nx cost/latency.`);
    return { decision: 'rollback_triplet', reasons };
  }
  if (deltas.error_rate !== null && deltas.error_rate >= THRESHOLDS.errorRateRegression) {
    reasons.push(`Triplet error rate rose by ${deltas.error_rate} vs ${referenceLabel} (>= ${THRESHOLDS.errorRateRegression}).`);
    return { decision: 'rollback_triplet', reasons };
  }
  if (deltas.citation_coverage !== null && deltas.citation_coverage <= THRESHOLDS.citationRegression) {
    reasons.push(`Triplet citation coverage dropped by ${deltas.citation_coverage} vs ${referenceLabel} (<= ${THRESHOLDS.citationRegression}).`);
    return { decision: 'rollback_triplet', reasons };
  }

  const qualityGain = deltas.rubric_mean !== null && deltas.rubric_mean >= T.minQualityGain;
  const costOk = deltas.cost_ratio === null || deltas.cost_ratio <= T.maxCostRatio;
  const latencyOk = deltas.latency_ratio === null || deltas.latency_ratio <= T.maxLatencyRatio;
  const adjudicationOk = typeof nm.adjudication_quality !== 'number' || nm.adjudication_quality >= T.adjudicationFloor;
  const consensusOk = typeof nm.consensus_score !== 'number' || nm.consensus_score >= T.minConsensus;
  const hallucinationsOk = countOf(nm.hallucination_or_unsupported_claim_flags) <= T.maxUnsupportedClaims;

  if (qualityGain && costOk && latencyOk && adjudicationOk && consensusOk && hallucinationsOk) {
    reasons.push(
      `Triplet beats ${referenceLabel} on rubric by ${deltas.rubric_mean} (>= ${T.minQualityGain}) within cost ` +
        `(${fmt(deltas.cost_ratio)}x) and latency (${fmt(deltas.latency_ratio)}x) budget; consensus ${fmt(nm.consensus_score)}, ` +
        `adjudication ${fmt(nm.adjudication_quality)}, unsupported flags ${countOf(nm.hallucination_or_unsupported_claim_flags)}.`
    );
    return { decision: 'keep_triplet', reasons };
  }

  if (qualityGain && (!costOk || !latencyOk || !consensusOk)) {
    if (!costOk) reasons.push(`Cost ${deltas.cost_ratio}x ${referenceLabel} exceeds budget ${T.maxCostRatio}x.`);
    if (!latencyOk) reasons.push(`Latency ${deltas.latency_ratio}x ${referenceLabel} exceeds budget ${T.maxLatencyRatio}x.`);
    if (!consensusOk) reasons.push(`Consensus ${nm.consensus_score} < ${T.minConsensus}: the arms rarely corroborate the same sources.`);
    return { decision: 'tune_triplet', reasons };
  }

  if (!qualityGain && deltas.rubric_mean !== null) {
    reasons.push(`Rubric gain ${deltas.rubric_mean} is positive but below keep threshold ${T.minQualityGain}.`);
  }
  if (!adjudicationOk) reasons.push(`Adjudication quality ${nm.adjudication_quality} below floor ${T.adjudicationFloor}.`);
  if (!hallucinationsOk) reasons.push(`Unsupported-claim flags (${countOf(nm.hallucination_or_unsupported_claim_flags)}) exceed allowance ${T.maxUnsupportedClaims}.`);
  reasons.push('No hard regression vs reference, but triplet is not a clean win. Tune and re-run.');
  return { decision: 'tune_triplet', reasons };
}

// ---------------------------------------------------------------------------
// Multi-strategy evaluation: score every provided strategy run, then run the
// relevant comparisons (twin vs Fable, twin vs baseline, candidate vs baseline)
// and surface an overall recommendation. Fully offline.
// `runs` is an object keyed by strategy name, e.g.
//   { baseline, fable, twin_llm, twin_llm_adjudicated, candidate }
// ---------------------------------------------------------------------------
function evaluateStrategies(fixtures, runs) {
  const scored = {};
  for (const [strategy, run] of Object.entries(runs)) {
    if (!run) continue;
    const s = scoreRun(Object.assign({ strategy }, run), fixtures);
    s.strategy = strategy;
    scored[strategy] = s;
  }

  const report = {
    generated_at: new Date().toISOString(),
    strategies: {},
    comparisons: {}
  };
  for (const [k, s] of Object.entries(scored)) {
    report.strategies[k] = summarize(s);
    report.strategies[k].per_query = s.per_query;
  }

  const twinKey = scored.twin_llm_adjudicated ? 'twin_llm_adjudicated' : scored.twin_llm ? 'twin_llm' : null;
  if (twinKey && scored.fable) {
    report.comparisons.twin_vs_fable = compareTwinToFable(scored[twinKey], scored.fable, 'fable');
  }
  if (twinKey && scored.baseline) {
    report.comparisons.twin_vs_baseline = compareTwinToFable(scored[twinKey], scored.baseline, 'baseline');
  }
  if (scored.candidate && scored.baseline) {
    report.comparisons.candidate_vs_baseline = compareRuns(scored.baseline, scored.candidate);
  }
  // Triplet earns its place only by beating the bar it's meant to raise: the
  // TWIN if one was provided, otherwise Fable.
  if (scored.triplet_llm) {
    const refKey = twinKey || (scored.fable ? 'fable' : null);
    if (refKey) {
      report.comparisons.triplet_vs_reference = compareNpletToReference(
        scored.triplet_llm,
        scored[refKey],
        twinKey ? 'twin' : 'fable'
      );
    }
  }

  // Overall recommendation: prefer triplet-vs-reference (the most specific
  // question when present), then twin-vs-Fable, then the candidate comparison.
  const primary =
    report.comparisons.triplet_vs_reference ||
    report.comparisons.twin_vs_fable ||
    report.comparisons.candidate_vs_baseline ||
    null;
  report.decision = primary ? primary.decision : 'needs_human_review';
  report.primary_comparison = report.comparisons.triplet_vs_reference
    ? 'triplet_vs_reference'
    : report.comparisons.twin_vs_fable
      ? 'twin_vs_fable'
      : report.comparisons.candidate_vs_baseline
        ? 'candidate_vs_baseline'
        : null;
  if (!primary) {
    report.reasons = ['Not enough strategies provided to compare (need twin+fable or candidate+baseline).'];
  } else {
    report.reasons = primary.reasons;
  }
  return report;
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

function renderTwinMarkdown(cmp) {
  const t = cmp.twin;
  const f = cmp.fable;
  const d = cmp.deltas;
  const tm = cmp.twin_metrics || {};
  const lines = [];
  lines.push(`## Twin-LLM vs ${cmp.reference}: \`${cmp.decision}\``);
  lines.push('');
  for (const r of cmp.reasons) lines.push(`- ${r}`);
  lines.push('');
  lines.push(`| Metric | Twin | ${cmp.reference} | Delta |`);
  lines.push('| --- | --- | --- | --- |');
  const rows = [
    ['Rubric mean', t.metrics.rubric_mean, f.metrics.rubric_mean, d.rubric_mean],
    ['Error rate', t.metrics.error_rate, f.metrics.error_rate, d.error_rate],
    ['Citation coverage', t.metrics.citation_coverage, f.metrics.citation_coverage, d.citation_coverage],
    ['Duplicate rate', t.metrics.duplicate_rate, f.metrics.duplicate_rate, d.duplicate_rate],
    ['Freshness satisfaction', t.metrics.freshness_satisfaction, f.metrics.freshness_satisfaction, d.freshness_satisfaction],
    ['Mean latency (ms)', t.metrics.mean_latency_ms, f.metrics.mean_latency_ms, d.latency_delta_vs_fable],
    ['Total cost (USD)', t.metrics.total_cost_usd, f.metrics.total_cost_usd, d.cost_delta_vs_fable]
  ];
  for (const [name, tv, fv, dv] of rows) lines.push(`| ${name} | ${fmt(tv)} | ${fmt(fv)} | ${fmt(dv)} |`);
  lines.push('');
  lines.push('### Twin-LLM dimensions');
  lines.push('');
  lines.push('| Dimension | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Model pair | ${fmt(Array.isArray(tm.model_pair) ? tm.model_pair.join(', ') : tm.model_pair)} |`);
  lines.push(`| Agreement score | ${fmt(tm.agreement_score)} |`);
  lines.push(`| Disagreement count | ${fmt(tm.disagreement_count)} |`);
  lines.push(`| Adjudication quality | ${fmt(tm.adjudication_quality)} |`);
  lines.push(`| Source overlap | ${fmt(tm.source_overlap)} |`);
  lines.push(`| Unique sources added | ${fmt(tm.unique_sources_added)} |`);
  lines.push(`| Hallucination / unsupported-claim flags | ${fmt(tm.hallucination_or_unsupported_claim_flags)} |`);
  lines.push(`| Cost delta vs ${cmp.reference} (USD) | ${fmt(tm.cost_delta_vs_fable)} |`);
  lines.push(`| Latency delta vs ${cmp.reference} (ms) | ${fmt(tm.latency_delta_vs_fable)} |`);
  lines.push(`| Cost ratio vs ${cmp.reference} | ${fmt(d.cost_ratio)}x |`);
  lines.push(`| Latency ratio vs ${cmp.reference} | ${fmt(d.latency_ratio)}x |`);
  lines.push('');
  return lines.join('\n');
}

function renderStrategyMarkdown(report) {
  const lines = [];
  lines.push('# Search Evaluation Report - Strategy Comparison');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push(`## Overall decision: \`${report.decision}\` (from \`${fmt(report.primary_comparison)}\`)`);
  lines.push('');
  for (const r of report.reasons || []) lines.push(`- ${r}`);
  lines.push('');
  lines.push('## Strategies measured');
  lines.push('');
  lines.push('| Strategy | Version | Rubric | Error | Citations | Dup | Latency (ms) | Cost (USD) |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [name, s] of Object.entries(report.strategies)) {
    const m = s.metrics;
    lines.push(
      `| ${name} | ${fmt(s.search_prompt_version)} | ${fmt(m.rubric_mean)} | ${fmt(m.error_rate)} | ` +
        `${fmt(m.citation_coverage)} | ${fmt(m.duplicate_rate)} | ${fmt(m.mean_latency_ms)} | ${fmt(m.total_cost_usd)} |`
    );
  }
  lines.push('');
  if (report.comparisons.twin_vs_fable) lines.push(renderTwinMarkdown(report.comparisons.twin_vs_fable));
  if (report.comparisons.twin_vs_baseline) lines.push(renderTwinMarkdown(report.comparisons.twin_vs_baseline));
  if (report.comparisons.candidate_vs_baseline) {
    lines.push(renderMarkdown(report.comparisons.candidate_vs_baseline));
  }
  lines.push('');
  lines.push('> Green CI is not proof of search quality. CI proves the measurement layer runs.');
  lines.push('> A twin-LLM strategy must beat Fable/baseline on this evaluation report before it');
  lines.push('> becomes the default. See standards/SEARCH_EVALUATION.md.');
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

  // Strategy mode: any of --fable / --twin / --twin-adjudicated triggers the
  // multi-strategy comparator (twin-LLM vs Fable/baseline).
  const tripletArg = args.triplet; // single documented flag (no hidden alias)
  const strategyMode = !!(args.fable || args.twin || args['twin-adjudicated'] || tripletArg);
  if (strategyMode) {
    const haveStrategy = args.twin || args['twin-adjudicated'] || tripletArg;
    const haveReference = args.fable || args.baseline || args.twin || args['twin-adjudicated'];
    if (!args.fixtures || !haveStrategy || !haveReference) {
      console.log(
        'Usage (strategy mode): node search-eval.js --fixtures <queries.json> ' +
          '--twin <run.json> [--twin-adjudicated <run.json>] [--triplet <run.json>] --fable <run.json> ' +
          '[--baseline <run.json>] [--candidate <run.json>] [--out report.json] [--md report.md]\n' +
          '(--triplet is scored vs the twin if provided, else vs Fable.)'
      );
      process.exit(1);
    }
    const fixtures = loadJson(args.fixtures);
    const runs = {};
    if (args.baseline) runs.baseline = loadJson(args.baseline);
    if (args.candidate) runs.candidate = loadJson(args.candidate);
    if (args.fable) runs.fable = loadJson(args.fable);
    if (args.twin) runs.twin_llm = loadJson(args.twin);
    if (args['twin-adjudicated']) runs.twin_llm_adjudicated = loadJson(args['twin-adjudicated']);
    if (tripletArg) runs.triplet_llm = loadJson(tripletArg);
    const report = evaluateStrategies(fixtures, runs);

    if (args.out) {
      fs.writeFileSync(args.out, JSON.stringify(report, null, 2));
      console.log(`JSON report -> ${args.out}`);
    }
    const md = renderStrategyMarkdown(report);
    if (args.md) {
      fs.writeFileSync(args.md, md);
      console.log(`Markdown report -> ${args.md}`);
    }
    if (!args.out && !args.md) console.log(md);
    console.log(`\nDecision: ${report.decision}`);
    return;
  }

  if (!args.fixtures || !args.baseline || !args.candidate) {
    console.log(
      'Usage: node search-eval.js --fixtures <queries.json> --baseline <run.json> ' +
        '--candidate <run.json> [--out report.json] [--md report.md]\n' +
        'Strategy mode: add --twin <run.json> and --fable <run.json> to compare a ' +
        'twin-LLM strategy against Fable/baseline.'
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
  TWIN_THRESHOLDS,
  NPLET_THRESHOLDS,
  STRATEGIES,
  rubricScore,
  scoreRun,
  twinMetricsFor,
  npletMetricsFor,
  compareRuns,
  compareTwinToFable,
  compareNpletToReference,
  decide,
  decideTwin,
  decideNplet,
  evaluate,
  evaluateStrategies,
  renderMarkdown,
  renderStrategyMarkdown,
  domainOf,
  loadJson
};

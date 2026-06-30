#!/usr/bin/env node
'use strict';

/**
 * Triplet / N-model live search runner (`triplet_llm`).
 *
 * Generalizes the twin to N independent models (default 3) run in PARALLEL, with
 * **k-of-n majority consensus** (k = floor(n/2)+1, i.e. 2-of-3 for a triplet) and
 * an adjudicator that merges agreed, source-backed claims and drops unsupported
 * ones. Emits an `nplet` block scored by eval/search-eval.js (`--triplet`), which
 * decides keep_triplet / tune_triplet / rollback_triplet vs the twin (or Fable).
 *
 * A triplet costs ~3x a single run, so per SEARCH_EVALUATION.md it must beat the
 * twin on measured quality to earn its place — the runner produces data, the eval
 * makes the call. Reuses twin-search.js helpers (no duplication). Uses
 * OPENROUTER_API_KEY (the product's paid search lane, not the BIOME crew).
 *
 * Terminology: the strategy/label is `triplet_llm` (the n=3 default a user runs);
 * the per-result block and the eval metrics are named `nplet` because the logic
 * generalizes to any N (set TRIPLET_MODELS to a longer list). triplet = the
 * common instance, nplet = the general shape.
 */

const {
  extractCitations,
  domainOf,
  unionCitations,
  parseAdjudication,
  buildSearchSystemPrompt,
} = require('./twin-search');

const DEFAULT_MODELS = process.env.TRIPLET_MODELS
  ? process.env.TRIPLET_MODELS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['openai/gpt-4o-search-preview', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.5-pro'];
const DEFAULT_ADJUDICATOR = process.env.TRIPLET_ADJUDICATOR || 'openai/gpt-4o';

function round(n, p = 2) {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function clamp01(n, fallback) {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function countOf(v) {
  if (Array.isArray(v)) return v.length;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return 0;
}

// Strict majority: 2 of 3, 3 of 5, etc.
function majorityK(n) {
  return Math.floor(n / 2) + 1;
}

// Consensus = fraction of distinct source-domains (across all arms) that are
// cited by at least k arms. High consensus => the arms independently corroborate
// the same sources, which is the robustness a triplet is bought for.
function consensusScore(perModelSources, k) {
  const counts = new Map();
  for (const arr of perModelSources || []) {
    const seen = new Set();
    for (const u of arr || []) {
      const d = domainOf(u);
      if (d && !seen.has(d)) {
        seen.add(d);
        counts.set(d, (counts.get(d) || 0) + 1);
      }
    }
  }
  const domains = [...counts.keys()];
  if (!domains.length) return 0;
  const backed = domains.filter((d) => counts.get(d) >= k).length;
  return round(backed / domains.length);
}

/**
 * Assemble one n-plet result row. `runs` is an array of
 * { answer, citations, latency_ms, cost_usd } (one per model).
 */
function buildNpletResult({ queryId, models, adjudicator, runs, adjudication, adjudicatorLatencyMs = 0, adjudicatorCostUsd = null, error = false }) {
  const adj = adjudication || {};
  const n = runs.length;
  const k = majorityK(n);
  const perModelSources = runs.map((r) => r.citations || []);
  const consensus = consensusScore(perModelSources, k);

  const firstAnswer = runs.map((r) => r.answer).find((a) => a && a.trim()) || '';
  const answer = typeof adj.answer === 'string' && adj.answer.trim() ? adj.answer.trim() : firstAnswer;
  const citations =
    Array.isArray(adj.citations) && adj.citations.length
      ? adj.citations.slice()
      // Union ALL N model source arrays — unionCitations is binary, so fold over
      // them (a bare spread would silently drop the 3rd+ model's citations).
      : perModelSources.reduce((acc, arr) => unionCitations(acc, arr), []);

  const latency_ms = Math.max(0, ...runs.map((r) => r.latency_ms || 0)) + (adjudicatorLatencyMs || 0);
  const costs = [...runs.map((r) => r.cost_usd), adjudicatorCostUsd].filter((c) => typeof c === 'number');
  const cost_usd = costs.length ? round(costs.reduce((s, c) => s + c, 0), 6) : null;

  return {
    query_id: queryId,
    answer,
    citations,
    // Error-free only when at least k arms returned (a triplet still works with
    // 2 of 3); surfaced so eval can measure error-rate.
    error: Boolean(error),
    latency_ms,
    cost_usd,
    nplet: {
      models: models.slice(),
      adjudicator,
      n,
      k,
      agreement_score: clamp01(adj.agreement_score, consensus),
      consensus_score: consensus,
      disagreements: countOf(adj.disagreements),
      adjudication_quality: clamp01(adj.adjudication_quality, 0.5),
      sources: perModelSources,
      unsupported_claims: countOf(adj.unsupported_claims),
    },
  };
}

function buildNpletReport(results, models, adjudicator) {
  return {
    label: 'triplet_llm',
    strategy: 'triplet_llm',
    search_prompt_version: 'triplet-llm-v1',
    router_profile: 'n_model_adjudicated',
    models: models.slice(),
    adjudicator,
    results,
  };
}

module.exports = {
  DEFAULT_MODELS,
  DEFAULT_ADJUDICATOR,
  majorityK,
  consensusScore,
  buildNpletResult,
  buildNpletReport,
};

// --- CLI / live orchestration ---------------------------------------------
if (require.main === module) {
  const ADJUDICATOR_SYSTEM = `You are an adjudicator merging ${'${N}'} independent research answers to the same question. Keep only claims that at least one answer supports with a cited source; favor claims corroborated by a MAJORITY of the answers; resolve disagreements toward the better-cited side; DROP any claim with no supporting source. Return STRICT JSON only, no prose:
{"answer": "<merged source-backed answer>", "citations": ["<url>", ...], "agreement_score": <0..1>, "disagreements": <int>, "adjudication_quality": <0..1>, "unsupported_claims": <int>}`;

  async function callModel(model, messages) {
    // OpenRouter needs a FUNDED key (even ":free" models need credits) — a
    // missing/unfunded key 401/402/403/429s. Troubleshoot: check key + balance
    // at https://openrouter.ai/credits.
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY required (must be a funded/verified key — see https://openrouter.ai/credits)');
    }
    const started = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rnd-research-fleet',
        'X-Title': 'R&D Research Fleet — Triplet Search',
      },
      body: JSON.stringify({ model, messages, max_tokens: 4000, temperature: 0.3, usage: { include: true } }),
    });
    const latency_ms = Date.now() - started;
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`${model} -> ${res.status} ${t.slice(0, 200)} (if 401/402/403/429: check key + balance at https://openrouter.ai/credits)`);
    }
    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content || '', latency_ms, cost_usd: typeof data.usage?.cost === 'number' ? data.usage.cost : null };
  }

  (async () => {
    const query = process.argv.slice(2).join(' ').trim();
    if (!query) {
      console.log('Usage: node triplet-search.js "your research question"');
      console.log('Env: TRIPLET_MODELS (comma-separated, default 3), TRIPLET_ADJUDICATOR');
      process.exit(0);
    }
    const models = DEFAULT_MODELS.slice();
    const adjudicator = DEFAULT_ADJUDICATOR;
    const userMsg = [{ role: 'system', content: buildSearchSystemPrompt() }, { role: 'user', content: query }];

    console.error(`[triplet] n=${models.length} models=${models.join(', ')} adj=${adjudicator}`);
    const settled = await Promise.allSettled(models.map((m) => callModel(m, userMsg)));
    const runs = settled.map((s, i) => {
      if (s.status === 'fulfilled') {
        return { answer: s.value.content, citations: extractCitations(s.value.content), latency_ms: s.value.latency_ms, cost_usd: s.value.cost_usd };
      }
      console.error(`[triplet] model ${models[i]} failed: ${s.reason?.message}`);
      return { answer: '', citations: [], latency_ms: 0, cost_usd: null };
    });
    const okCount = settled.filter((s) => s.status === 'fulfilled').length;
    const error = okCount < majorityK(models.length); // can't form a majority

    let adjudication = null;
    let adjLatency = 0;
    let adjCost = null;
    if (okCount >= 1) {
      const arms = runs.map((r, i) => `--- Answer ${i + 1} (${models[i]}) ---\n${r.answer}`).join('\n\n');
      const adjMsg = [
        { role: 'system', content: ADJUDICATOR_SYSTEM.replace('${N}', String(models.length)) },
        { role: 'user', content: `Question:\n${query}\n\n${arms}` },
      ];
      try {
        const adj = await callModel(adjudicator, adjMsg);
        adjudication = parseAdjudication(adj.content);
        adjLatency = adj.latency_ms;
        adjCost = adj.cost_usd;
      } catch (e) {
        console.error(`[triplet] adjudicator (${adjudicator}) failed: ${e.message}`);
      }
    }

    const result = buildNpletResult({
      queryId: 'cli-query',
      models,
      adjudicator,
      runs,
      adjudication,
      adjudicatorLatencyMs: adjLatency,
      adjudicatorCostUsd: adjCost,
      error,
    });
    console.log(JSON.stringify(buildNpletReport([result], models, adjudicator), null, 2));
    if (error) process.exitCode = 1;
  })().catch((e) => {
    console.error('triplet-search error:', e.message);
    process.exit(1);
  });
}

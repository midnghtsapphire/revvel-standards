#!/usr/bin/env node
'use strict';

/**
 * Twin-LLM live search runner (twin_llm_adjudicated).
 *
 * Implements the strategy specced in standards/SEARCH_EVALUATION.md as a LIVE
 * path (the existing deep-search-router.js only does sequential failover):
 *
 *   1. Send the SAME query to TWO independent models in PARALLEL (model_a, model_b)
 *      — ideally different providers, so failure modes are uncorrelated.
 *   2. An adjudicator model merges them: keep agreed + source-backed claims,
 *      resolve disagreements toward the better-cited side, DROP unsupported claims.
 *   3. Emit a result object matching the twin JSON schema so it plugs straight
 *      into eval/search-eval.js (--twin-adjudicated) for the keep/tune/rollback
 *      decision. Green CI never proves twin is better — the eval does.
 *
 * Uses OPENROUTER_API_KEY (this is the rnd-research-fleet product's paid search
 * lane, not the credit-free BIOME crew). Pure helpers are exported for tests;
 * the network orchestration lives under `if (require.main === module)`.
 */

const { MASTER_PROMPT } = require('./deep-search-router');

const DEFAULTS = {
  modelA: process.env.TWIN_MODEL_A || 'openai/gpt-4o-search-preview',
  modelB: process.env.TWIN_MODEL_B || 'anthropic/claude-3.5-sonnet',
  adjudicator: process.env.TWIN_ADJUDICATOR || 'openai/gpt-4o',
};

// The twin's two arms apply the SAME R&D frameworks as the deep-search lane —
// DOE Screening, TRIZ, MEErP, LCA, and BNAT (Best Not Yet Available Technology) —
// so it stays a true deep-research twin, not a generic Q&A. Citations are added
// on top because the evaluator scores source coverage.
function buildSearchSystemPrompt() {
  return `${MASTER_PROMPT}

Additionally, for this search: cite every nontrivial claim with a full source URL inline. Prefer primary/authoritative sources. If unsure, say so rather than guessing.`;
}

const URL_RE = /\bhttps?:\/\/[^\s)\]"'<>]+/g;

function extractCitations(text) {
  if (!text) return [];
  const out = [];
  const seen = new Set();
  for (const m of String(text).matchAll(URL_RE)) {
    // strip trailing punctuation that commonly clings to URLs in prose
    const url = m[0].replace(/[.,;:)\]}>"']+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function domainSet(urls) {
  return new Set((urls || []).map(domainOf).filter(Boolean));
}

// Jaccard overlap of source domains — used as a fallback agreement signal when
// the adjudicator doesn't return its own agreement_score.
function sourceOverlapScore(a, b) {
  const sa = domainSet(a);
  const sb = domainSet(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const d of sa) if (sb.has(d)) inter += 1;
  const union = new Set([...sa, ...sb]).size;
  return union ? round(inter / union) : 0;
}

function round(n, p = 2) {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function unionCitations(a, b) {
  const out = [];
  const seen = new Set();
  for (const u of [...(a || []), ...(b || [])]) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

// Parse the adjudicator's structured verdict. Tolerates ```json fences and
// surrounding prose; returns null if no JSON object can be recovered.
function parseAdjudication(content) {
  if (!content) return null;
  let text = String(content).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
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

/**
 * Assemble one twin result row matching the SEARCH_EVALUATION twin schema.
 * runA/runB: { answer, citations, latency_ms, cost_usd }
 * adjudication: parsed adjudicator object (may be null -> fallback merge).
 */
function buildTwinResult({ queryId, models, runA, runB, adjudication, adjudicatorLatencyMs = 0, adjudicatorCostUsd = null }) {
  const adj = adjudication || {};
  const sourcesA = runA.citations || [];
  const sourcesB = runB.citations || [];

  const answer = typeof adj.answer === 'string' && adj.answer.trim() ? adj.answer.trim() : runA.answer || runB.answer || '';
  const citations =
    Array.isArray(adj.citations) && adj.citations.length ? adj.citations.slice() : unionCitations(sourcesA, sourcesB);

  const latency_ms = Math.max(runA.latency_ms || 0, runB.latency_ms || 0) + (adjudicatorLatencyMs || 0);
  const costs = [runA.cost_usd, runB.cost_usd, adjudicatorCostUsd].filter((c) => typeof c === 'number');
  const cost_usd = costs.length ? round(costs.reduce((s, c) => s + c, 0), 6) : null;

  return {
    query_id: queryId,
    answer,
    citations,
    error: false,
    latency_ms,
    cost_usd,
    twin: {
      model_a: models.modelA,
      model_b: models.modelB,
      adjudicator: models.adjudicator,
      agreement_score: clamp01(adj.agreement_score, sourceOverlapScore(sourcesA, sourcesB)),
      disagreements: countOf(adj.disagreements),
      adjudication_quality: clamp01(adj.adjudication_quality, 0.5),
      sources_a: sourcesA,
      sources_b: sourcesB,
      unsupported_claims: countOf(adj.unsupported_claims),
    },
  };
}

function buildTwinReport(results, models) {
  return {
    label: 'twin_llm_adjudicated',
    strategy: 'twin_llm_adjudicated',
    search_prompt_version: 'twin-llm-adjudicated-v1',
    router_profile: 'twin_dual_model_adjudicated',
    models,
    results,
  };
}

module.exports = {
  DEFAULTS,
  buildSearchSystemPrompt,
  extractCitations,
  domainOf,
  sourceOverlapScore,
  unionCitations,
  parseAdjudication,
  buildTwinResult,
  buildTwinReport,
};

// --- CLI / live orchestration ---------------------------------------------
if (require.main === module) {
  const SEARCH_SYSTEM = buildSearchSystemPrompt();

  const ADJUDICATOR_SYSTEM = `You are an adjudicator merging two independent research answers (A and B) to the same question. Keep only claims that at least one answer supports with a cited source; resolve disagreements toward the better-cited side; DROP any claim with no supporting source. Return STRICT JSON only, no prose, with this exact shape:
{"answer": "<merged source-backed answer>", "citations": ["<url>", ...], "agreement_score": <0..1>, "disagreements": <int>, "adjudication_quality": <0..1>, "unsupported_claims": <int>}`;

  async function callModel(model, messages) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY required');
    const started = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rnd-research-fleet',
        'X-Title': 'R&D Research Fleet — Twin Search',
      },
      body: JSON.stringify({ model, messages, max_tokens: 4000, temperature: 0.3, usage: { include: true } }),
    });
    const latency_ms = Date.now() - started;
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`${model} -> ${res.status} ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cost_usd = typeof data.usage?.cost === 'number' ? data.usage.cost : null;
    return { content, latency_ms, cost_usd };
  }

  (async () => {
    const query = process.argv.slice(2).join(' ').trim();
    if (!query) {
      console.log('Usage: node twin-search.js "your research question"');
      console.log('Env: TWIN_MODEL_A, TWIN_MODEL_B, TWIN_ADJUDICATOR (optional overrides)');
      process.exit(0);
    }
    const models = { ...DEFAULTS };
    const userMsg = [{ role: 'system', content: SEARCH_SYSTEM }, { role: 'user', content: query }];

    console.error(`[twin] A=${models.modelA}  B=${models.modelB}  adj=${models.adjudicator}`);
    // Two independent runs IN PARALLEL — the whole point of twin.
    const [a, b] = await Promise.all([callModel(models.modelA, userMsg), callModel(models.modelB, userMsg)]);
    const runA = { answer: a.content, citations: extractCitations(a.content), latency_ms: a.latency_ms, cost_usd: a.cost_usd };
    const runB = { answer: b.content, citations: extractCitations(b.content), latency_ms: b.latency_ms, cost_usd: b.cost_usd };

    const adjMsg = [
      { role: 'system', content: ADJUDICATOR_SYSTEM },
      { role: 'user', content: `Question:\n${query}\n\n--- Answer A (${models.modelA}) ---\n${runA.answer}\n\n--- Answer B (${models.modelB}) ---\n${runB.answer}` },
    ];
    const adj = await callModel(models.adjudicator, adjMsg);
    const adjudication = parseAdjudication(adj.content);

    const result = buildTwinResult({
      queryId: 'cli-query',
      models,
      runA,
      runB,
      adjudication,
      adjudicatorLatencyMs: adj.latency_ms,
      adjudicatorCostUsd: adj.cost_usd,
    });
    // Emit the eval-compatible report on stdout (pipe to a fixture, then run
    // `npm run eval:strategies ... --twin-adjudicated <file>`).
    console.log(JSON.stringify(buildTwinReport([result], models), null, 2));
  })().catch((e) => {
    console.error('twin-search error:', e.message);
    process.exit(1);
  });
}

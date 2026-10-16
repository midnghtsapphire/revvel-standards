// @midnght/deep-research — core engine
// Fan a question across N OpenRouter models, cross-check with a judge, synthesize a tiered brief.
// Provider-agnostic at the call site: everything goes through OpenRouter's single endpoint.

import fs from "node:fs";
import path from "node:path";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export function loadModels(configPath) {
  const p = configPath || path.join(process.env.HOME || ".", ".dr", "models.json");
  const fallback = path.join(process.cwd(), "config", "models.json");
  const file = fs.existsSync(p) ? p : fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function callModel(modelId, messages, { reasoningEffort = "high", apiKey } = {}) {
  const t0 = Date.now();
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey || process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://midnghtsapphire.local",
      "X-Title": "deep-research"
    },
    body: JSON.stringify({ model: modelId, messages, reasoning: { effort: reasoningEffort } })
  });
  if (!res.ok) throw new Error(`${modelId} -> ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    model: modelId,
    text: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage ?? null,
    latency_ms: Date.now() - t0
  };
}

// Required output contract each panel model is asked to follow.
const PANEL_SYSTEM = `You are one independent member of a research panel. Answer the question with:
- CLAIMS: numbered, each a single factual statement.
- SOURCES: for each claim, cite a source (URL/title) or mark [memory] if uncited.
- CONFIDENCE: a 0-100% per claim.
- ASSUMPTIONS: list explicitly.
- UNKNOWNS: what you cannot determine.
Do not invent sources. Mark uncertainty plainly. Be thorough; depth over brevity.`;

const JUDGE_SYSTEM = `You are the referee. You receive multiple panel answers to the same question.
Produce:
- AGREEMENTS: claims independently supported by >=3 panelists (tier these higher).
- CONFLICTS: where panelists disagree; state both sides, do not resolve by vote alone.
- UNSUPPORTED: claims with weak/no sourcing or only one panelist.
- TIERED FINDINGS: label each surviving claim A1/A2/B2/B3 (A=authoritative/instrumented/confirmed,
  B=reliable-source/context; 1=corroborated..3=possible).
- OVERALL CONFIDENCE: 0-100%, and a list of remaining UNKNOWNS to drive another round.
Never paper over conflicts. Prefer primary sources.`;

export async function runPanel(question, { models, judge, reasoningEffort, apiKey, web } = {}) {
  const cfg = loadModels();
  const panel = models && models.length ? models : cfg.tiers.reasoning.primary.slice(0, cfg.defaults.panel_size);
  const judgeModel = judge || cfg.tiers.judge.primary[0];

  const webNote = web === false ? "" : "\nUse web sources where possible; cite URLs.";
  const userMsg = [{ role: "system", content: PANEL_SYSTEM + webNote }, { role: "user", content: question }];

  // Fan out in parallel; tolerate individual failures (fall back per tier).
  const results = await Promise.allSettled(
    panel.map((m) => callModel(m, userMsg, { reasoningEffort, apiKey }))
  );
  const answers = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failures = results.filter((r) => r.status === "rejected").map((r) => String(r.reason));

  // Judge cross-checks the assembled panel.
  const judgeMsg = [
    { role: "system", content: JUDGE_SYSTEM },
    { role: "user", content: `QUESTION:\n${question}\n\nPANEL ANSWERS:\n` +
        answers.map((a, i) => `--- PANELIST ${i + 1} (${a.model}) ---\n${a.text}`).join("\n\n") }
  ];
  const verdict = await callModel(judgeModel, judgeMsg, { reasoningEffort: "high", apiKey });

  const ledger = {
    panel,
    judge: judgeModel,
    failures,
    cost_latency: answers.map((a) => ({ model: a.model, usage: a.usage, latency_ms: a.latency_ms }))
      .concat([{ model: judgeModel, usage: verdict.usage, latency_ms: verdict.latency_ms }])
  };
  return { question, answers, verdict: verdict.text, ledger };
}

// Iterative deepening: re-run targeting unknowns until confidence threshold or maxRounds.
export async function deepResearch(question, opts = {}) {
  const cfg = loadModels();
  const maxRounds = opts.rounds === "auto" || opts.rounds == null ? 5 : opts.rounds;
  const threshold = opts.confidenceThreshold ?? cfg.defaults.confidence_threshold;
  const rounds = [];
  let q = question;
  for (let i = 0; i < maxRounds; i++) {
    const r = await runPanel(q, opts);
    rounds.push(r);
    const conf = extractConfidence(r.verdict);
    if (conf >= threshold * 100) break;
    const unknowns = extractUnknowns(r.verdict);
    if (!unknowns) break;
    q = `${question}\n\nFocus this round on resolving these open points:\n${unknowns}`;
  }
  return { question, rounds, brief: rounds[rounds.length - 1]?.verdict, total_rounds: rounds.length };
}

function extractConfidence(text) {
  const m = text.match(/OVERALL CONFIDENCE[:\s]*([0-9]{1,3})\s*%/i);
  return m ? Number(m[1]) : 0;
}
function extractUnknowns(text) {
  const m = text.match(/UNKNOWNS?[:\s]*([\s\S]*?)(?:\n\n|$)/i);
  return m ? m[1].trim() : "";
}

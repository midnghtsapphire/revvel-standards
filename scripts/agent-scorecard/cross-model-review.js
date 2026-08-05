'use strict';

/**
 * Cross-model adversarial review.
 *
 * A second, independent model reviews the first agent's diff specifically for
 * hallucination: claims/APIs/behaviour the diff does not actually support,
 * invented function names, or descriptions that contradict the code. This is the
 * "expensive" detector — it only runs when keys are configured and degrades to a
 * clean no-op otherwise, so CI never hard-fails for lack of a reviewer.
 *
 * Reuses scripts/llm.js (`ask`) so it inherits the repo's no-key-first →
 * OpenRouter fallback chain rather than wiring a new provider.
 */

const REVIEW_SYSTEM =
  'You are an adversarial code reviewer whose ONLY job is to detect hallucinations ' +
  'in a pull request diff: references to functions, files, APIs, flags, or behaviours ' +
  'that the diff does not actually define or support, and prose claims that contradict ' +
  'the code. You do not comment on style. Respond with STRICT JSON only.';

function buildPrompt({ title, body, diff }) {
  const clippedDiff = String(diff || '').slice(0, 18000);
  return [
    `PR title: ${title || '(none)'}`,
    `PR body:\n${String(body || '(none)').slice(0, 2000)}`,
    '',
    'Unified diff (may be truncated):',
    '```diff',
    clippedDiff,
    '```',
    '',
    'Return JSON exactly of the form:',
    '{"flags":[{"severity":"high|med|low","claim":"...","why":"..."}],"summary":"one sentence"}',
    'If you find no hallucinations, return {"flags":[],"summary":"no hallucinations found"}.',
  ].join('\n');
}

function parseVerdict(text) {
  // Pull the first JSON object out of the model's reply, tolerating code fences.
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return { flags: [], summary: 'unparseable review', parsed: false };
  try {
    const obj = JSON.parse(match[0]);
    const flags = Array.isArray(obj.flags) ? obj.flags : [];
    return { flags, summary: obj.summary || '', parsed: true };
  } catch {
    return { flags: [], summary: 'unparseable review', parsed: false };
  }
}

/**
 * @param {object} ctx  { title, body, diff }
 * @param {object} [deps] { ask } injectable for tests
 * @returns {Promise<{available:boolean, flagCount:number, flags:Array, summary:string, modelUsed?:string}>}
 */
async function review(ctx, deps = {}) {
  const ask = deps.ask || require('../llm').ask;
  try {
    const { text, modelUsed } = await ask(buildPrompt(ctx), {
      system: REVIEW_SYSTEM,
      silent: true,
    });
    const verdict = parseVerdict(text);
    return {
      available: true,
      flagCount: verdict.flags.length,
      flags: verdict.flags,
      summary: verdict.summary,
      modelUsed,
    };
  } catch (err) {
    return {
      available: false,
      flagCount: 0,
      flags: [],
      summary: `cross-model review unavailable: ${err.message}`,
    };
  }
}

module.exports = { review, buildPrompt, parseVerdict, REVIEW_SYSTEM };

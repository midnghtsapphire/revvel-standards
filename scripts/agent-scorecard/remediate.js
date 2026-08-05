'use strict';

/**
 * Self-heal remediation loop.
 *
 * When the scorecard detects a shortcoming, we don't just gate — we try to fix
 * it, then rate the *recovery*. The escalation ladder:
 *
 *   tier 0  prompt-correction : re-run the SAME agent with a corrective system
 *                               prompt that names exactly what it got wrong.
 *                               If this fixes it, our PROMPT/SCRIPT was the weak
 *                               link, not the agent.
 *   tier 1  agent-handoff     : hand off to the next agent in the fallback chain.
 *                               If this fixes it, the AGENT was the weak link.
 *   tier 2  escalate-claude   : direct call to the Claude API (top model). If only
 *                               this fixes it, the task was genuinely hard.
 *
 * Decision logic is pure and unit-tested; the live re-run / escalate call is
 * performed by the orchestrator using scripts/llm.js.
 */

// Next-agent chain, aligned with scripts/agent-self-heal.js.
const HANDOFF_CHAIN = {
  openrouter: 'openhands',
  openhands: 'claude-direct',
  cursor: 'openrouter',
  default: 'openrouter',
};

const TIERS = ['prompt-correction', 'agent-handoff', 'escalate-claude'];

/**
 * Turn failed dimensions into a human-and-model-readable list of what to fix.
 */
function diagnose(signals = {}) {
  const problems = [];
  if (signals.unresolvedRefs > 0)
    problems.push(`${signals.unresolvedRefs} reference(s) point to things that don't exist (hallucinated imports/paths/env).`);
  if (signals.unbackedClaims > 0)
    problems.push(`${signals.unbackedClaims} PR claim(s) are not backed by the diff.`);
  if (signals.crossModelHallucinationFlags > 0)
    problems.push(`Independent review flagged ${signals.crossModelHallucinationFlags} hallucination(s).`);
  if (signals.testFailures > 0) problems.push(`${signals.testFailures} test(s) failing.`);
  if (signals.buildFailures > 0) problems.push(`Build is failing.`);
  if (signals.scaffoldingHits > 0) problems.push(`Scaffolding/placeholder code was added.`);
  if (signals.rootJunkHits > 0) problems.push(`Stray files were added to the repo root.`);
  if (signals.outOfScopeFiles > 0)
    problems.push(`${signals.outOfScopeFiles} file(s) changed outside the work-request scope.`);
  return problems;
}

/**
 * Choose the remediation tier from how many times we've already tried.
 */
function selectTier(attempt = 0) {
  return TIERS[Math.min(attempt, TIERS.length - 1)];
}

function nextAgent(agent) {
  return HANDOFF_CHAIN[agent] || HANDOFF_CHAIN.default;
}

/**
 * Build the corrective system-prompt addendum that names the failures so the
 * re-run targets them instead of repeating the mistake.
 */
function correctivePrompt(agent, problems) {
  return [
    `You are re-running a task that the agent "${agent}" did not complete correctly.`,
    'Fix EXACTLY these problems and change nothing unrelated:',
    ...problems.map((p, i) => `  ${i + 1}. ${p}`),
    'Ship working code only — no placeholders. Verify every import, path, and env var resolves.',
    'If you reference a file, function, or API, it must already exist or be created in this same change.',
  ].join('\n');
}

/**
 * Produce the full remediation plan for a detected shortcoming. Pure.
 *
 * @param {object} opts
 * @param {string} opts.agent     the agent that produced the bad PR
 * @param {object} opts.signals   the signals that triggered remediation
 * @param {number} [opts.attempt] how many remediations already tried (0-based)
 */
function planRemediation({ agent, signals, attempt = 0 }) {
  const problems = diagnose(signals);
  const tier = selectTier(attempt);
  const plan = {
    agent,
    tier,
    attempt,
    problems,
    correctivePrompt: correctivePrompt(agent, problems),
  };
  if (tier === 'agent-handoff') plan.handoffTo = nextAgent(agent);
  if (tier === 'escalate-claude') plan.escalateModel = 'anthropic/claude-sonnet-4';
  return plan;
}

/**
 * After a re-run, decide whether it recovered and — the metric you actually want
 * — WHERE the weak link was, so we know if prompts/scripts need work vs agents.
 *
 * @param {object} opts
 * @param {string} opts.tier         tier that was executed
 * @param {boolean} opts.postPassed  did the re-run land green / clean?
 */
function recordOutcome({ tier, postPassed }) {
  if (!postPassed) {
    return { recovered: false, weakLink: 'unresolved' };
  }
  const weakLink =
    tier === 'prompt-correction'
      ? 'prompt' // our instructions were the problem — improve the prompt/script
      : tier === 'agent-handoff'
        ? 'agent' // the original agent couldn't do it — another could
        : 'task-difficulty'; // only the top model could — genuinely hard task
  return { recovered: true, weakLink, tier };
}

module.exports = {
  HANDOFF_CHAIN,
  TIERS,
  diagnose,
  selectTier,
  nextAgent,
  correctivePrompt,
  planRemediation,
  recordOutcome,
};

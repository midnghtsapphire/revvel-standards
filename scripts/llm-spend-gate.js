'use strict';

/**
 * One switch that decides whether this repo may spend money on an LLM.
 *
 * The problem this exists for: on 2026-08-21 the owner found ~$80 of OpenRouter
 * spend in a day with nobody touching the repository. The cause was not a tier
 * or a price — it was call volume nobody was holding a total for. 46 scheduled
 * workflows fired ~496 runs/day and ten of them called OpenRouter (#17849), and
 * on top of that every pull request fans out to a fleet of reviewer bots, several
 * routed through `scripts/openrouter-personas.js` (#17850).
 *
 * At the moment that spend is zero, but for the wrong reason: the account sits
 * at 402 Payment Required, so every call fails free. **Topping up credits
 * re-arms the entire burn.** The 402 is not a control; it is an outage that
 * happens to look like one.
 *
 * So: a call that costs money must be refused unless someone deliberately said
 * yes. `REVVEL_LLM_ALLOW_CLOUD` must be exactly `"1"`. Not `true`, not `yes` —
 * a half-remembered value fails closed rather than open.
 *
 * This is the JavaScript half of the gate that `scripts/local_llm.py` applies on
 * the Python side, and it uses the same variable on purpose: one name, one
 * decision, both languages. `wr/agents/HIERARCHY.md` puts local LLMs at Layer 0
 * and targets 60-70% of work there; this is what makes "Layer 0 first" a
 * property of the system rather than an aspiration in a document.
 *
 * Usage:
 *
 *   const { assertCloudAllowed } = require('./llm-spend-gate');
 *   assertCloudAllowed('pr-auto-review');   // throws CloudSpendBlockedError
 *
 * or, to skip rather than fail:
 *
 *   const { cloudAllowed } = require('./llm-spend-gate');
 *   if (!cloudAllowed()) return skipGracefully();
 */

const GATE_ENV = 'REVVEL_LLM_ALLOW_CLOUD';
const GATE_VALUE = '1';

/**
 * Thrown instead of spending. A distinct class so callers can tell "we refused
 * to spend" apart from "the API failed" — the two need different handling and
 * conflating them is how a refusal gets retried.
 */
class CloudSpendBlockedError extends Error {
  constructor(callSite) {
    super(
      `Refusing to call a paid LLM API from "${callSite}": ${GATE_ENV} is not set to "${GATE_VALUE}".\n` +
        `\n` +
        `This is a spend gate, not a bug. Nothing in this repo may bill an LLM\n` +
        `provider unless someone deliberately allowed it for that job.\n` +
        `\n` +
        `To allow it for one workflow, set it in that workflow's env with a\n` +
        `comment saying why the work cannot run locally:\n` +
        `\n` +
        `    env:\n` +
        `      ${GATE_ENV}: "${GATE_VALUE}"\n` +
        `\n` +
        `To run local-only instead, use Layer 0 — see docs/LOCAL_LLM_SETUP.md.`,
    );
    this.name = 'CloudSpendBlockedError';
    this.callSite = callSite;
    this.gate = GATE_ENV;
  }
}

/** True only on an exact "1". Anything else means local-only. */
function cloudAllowed() {
  return (process.env[GATE_ENV] || '').trim() === GATE_VALUE;
}

/**
 * Throw unless cloud spend is explicitly allowed.
 *
 * @param {string} callSite Where the call is being made from, for the message.
 */
function assertCloudAllowed(callSite) {
  if (!cloudAllowed()) {
    throw new CloudSpendBlockedError(callSite || 'unknown call site');
  }
}

module.exports = {
  GATE_ENV,
  GATE_VALUE,
  CloudSpendBlockedError,
  cloudAllowed,
  assertCloudAllowed,
};

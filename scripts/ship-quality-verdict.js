#!/usr/bin/env node
'use strict';

/**
 * Ship Quality verdict combiner — the VEINS grounding gate (CuP = 100%).
 *
 * Why this exists: Ship Quality Check used to be an LLM vibe-scan of the diff
 * that never ran the test suite and said "PASS — Ready to ship" over a broken
 * pipeline for weeks (observed 2026-07-08; predicted by the owner's V.E.I.N.S.
 * research as "Speculative Hallucination & Rule-Poisoning"). Per S-MOS §4
 * strict sandboxing: no verdict may PASS unless the REAL `npm test` result is
 * green. An LLM opinion may only DOWNGRADE (WARN / BLOCK) — it can never
 * establish or upgrade a PASS on its own.
 *
 * Inputs (grounded first, opinion second):
 *   testsResult — 'pass' | 'fail' | '' (empty = suite did not run → NOT grounded)
 *   aiResult    — 'pass' | 'warn' | 'fail' | '' (empty = no AI key / no diff)
 *
 * Output: final verdict 'pass' | 'warn' | 'fail'.
 *   - tests fail            → 'fail' (always; nothing can override a red suite)
 *   - tests missing/unknown → at most 'warn' (ungrounded: opinion may warn,
 *                             never pass), 'fail' if the AI says BLOCK
 *   - tests pass            → AI may keep 'pass' or downgrade to warn/fail
 *
 * What to check if this gate fails unexpectedly: run `npm test` locally (see
 * CLAUDE.md "Verifying changes locally") — 3 known pre-existing failures are
 * documented in learnings.md; anything else is your change.
 */

function combineVerdict({ testsResult, aiResult }) {
  const tests = String(testsResult || '').toLowerCase();
  const ai = String(aiResult || '').toLowerCase();

  // Grounded gate: a red suite is a hard fail — no LLM opinion overrides it.
  if (tests === 'fail') return 'fail';

  // Ungrounded (suite never ran): the LLM may WARN or BLOCK, never PASS.
  if (tests !== 'pass') {
    if (ai === 'fail') return 'fail';
    return 'warn';
  }

  // Grounded green: the LLM opinion may only downgrade.
  if (ai === 'fail') return 'fail';
  if (ai === 'warn') return 'warn';
  return 'pass';
}

module.exports = { combineVerdict };

// --- CLI: node scripts/ship-quality-verdict.js --tests pass --ai warn -------
if (require.main === module) {
  const argv = process.argv;
  let testsResult = '';
  let aiResult = '';
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--tests' && argv[i + 1] !== undefined) { testsResult = argv[i + 1]; i += 1; }
    else if (argv[i] === '--ai' && argv[i + 1] !== undefined) { aiResult = argv[i + 1]; i += 1; }
  }
  const final = combineVerdict({ testsResult, aiResult });
  process.stdout.write(`${final}\n`);
  if (process.env.GITHUB_OUTPUT) {
    require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `final=${final}\n`);
  }
}

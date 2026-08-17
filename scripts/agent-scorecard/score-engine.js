'use strict';

/**
 * Fleet Trust Score Engine — pure scoring logic, no IO.
 *
 * Turns a bag of per-PR signals into (a) a 0–100 quality score for that PR and
 * (b) the EWMA-updated trust score for the agent that produced it. Kept pure so
 * it is fully unit-testable; all IO (git, GitHub API, fs) lives in the callers.
 *
 * The five dimensions map onto signals the repo already emits in CI:
 *   - ci          : did it land green, and how many red runs first
 *   - badCode     : CodeQL / trivy / test / build failures
 *   - rash        : revert / force-amend / big diff with no tests
 *   - directions  : anti-scaffolding, no-root-junk, non-conventional commits,
 *                   files touched outside the work-request scope
 *   - hallucination: unresolved refs, unbacked PR-body claims, cross-model flags
 *
 * Hallucination and bad code are weighted highest because they are the failure
 * modes that cost the most downstream.
 */

const DIMENSION_WEIGHTS = Object.freeze({
  hallucination: 0.30,
  badCode: 0.25,
  directions: 0.20,
  rash: 0.15,
  ci: 0.10,
});

const DEFAULT_EWMA_ALPHA = 0.3;
const STARTING_TRUST = 70; // neutral-positive; agents earn or lose from here

function clamp01(n) {
  if (Number.isNaN(n) || typeof n !== 'number') return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Convert a count of bad events into a 0..1 "goodness" score that decays as the
 * count rises. `softness` controls how fast it drops (higher = more forgiving).
 */
function decay(count, softness = 2) {
  const c = Math.max(0, Number(count) || 0);
  return clamp01(softness / (softness + c));
}

/**
 * Score a single dimension to 0..1 (1 = perfect) from raw signals.
 */
function scoreDimensions(signals = {}) {
  const s = signals;

  // CI: 1.0 if green first try; each red run before green costs.
  const ci = s.ciGreen === false ? 0 : decay(s.redRunsBeforeGreen || 0, 3);

  // Bad code: security + test + build failures.
  const badCodeCount =
    (s.codeqlFindings || 0) +
    (s.trivyFindings || 0) +
    (s.testFailures || 0) +
    (s.buildFailures || 0);
  const badCode = decay(badCodeCount, 2);

  // Rash: reverted after merge is the worst; amends and untested big diffs cost.
  let rashPenalty = 0;
  if (s.revertedAfterMerge) rashPenalty += 3;
  rashPenalty += (s.forceAmends || 0) * 0.5;
  if (s.largeDiffNoTests) rashPenalty += 1.5;
  const rash = decay(rashPenalty, 2);

  // Directions: house-rules violations.
  const dirPenalty =
    (s.scaffoldingHits || 0) * 2 +
    (s.rootJunkHits || 0) * 2 +
    (s.nonConventionalCommits || 0) +
    (s.outOfScopeFiles || 0) * 0.5;
  const directions = decay(dirPenalty, 2);

  // Hallucination: the headline. Unresolved refs + unbacked claims + model flags.
  const halluCount =
    (s.unresolvedRefs || 0) +
    (s.unbackedClaims || 0) +
    (s.crossModelHallucinationFlags || 0);
  const hallucination = decay(halluCount, 1.5);

  return { ci, badCode, rash, directions, hallucination };
}

/**
 * Composite 0–100 quality score for a single PR from its dimensions.
 */
function prQualityScore(signals = {}) {
  const dims = scoreDimensions(signals);
  let total = 0;
  for (const [k, w] of Object.entries(DIMENSION_WEIGHTS)) {
    total += w * clamp01(dims[k]);
  }
  return {
    score: Math.round(total * 100),
    dimensions: dims,
  };
}

/**
 * EWMA-update an agent's running trust score with a new PR quality score.
 */
function updateTrust(previousTrust, prQuality, alpha = DEFAULT_EWMA_ALPHA) {
  const prev =
    typeof previousTrust === 'number' && !Number.isNaN(previousTrust)
      ? previousTrust
      : STARTING_TRUST;
  const a = clamp01(alpha);
  return Math.round((1 - a) * prev + a * prQuality);
}

/**
 * A letter grade + label for a trust score, for the leaderboard and PR comments.
 */
function grade(trust) {
  if (trust >= 90) return { letter: 'A', label: 'trusted' };
  if (trust >= 80) return { letter: 'B', label: 'reliable' };
  if (trust >= 70) return { letter: 'C', label: 'watch' };
  if (trust >= 55) return { letter: 'D', label: 'shaky' };
  return { letter: 'F', label: 'quarantine' };
}

module.exports = {
  DIMENSION_WEIGHTS,
  DEFAULT_EWMA_ALPHA,
  STARTING_TRUST,
  clamp01,
  decay,
  scoreDimensions,
  prQualityScore,
  updateTrust,
  grade,
};

'use strict';

/**
 * Covers primitive helpers and edge cases in score-engine.js not exercised by
 * the existing tests/agent-scorecard.test.js (which focuses on integration-level
 * behaviour such as "hallucination hurts more than rashness").
 */

const test = require('node:test');
const assert = require('node:assert');

const {
  clamp01,
  decay,
  DIMENSION_WEIGHTS,
  DEFAULT_EWMA_ALPHA,
  STARTING_TRUST,
  scoreDimensions,
  prQualityScore,
  updateTrust,
  grade,
} = require('../scripts/agent-scorecard/score-engine');

// ── clamp01 ───────────────────────────────────────────────────────────────────

test('clamp01: values in range pass through unchanged', () => {
  assert.strictEqual(clamp01(0), 0);
  assert.strictEqual(clamp01(0.5), 0.5);
  assert.strictEqual(clamp01(1), 1);
});

test('clamp01: values below 0 are clamped to 0', () => {
  assert.strictEqual(clamp01(-0.001), 0);
  assert.strictEqual(clamp01(-100), 0);
});

test('clamp01: values above 1 are clamped to 1', () => {
  assert.strictEqual(clamp01(1.001), 1);
  assert.strictEqual(clamp01(999), 1);
});

test('clamp01: NaN returns 0', () => {
  assert.strictEqual(clamp01(NaN), 0);
});

test('clamp01: non-numeric input returns 0', () => {
  assert.strictEqual(clamp01('x'), 0);
  assert.strictEqual(clamp01(null), 0);
  assert.strictEqual(clamp01(undefined), 0);
});

// ── decay ─────────────────────────────────────────────────────────────────────

test('decay: count of zero returns 1 (perfect score)', () => {
  assert.strictEqual(decay(0), 1);
  assert.strictEqual(decay(0, 5), 1);
});

test('decay: decreases monotonically as count increases', () => {
  const prev = decay(0);
  for (let i = 1; i <= 10; i++) {
    const curr = decay(i);
    assert.ok(curr < prev, `decay(${i}) should be less than decay(${i - 1})`);
  }
});

test('decay: always stays in [0, 1]', () => {
  for (const c of [0, 1, 5, 100, 10000]) {
    const d = decay(c);
    assert.ok(d >= 0 && d <= 1, `decay(${c}) = ${d} is out of [0,1]`);
  }
});

test('decay: higher softness is more forgiving at the same count', () => {
  const strict = decay(3, 1);
  const lenient = decay(3, 5);
  assert.ok(lenient > strict, 'higher softness should yield a higher score for the same count');
});

test('decay: negative count is treated as 0', () => {
  assert.strictEqual(decay(-5), decay(0));
});

test('decay: non-numeric count is treated as 0', () => {
  assert.strictEqual(decay('bad'), decay(0));
  assert.strictEqual(decay(null), decay(0));
});

// ── DIMENSION_WEIGHTS ─────────────────────────────────────────────────────────

test('DIMENSION_WEIGHTS sum to exactly 1', () => {
  const sum = Object.values(DIMENSION_WEIGHTS).reduce((s, w) => s + w, 0);
  assert.ok(Math.abs(sum - 1) < 1e-10, `weights must sum to 1, got ${sum}`);
});

test('DIMENSION_WEIGHTS has the five expected dimensions', () => {
  const expected = ['hallucination', 'badCode', 'directions', 'rash', 'ci'];
  for (const dim of expected) {
    assert.ok(dim in DIMENSION_WEIGHTS, `missing dimension: ${dim}`);
    assert.ok(DIMENSION_WEIGHTS[dim] > 0, `weight for ${dim} must be positive`);
  }
});

test('hallucination weight is the highest', () => {
  const maxWeight = Math.max(...Object.values(DIMENSION_WEIGHTS));
  assert.strictEqual(DIMENSION_WEIGHTS.hallucination, maxWeight);
});

// ── STARTING_TRUST / DEFAULT_EWMA_ALPHA ──────────────────────────────────────

test('STARTING_TRUST is in a neutral-positive range [60, 80]', () => {
  assert.ok(
    STARTING_TRUST >= 60 && STARTING_TRUST <= 80,
    `expected neutral-positive starting trust, got ${STARTING_TRUST}`
  );
});

test('DEFAULT_EWMA_ALPHA is in (0, 1)', () => {
  assert.ok(DEFAULT_EWMA_ALPHA > 0 && DEFAULT_EWMA_ALPHA < 1);
});

// ── scoreDimensions: signal edge cases ───────────────────────────────────────

test('scoreDimensions: ci=0 when ciGreen is false regardless of other signals', () => {
  const dims = scoreDimensions({ ciGreen: false, redRunsBeforeGreen: 0 });
  assert.strictEqual(dims.ci, 0);
});

test('scoreDimensions: ci penalised by each red run before green', () => {
  const clean = scoreDimensions({ ciGreen: true, redRunsBeforeGreen: 0 });
  const flaky = scoreDimensions({ ciGreen: true, redRunsBeforeGreen: 3 });
  assert.ok(clean.ci > flaky.ci, 'more red runs should lower the ci score');
});

test('scoreDimensions: badCode stacks all four failure types', () => {
  const none = scoreDimensions({});
  const many = scoreDimensions({ codeqlFindings: 1, trivyFindings: 1, testFailures: 1, buildFailures: 1 });
  assert.ok(none.badCode > many.badCode, 'multiple finding types should lower badCode');
});

test('scoreDimensions: revertedAfterMerge tanks rash below 0.5', () => {
  const dims = scoreDimensions({ revertedAfterMerge: true });
  assert.ok(dims.rash < 0.5, `rash should be < 0.5 when reverted, got ${dims.rash}`);
});

test('scoreDimensions: largeDiffNoTests alone reduces rash below perfect', () => {
  const perfect = scoreDimensions({});
  const lazy = scoreDimensions({ largeDiffNoTests: true });
  assert.ok(lazy.rash < perfect.rash);
});

test('scoreDimensions: scaffolding and root-junk hits penalise directions', () => {
  const clean = scoreDimensions({});
  const dirty = scoreDimensions({ scaffoldingHits: 2, rootJunkHits: 2 });
  assert.ok(clean.directions > dirty.directions);
});

test('scoreDimensions: nonConventionalCommits penalise directions', () => {
  const clean = scoreDimensions({});
  const messy = scoreDimensions({ nonConventionalCommits: 3 });
  assert.ok(clean.directions > messy.directions);
});

test('scoreDimensions: outOfScopeFiles penalise directions', () => {
  const clean = scoreDimensions({});
  const outScope = scoreDimensions({ outOfScopeFiles: 5 });
  assert.ok(clean.directions > outScope.directions);
});

test('scoreDimensions: all hallucination signals stack', () => {
  const clean = scoreDimensions({});
  const hall = scoreDimensions({ unresolvedRefs: 2, unbackedClaims: 1, crossModelHallucinationFlags: 1 });
  assert.ok(clean.hallucination > hall.hallucination, 'multiple hallucination signals should lower score');
});

test('scoreDimensions: all dimensions are in [0, 1]', () => {
  const extremes = scoreDimensions({
    ciGreen: false,
    redRunsBeforeGreen: 99,
    codeqlFindings: 10,
    trivyFindings: 10,
    testFailures: 10,
    buildFailures: 10,
    revertedAfterMerge: true,
    forceAmends: 20,
    largeDiffNoTests: true,
    scaffoldingHits: 10,
    rootJunkHits: 10,
    nonConventionalCommits: 10,
    outOfScopeFiles: 20,
    unresolvedRefs: 10,
    unbackedClaims: 10,
    crossModelHallucinationFlags: 10,
  });
  for (const [key, val] of Object.entries(extremes)) {
    assert.ok(val >= 0 && val <= 1, `dimension ${key} = ${val} out of [0,1]`);
  }
});

// ── prQualityScore: edge cases ────────────────────────────────────────────────

test('prQualityScore: empty signals yields near-perfect score (≥95)', () => {
  const { score } = prQualityScore({});
  assert.ok(score >= 95, `expected ≥95 for no bad signals, got ${score}`);
});

test('prQualityScore: worst-case signals yield a very low score (<20)', () => {
  const { score } = prQualityScore({
    ciGreen: false,
    codeqlFindings: 10,
    revertedAfterMerge: true,
    forceAmends: 10,
    scaffoldingHits: 10,
    unresolvedRefs: 10,
    unbackedClaims: 10,
  });
  assert.ok(score < 20, `expected low score for worst signals, got ${score}`);
});

test('prQualityScore: score is always an integer in [0, 100]', () => {
  for (const signals of [{}, { ciGreen: false }, { unresolvedRefs: 5 }]) {
    const { score } = prQualityScore(signals);
    assert.ok(Number.isInteger(score), `score should be integer, got ${score}`);
    assert.ok(score >= 0 && score <= 100, `score ${score} out of [0, 100]`);
  }
});

test('prQualityScore: dimensions are returned alongside score', () => {
  const { dimensions } = prQualityScore({ ciGreen: true });
  const expected = ['ci', 'badCode', 'rash', 'directions', 'hallucination'];
  for (const dim of expected) {
    assert.ok(dim in dimensions, `expected dimension ${dim} in result`);
  }
});

// ── updateTrust: edge cases ───────────────────────────────────────────────────

test('updateTrust: NaN previousTrust falls back to STARTING_TRUST', () => {
  const t = updateTrust(NaN, 100);
  assert.ok(t > STARTING_TRUST, 'NaN previous should converge up from STARTING_TRUST');
});

test('updateTrust: null previousTrust falls back to STARTING_TRUST', () => {
  const t = updateTrust(null, 100);
  assert.ok(t >= STARTING_TRUST);
});

test('updateTrust: alpha clamped to [0,1] — alpha=0 returns previous', () => {
  const result = updateTrust(70, 100, 0);
  assert.strictEqual(result, 70);
});

test('updateTrust: alpha=1 returns the new quality score directly', () => {
  const result = updateTrust(70, 100, 1);
  assert.strictEqual(result, 100);
});

// ── grade: boundary values ────────────────────────────────────────────────────

test('grade: boundary at 90 → A', () => {
  assert.strictEqual(grade(90).letter, 'A');
  assert.strictEqual(grade(89).letter, 'B');
});

test('grade: boundary at 80 → B', () => {
  assert.strictEqual(grade(80).letter, 'B');
  assert.strictEqual(grade(79).letter, 'C');
});

test('grade: boundary at 70 → C', () => {
  assert.strictEqual(grade(70).letter, 'C');
  assert.strictEqual(grade(69).letter, 'D');
});

test('grade: boundary at 55 → D', () => {
  assert.strictEqual(grade(55).letter, 'D');
  assert.strictEqual(grade(54).letter, 'F');
});

test('grade: 0 → F (quarantine)', () => {
  assert.strictEqual(grade(0).letter, 'F');
  assert.strictEqual(grade(0).label, 'quarantine');
});

test('grade: 100 → A (trusted)', () => {
  assert.strictEqual(grade(100).letter, 'A');
  assert.strictEqual(grade(100).label, 'trusted');
});

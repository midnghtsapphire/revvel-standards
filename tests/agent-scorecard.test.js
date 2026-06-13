'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../scripts/agent-scorecard/score-engine');
const { findUnresolvedRefs, addedLinesByFile } = require('../scripts/agent-scorecard/reference-resolver');
const { checkClaims } = require('../scripts/agent-scorecard/claim-checker');
const { aggregate, renderLeaderboard } = require('../scripts/agent-scorecard/ledger');
const crossModel = require('../scripts/agent-scorecard/cross-model-review');
const remediate = require('../scripts/agent-scorecard/remediate');

test('clean PR scores high', () => {
  const { score, dimensions } = engine.prQualityScore({ ciGreen: true });
  assert.ok(score >= 95, `expected near-perfect, got ${score}`);
  assert.equal(dimensions.hallucination, 1);
});

test('hallucination is weighted hardest', () => {
  const hallu = engine.prQualityScore({ ciGreen: true, unresolvedRefs: 3 }).score;
  const rash = engine.prQualityScore({ ciGreen: true, forceAmends: 6 }).score;
  assert.ok(hallu < rash, `hallucination (${hallu}) should hurt more than rashness (${rash})`);
});

test('reverted-after-merge tanks the rash dimension', () => {
  const dims = engine.scoreDimensions({ revertedAfterMerge: true });
  assert.ok(dims.rash < 0.5);
});

test('updateTrust is an EWMA that moves toward the new score', () => {
  const t1 = engine.updateTrust(70, 100);
  assert.ok(t1 > 70 && t1 < 100);
  const t2 = engine.updateTrust(70, 0);
  assert.ok(t2 < 70 && t2 > 0);
});

test('grade thresholds', () => {
  assert.equal(engine.grade(95).letter, 'A');
  assert.equal(engine.grade(50).letter, 'F');
});

test('addedLinesByFile only returns added lines with their file', () => {
  const diff = [
    'diff --git a/x.js b/x.js',
    '--- a/x.js',
    '+++ b/x.js',
    '@@ -1 +1,2 @@',
    ' const a = 1;',
    "+const b = require('./real');",
    '-const removed = 1;',
  ].join('\n');
  const added = addedLinesByFile(diff);
  assert.equal(added.length, 1);
  assert.equal(added[0].file, 'x.js');
  assert.match(added[0].text, /require/);
});

test('reference resolver flags a missing import but not a real one', () => {
  const diff = [
    '+++ b/src/a.js',
    "+const ok = require('./real');",
    "+const bad = require('./ghost');",
  ].join('\n');
  const exists = (p) => p === 'src/real.js' || p === 'src/real';
  const { count, findings } = findUnresolvedRefs({ diff, exists });
  assert.equal(count, 1);
  assert.equal(findings[0].ref, './ghost');
});

test('reference resolver flags undeclared env vars', () => {
  const diff = ['+++ b/src/a.js', '+const k = process.env.MADE_UP_KEY;'].join('\n');
  const { count, findings } = findUnresolvedRefs({
    diff,
    exists: () => true,
    envKeys: new Set(['OPENROUTER_API_KEY']),
  });
  assert.equal(count, 1);
  assert.equal(findings[0].ref, 'MADE_UP_KEY');
});

test('claim checker catches an unbacked "added tests" claim', () => {
  const { count, findings } = checkClaims('This PR adds tests for the parser.', ['src/parser.js']);
  assert.equal(count, 1);
  assert.equal(findings[0].claim, 'added-tests');
});

test('claim checker passes when the claim is backed', () => {
  const { count } = checkClaims('Added tests for the parser.', ['tests/parser.test.js']);
  assert.equal(count, 0);
});

test('ledger aggregation computes trust, hallucination and recovery rates', () => {
  const events = [
    { type: 'score', agent: 'openhands', pr: 1, quality: 100, hallucination: 0, latencyMin: 10 },
    { type: 'score', agent: 'openhands', pr: 2, quality: 40, hallucination: 2, latencyMin: 30 },
    { type: 'remediation', agent: 'openhands', pr: 2, tier: 'prompt', recovered: true },
    { type: 'score', agent: 'cursor', pr: 3, quality: 90, hallucination: 0 },
  ];
  const agents = aggregate(events);
  const oh = agents.get('openhands');
  assert.equal(oh.prs, 2);
  assert.equal(oh.hallucinationEvents, 1);
  assert.equal(oh.hallucinationRate, 0.5);
  assert.equal(oh.recoveryRate, 1);
  assert.equal(oh.avgLatencyMin, 20);
  assert.ok(oh.trust < 70 && oh.trust > 40);

  const md = renderLeaderboard(agents);
  assert.match(md, /Fleet Trust Scorecard/);
  assert.match(md, /openhands/);
});

test('cross-model verdict parser tolerates code fences and prose', () => {
  const v = crossModel.parseVerdict('Sure!\n```json\n{"flags":[{"severity":"high","claim":"x","why":"y"}],"summary":"bad"}\n```');
  assert.equal(v.parsed, true);
  assert.equal(v.flags.length, 1);
});

test('cross-model review degrades to a no-op when the model lane fails', async () => {
  const fakeAsk = async () => { throw new Error('no keys'); };
  const r = await crossModel.review({ title: 't', body: 'b', diff: 'd' }, { ask: fakeAsk });
  assert.equal(r.available, false);
  assert.equal(r.flagCount, 0);
});

test('cross-model review counts flags from the model', async () => {
  const fakeAsk = async () => ({ text: '{"flags":[{"claim":"a"},{"claim":"b"}],"summary":"two"}', modelUsed: 'm' });
  const r = await crossModel.review({ title: 't', body: 'b', diff: 'd' }, { ask: fakeAsk });
  assert.equal(r.available, true);
  assert.equal(r.flagCount, 2);
});

test('remediation escalates tier with each attempt', () => {
  assert.equal(remediate.selectTier(0), 'prompt-correction');
  assert.equal(remediate.selectTier(1), 'agent-handoff');
  assert.equal(remediate.selectTier(2), 'escalate-claude');
  assert.equal(remediate.selectTier(9), 'escalate-claude');
});

test('remediation plan names the problems in the corrective prompt', () => {
  const plan = remediate.planRemediation({
    agent: 'openrouter',
    signals: { unresolvedRefs: 2, testFailures: 1 },
    attempt: 0,
  });
  assert.equal(plan.tier, 'prompt-correction');
  assert.match(plan.correctivePrompt, /reference/i);
  assert.match(plan.correctivePrompt, /test/i);
});

test('handoff tier picks the next agent in the chain', () => {
  const plan = remediate.planRemediation({ agent: 'openrouter', signals: { testFailures: 1 }, attempt: 1 });
  assert.equal(plan.tier, 'agent-handoff');
  assert.equal(plan.handoffTo, 'openhands');
});

test('recordOutcome attributes the weak link correctly', () => {
  assert.deepEqual(remediate.recordOutcome({ tier: 'prompt-correction', postPassed: true }).weakLink, 'prompt');
  assert.deepEqual(remediate.recordOutcome({ tier: 'agent-handoff', postPassed: true }).weakLink, 'agent');
  assert.deepEqual(remediate.recordOutcome({ tier: 'escalate-claude', postPassed: true }).weakLink, 'task-difficulty');
  assert.deepEqual(remediate.recordOutcome({ tier: 'agent-handoff', postPassed: false }).weakLink, 'unresolved');
});

'use strict';

/**
 * Unit tests for scripts/veins-tracker.js
 * Regression-pins the parser, analyser, and BIOME section builder.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const path     = require('node:path');
const fs       = require('node:fs');

const {
  parseProposal,
  analyzeProposals,
  buildTrackerSection,
  normalizeComponent,
  STUB_MARKER,
} = require('../scripts/veins-tracker');

// ── fixtures ─────────────────────────────────────────────────────────────────

const STUB_PROPOSAL = `# VEINS Heal Proposal

**Title:** Flaky workflow candidate: 🎛️ PR State Orchestrator

> Opened by **V.E.I.N.S.** self-healing engine
> Receipt: \`auto-flaky-quarantine-midnghtsapphire/revvel-standards::🎛️ PR State Orchestrator\`
**Severity:** 🟢 \`low\`
**Source:** \`workflow_run\` — <https://github.com/midnghtsapphire/revvel-standards/actions/runs/28634026490>
---
**Hypothesis:** Workflow "🎛️ PR State Orchestrator" flipped pass/fail 3× in the last 8 runs.
**Component:** \`🎛️ PR State Orchestrator\`
**Origin repo:** \`midnghtsapphire/revvel-standards\`
**Upstream:** <https://github.com/midnghtsapphire/revvel-standards/actions/runs/28634026490>
Heal event id: \`FLAKY-🎛️ PR S\`

---

_This file was committed by the VEINS engine as a human-reviewable proposal. Edit or replace with the real patch on this branch before merging._
`;

const ACTIONED_PROPOSAL = `# VEINS Heal Proposal

**Title:** Flaky workflow candidate: some-other-workflow

**Component:** \`some-other-workflow\`
**Severity:** 🔴 \`high\`
**Source:** \`workflow_run\` — <https://github.com/midnghtsapphire/revvel-standards/actions/runs/12300000001>
Heal event id: \`FLAKY-some-oth\`

This is the actual fix — someone edited out the stub marker and added the real patch here.
`;

// ── normalizeComponent ────────────────────────────────────────────────────────

test('normalizeComponent strips emojis and punctuation', () => {
  assert.equal(normalizeComponent('🎛️ PR State Orchestrator'), 'pr state orchestrator');
  assert.equal(normalizeComponent('some-other-workflow'), 'some other workflow');
  assert.equal(normalizeComponent('UPPER CASE'), 'upper case');
});

test('normalizeComponent collapses whitespace', () => {
  assert.equal(normalizeComponent('  multiple   spaces  '), 'multiple spaces');
});

// ── parseProposal ─────────────────────────────────────────────────────────────

test('parseProposal extracts fields from a real stub proposal', () => {
  const p = parseProposal(STUB_PROPOSAL, 'test-proposal.md');
  assert.equal(p.filename, 'test-proposal.md');
  assert.equal(p.severity, 'low');
  assert.equal(p.runId, '28634026490');
  assert.match(p.runUrl, /actions\/runs\/28634026490/);
  assert.equal(p.healId, 'FLAKY-🎛️ PR S');
  assert.equal(p.isStub, true, 'unedited proposal should be a stub');
});

test('parseProposal isStub=false when stub marker is absent', () => {
  const p = parseProposal(ACTIONED_PROPOSAL, 'actioned.md');
  assert.equal(p.isStub, false);
  assert.equal(p.severity, 'high');
  assert.equal(p.runId, '12300000001');
});

test('parseProposal handles missing fields gracefully', () => {
  const p = parseProposal('# Empty proposal', 'empty.md');
  assert.equal(p.component, 'unknown');
  assert.equal(p.runId, null);
  assert.equal(p.severity, 'unknown');
  assert.equal(p.isStub, false);
});

// ── analyzeProposals ──────────────────────────────────────────────────────────

test('analyzeProposals: empty input produces zeroed counts', () => {
  const a = analyzeProposals([]);
  assert.equal(a.total, 0);
  assert.equal(a.stubs, 0);
  assert.equal(a.actioned, 0);
  assert.equal(a.unique_runs, 0);
  assert.equal(a.repeat_firing.length, 0);
});

test('analyzeProposals: detects repeat-firing when 3+ proposals share a component', () => {
  // Make 3 stub proposals for the same component, two different run IDs.
  const make = (runId) => parseProposal(
    STUB_PROPOSAL.replace('28634026490', runId), `p-${runId}.md`
  );
  const proposals = [make('100'), make('100'), make('200')];
  const a = analyzeProposals(proposals);
  assert.equal(a.total, 3);
  assert.equal(a.stubs, 3);
  assert.equal(a.repeat_firing.length, 1);
  assert.equal(a.repeat_firing[0].count, 3);
  assert.equal(a.repeat_firing[0].unique_runs, 2);
});

test('analyzeProposals: does NOT flag repeat-firing for fewer than 3 proposals', () => {
  const p = parseProposal(STUB_PROPOSAL, 'only-one.md');
  const a = analyzeProposals([p, p]);  // 2 — below threshold
  assert.equal(a.repeat_firing.length, 0);
});

test('analyzeProposals: actioned proposals are counted separately from stubs', () => {
  const stub     = parseProposal(STUB_PROPOSAL, 's.md');
  const actioned = parseProposal(ACTIONED_PROPOSAL, 'a.md');
  const a = analyzeProposals([stub, actioned]);
  assert.equal(a.total, 2);
  assert.equal(a.stubs, 1);
  assert.equal(a.actioned, 1);
});

// ── buildTrackerSection ───────────────────────────────────────────────────────

test('buildTrackerSection: healthy when no proposals', () => {
  const s = buildTrackerSection(analyzeProposals([]));
  assert.equal(s.worker, 'veins-tracker');
  assert.equal(s.status, 'healthy');
});

test('buildTrackerSection: down when any stubs remain', () => {
  const p = parseProposal(STUB_PROPOSAL, 'stub.md');
  const s = buildTrackerSection(analyzeProposals([p]));
  assert.equal(s.status, 'down');
  assert.equal(s.counts.stub_unactioned, 1);
});

test('buildTrackerSection: down when repeat-firing component detected', () => {
  const make = (runId) => parseProposal(
    STUB_PROPOSAL.replace('28634026490', runId), `p-${runId}.md`
  );
  const s = buildTrackerSection(analyzeProposals([make('1'), make('2'), make('3')]));
  assert.equal(s.status, 'down');
  assert.equal(s.counts.repeat_firing_components, 1);
});

test('buildTrackerSection: summary mentions unactioned stubs', () => {
  const p = parseProposal(STUB_PROPOSAL, 'stub.md');
  const s = buildTrackerSection(analyzeProposals([p]));
  assert.match(s.summary, /unactioned stub/);
});

// ── live fixture: repo's actual .veins/proposals/ ────────────────────────────
// These assertions document the real state found on 2026-10-29 and will fail
// if the external VEINS engine writes a fundamentally different proposal shape.

test('live proposals directory exists and contains md files', () => {
  const dir = path.join(__dirname, '..', '.veins', 'proposals');
  assert.ok(fs.existsSync(dir), '.veins/proposals/ must exist');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length > 0, 'at least one proposal must exist');
});

test('live proposals: all current proposals target the same component', () => {
  const dir   = path.join(__dirname, '..', '.veins', 'proposals');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const proposals = files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    return parseProposal(content, f);
  });
  const analysis = analyzeProposals(proposals);
  // All 7 current proposals target "🎛️ PR State Orchestrator" (one component).
  assert.equal(analysis.unique_components, 1,
    'current VEINS proposals all target one component');
});

test('live proposals: all are unactioned stubs (no real patch applied yet)', () => {
  const dir   = path.join(__dirname, '..', '.veins', 'proposals');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const proposals = files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    return parseProposal(content, f);
  });
  const analysis = analyzeProposals(proposals);
  assert.equal(analysis.actioned, 0, 'no proposals have been actioned yet');
  assert.equal(analysis.stubs, analysis.total, 'all proposals are stubs');
});

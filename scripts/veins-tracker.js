#!/usr/bin/env node
'use strict';

/**
 * BIOME · veins-tracker — the crew's VEINS proposal ledger.
 *
 * The external V.E.I.N.S. engine (running in Lovable, outside this repo)
 * writes heal proposals to `.veins/proposals/` as markdown stubs whenever
 * it detects a flaky or stuck fleet component. This worker reads that
 * directory and answers:
 *
 *   1. What is VEINS changing?
 *      Each proposal names: the target component, its severity, the upstream
 *      workflow run that triggered it, and a heal event ID. Parsed here and
 *      surfaced in the BIOME feed.
 *
 *   2. How frequently?
 *      Unique source run IDs = individual VEINS invocations. Multiple proposals
 *      from the same run ID = VEINS fired once but wrote redundant stubs (its
 *      own dedup gap). Multiple run IDs for the same component = the component
 *      keeps re-alerting across separate VEINS sessions.
 *
 *   3. Are they doing anything?
 *      A proposal is a "stub" if it still contains the VEINS boilerplate
 *      ("Edit or replace with the real patch on this branch before merging").
 *      Stubs = VEINS fired but no human or automated agent has applied a fix.
 *      `actioned_count` is how many proposals have had the stub replaced.
 *
 * Status thresholds:
 *   healthy  — zero proposals OR all proposals actioned
 *   degraded — proposals exist, none are stubs, no repeat-firing components
 *   down     — any stub proposals remain OR any component has 3+ proposals
 *              (repeat-firing = VEINS keeps detecting the same problem without cure)
 *
 * Pure functions are exported for unit tests; the CLI reads from disk.
 */

const STUB_MARKER = 'This file was committed by the VEINS engine as a human-reviewable proposal.';

// These regexes mirror what the external engine writes.
const RE_TITLE     = /^\*\*Title:\*\*\s*(.+)$/m;
const RE_COMPONENT = /^\*\*Component:\*\*\s*(.+)$/m;
const RE_SEVERITY  = /^\*\*Severity:\*\*\s*[^`]*`([^`]+)`/m;
const RE_RUN_URL   = /\*\*Source:\*\*.*<(https:\/\/github\.com\/[^>]+)>/;
const RE_HEAL_ID   = /Heal event id:\s*`([^`]+)`/;

/** Parse a single proposal markdown string into a structured record. */
function parseProposal(content, filename) {
  const title     = (RE_TITLE.exec(content)     || [])[1] || filename;
  const component = (RE_COMPONENT.exec(content) || [])[1] || 'unknown';
  const severity  = (RE_SEVERITY.exec(content)  || [])[1] || 'unknown';
  const runUrl    = (RE_RUN_URL.exec(content)    || [])[1] || null;
  const healId    = (RE_HEAL_ID.exec(content)    || [])[1] || null;
  // Extract run ID from the URL tail (last path segment).
  const runId     = runUrl ? (runUrl.split('/').pop() || null) : null;
  const isStub    = content.includes(STUB_MARKER);

  return { filename, title, component, severity, runUrl, runId, healId, isStub };
}

/** Normalize a component name: strip emojis, punctuation, numbers for grouping. */
function normalizeComponent(name) {
  return String(name)
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')  // strip emoji
    .replace(/[^a-z0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Analyse an array of parsed proposal records.
 * @param {Array} proposals — from parseProposal calls
 */
function analyzeProposals(proposals) {
  const all = proposals || [];
  const stubs = all.filter((p) => p.isStub);
  const actioned = all.filter((p) => !p.isStub);

  // Group by normalised component name.
  const byComponent = {};
  for (const p of all) {
    const key = normalizeComponent(p.component);
    if (!byComponent[key]) {
      byComponent[key] = { representative: p.component, proposals: [] };
    }
    byComponent[key].proposals.push(p);
  }

  // Repeat-firing: same component across 3+ proposals.
  const repeatFiring = Object.values(byComponent)
    .filter((g) => g.proposals.length >= 3)
    .sort((a, b) => b.proposals.length - a.proposals.length)
    .map((g) => ({
      component: g.representative,
      count: g.proposals.length,
      unique_runs: [...new Set(g.proposals.map((p) => p.runId).filter(Boolean))].length,
      all_stubs: g.proposals.every((p) => p.isStub),
    }));

  // Unique source run IDs = distinct VEINS invocations.
  const uniqueRunIds = [...new Set(all.map((p) => p.runId).filter(Boolean))];

  return {
    total:         all.length,
    stubs:         stubs.length,
    actioned:      actioned.length,
    unique_runs:   uniqueRunIds.length,
    unique_components: Object.keys(byComponent).length,
    repeat_firing: repeatFiring,
    all_components: Object.values(byComponent).map((g) => ({
      component: g.representative,
      count: g.proposals.length,
    })),
    open_samples: all.slice(0, 5).map((p) => ({
      filename: p.filename,
      component: p.component,
      severity: p.severity,
      is_stub: p.isStub,
      run_id: p.runId,
    })),
  };
}

/**
 * Build a BIOME worker section from a proposal analysis object.
 *
 * healthy  — zero proposals or all actioned
 * degraded — proposals exist, none stubs, no repeat-firing
 * down     — any stubs OR any component fires 3+ times
 */
function buildTrackerSection(analysis) {
  const { total, stubs, actioned, unique_runs, repeat_firing, unique_components } = analysis;

  let status = 'healthy';
  if (total > 0 && stubs === 0 && repeat_firing.length === 0) status = 'degraded';
  if (stubs > 0 || repeat_firing.length > 0) status = 'down';

  const parts = [
    `${total} proposal(s) (${stubs} unactioned stub(s))`,
    `${unique_runs} unique VEINS run(s)`,
    `${unique_components} component(s)`,
  ];
  if (repeat_firing.length > 0) {
    parts.push(`${repeat_firing.length} repeat-firing component(s) — VEINS keeps flagging without cure`);
  }
  if (total === 0) {
    parts.length = 0;
    parts.push('no proposals in .veins/proposals/ — VEINS may be offline or writing elsewhere');
  }

  return {
    worker: 'veins-tracker',
    status,
    summary: parts.join('; '),
    counts: {
      total_proposals: total,
      stub_unactioned: stubs,
      actioned: actioned,
      unique_veins_runs: unique_runs,
      repeat_firing_components: repeat_firing.length,
    },
    detail: {
      repeat_firing,
      all_components: analysis.all_components,
      open_samples: analysis.open_samples,
    },
  };
}

module.exports = {
  parseProposal,
  analyzeProposals,
  buildTrackerSection,
  normalizeComponent,
  STUB_MARKER,
};

// --- CLI (standalone run) ---------------------------------------------------
if (require.main === module) {
  const fs   = require('fs');
  const path = require('path');

  const proposalsDir = path.join(process.cwd(), '.veins', 'proposals');
  let proposals = [];

  if (fs.existsSync(proposalsDir)) {
    const files = fs.readdirSync(proposalsDir).filter((f) => f.endsWith('.md'));
    proposals = files.map((f) => {
      const content = fs.readFileSync(path.join(proposalsDir, f), 'utf8');
      return parseProposal(content, f);
    });
  } else {
    console.warn('[veins-tracker] .veins/proposals/ not found — VEINS may be offline');
  }

  const analysis = analyzeProposals(proposals);
  const section  = buildTrackerSection(analysis);
  console.log(JSON.stringify({ analysis, section }, null, 2));
  process.exitCode = section.status === 'healthy' ? 0 : 1;
}

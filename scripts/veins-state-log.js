#!/usr/bin/env node
'use strict';

/**
 * VEINS State Log — appends a compact summary row to docs/veins-history.jsonl.
 *
 * Purpose: each CircleCI veins-monitor run now produces a comparable, time-series
 * record so the three standing questions can be answered across builds:
 *   1. What is VEINS changing?        → stub counts, components, heal event IDs
 *   2. How frequently?                → days_since_last_commit, unique_veins_runs
 *   3. Are proposals doing anything?  → actioned vs stubs, repeat-firing count
 *
 * Usage:
 *   node scripts/veins-state-log.js           # append + print trend
 *   node scripts/veins-state-log.js --json    # append + print row as JSON
 *
 * Exit 0 = status healthy.
 * Exit 1 = status degraded or down.
 *
 * What to check if it fails:
 *   - status "down"     → unactioned stubs or repeat-firing components exist.
 *   - status "degraded" → engine silent > 30 days, or proposals exist without stubs.
 *   - docs/veins-history.jsonl unwriteable → check file/dir permissions.
 *   - .veins/proposals/ missing → VEINS engine may be offline or writing elsewhere.
 */

const fs   = require('fs');
const path = require('path');

const { parseProposal, analyzeProposals } = require('./veins-tracker');
const { frequencyStats, proposalCommitDates } = require('./veins-snapshot');

const PROPOSALS_DIR    = path.join(process.cwd(), '.veins', 'proposals');
const FINGERPRINT_PATH = path.join(process.cwd(), 'docs', 'biome', 'bnat-fingerprint.json');
const HISTORY_PATH     = path.join(process.cwd(), 'docs', 'veins-history.jsonl');

// ── data collectors ────────────────────────────────────────────────────────────

function readProposals() {
  if (!fs.existsSync(PROPOSALS_DIR)) return [];
  const files = fs.readdirSync(PROPOSALS_DIR).filter((f) => f.endsWith('.md'));
  return files.map((f) => {
    const content = fs.readFileSync(path.join(PROPOSALS_DIR, f), 'utf8');
    return parseProposal(content, f);
  });
}

function readFingerprint() {
  if (!fs.existsSync(FINGERPRINT_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(FINGERPRINT_PATH, 'utf8')); } catch { return null; }
}

// ── history helpers ────────────────────────────────────────────────────────────

/**
 * Read all existing rows from the JSONL log.
 * @returns {Array<object>}
 */
function readHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  return fs.readFileSync(HISTORY_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

/**
 * Append a row to the JSONL log (one JSON object per line, never overwrites).
 * @param {object} row
 */
function appendHistory(row) {
  fs.appendFileSync(HISTORY_PATH, JSON.stringify(row) + '\n', 'utf8');
}

// ── trend analysis ─────────────────────────────────────────────────────────────

const STATUS_RANK = { healthy: 0, degraded: 1, down: 2 };

/**
 * Compare current row to the previous row (if any).
 * Returns a plain-English trend description.
 * @param {object} current
 * @param {object|null} previous
 * @returns {string}
 */
function trendDescription(current, previous) {
  if (!previous) return 'first entry — no prior baseline';

  const lines = [];

  const statusDelta = STATUS_RANK[current.status] - STATUS_RANK[previous.status];
  if      (statusDelta < 0) lines.push('status improved');
  else if (statusDelta > 0) lines.push('status degraded');
  else                       lines.push('status unchanged');

  const stubDelta = current.stub_unactioned - previous.stub_unactioned;
  if      (stubDelta > 0) lines.push(`stubs grew +${stubDelta}`);
  else if (stubDelta < 0) lines.push(`stubs reduced ${stubDelta}`);

  const silenceDelta = (current.days_since_last_commit ?? 0) - (previous.days_since_last_commit ?? 0);
  if (silenceDelta > 0) lines.push(`engine silent ${silenceDelta} more day(s)`);

  return lines.join('; ');
}

// ── row builder ────────────────────────────────────────────────────────────────

/**
 * Build a compact summary row from the current repo state.
 * @param {string} snapshotAt  ISO timestamp
 * @returns {object}
 */
function buildRow(snapshotAt) {
  const proposals   = readProposals();
  const analysis    = analyzeProposals(proposals);
  const fingerprint = readFingerprint();

  const commitDates = proposalCommitDates();
  const freq        = frequencyStats(commitDates);
  const daysSilent  = freq
    ? Math.round((Date.now() - new Date(freq.last_commit)) / 86400000)
    : null;

  // Status mirrors veins-snapshot.js logic exactly.
  let status = 'healthy';
  if (analysis.total > 0 && analysis.stubs > 0) status = 'down';
  else if (analysis.total > 0 && analysis.repeat_firing.length > 0) status = 'degraded';
  else if (daysSilent !== null && daysSilent > 30) status = 'degraded';

  // Effectiveness index: 100 − stub_penalty − repeat_penalty − silence_penalty.
  const stubRate    = analysis.total > 0 ? analysis.stubs / analysis.total : 0;
  const effectiveness = Math.max(0,
    100
    - Math.round(stubRate * 50)
    - (analysis.repeat_firing.length > 0 ? 30 : 0)
    - (daysSilent !== null && daysSilent > 30 ? 20 : 0)
  );

  return {
    snapshot_at:              snapshotAt,
    status,
    effectiveness_index:      effectiveness,
    total_proposals:          analysis.total,
    stub_unactioned:          analysis.stubs,
    actioned:                 analysis.actioned,
    unique_components:        analysis.unique_components,
    unique_veins_runs:        analysis.unique_runs,
    repeat_firing_components: analysis.repeat_firing.length,
    days_since_last_commit:   daysSilent,
    sheaf_dim_H1:             fingerprint ? (fingerprint.dim_H1 ?? null)             : null,
    sheaf_energy:             fingerprint ? (fingerprint.energy  ?? null)             : null,
    sheaf_long_lived_h1:      fingerprint ? (fingerprint.long_lived_h1_count ?? null) : null,
  };
}

module.exports = { buildRow, trendDescription, readHistory, appendHistory };

// ── CLI ────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const jsonMode   = process.argv.includes('--json');
  const snapshotAt = new Date().toISOString();
  const row        = buildRow(snapshotAt);
  const history    = readHistory();
  const previous   = history.length > 0 ? history[history.length - 1] : null;
  const trend      = trendDescription(row, previous);

  appendHistory(row);

  if (jsonMode) {
    console.log(JSON.stringify({ row, trend }, null, 2));
  } else {
    const BADGE = { healthy: '🟢', degraded: '🟡', down: '🔴' };
    console.log(`VEINS State Log — ${snapshotAt}`);
    console.log(`Status:    ${BADGE[row.status] || '⚪'} ${row.status.toUpperCase()}  |  Effectiveness: ${row.effectiveness_index}/100`);
    console.log(`Trend:     ${trend}`);
    console.log(`Stubs:     ${row.stub_unactioned} unactioned / ${row.total_proposals} total`);
    console.log(`Silence:   ${row.days_since_last_commit ?? 'unknown'} days since last VEINS commit`);
    console.log(`Repeat-firing: ${row.repeat_firing_components} component(s)`);
    if (row.sheaf_dim_H1 !== null) {
      console.log(`Sheaf H¹:  dim ${row.sheaf_dim_H1}  energy ${row.sheaf_energy}  long-lived ${row.sheaf_long_lived_h1}`);
    }
    console.log(`Appended row to: ${path.relative(process.cwd(), HISTORY_PATH)}`);
  }

  process.exitCode = row.status === 'healthy' ? 0 : 1;
}

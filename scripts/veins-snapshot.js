#!/usr/bin/env node
'use strict';

/**
 * VEINS Monitoring Snapshot — answers the three fleet questions, credit-free.
 *
 * 1. What is VEINS changing?
 *    Targets (components), severity, heal event types — from .veins/proposals/
 * 2. How frequently?
 *    Unique run IDs, commit dates from git log (span + average interval)
 * 3. Are they doing anything?
 *    Stub rate (unactioned), repeat-firing components, effectiveness index
 *
 * Also attaches the sheaf topology snapshot (docs/biome/bnat-fingerprint.json)
 * if it exists — dim_H0/H1, energy, long-lived H¹ bars.
 *
 * Exit code 0 = healthy (zero stubs, zero repeat-firing, engine active).
 * Exit code 1 = issues found (stubs unactioned, repeat-firing, or engine silent).
 * Exit code 2 = proposals directory not found.
 *
 * Pure functions exported for unit tests; CLI reads from disk and git log.
 *
 * What to check if it fails:
 *   - Missing .veins/proposals/ → VEINS engine may be offline or writing elsewhere.
 *   - All stubs → proposals written but no human or bot applied a fix.
 *   - Repeat-firing → same component keeps flapping; underlying cause not healed.
 *   - git log unavailable → frequency section will show null dates (non-fatal).
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { parseProposal, analyzeProposals, normalizeComponent } = require('./veins-tracker');

const PROPOSALS_DIR   = path.join(process.cwd(), '.veins', 'proposals');
const FINGERPRINT_PATH = path.join(process.cwd(), 'docs', 'biome', 'bnat-fingerprint.json');

// ── git log helper ─────────────────────────────────────────────────────────────

/**
 * Return commit timestamps (ISO strings, newest-first) for all commits that
 * touched .veins/proposals/. Returns [] if git is unavailable.
 */
function proposalCommitDates() {
  try {
    const out = execFileSync(
      'git',
      ['log', '--follow', '--format=%aI', '--', '.veins/proposals/'],
      { encoding: 'utf8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// ── frequency analysis ─────────────────────────────────────────────────────────

/**
 * Given an array of ISO date strings (newest-first from git log), compute:
 *   - first_commit / last_commit
 *   - span_days
 *   - avg_interval_hours between consecutive VEINS invocations
 *   - sessions (unique calendar-days with commits)
 *
 * @param {string[]} dates  ISO strings, newest first
 */
function frequencyStats(dates) {
  if (!dates || dates.length === 0) return null;
  const sorted = dates.map((d) => new Date(d)).sort((a, b) => a - b);
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];
  const spanMs = last - first;
  const spanDays = Math.round(spanMs / 86400000);

  // Average hours between consecutive commits (VEINS sessions, not individual proposals).
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i] - sorted[i - 1];
    if (diff > 0) intervals.push(diff / 3600000); // ms → hours
  }
  const avgIntervalHours = intervals.length > 0
    ? Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10
    : null;

  return {
    first_commit: first.toISOString(),
    last_commit:  last.toISOString(),
    span_days:    spanDays,
    avg_interval_hours: avgIntervalHours,
    total_commits: dates.length,
  };
}

// ── effectiveness index ────────────────────────────────────────────────────────

/**
 * 0–100 score: 100 = all proposals actioned, no repeat-firing, engine active.
 *              0 = all stubs, repeat-firing, engine silent.
 * @param {object} analysis  from analyzeProposals()
 * @param {number} daysSilent  days since last commit (null = unknown)
 */
function effectivenessIndex(analysis, daysSilent) {
  let score = 100;
  // Penalise unactioned stubs (up to −50 pts). Guard against division by zero.
  const stubRate = analysis.total > 0 ? analysis.stubs / analysis.total : 0;
  score -= Math.round(stubRate * 50);
  // Penalise repeat-firing (up to −30 pts).
  if (analysis.repeat_firing.length > 0) score -= 30;
  // Penalise silence (more than 30 days since last proposal, engine may be offline).
  if (daysSilent !== null && daysSilent > 30) score -= 20;
  return Math.max(0, score);
}

// ── report builder ─────────────────────────────────────────────────────────────

/**
 * Build the full monitoring snapshot.
 *
 * @param {string[]}  proposals   raw markdown strings
 * @param {string[]}  commitDates ISO strings from git log (newest-first)
 * @param {object|null} fingerprint  bnat-fingerprint.json content or null
 * @param {string}    snapshotAt  ISO timestamp for this run
 */
function buildSnapshot(proposals, commitDates, fingerprint, snapshotAt) {
  const parsed   = proposals.map((content, i) => parseProposal(content, `proposal-${i}.md`));
  const analysis = analyzeProposals(parsed);
  const freq     = frequencyStats(commitDates);

  const daysSilent = freq
    ? Math.round((Date.now() - new Date(freq.last_commit)) / 86400000)
    : null;

  const index = effectivenessIndex(analysis, daysSilent);

  // ── what ──
  const targets = analysis.all_components.map((c) => ({
    component:  c.component,
    count:      c.count,
    normalized: normalizeComponent(c.component),
  }));

  // Severity distribution from raw parsed proposals.
  const severityCounts = {};
  for (const p of parsed) {
    severityCounts[p.severity] = (severityCounts[p.severity] || 0) + 1;
  }

  const uniqueHealIds = [...new Set(parsed.map((p) => p.healId).filter(Boolean))];

  // ── status ──
  let status = 'healthy';
  if (analysis.total > 0 && analysis.stubs > 0) status = 'down';
  else if (analysis.total > 0 && analysis.repeat_firing.length > 0) status = 'degraded';
  else if (daysSilent !== null && daysSilent > 30) status = 'degraded';

  return {
    schema:      'veins-snapshot/v1',
    snapshot_at: snapshotAt,
    status,
    effectiveness_index: index,

    what: {
      targets,
      severity_distribution: severityCounts,
      unique_heal_event_ids: uniqueHealIds,
      total_proposals:      analysis.total,
      unique_components:    analysis.unique_components,
    },

    how_frequently: {
      unique_veins_runs:     analysis.unique_runs,
      commit_history:        freq,
      days_since_last_commit: daysSilent,
    },

    effectiveness: {
      stub_unactioned: analysis.stubs,
      actioned:        analysis.actioned,
      stub_rate_pct:   analysis.total > 0
        ? Math.round((analysis.stubs / analysis.total) * 100) : 0,
      repeat_firing:   analysis.repeat_firing,
    },

    sheaf_topology: fingerprint ? {
      dim_H0:       fingerprint.dim_H0,
      dim_H1:       fingerprint.dim_H1,
      energy:       fingerprint.energy,
      consistent:   fingerprint.consistent,
      obstruction:  fingerprint.obstruction,
      long_lived_h1_count: fingerprint.long_lived_h1_count,
      generated_at: fingerprint.generated_at,
    } : null,
  };
}

/**
 * Render a snapshot as a human-readable text report.
 * @param {object} snap  from buildSnapshot()
 */
function renderReport(snap) {
  const lines = [];
  const BADGE = { healthy: '🟢', degraded: '🟡', down: '🔴' };
  const badge = BADGE[snap.status] || '⚪';

  lines.push(`VEINS Monitoring Snapshot — ${snap.snapshot_at}`);
  lines.push(`Overall: ${badge} ${snap.status.toUpperCase()}  |  Effectiveness index: ${snap.effectiveness_index}/100`);
  lines.push('');

  lines.push('── 1. WHAT IS VEINS CHANGING? ──────────────────────────────────');
  if (snap.what.total_proposals === 0) {
    lines.push('  No proposals in .veins/proposals/ — engine may be offline or writing elsewhere.');
  } else {
    lines.push(`  ${snap.what.total_proposals} proposal(s) across ${snap.what.unique_components} component(s):`);
    for (const t of snap.what.targets) {
      lines.push(`    • ${t.component}  (${t.count} proposal(s))`);
    }
    lines.push('');
    lines.push('  Severity distribution:');
    for (const [sev, cnt] of Object.entries(snap.what.severity_distribution)) {
      lines.push(`    ${sev}: ${cnt}`);
    }
    lines.push('');
    lines.push('  Unique heal event IDs:');
    for (const id of snap.what.unique_heal_event_ids) {
      lines.push(`    • ${id}`);
    }
  }
  lines.push('');

  lines.push('── 2. HOW FREQUENTLY? ──────────────────────────────────────────');
  lines.push(`  Unique VEINS run IDs: ${snap.how_frequently.unique_veins_runs}`);
  if (snap.how_frequently.commit_history) {
    const h = snap.how_frequently.commit_history;
    lines.push(`  First proposal commit:  ${h.first_commit}`);
    lines.push(`  Last proposal commit:   ${h.last_commit}`);
    lines.push(`  Span: ${h.span_days} day(s)  |  Avg interval: ${h.avg_interval_hours ?? 'n/a'} hour(s)`);
  } else {
    lines.push('  Commit history unavailable (git log failed).');
  }
  const silence = snap.how_frequently.days_since_last_commit;
  if (silence !== null) {
    const silenceNote = silence > 30 ? '  ⚠️  Engine appears silent (> 30 days).' : '';
    lines.push(`  Days since last proposal: ${silence}${silenceNote}`);
  }
  lines.push('');

  lines.push('── 3. ARE THEY DOING ANYTHING? ─────────────────────────────────');
  const eff = snap.effectiveness;
  lines.push(`  Stub rate: ${eff.stub_rate_pct}%  (${eff.stub_unactioned} unactioned / ${eff.stub_unactioned + eff.actioned} total)`);
  if (eff.actioned === 0 && eff.stub_unactioned > 0) {
    lines.push('  ⚠️  All proposals are stubs — no real patch has been applied.');
  }
  if (eff.repeat_firing.length > 0) {
    lines.push(`  ⚠️  ${eff.repeat_firing.length} repeat-firing component(s) — VEINS keeps detecting without cure:`);
    for (const rf of eff.repeat_firing) {
      lines.push(`    • ${rf.component}  (${rf.count} proposals, ${rf.unique_runs} unique run(s))`);
    }
  } else {
    lines.push('  No repeat-firing components detected.');
  }
  lines.push('');

  if (snap.sheaf_topology) {
    const st = snap.sheaf_topology;
    lines.push('── SHEAF TOPOLOGY ─────────────────────────────────────────────');
    lines.push(`  dim H⁰: ${st.dim_H0}  dim H¹: ${st.dim_H1}  energy: ${st.energy}`);
    lines.push(`  Consistent: ${st.consistent}  Obstruction: ${st.obstruction}`);
    lines.push(`  Long-lived H¹ bars: ${st.long_lived_h1_count}  (as of ${st.generated_at})`);
    if (st.long_lived_h1_count > 0) {
      lines.push('  ⚠️  Long-lived H¹ bars detected — persistent fleet disagreement must be resolved, not glued.');
    }
    lines.push('');
  }

  lines.push('── RECOMMENDED ACTION ──────────────────────────────────────────');
  if (eff.stub_unactioned > 0 && eff.repeat_firing.length > 0) {
    lines.push('  🔴 Repeat-firing component with unactioned stubs.');
    lines.push('     → Apply the quarantine patch for the repeat-firing component.');
    lines.push('     → Or close the relevant GitHub issues as "not planned" if the flakiness is resolved.');
    lines.push('     → After applying a fix, delete or update the stub proposals.');
  } else if (eff.stub_unactioned > 0) {
    lines.push('  🟡 Unactioned stubs remain — review and apply or close them.');
  } else if (snap.how_frequently.days_since_last_commit !== null &&
             snap.how_frequently.days_since_last_commit > 30) {
    lines.push('  🟡 VEINS engine appears silent. Check that it is running in Lovable and watching this repo.');
  } else {
    lines.push('  🟢 No immediate action required.');
  }
  lines.push('');

  return lines.join('\n');
}

module.exports = { buildSnapshot, renderReport, frequencyStats, effectivenessIndex, proposalCommitDates };

// ── CLI ────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const jsonMode = process.argv.includes('--json');

  if (!fs.existsSync(PROPOSALS_DIR)) {
    console.warn('[veins-snapshot] .veins/proposals/ not found — VEINS may be offline or writing elsewhere.');
    process.exitCode = 2;
    process.exit();
  }

  const files = fs.readdirSync(PROPOSALS_DIR).filter((f) => f.endsWith('.md'));
  const proposalContents = files.map((f) =>
    fs.readFileSync(path.join(PROPOSALS_DIR, f), 'utf8')
  );

  const commitDates = proposalCommitDates();

  let fingerprint = null;
  if (fs.existsSync(FINGERPRINT_PATH)) {
    try {
      fingerprint = JSON.parse(fs.readFileSync(FINGERPRINT_PATH, 'utf8'));
    } catch {
      /* non-fatal; sheaf section omitted */
    }
  }

  const snap = buildSnapshot(proposalContents, commitDates, fingerprint, new Date().toISOString());

  if (jsonMode) {
    console.log(JSON.stringify(snap, null, 2));
  } else {
    console.log(renderReport(snap));
    if (!jsonMode) {
      console.log('(Pass --json for machine-readable output.)');
    }
  }

  process.exitCode = snap.status === 'healthy' ? 0 : 1;
}

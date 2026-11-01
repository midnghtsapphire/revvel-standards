#!/usr/bin/env node
'use strict';

/**
 * VEINS Activity Monitor — what is the self-healing engine doing?
 *
 * Reads .veins/proposals/, git history of .veins/, BIOME sheaf state, and
 * veins-monitor.yml wiring, then emits a structured observability report.
 *
 * Why this exists: VEINS runs externally and commits proposals into this repo.
 * Nothing was surfacing how often it fires, which components it targets, or
 * whether the internal monitor (veins-monitor.yml) is even wired. This script
 * answers all three. See docs/VEINS_MONITOR.md for architecture context.
 *
 * Read-only. Zero npm dependencies (pure Node stdlib + local bnatsheaf/).
 * Exit 0 always — this is observability, not a gate.
 *
 * Usage:
 *   node scripts/veins-activity.js          # human-readable summary
 *   node scripts/veins-activity.js --json   # machine-readable JSON
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PROPOSALS_DIR = path.join(ROOT, '.veins', 'proposals');
const BIOME_STATUS = path.join(ROOT, 'docs', 'biome', 'biome-status.json');
const VEINS_MONITOR_YML = path.join(ROOT, '.github', 'workflows', 'veins-monitor.yml');
const VEINS_DEDUP_YML = path.join(ROOT, '.github', 'workflows', 'veins-intake-dedup.yml');

// ── 1. Proposals ─────────────────────────────────────────────────────────────
// Parse every markdown file in .veins/proposals/ and extract structured fields.

function parseProposals() {
  if (!fs.existsSync(PROPOSALS_DIR)) return [];
  return fs.readdirSync(PROPOSALS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const content = fs.readFileSync(path.join(PROPOSALS_DIR, f), 'utf8');
      const m = (re) => { const r = content.match(re); return r ? r[1].trim() : null; };
      const runUrl = m(/\*\*Source:\*\* `workflow_run` — <([^>]+)>/);
      const runId = runUrl ? runUrl.split('/').pop() : null;
      return {
        file: f,
        title: m(/\*\*Title:\*\* (.+)/),
        severity: m(/\*\*Severity:\*\* [^\s]+ `([^`]+)`/),
        component: m(/\*\*Component:\*\* (.+)/),
        runUrl,
        runId,
        healId: m(/Heal event id: `([^`]+)`/),
      };
    });
}

// ── 2. Git frequency ─────────────────────────────────────────────────────────
// All commits that touched .veins/ — gives the external engine's firing cadence.

function getVeinsGitHistory() {
  try {
    const raw = execSync(
      'git log --format="%H|%ai|%s" -- .veins/',
      { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    if (!raw) return [];
    return raw.split('\n').map((line) => {
      const idx = line.indexOf('|');
      const idx2 = line.indexOf('|', idx + 1);
      return {
        hash: line.slice(0, idx).trim(),
        date: line.slice(idx + 1, idx2).trim(),
        subject: line.slice(idx2 + 1).trim(),
      };
    });
  } catch (_) {
    return [];
  }
}

// ── 3. Sheaf health ───────────────────────────────────────────────────────────
// Compute Laplacian energy over the BIOME worker graph. E(x) > 0 means workers
// disagree on severity — an H¹ obstruction that must be named, never glued.

function getSheafHealth() {
  if (!fs.existsSync(BIOME_STATUS)) {
    return { available: false, reason: 'biome-status.json not found — run biome-sheaf.yml first' };
  }
  try {
    const status = JSON.parse(fs.readFileSync(BIOME_STATUS, 'utf8'));
    const { sheafFromBiomeStatus } = require('./bnatsheaf/sheaf');
    const sheaf = sheafFromBiomeStatus(status);
    const energy = sheaf.laplacianEnergy();
    const obstructions = sheaf.h1Obstructions(1e-9);
    const workers = Object.entries(status.workers || {}).reduce((acc, [k, v]) => {
      acc[k] = v.status;
      return acc;
    }, {});
    return {
      available: true,
      biomeGeneratedAt: status.generated_at,
      biomeOverall: status.overall,
      workerCount: Object.keys(status.workers || {}).length,
      workers,
      energy,
      consistent: energy < 1e-9,
      h1ObstructionCount: obstructions.length,
      obstructions: obstructions.map((o) => ({
        edge: o.edge,
        energy: o.energy,
        transitionPatch: o.transitionPatch,
      })),
    };
  } catch (e) {
    return { available: false, reason: e.message };
  }
}

// ── 4. Monitor wiring ─────────────────────────────────────────────────────────
// Check whether veins-monitor.yml is scheduled or only manually triggered.
// The no-scheduled-workflows policy means any schedule must be explicitly listed
// in the ALLOWED_SCHEDULED allowlist in tests/no-scheduled-workflows.test.js.

function getMonitorWiring() {
  const check = (filePath) => {
    if (!fs.existsSync(filePath)) return { exists: false };
    const c = fs.readFileSync(filePath, 'utf8');
    const activeSchedule = /^  schedule:/m.test(c) && !/^  #.*schedule:/m.test(c);
    const commentedSchedule = /^  #\s*(schedule:|cron:)/m.test(c);
    const hasIssuesTrigger = /types:\s*\n\s*-\s*opened/.test(c);
    return {
      exists: true,
      activeSchedule,
      commentedSchedule,
      hasWorkflowDispatch: /workflow_dispatch/.test(c),
      hasIssuesTrigger,
    };
  };
  return {
    veinsMonitor: check(VEINS_MONITOR_YML),
    veinsDedup: check(VEINS_DEDUP_YML),
  };
}

// ── 5. Dedup analysis ─────────────────────────────────────────────────────────
// The external engine can commit multiple proposals for the same run ID.
// Detect run-level duplicates: same runId → same upstream event, different files.

function analyzeDuplicates(proposals) {
  const byRunId = {};
  const byHealId = {};
  for (const p of proposals) {
    if (p.runId) {
      (byRunId[p.runId] = byRunId[p.runId] || []).push(p.file);
    }
    if (p.healId) {
      (byHealId[p.healId] = byHealId[p.healId] || []).push(p.file);
    }
  }
  const runDuplicates = Object.entries(byRunId)
    .filter(([, files]) => files.length > 1)
    .map(([runId, files]) => ({ runId, count: files.length, files }));
  const healIdDuplicates = Object.entries(byHealId)
    .filter(([, files]) => files.length > 1)
    .map(([healId, files]) => ({ healId, count: files.length, files }));
  return { byRunId, byHealId, runDuplicates, healIdDuplicates };
}

// ── 6. Assessment ─────────────────────────────────────────────────────────────

function buildAssessment({ proposals, history, sheaf, wiring, dupes, daysSinceLast }) {
  const issues = [];
  const notes = [];

  if (proposals.count === 0) {
    notes.push('No heal proposals in .veins/proposals/ — VEINS has not committed any patches.');
  } else {
    const uniqueComponents = Object.keys(proposals.components).length;
    notes.push(`${proposals.count} proposal(s) targeting ${uniqueComponents} distinct component(s).`);
  }

  if (proposals.duplicateProposals > 0) {
    // Duplicate proposals are a known VEINS dedup gap (see veins-intake-dedup.yml comment).
    issues.push(
      `${dupes.runDuplicates.length} run-ID collision(s) — external engine committed ` +
      `multiple proposals for the same CI run. The proposal-level dedup gate is not working.`
    );
  }
  if (dupes.healIdDuplicates.length > 0) {
    issues.push(
      `${dupes.healIdDuplicates.length} healId collision(s) — same heal event committed ` +
      `as separate files. Proposals need consolidation.`
    );
  }

  if (daysSinceLast === null) {
    notes.push('No VEINS git history found — engine may never have fired, or .veins/ is new.');
  } else if (daysSinceLast > 60) {
    notes.push(`VEINS last committed ${daysSinceLast} days ago — engine appears dormant.`);
  } else if (daysSinceLast > 14) {
    notes.push(`VEINS last committed ${daysSinceLast} days ago — low activity.`);
  } else {
    notes.push(`VEINS committed within the last ${daysSinceLast} days — engine is active.`);
  }

  const mon = wiring.veinsMonitor;
  if (!mon.exists) {
    issues.push('veins-monitor.yml not found — internal VEINS scan workflow is missing.');
  } else if (!mon.activeSchedule) {
    notes.push(
      'veins-monitor.yml has no active schedule (workflow_dispatch only). ' +
      'Internal stuck-issue scan does not run automatically. ' +
      'Trigger manually via: gh workflow run veins-monitor.yml'
    );
  } else {
    notes.push('veins-monitor.yml is scheduled — internal scan runs automatically.');
  }

  const dedup = wiring.veinsDedup;
  if (!dedup.exists) {
    issues.push('veins-intake-dedup.yml not found — duplicate [VEINS] issues will not be deduplicated.');
  } else if (!dedup.hasIssuesTrigger) {
    issues.push('veins-intake-dedup.yml lacks an issues:opened trigger — dedup gate will not fire.');
  } else {
    notes.push('veins-intake-dedup.yml is wired (fires on issues:opened).');
  }

  if (sheaf.available) {
    if (sheaf.consistent) {
      notes.push(`Sheaf is consistent (E(x)=${sheaf.energy.toExponential(2)}) — no H¹ obstructions.`);
    } else {
      issues.push(
        `Sheaf Laplacian energy E(x)=${sheaf.energy.toFixed(4)} > ε. ` +
        `${sheaf.h1ObstructionCount} H¹ obstruction(s) detected. ` +
        `Apply transition patches or escalate (lifecycle:stuck + needs-human).`
      );
    }
  } else {
    notes.push(`Sheaf health unavailable: ${sheaf.reason}`);
  }

  return {
    healthy: issues.length === 0,
    issues,
    notes,
  };
}

// ── Print ─────────────────────────────────────────────────────────────────────

function printHumanReport(report) {
  const { proposals, frequency, sheafHealth, monitorWiring, assessment } = report;
  const sep = '─'.repeat(60);

  console.log(`\n${sep}`);
  console.log(`  VEINS Activity Monitor  —  ${report.generatedAt}`);
  console.log(sep);

  // Proposals
  console.log(`\n📁 PROPOSALS  (.veins/proposals/)  count=${proposals.count}`);
  if (proposals.count === 0) {
    console.log('   None found.');
  } else {
    const comp = Object.entries(proposals.components)
      .map(([c, n]) => `${c} (×${n})`)
      .join(', ');
    console.log(`   Components targeted: ${comp || 'unknown'}`);
    console.log(`   Unique upstream run IDs: ${proposals.uniqueRunIds}`);
    if (proposals.duplicateProposals > 0) {
      console.log(`   ⚠️  Duplicate proposals (same run ID, multiple files): ${proposals.duplicateProposals}`);
      for (const d of proposals.duplicateDetails) {
        console.log(`      run ${d.runId}: extra file ${d.file}`);
      }
    }
  }

  // Frequency
  console.log(`\n📅 FREQUENCY  (git log -- .veins/)`);
  if (frequency.totalVeinsCommits === 0) {
    console.log('   No commits found touching .veins/.');
  } else {
    const dormant = frequency.daysSinceLastActivity > 30;
    const flag = dormant ? '💤' : '✅';
    console.log(`   ${flag} Last activity: ${frequency.lastActivityDate} (${frequency.daysSinceLastActivity} days ago)`);
    console.log(`   Total commits: ${frequency.totalVeinsCommits}  |  Last 90 days: ${frequency.last90DaysCommits}`);
    console.log('   Recent commits:');
    for (const h of frequency.history.slice(0, 5)) {
      console.log(`     ${h.date.slice(0, 10)}  ${h.subject.slice(0, 70)}`);
    }
  }

  // Sheaf
  console.log(`\n🔬 SHEAF HEALTH  (BIOME Laplacian E(x))`);
  if (!sheafHealth.available) {
    console.log(`   ⚠️  ${sheafHealth.reason}`);
  } else {
    const icon = sheafHealth.consistent ? '✅' : '🔴';
    console.log(`   ${icon} E(x) = ${sheafHealth.energy.toExponential(3)}  |  consistent: ${sheafHealth.consistent}`);
    console.log(`   Workers (${sheafHealth.workerCount}): ${JSON.stringify(sheafHealth.workers)}`);
    console.log(`   BIOME generated at: ${sheafHealth.biomeGeneratedAt}`);
    if (!sheafHealth.consistent) {
      console.log(`   H¹ obstructions (${sheafHealth.h1ObstructionCount}):`);
      for (const o of sheafHealth.obstructions) {
        console.log(`     edge [${o.edge}]  energy=${o.energy.toFixed(4)}  patch=${JSON.stringify(o.transitionPatch)}`);
      }
    }
  }

  // Wiring
  console.log(`\n⚙️  MONITOR WIRING`);
  const mon = monitorWiring.veinsMonitor;
  if (!mon.exists) {
    console.log('   ❌ veins-monitor.yml  NOT FOUND');
  } else {
    const schedIcon = mon.activeSchedule ? '✅ scheduled' : (mon.commentedSchedule ? '💤 schedule commented-out' : '🔘 workflow_dispatch only');
    console.log(`   veins-monitor.yml     ${schedIcon}`);
  }
  const ded = monitorWiring.veinsDedup;
  if (!ded.exists) {
    console.log('   ❌ veins-intake-dedup.yml  NOT FOUND');
  } else {
    const dedIcon = ded.hasIssuesTrigger ? '✅ wired (issues:opened)' : '⚠️  missing issues trigger';
    console.log(`   veins-intake-dedup.yml  ${dedIcon}`);
  }

  // Assessment
  console.log(`\n📊 ASSESSMENT`);
  if (assessment.healthy) {
    console.log('   ✅ No issues detected.');
  } else {
    console.log(`   ⚠️  ${assessment.issues.length} issue(s) found:`);
    for (const iss of assessment.issues) {
      console.log(`     • ${iss}`);
    }
  }
  for (const note of assessment.notes) {
    console.log(`   ℹ  ${note}`);
  }

  console.log(`\n${sep}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const jsonMode = process.argv.includes('--json');

  const proposals = parseProposals();
  const history = getVeinsGitHistory();
  const sheafHealth = getSheafHealth();
  const monitorWiring = getMonitorWiring();

  // Dedup analysis
  const dupes = analyzeDuplicates(proposals);
  const byRunId = {};
  for (const p of proposals) {
    if (p.component) byRunId[p.component] = (byRunId[p.component] || 0) + 1;
  }
  const uniqueRunIds = new Set(proposals.map((p) => p.runId).filter(Boolean));

  // Frequency
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  const recentHistory = history.filter((h) => Date.now() - new Date(h.date).getTime() < NINETY_DAYS);
  const lastCommit = history[0] || null;
  const daysSinceLast = lastCommit
    ? Math.round((Date.now() - new Date(lastCommit.date).getTime()) / 86400000)
    : null;

  const proposalSummary = {
    count: proposals.length,
    components: byRunId,
    uniqueRunIds: uniqueRunIds.size,
    duplicateProposals: dupes.runDuplicates.reduce((n, d) => n + d.count - 1, 0),
    duplicateDetails: dupes.runDuplicates.flatMap((d) =>
      d.files.slice(1).map((f) => ({ file: f, runId: d.runId }))
    ),
    items: proposals,
  };

  const frequencySummary = {
    totalVeinsCommits: history.length,
    last90DaysCommits: recentHistory.length,
    lastActivityDate: lastCommit ? lastCommit.date : null,
    daysSinceLastActivity: daysSinceLast,
    history: history.slice(0, 10),
  };

  const assessment = buildAssessment({
    proposals: proposalSummary,
    history: frequencySummary,
    sheaf: sheafHealth,
    wiring: monitorWiring,
    dupes,
    daysSinceLast,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    proposals: proposalSummary,
    frequency: frequencySummary,
    sheafHealth,
    monitorWiring,
    assessment,
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  // Exit 0 always: this is observational, not a gate.
}

main();

#!/usr/bin/env node
'use strict';

/**
 * BIOME · veins-observer — the fleet's VEINS activity monitor.
 *
 * Tracks external [VEINS] alerts posted by the V.E.I.N.S. (Vital Engine
 * INtelligence Surveillance) engine. VEINS runs OUTSIDE this repo and posts
 * issues titled "[VEINS] ..." using the owner's token when it detects stuck
 * pipeline components. This worker answers three questions:
 *
 *   1. What is it changing?
 *      Labels applied: auto-fix, ralph-loop, self-heal (on fresh alerts);
 *      lifecycle:stuck (on escalations after 3+ duplicates); wr:reset
 *      (via veins-monitor.yml manual dispatch on stuck WRs > 7 days).
 *
 *   2. How frequently?
 *      `recent_30d` — alerts in the last 30 days.
 *      `oldest_open_alert_days` — age of the oldest unresolved alert.
 *      `repeat_components` — components that have fired 3+ identical alerts
 *      (volatile numbers stripped so "(3767m)" and "(3807m)" collapse to the
 *      same component — the same normalization the dedup workflow uses).
 *
 *   3. Are they doing anything?
 *      `resolution_rate_pct` — of all [VEINS] issues, what % are closed
 *      without being merely labelled "duplicate" (i.e. the underlying problem
 *      was actually fixed). If this stays near zero while `repeat_components`
 *      grows, VEINS is squawking but not healing.
 *
 * How VEINS uses sheaves (algorithm summary):
 *   - Each fleet component (workflow, WR pipeline stage) is a vertex.
 *   - The component's health state is its stalk — a vector in severity space.
 *   - Edges encode "shared context" (dependency or overlap between components).
 *   - The sheaf Laplacian energy E(x) = Σ_e ||R_u x_u − R_v x_v||² measures
 *     disagreement: zero iff the fleet is a global section (H¹ ≈ 0), non-zero
 *     iff there are H¹ obstructions (persistent disagreements = stuck states).
 *   - VEINS fires a [VEINS] alert when it detects a positive-birth H¹ bar that
 *     has exceeded the staleness threshold (default 7 days).
 *   - The dedup gate (veins-intake-dedup.yml) absorbs duplicate alerts for the
 *     same H¹ bar; after 3 duplicates it escalates (the bar is immortal in a
 *     graph sheaf — it must be explicitly killed, never silently glued).
 *
 * Pure functions are exported for unit testing; the CLI reads from disk.
 */

const VEINS_TITLE_RE = /^\[VEINS\]/i;

/** Strip volatile numbers and normalise whitespace — mirrors dedup workflow. */
function normalizeTitle(t) {
  return String(t).toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
}

function labelNames(item) {
  return (item.labels || [])
    .map((l) => (typeof l === 'string' ? l : (l && l.name) || ''))
    .filter(Boolean);
}

function ageDays(item) {
  const ts = new Date(item.created_at).getTime();
  return Number.isFinite(ts) ? Math.round((Date.now() - ts) / 86400000) : 0;
}

/**
 * Analyse an array of [VEINS] issues (any state).
 * @param {Array}  issues     — raw GitHub issue objects (search or list result)
 * @param {number} windowDays — "recent" recency window (default 30)
 */
function analyzeVeinsAlerts(issues, windowDays = 30) {
  const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const all = (issues || []).filter(
    (i) => !i.pull_request && VEINS_TITLE_RE.test(i.title || '')
  );
  const open = all.filter((i) => i.state === 'open');
  const recent = all.filter((i) => new Date(i.created_at).getTime() >= cutoffMs);
  const closedDupe = all.filter(
    (i) => i.state === 'closed' && labelNames(i).includes('duplicate')
  );
  const escalated = all.filter((i) => labelNames(i).includes('lifecycle:stuck'));
  const routedToSelfHeal = all.filter((i) =>
    labelNames(i).some((l) => ['auto-fix', 'ralph-loop', 'self-heal'].includes(l))
  );
  // Resolved = closed for a reason OTHER than "duplicate" (underlying fix landed).
  const resolved = all.filter(
    (i) => i.state === 'closed' && !labelNames(i).includes('duplicate')
  );

  // Repeat-firing: same normalised title appearing 3+ times means a component
  // keeps re-alerting without the underlying H¹ bar being killed.
  const titleCounts = {};
  for (const issue of all) {
    const key = normalizeTitle(issue.title || '');
    if (!titleCounts[key]) titleCounts[key] = { count: 0, representative: issue.title };
    titleCounts[key].count += 1;
  }
  const repeatComponents = Object.values(titleCounts)
    .filter((v) => v.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalAlerts = all.length;
  const oldestOpenDays = open.reduce((max, i) => Math.max(max, ageDays(i)), 0);
  const dupRatePct = totalAlerts > 0 ? Math.round((closedDupe.length / totalAlerts) * 100) : 0;
  const resolutionRatePct = totalAlerts > 0 ? Math.round((resolved.length / totalAlerts) * 100) : null;

  return {
    window_days: windowDays,
    total_all_time: totalAlerts,
    open: open.length,
    recent: recent.length,
    duplicate_closed: closedDupe.length,
    escalated: escalated.length,
    routed_to_self_heal: routedToSelfHeal.length,
    resolved: resolved.length,
    dedup_rate_pct: dupRatePct,
    resolution_rate_pct: resolutionRatePct,
    oldest_open_days: oldestOpenDays,
    repeat_components: repeatComponents,
    open_samples: open.slice(0, 5).map((i) => ({
      number: i.number,
      title: i.title,
      age_days: ageDays(i),
      labels: labelNames(i),
    })),
  };
}

/**
 * Build a BIOME worker section from a VEINS analysis object.
 *
 * Status thresholds (conservative — VEINS alerts mean the fleet is already
 * in pain, so a single open alert is already degraded):
 *   healthy  — zero open [VEINS] alerts
 *   degraded — 1–3 open alerts OR oldest open < 7 days
 *   down     — > 3 open OR oldest open >= 7 days OR any repeat-firing component
 */
function buildVeinsSection(analysis) {
  const { open, oldest_open_days, repeat_components, recent, total_all_time, window_days } = analysis;

  let status = 'healthy';
  if (open > 0) status = 'degraded';
  if (open > 3 || oldest_open_days >= 7 || repeat_components.length > 0) status = 'down';

  const parts = [`${open} open [VEINS] alert(s)`, `${recent} in last ${window_days}d`];
  if (repeat_components.length > 0) {
    parts.push(`${repeat_components.length} repeat-firing component(s)`);
  }
  if (total_all_time === 0) {
    parts.push('(no external alerts seen — engine may be offline or titles differ)');
  }

  return {
    worker: 'veins-observer',
    status,
    summary: parts.join('; '),
    counts: {
      open_alerts: open,
      recent_30d: recent,
      dedup_rate_pct: analysis.dedup_rate_pct,
      resolution_rate_pct: analysis.resolution_rate_pct,
      escalated_to_stuck: analysis.escalated,
      repeat_firing_components: repeat_components.length,
      oldest_open_alert_days: oldest_open_days,
      routed_to_self_heal: analysis.routed_to_self_heal,
    },
    detail: {
      repeat_components,
      open_samples: analysis.open_samples,
    },
  };
}

module.exports = { analyzeVeinsAlerts, buildVeinsSection, normalizeTitle, labelNames, ageDays };

// --- CLI (standalone run) --------------------------------------------------
if (require.main === module) {
  (async () => {
    const { OWNER, NAME, api } = require('./gh');
    const q = encodeURIComponent(`[VEINS] in:title repo:${OWNER}/${NAME}`);
    const url = `/search/issues?q=${q}&per_page=100&sort=created&order=desc`;

    const result = await api(url, { allowError: true });
    if (!result) {
      console.warn('[veins-observer] GitHub search API unavailable — no token or rate limited');
      process.exitCode = 0;
      return;
    }

    const analysis = analyzeVeinsAlerts(result.items || []);
    const section = buildVeinsSection(analysis);
    console.log(JSON.stringify({ analysis, section }, null, 2));
    process.exitCode = section.status === 'healthy' ? 0 : 1;
  })().catch((err) => {
    console.error(`[veins-observer] error: ${err.message}`);
    process.exitCode = 1;
  });
}

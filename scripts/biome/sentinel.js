#!/usr/bin/env node
'use strict';

/**
 * BIOME · sentinel — the crew's nociceptor (pain sensor).
 *
 * Credit-free, rule-based failure detection. Reads recent workflow runs and open
 * issues via the GitHub API (GITHUB_TOKEN only) and decides — with deterministic
 * rules, no AI — whether the fleet is in pain. When it is, sentinel files (or
 * quietly refreshes, deduped) a single [BIOME-SENTINEL] incident issue: ongoing
 * incidents are updated by editing the issue body in place (PATCH) rather than
 * posting a new comment each sweep, so nobody gets notification-spammed every
 * 2 hours. When the fleet recovers, the incident is auto-resolved (one
 * resolution comment + close).
 *
 * Pure decision functions are exported for unit testing; the CLI at the bottom
 * performs the actual GitHub I/O.
 */

const FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'startup_failure']);

const DEFAULTS = {
  failedRunsThreshold: 3, // matches self-healing.yml FAILED_ACTIONS_THRESHOLD
  stuckDays: 7,
};

const STUCK_LABEL_RE = /stuck|checking|self-heal|auto-fix|won't-merge|wont-merge/i;
const INCIDENT_MARKER = '<!-- biome-sentinel-incident -->';

function labelNames(item) {
  return (item.labels || []).map((l) => (typeof l === 'string' ? l : (l && l.name) || '')).filter(Boolean);
}

function classifyRuns(runs) {
  const list = Array.isArray(runs) ? runs : [];
  let failed = 0;
  const recentFailures = [];
  for (const r of list) {
    if (FAILURE_CONCLUSIONS.has(r.conclusion)) {
      failed += 1;
      recentFailures.push({ id: r.id, name: r.name, path: r.path, url: r.html_url, conclusion: r.conclusion });
    }
  }
  const total = list.length;
  return { failed, total, failureRate: total ? failed / total : 0, recentFailures };
}

function detectStuckIssues(issues, nowMs, stuckDays = DEFAULTS.stuckDays) {
  const cutoff = nowMs - stuckDays * 86400000;
  const stuck = [];
  for (const it of Array.isArray(issues) ? issues : []) {
    if (it.pull_request) continue; // the issues endpoint also returns PRs
    if (it.state !== 'open') continue;
    const labels = labelNames(it);
    if (!labels.some((n) => STUCK_LABEL_RE.test(n))) continue;
    const updated = Date.parse(it.updated_at);
    if (Number.isFinite(updated) && updated < cutoff) {
      stuck.push({ number: it.number, title: it.title, updated_at: it.updated_at, labels });
    }
  }
  return stuck;
}

function buildSentinelSection(runClass, stuckIssues, thresholds = DEFAULTS) {
  const failedOverThreshold = runClass.failed >= thresholds.failedRunsThreshold;
  const hasStuck = stuckIssues.length > 0;
  let status = 'healthy';
  if (failedOverThreshold || hasStuck) status = 'degraded';
  if (failedOverThreshold && hasStuck) status = 'down';
  return {
    worker: 'sentinel',
    status,
    summary: `${runClass.failed}/${runClass.total} recent runs failed; ${stuckIssues.length} stuck item(s)`,
    counts: {
      failed_runs: runClass.failed,
      total_runs: runClass.total,
      stuck_issues: stuckIssues.length,
    },
    detail: {
      recent_failures: runClass.recentFailures.slice(0, 10),
      stuck: stuckIssues.slice(0, 10),
    },
  };
}

function shouldFileIncident(section) {
  return section.status !== 'healthy';
}

function buildIncidentTitle(section) {
  return `[BIOME-SENTINEL] Fleet pain detected (${section.status})`;
}

function buildResolutionComment(generatedAtIso) {
  return `${INCIDENT_MARKER}\n✅ Fleet recovered as of ${generatedAtIso} — no failures or stuck items over threshold. Auto-resolving.`;
}

function buildIncidentBody(section, generatedAtIso) {
  const f = section.detail.recent_failures || [];
  const s = section.detail.stuck || [];
  const lines = [
    INCIDENT_MARKER,
    '## 🩹 BIOME Sentinel — fleet pain detected',
    '',
    `**Status:** \`${section.status}\`  `,
    `**Detected:** ${generatedAtIso}  `,
    `**Lane:** credit-free rule-based (no AI keys required)`,
    '',
    `- Failed recent runs: **${section.counts.failed_runs}/${section.counts.total_runs}**`,
    `- Stuck items: **${section.counts.stuck_issues}**`,
    '',
  ];
  if (f.length) {
    lines.push('### Recent failed runs');
    for (const r of f) lines.push(`- ${r.name || r.path || r.id} — \`${r.conclusion}\` ([run](${r.url}))`);
    lines.push('');
  }
  if (s.length) {
    lines.push('### Stuck items');
    for (const it of s) lines.push(`- #${it.number} — ${it.title} (last update ${it.updated_at})`);
    lines.push('');
  }
  lines.push('---');
  lines.push('_biome-medic will attempt rule-based remediation; this issue auto-resolves when the fleet recovers._');
  return lines.join('\n');
}

module.exports = {
  FAILURE_CONCLUSIONS,
  DEFAULTS,
  INCIDENT_MARKER,
  classifyRuns,
  detectStuckIssues,
  buildSentinelSection,
  shouldFileIncident,
  buildIncidentBody,
  buildIncidentTitle,
  buildResolutionComment,
  labelNames,
};

// --- CLI -------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    const { repoApi } = require('./gh');
    // allowError: true — a single transient API error (rate limit, 5xx) here must
    // degrade this sweep gracefully, not crash the whole crew (see gh.js: allowError
    // callers get null back instead of a throw). Warn loudly so a degraded sweep is
    // never mistaken for "genuinely healthy".
    const runsResp = await repoApi('/actions/runs?per_page=100', { allowError: true });
    if (!runsResp) console.warn('[biome-sentinel] warning: failed to fetch recent workflow runs (API error) — treating as 0 runs for this sweep');
    const issuesResp = await repoApi('/issues?state=open&per_page=100&filter=all', { allowError: true });
    if (!issuesResp) console.warn('[biome-sentinel] warning: failed to fetch open issues (API error) — treating as 0 issues for this sweep');
    const runClass = classifyRuns((runsResp && runsResp.workflow_runs) || []);
    const stuck = detectStuckIssues(issuesResp || [], Date.now(), DEFAULTS.stuckDays);
    const section = buildSentinelSection(runClass, stuck);
    const generatedAt = new Date().toISOString();
    console.log(`[biome-sentinel] status=${section.status} ${section.summary}`);

    // Dedupe: find the existing open incident (if any) before deciding anything —
    // it's needed both to refresh an ongoing incident and to auto-resolve it on recovery.
    const search = await repoApi('/issues?state=open&labels=biome,scorecard&per_page=50', { allowError: true });
    const existing = Array.isArray(search)
      ? search.find((i) => !i.pull_request && (i.body || '').includes(INCIDENT_MARKER))
      : null;

    if (!shouldFileIncident(section)) {
      if (existing) {
        // Recovery: honor the footer's promise — one resolution comment, then close.
        // Comment first so the recovery note lands while the issue is still open
        // (and is delivered with the incident context, not after a bare close).
        // (Close is ops metadata, not a content deletion; same pattern as homeostat.)
        await repoApi(`/issues/${existing.number}/comments`, {
          method: 'POST',
          body: { body: buildResolutionComment(generatedAt) },
        });
        await repoApi(`/issues/${existing.number}`, { method: 'PATCH', body: { state: 'closed' } });
        console.log(`[biome-sentinel] fleet healthy — auto-resolved incident #${existing.number}`);
      } else {
        console.log('[biome-sentinel] fleet healthy — no incident filed.');
      }
      return;
    }

    const body = buildIncidentBody(section, generatedAt);

    if (existing) {
      // Quiet refresh: edit the incident in place instead of posting a new comment.
      // A comment every 2h sweep spams notifications ("chatty cathy"); a body PATCH
      // keeps the incident current without pinging anyone. The full change history
      // stays available in the issue's edit history — nothing is lost.
      await repoApi(`/issues/${existing.number}`, {
        method: 'PATCH',
        body: { title: buildIncidentTitle(section), body },
      });
      console.log(`[biome-sentinel] refreshed existing incident #${existing.number} in place`);
    } else {
      const created = await repoApi('/issues', {
        method: 'POST',
        body: {
          title: buildIncidentTitle(section),
          body,
          labels: ['biome', 'scorecard', 'self-heal'],
        },
      });
      console.log(`[biome-sentinel] filed incident #${created && created.number}`);
    }
  })().catch((err) => {
    console.error(`[biome-sentinel] error: ${err.message}`);
    process.exit(1);
  });
}

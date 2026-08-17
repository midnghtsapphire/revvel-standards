#!/usr/bin/env node
'use strict';

/**
 * BIOME · sheaf — the crew's connective tissue (the monitor feed).
 *
 * In sheaf theory, local sections that agree on their overlaps glue into a single
 * global section. Here each worker contributes a LOCAL status section; sheaf glues
 * them into one globally-consistent fleet-health object and renders it as JSON +
 * HTML. The overall health is the worst severity across workers.
 *
 * Outputs (committed by biome-sheaf.yml, single committer to avoid races):
 *   docs/biome/biome-status.json  — machine-readable feed (Lovable reads this)
 *   docs/biome/biome-status.html  — self-contained human view
 *
 * Pure functions exported for tests; CLI gathers data (read-only) and writes files.
 */

const SEVERITY = { healthy: 0, degraded: 1, down: 2 };

function worseOf(a, b) {
  const sa = SEVERITY[a] === undefined ? 1 : SEVERITY[a];
  const sb = SEVERITY[b] === undefined ? 1 : SEVERITY[b];
  return sa >= sb ? a : b;
}

function computeOverallHealth(sections) {
  let overall = 'healthy';
  for (const s of sections || []) overall = worseOf(overall, s.status);
  return overall;
}

function glueSections(sections, generatedAtIso) {
  const workers = {};
  for (const s of sections || []) {
    workers[s.worker] = {
      status: s.status,
      summary: s.summary || '',
      counts: s.counts || {},
      detail: s.detail || {},
    };
  }
  return {
    schema: 'biome-status/v1',
    generated_at: generatedAtIso,
    credit_free: true,
    overall: computeOverallHealth(sections),
    workers,
  };
}

function badge(status) {
  return { healthy: '🟢', degraded: '🟡', down: '🔴' }[status] || '⚪';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderStatusHtml(status) {
  const rows = Object.entries(status.workers || {})
    .map(([name, w]) => {
      const counts = Object.entries(w.counts || {})
        .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
        .join(', ');
      return `      <tr>
        <td>${badge(w.status)} <strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(w.status)}</td>
        <td>${escapeHtml(w.summary)}</td>
        <td>${escapeHtml(counts)}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BIOME Crew Status</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 1.4rem; }
    .overall { font-size: 1.1rem; padding: .5rem .9rem; border-radius: 10px; display: inline-block; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    table { border-collapse: collapse; margin-top: 1rem; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); width: 100%; }
    th, td { text-align: left; padding: .6rem .8rem; border-bottom: 1px solid #e2e8f0; font-size: .9rem; }
    th { background: #0ea5e9; color: #fff; }
    .meta { color: #64748b; font-size: .8rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>🧬 BIOME Crew Status</h1>
  <p class="overall">Overall: ${badge(status.overall)} <strong>${escapeHtml(status.overall)}</strong> · credit-free: ${status.credit_free ? 'yes' : 'no'}</p>
  <table>
    <thead>
      <tr><th>Worker</th><th>Status</th><th>Summary</th><th>Counts</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="meta">Generated ${escapeHtml(status.generated_at)} · schema ${escapeHtml(status.schema)} · machine feed: <code>biome-status.json</code></p>
</body>
</html>
`;
}

module.exports = { SEVERITY, worseOf, computeOverallHealth, glueSections, renderStatusHtml, badge };

// --- CLI -------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    const fs = require('fs');
    const path = require('path');
    const { repoApi } = require('./gh');
    const sentinel = require('./sentinel');
    const homeostat = require('./homeostat');

    const generatedAt = new Date().toISOString();

    // Read-only data gather. allowError: true — a single transient API error (rate
    // limit, 5xx) here must degrade this sweep gracefully, not crash the whole crew
    // (see gh.js: allowError callers get null back instead of a throw). Warn loudly
    // so a degraded feed is never mistaken for "genuinely healthy".
    const runsResp = await repoApi('/actions/runs?per_page=100', { allowError: true });
    if (!runsResp) console.warn('[biome-sheaf] warning: failed to fetch recent workflow runs (API error) — treating as 0 runs for this sweep');
    const issuesRespRaw = await repoApi('/issues?state=open&per_page=100&filter=all', { allowError: true });
    if (!issuesRespRaw) console.warn('[biome-sheaf] warning: failed to fetch open issues (API error) — treating as 0 issues for this sweep');
    const issuesResp = issuesRespRaw || [];
    const runs = (runsResp && runsResp.workflow_runs) || [];

    const runClass = sentinel.classifyRuns(runs);
    const stuck = sentinel.detectStuckIssues(issuesResp, Date.now());
    const sentinelSection = sentinel.buildSentinelSection(runClass, stuck);

    const assessment = homeostat.assessKeyHealth(process.env);
    const homeostatSection = homeostat.buildHomeostatSection(assessment);

    // medic's own last-run health, derived from the recent runs list.
    const medicRun = runs.find((r) => String(r.path || '').includes('biome-medic'));
    const medicSection = {
      worker: 'medic',
      status: medicRun && sentinel.FAILURE_CONCLUSIONS.has(medicRun.conclusion) ? 'degraded' : 'healthy',
      summary: medicRun ? `last run: ${medicRun.conclusion || medicRun.status}` : 'no recent run yet',
      counts: {},
      detail: { last_run: medicRun ? medicRun.html_url : null },
    };

    const sheafSection = {
      worker: 'sheaf',
      status: 'healthy',
      summary: 'feed generated',
      counts: { workers: 3 },
      detail: {},
    };

    const status = glueSections([sentinelSection, homeostatSection, medicSection, sheafSection], generatedAt);

    const outDir = path.join(process.cwd(), 'docs', 'biome');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'biome-status.json'), `${JSON.stringify(status, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'biome-status.html'), renderStatusHtml(status));
    console.log(`[biome-sheaf] wrote feed: overall=${status.overall}`);
  })().catch((err) => {
    console.error(`[biome-sheaf] error: ${err.message}`);
    process.exit(1);
  });
}

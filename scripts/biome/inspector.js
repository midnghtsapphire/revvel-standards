#!/usr/bin/env node
'use strict';

/**
 * BIOME · inspector — the crew's "is it actually alive?" sense.
 *
 * Credit-free completion auditor. Bridges the gap the existing pipeline leaves:
 * DEFINITION_OF_DONE.md says "every deliverable ships a live Vercel deployment —
 * no live URL = not done", and app_artifact_auditor.py records each app's URL,
 * but NOTHING pings the URL to confirm it is reachable, and deployment-health-
 * check.yml only checks 4 hardcoded URLs. inspector HTTP-checks every app's live
 * URL (2xx = testable-live), publishes a completion scoreboard, and files a
 * deduped worklist of unfinished projects so the self-heal loop drives them done.
 *
 * Credit-free: HTTP fetch + GITHUB_TOKEN only. No AI keys.
 * Pure functions exported for tests; CLI does the I/O.
 */

const WORKLIST_MARKER = '<!-- biome-inspector-worklist -->';

function isExternal(meta) {
  return !!(meta && (meta.repo || meta.path === 'external' || meta.type === 'external'));
}

function deriveLiveUrl(name, meta, baseUrl) {
  const explicit = ((meta && meta.live_url) || '').trim();
  if (explicit) return /^https?:\/\//i.test(explicit) ? explicit : ''; // ignore non-http(s) values
  if (!isExternal(meta) && baseUrl && /^https?:\/\//i.test(baseUrl)) return `${baseUrl.replace(/\/+$/, '')}/docs/${name}/`;
  return '';
}

// status: HTTP status code (number); 0/undefined means the request failed.
function classifyApp({ name, url, status, external }) {
  if (!url) {
    return { name, url: '', external: !!external, http_status: null, reachable: false, state: external ? 'external-no-link' : 'no-link' };
  }
  const reachable = typeof status === 'number' && status >= 200 && status < 300;
  return { name, url, external: !!external, http_status: status ?? 0, reachable, state: reachable ? 'live' : 'unreachable' };
}

// Apps that should be testable-live but aren't. External-no-link is informational
// (the code lives in another repo), so it is not part of the actionable worklist.
function isIncomplete(app) {
  return app.state === 'no-link' || app.state === 'unreachable';
}

function summarize(apps) {
  const s = { total: apps.length, live: 0, unreachable: 0, no_link: 0, external: 0 };
  for (const a of apps) {
    if (a.state === 'live') s.live += 1;
    else if (a.state === 'unreachable') s.unreachable += 1;
    else if (a.state === 'no-link') s.no_link += 1;
    else if (a.state === 'external-no-link') s.external += 1;
  }
  return s;
}

function buildScoreboard(apps, generatedAtIso, baseUrl) {
  const summary = summarize(apps);
  return {
    schema: 'biome-app-completion/v1',
    generated_at: generatedAtIso,
    credit_free: true,
    base_url: baseUrl || '',
    overall: apps.length === 0 ? 'pending' : summary.unreachable + summary.no_link > 0 ? 'incomplete' : 'all-testable-live',
    summary,
    apps: apps.slice().sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function badge(state) {
  return { live: '🟢', unreachable: '🔴', 'no-link': '🟠', 'external-no-link': '⚪' }[state] || '⚪';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderScoreboardHtml(sb) {
  const rows = sb.apps
    .map((a) => {
      const link = a.url ? `<a href="${escapeHtml(a.url)}">${escapeHtml(a.url)}</a>` : '<em>— none —</em>';
      return `      <tr><td>${badge(a.state)} <strong>${escapeHtml(a.name)}</strong></td><td>${escapeHtml(a.state)}</td><td>${a.http_status ?? ''}</td><td>${link}</td></tr>`;
    })
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BIOME — App Completion</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem; color: #0f172a; background: #f8fafc; }
    .overall { font-size: 1.1rem; padding: .5rem .9rem; border-radius: 10px; display: inline-block; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    table { border-collapse: collapse; margin-top: 1rem; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); width: 100%; }
    th, td { text-align: left; padding: .6rem .8rem; border-bottom: 1px solid #e2e8f0; font-size: .9rem; }
    th { background: #0ea5e9; color: #fff; }
    .meta { color: #64748b; font-size: .8rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>🔬 BIOME — App Completion</h1>
  <p class="overall">Overall: <strong>${escapeHtml(sb.overall)}</strong> · ${sb.summary.live}/${sb.summary.total} testable-live · ${sb.summary.unreachable} unreachable · ${sb.summary.no_link} no link</p>
  <table>
    <thead><tr><th>App</th><th>State</th><th>HTTP</th><th>Live URL</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="meta">Generated ${escapeHtml(sb.generated_at)} · schema ${escapeHtml(sb.schema)} · machine feed: <code>app-completion.json</code></p>
</body>
</html>
`;
}

function buildWorklistBody(apps, generatedAtIso) {
  const incomplete = apps.filter(isIncomplete);
  const lines = [
    WORKLIST_MARKER,
    '## 🔬 BIOME Inspector — projects not testable-live',
    '',
    `**Detected:** ${generatedAtIso}  `,
    '**Rule:** DEFINITION_OF_DONE #1 — "every deliverable ships a live Vercel deployment; no live URL = not done."  ',
    '**Lane:** credit-free rule-based (HTTP check + GITHUB_TOKEN only)',
    '',
    `${incomplete.length} project(s) need finishing:`,
    '',
  ];
  for (const a of incomplete) {
    if (a.state === 'no-link') {
      lines.push(`- **${a.name}** — 🟠 no live URL could be derived. Set \`deployment.base_url\` in \`docs/app-deployments.yml\` (or give the app an explicit \`live_url\`).`);
    } else {
      lines.push(`- **${a.name}** — 🔴 live URL ${a.url} returns \`${a.http_status}\`; deploy/fix the page so it serves 2xx.`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('_Auto-resolves when every project is testable-live. Full board: `docs/biome/app-completion.json`._');
  return lines.join('\n');
}

module.exports = {
  WORKLIST_MARKER,
  isExternal,
  deriveLiveUrl,
  classifyApp,
  isIncomplete,
  summarize,
  buildScoreboard,
  renderScoreboardHtml,
  buildWorklistBody,
};

// --- CLI -------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    const fs = require('fs');
    const path = require('path');
    const YAML = require('yaml');
    const { repoApi } = require('./gh');

    const generatedAt = new Date().toISOString();
    const manifest = YAML.parse(fs.readFileSync(path.join(process.cwd(), 'docs', 'app-deployments.yml'), 'utf8')) || {};
    const baseUrl = (manifest.deployment && manifest.deployment.base_url) || '';
    const appsManifest = manifest.apps || {};

    async function attempt(url, method) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'biome-inspector' } });
        return res.status;
      } finally {
        clearTimeout(timer);
      }
    }

    async function checkUrl(url) {
      if (!url) return undefined;
      // HEAD first to avoid downloading full pages every 6h; fall back to GET
      // when HEAD is unsupported (405/501) or errors.
      try {
        const head = await attempt(url, 'HEAD');
        // Fall back to GET on any non-2xx HEAD — some hosts answer HEAD with
        // 4xx/5xx (405/501/403/404…) yet serve the page fine via GET, and we
        // don't want to falsely mark a reachable app unreachable.
        if (head < 200 || head >= 300) return await attempt(url, 'GET');
        return head;
      } catch {
        try {
          return await attempt(url, 'GET');
        } catch {
          return 0; // network error / timeout => unreachable
        }
      }
    }

    const results = [];
    for (const [name, meta] of Object.entries(appsManifest)) {
      const url = deriveLiveUrl(name, meta, baseUrl);
      const status = await checkUrl(url);
      results.push(classifyApp({ name, url, status, external: isExternal(meta) }));
    }

    const scoreboard = buildScoreboard(results, generatedAt, baseUrl);
    const outDir = path.join(process.cwd(), 'docs', 'biome');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'app-completion.json'), `${JSON.stringify(scoreboard, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'app-completion.html'), renderScoreboardHtml(scoreboard));
    console.log(`[biome-inspector] ${scoreboard.summary.live}/${scoreboard.summary.total} testable-live · ${scoreboard.summary.unreachable} unreachable · ${scoreboard.summary.no_link} no-link`);

    // Worklist: upsert/resolve a single deduped issue.
    const search = await repoApi('/issues?state=open&labels=biome,dod-gap&per_page=50', { allowError: true });
    const existing = Array.isArray(search)
      ? search.find((i) => !i.pull_request && (i.body || '').includes(WORKLIST_MARKER))
      : null;
    const incomplete = results.filter(isIncomplete);

    if (incomplete.length === 0) {
      if (existing) {
        await repoApi(`/issues/${existing.number}/comments`, { method: 'POST', body: { body: `${WORKLIST_MARKER}\n✅ All projects testable-live as of ${generatedAt}. Resolving.` }, allowError: true });
        await repoApi(`/issues/${existing.number}`, { method: 'PATCH', body: { state: 'closed' }, allowError: true });
        console.log(`[biome-inspector] resolved worklist #${existing.number}`);
      } else {
        console.log('[biome-inspector] all projects testable-live — no worklist.');
      }
      return;
    }

    const body = buildWorklistBody(results, generatedAt);
    if (existing) {
      await repoApi(`/issues/${existing.number}/comments`, { method: 'POST', body: { body }, allowError: true });
      console.log(`[biome-inspector] refreshed worklist #${existing.number} (${incomplete.length} incomplete)`);
    } else {
      const created = await repoApi('/issues', {
        method: 'POST',
        body: { title: `[BIOME-INSPECTOR] ${incomplete.length} project(s) not testable-live`, body, labels: ['biome', 'dod-gap', 'self-heal'] },
      });
      console.log(`[biome-inspector] filed worklist #${created && created.number}`);
    }
  })().catch((err) => {
    console.error(`[biome-inspector] error: ${err.message}`);
    process.exit(1);
  });
}

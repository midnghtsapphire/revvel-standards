#!/usr/bin/env node
'use strict';

/**
 * MergeMe.dev wiring auditor for revvel-standards.
 *
 * Answer to WR #16824 ("MERGEME.DEV IS THIS WIRED INTO REVVEL-STANDARDS?"):
 * this module is the machine-checkable SSOT for "wired". A connection is
 * considered wired only when the repo-side surfaces below are present and
 * consistent — not merely because a human installed the GitHub App once.
 *
 * Pure functions are exported for tests and the product UI. The CLI
 * (`node scripts/mergeme-wiring.js`) prints a JSON report and exits 0 only
 * when every required surface is present (exit 1 = not fully wired).
 *
 * Why no MERGEME_API_KEY: MergeMe is a marketplace GitHub App + Slack OAuth
 * product (https://mergeme.dev). Wiring is install + map + document, not a
 * secret in this repo. Optional SLACK channel mapping is recorded in docs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** Known MergeMe GitHub App / bot login patterns (marketplace slug + variants). */
const MERGEME_APP_SLUGS = ['mergeme-app', 'mergeme', 'merge-me'];
const MERGEME_BOT_LOGINS = ['mergeme-app[bot]', 'mergeme[bot]', 'merge-me[bot]'];

/** Required repo surfaces that prove MergeMe is wired into revvel-standards. */
const REQUIRED_SURFACES = [
  {
    id: 'connections-registry',
    label: 'Connections registry entry',
    path: 'config/connections.yml',
    check: (root) => {
      const p = path.join(root, 'config/connections.yml');
      if (!fs.existsSync(p)) return { ok: false, detail: 'config/connections.yml missing' };
      const text = fs.readFileSync(p, 'utf8');
      const hasId = /^\s*-\s*id:\s*mergeme\s*$/m.test(text);
      return hasId
        ? { ok: true, detail: 'id: mergeme present in config/connections.yml' }
        : { ok: false, detail: 'id: mergeme missing from config/connections.yml' };
    },
  },
  {
    id: 'integration-doc',
    label: 'Integration documentation',
    path: 'docs/MERGEME_INTEGRATION.md',
    check: (root) => fileExists(root, 'docs/MERGEME_INTEGRATION.md', /mergeme\.dev/i),
  },
  {
    id: 'status-workflow',
    label: 'Status workflow',
    path: '.github/workflows/mergeme-status.yml',
    check: (root) => fileExists(root, '.github/workflows/mergeme-status.yml', /mergeme/i),
  },
  {
    id: 'status-product',
    label: 'Status product app',
    path: 'products/mergeme-status',
    check: (root) => {
      const pkg = path.join(root, 'products/mergeme-status/package.json');
      const page = path.join(root, 'products/mergeme-status/app/page.tsx');
      if (!fs.existsSync(pkg) || !fs.existsSync(page)) {
        return { ok: false, detail: 'products/mergeme-status app files missing' };
      }
      return { ok: true, detail: 'products/mergeme-status package + page present' };
    },
  },
  {
    id: 'live-docs-page',
    label: 'Live docs test page',
    path: 'docs/mergeme-status/index.html',
    check: (root) => fileExists(root, 'docs/mergeme-status/index.html', /mergeme/i),
  },
  {
    id: 'root-tests',
    label: 'Root regression tests',
    path: 'tests/mergeme-wiring.test.js',
    check: (root) => fileExists(root, 'tests/mergeme-wiring.test.js', /mergeme/i),
  },
  {
    id: 'agents-port',
    label: 'AGENTS.md port assignment',
    path: 'AGENTS.md',
    check: (root) => {
      const p = path.join(root, 'AGENTS.md');
      if (!fs.existsSync(p)) return { ok: false, detail: 'AGENTS.md missing' };
      const text = fs.readFileSync(p, 'utf8');
      const ok = /mergeme-status/i.test(text) && /3012/.test(text);
      return ok
        ? { ok: true, detail: 'mergeme-status listed on port 3012 in AGENTS.md' }
        : { ok: false, detail: 'mergeme-status / port 3012 missing from AGENTS.md' };
    },
  },
  {
    id: 'app-registry',
    label: 'APP_REGISTRY catalog entry',
    path: 'docs/APP_REGISTRY.md',
    check: (root) => {
      const p = path.join(root, 'docs/APP_REGISTRY.md');
      if (!fs.existsSync(p)) return { ok: false, detail: 'docs/APP_REGISTRY.md missing' };
      const text = fs.readFileSync(p, 'utf8');
      const ok = /products\/mergeme-status/.test(text);
      return ok
        ? { ok: true, detail: 'products/mergeme-status listed in APP_REGISTRY.md' }
        : { ok: false, detail: 'products/mergeme-status missing from APP_REGISTRY.md' };
    },
  },
];

function fileExists(root, rel, contentRe) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return { ok: false, detail: `${rel} missing` };
  if (contentRe) {
    const text = fs.readFileSync(p, 'utf8');
    if (!contentRe.test(text)) {
      return { ok: false, detail: `${rel} exists but does not mention expected content` };
    }
  }
  return { ok: true, detail: `${rel} present` };
}

/**
 * Audit repo-side MergeMe wiring surfaces.
 * @param {string} [root=ROOT]
 * @returns {{ wired: boolean, score: string, surfaces: Array<object>, summary: string }}
 */
function auditWiring(root = ROOT) {
  const surfaces = REQUIRED_SURFACES.map((s) => {
    const result = s.check(root);
    return {
      id: s.id,
      label: s.label,
      path: s.path,
      ok: Boolean(result.ok),
      detail: result.detail || '',
    };
  });
  const passed = surfaces.filter((s) => s.ok).length;
  const total = surfaces.length;
  const wired = passed === total;
  const summary = wired
    ? `MergeMe.dev IS wired into revvel-standards (${passed}/${total} surfaces).`
    : `MergeMe.dev is NOT fully wired into revvel-standards (${passed}/${total} surfaces).`;
  return {
    wired,
    score: `${passed}/${total}`,
    passed,
    total,
    surfaces,
    summary,
    product: 'mergeme.dev',
    repo: 'midnghtsapphire/revvel-standards',
    docs: 'docs/MERGEME_INTEGRATION.md',
    app: 'products/mergeme-status',
    marketplace: 'https://github.com/marketplace/mergeme-app',
    site: 'https://mergeme.dev',
    checked_at: new Date().toISOString(),
  };
}

/**
 * Classify a GitHub App installation payload as MergeMe or not.
 * Used by the status workflow when listing repo installations.
 * @param {{ app_slug?: string, app_id?: number, account?: object }} installation
 */
function isMergeMeInstallation(installation) {
  if (!installation || typeof installation !== 'object') return false;
  const slug = String(installation.app_slug || installation.slug || '').toLowerCase();
  if (MERGEME_APP_SLUGS.includes(slug)) return true;
  const name = String(installation.app_name || installation.name || '').toLowerCase();
  return name.includes('mergeme') || name.includes('merge me') || name === 'merge-me';
}

/**
 * Classify a GitHub actor login as the MergeMe bot.
 * @param {string} login
 */
function isMergeMeBotLogin(login) {
  if (!login) return false;
  const normalized = String(login).toLowerCase();
  if (MERGEME_BOT_LOGINS.includes(normalized)) return true;
  return normalized.includes('mergeme') && normalized.includes('[bot]');
}

/**
 * Build a human-readable markdown status report for PR/issue comments.
 * @param {ReturnType<typeof auditWiring>} report
 */
function renderMarkdownReport(report) {
  const lines = [];
  lines.push('## MergeMe.dev wiring status');
  lines.push('');
  lines.push(report.wired ? '**Answer: YES — wired.**' : '**Answer: NO — not fully wired.**');
  lines.push('');
  lines.push(`Score: **${report.score}** · checked \`${report.checked_at}\``);
  lines.push('');
  lines.push('| Surface | Status | Detail |');
  lines.push('| --- | :---: | --- |');
  for (const s of report.surfaces) {
    lines.push(`| ${s.label} (\`${s.path}\`) | ${s.ok ? '✅' : '❌'} | ${s.detail} |`);
  }
  lines.push('');
  lines.push(`Product UI: \`${report.app}\` · Docs: \`${report.docs}\``);
  lines.push('');
  lines.push(`Site: ${report.site}`);
  lines.push(`Marketplace: ${report.marketplace}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Setup steps a human must complete outside the repo (GitHub App + Slack).
 * These are intentionally not "code surfaces" — they require owner OAuth.
 */
function externalSetupSteps() {
  return [
    {
      id: 'install-github-app',
      title: 'Install MergeMe GitHub App on the org/repo',
      href: 'https://github.com/marketplace/mergeme-app',
      detail:
        'GitHub → marketplace → MergeMe App → Install → select midnghtsapphire/revvel-standards (or the whole org).',
    },
    {
      id: 'connect-slack',
      title: 'Connect Slack workspace at mergeme.dev',
      href: 'https://mergeme.dev',
      detail: 'Sign in at mergeme.dev, authorize Slack, pick the workspace that receives PR cards.',
    },
    {
      id: 'map-repo-channel',
      title: 'Map revvel-standards → Slack channel',
      href: 'https://mergeme.dev',
      detail:
        'In MergeMe dashboard: map midnghtsapphire/revvel-standards to the target channel (e.g. #revvel-prs).',
    },
    {
      id: 'map-users',
      title: 'Map GitHub users → Slack users',
      href: 'https://mergeme.dev',
      detail: 'Map @mentions so review pings land on real Slack users (Hobby plan: limited seats).',
    },
    {
      id: 'verify-card',
      title: 'Open a test PR and confirm one updating Slack card',
      href: 'https://mergeme.dev',
      detail:
        'Open/sync a PR; Slack should show one card that edits in place (not a flood of messages).',
    },
  ];
}

function main() {
  const report = auditWiring(ROOT);
  let outPath = null;
  if (process.argv.includes('--out')) {
    const raw = process.argv[process.argv.indexOf('--out') + 1];
    if (!raw || raw.startsWith('-')) {
      console.error('mergeme-wiring: --out requires a file path argument');
      process.exitCode = 2;
      return;
    }
    outPath = raw;
  }
  const json = JSON.stringify(report, null, 2);
  if (outPath) {
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, json + '\n', 'utf8');
  }
  if (process.argv.includes('--markdown')) {
    process.stdout.write(renderMarkdownReport(report));
  } else {
    process.stdout.write(json + '\n');
  }
  process.exitCode = report.wired ? 0 : 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  REQUIRED_SURFACES,
  MERGEME_APP_SLUGS,
  MERGEME_BOT_LOGINS,
  auditWiring,
  isMergeMeInstallation,
  isMergeMeBotLogin,
  renderMarkdownReport,
  externalSetupSteps,
};

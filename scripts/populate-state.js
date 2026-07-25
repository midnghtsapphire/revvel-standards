#!/usr/bin/env node
/**
 * populate-state.js
 *
 * Regenerates state.json from dashboard-data.json so automation has a
 * machine-readable view of the portfolio. Prior to the activation sprint,
 * state.json was `{}` and no automation could make decisions from it.
 *
 * Usage:
 *   node scripts/populate-state.js           # writes state.json
 *   node scripts/populate-state.js --check   # exits non-zero if stale
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD_PATH = path.join(ROOT, 'dashboard-data.json');
const STATE_PATH = path.join(ROOT, 'state.json');

function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function buildState(dashboard) {
  const projects = Array.isArray(dashboard && dashboard.projects)
    ? dashboard.projects
    : Array.isArray(dashboard)
      ? dashboard
      : [];

  const statusBreakdown = {};
  const domains = new Set();
  const urls = new Set();
  let revenueSignalCount = 0;

  for (const p of projects) {
    if (!p || typeof p !== 'object') continue;
    const status = String(p.status || 'unknown').toLowerCase();
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

    if (p.url) {
      urls.add(String(p.url));
      try {
        const host = new URL(String(p.url)).hostname.replace(/^www\./, '');
        if (host) domains.add(host);
      } catch (_) { /* ignore malformed */ }
    }
    if (p.domain) domains.add(String(p.domain).replace(/^www\./, ''));

    const hasRevenue =
      (typeof p.revenue === 'number' && p.revenue > 0) ||
      (typeof p.mrr === 'number' && p.mrr > 0) ||
      p.revenue_signal === true ||
      (typeof p.revenue_signal === 'string' && p.revenue_signal.length > 0) ||
      (Array.isArray(p.revenue_streams) && p.revenue_streams.length > 0);
    if (hasRevenue) revenueSignalCount += 1;
  }

  return {
    generated_at: new Date().toISOString(),
    source: 'dashboard-data.json',
    projects: {
      total: projects.length,
      status_breakdown: statusBreakdown,
      with_revenue_signal: revenueSignalCount,
    },
    surface: {
      urls: urls.size,
      domains: domains.size,
    },
    prime_directive: '$10k/month -> $10M in 3 years',
    gate: 'REVENUE_GATE.md',
  };
}

function stableStringify(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');

  const dashboard = readJsonSafe(DASHBOARD_PATH, { projects: [] });
  const next = buildState(dashboard);

  if (checkMode) {
    const current = readJsonSafe(STATE_PATH, {});
    // Compare everything except generated_at
    const { generated_at: _a, ...nextRest } = next;
    const { generated_at: _b, ...currentRest } = current || {};
    const same = JSON.stringify(nextRest) === JSON.stringify(currentRest);
    if (!same) {
      process.stderr.write('state.json is stale. Run: node scripts/populate-state.js\n');
      process.exit(1);
    }
    if (!currentRest || Object.keys(currentRest).length === 0) {
      process.stderr.write('state.json is empty. Run: node scripts/populate-state.js\n');
      process.exit(1);
    }
    process.stdout.write('state.json is fresh.\n');
    return;
  }

  fs.writeFileSync(STATE_PATH, stableStringify(next));
  process.stdout.write(`Wrote ${STATE_PATH}\n`);
}

if (require.main === module) {
  main();
}

module.exports = { buildState };

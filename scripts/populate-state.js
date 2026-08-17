#!/usr/bin/env node
/**
 * populate-state.js — derive machine-readable state.json from
 * dashboard-data.json (audit finding: state.json was `{}`, so automation
 * that reads it could never make decisions).
 *
 * Usage: node scripts/populate-state.js          # writes state.json
 *        node scripts/populate-state.js --check  # exit 1 if state.json is stale
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DASHBOARD = path.join(REPO_ROOT, 'dashboard-data.json');
const STATE = path.join(REPO_ROOT, 'state.json');

/** Pure: dashboard-data.json object -> state.json object. */
function buildState(dashboard) {
  const projects = Array.isArray(dashboard.projects) ? dashboard.projects : [];
  const statuses = {};
  for (const p of projects) {
    const s = (p.status || 'unknown').toLowerCase();
    statuses[s] = (statuses[s] || 0) + 1;
  }
  const withRevenue = projects.filter(
    (p) => typeof p.revenue === 'string' && /\$\s*[1-9]/.test(p.revenue)
  );
  return {
    schema: 1,
    source: 'dashboard-data.json',
    lastUpdated: dashboard.lastUpdated || null,
    projects: {
      total: projects.length,
      byStatus: statuses,
      withRevenueSignal: withRevenue.map((p) => p.name),
    },
    urls: Array.isArray(dashboard.urls) ? dashboard.urls.length : 0,
    domains: Array.isArray(dashboard.domains) ? dashboard.domains.length : 0,
    systemState: Array.isArray(dashboard.projectStatus)
      ? dashboard.projectStatus.filter((s) => s.hasSystemState).length
      : 0,
  };
}

module.exports = { buildState };

if (require.main === module) {
  const dashboard = JSON.parse(fs.readFileSync(DASHBOARD, 'utf8'));
  const next = JSON.stringify(buildState(dashboard), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(STATE) ? fs.readFileSync(STATE, 'utf8') : '';
    if (current !== next) {
      console.error('state.json is stale — run: node scripts/populate-state.js');
      process.exit(1);
    }
    console.log('state.json is current.');
  } else {
    fs.writeFileSync(STATE, next);
    console.log(`state.json written (${next.length} bytes).`);
  }
}

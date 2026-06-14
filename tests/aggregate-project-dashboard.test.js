'use strict';

/**
 * Test suite for Project Dashboard Aggregator
 */

const assert = require('assert');
const {
  parseInventory,
  parseBOM,
  parseProjectsToShip,
  parseProjectCatalog,
} = require('../scripts/aggregate-project-dashboard.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${error.message}`);
    return false;
  }
}

// Test: parseInventory
if (test('parseInventory parses service tables from real inventory format', () => {
  const content = `
| Service | What It Does | Provider | Free Tier | Cost | Trigger | Status | Used By |
|---|---|---|---|---|---|---|---|
| OpenRouter | Routes LLM requests | OpenRouter | No | $5-50/mo | Budget | ✅ Active | All projects |
`;
  const result = parseInventory(content);
  assert(result.services.length >= 1);
  assert(result.services[0].name === 'OpenRouter');
  assert(result.services[0].status === '✅ Active');
  assert(result.services[0].usedBy === 'All projects');
})) passed++; else failed++;

if (test('parseInventory handles empty content', () => {
  const result = parseInventory('');
  assert(result.services.length === 0);
})) passed++; else failed++;

// Test: parseBOM
if (test('parseBOM parses BOM items', () => {
  const content = `
## Required

| Item | Type | Provider | Status |
|---|---|---|---|
| Stripe account | account | Stripe | ✅ on hand |
| Domain | infra | DigitalOcean | ⬜ needed |
`;
  const result = parseBOM(content);
  assert(result.items.length >= 2);
  assert(result.items[0].name === 'Stripe account');
})) passed++; else failed++;

// Test: parseProjectsToShip
if (test('parseProjectsToShip parses project tables', () => {
  const content = `
## Projects

| Project | Type | Revenue Target | Status |
|---|---|---|---|
| Vine review optimization | Existing | $5K/month | Expand |
| Product rental | New | $2K/month | Launch |
`;
  const result = parseProjectsToShip(content);
  assert(result.length >= 2);
  assert(result[0].name === 'Vine review optimization');
  assert(result[0].status === 'Existing');
  assert(result[0].revenue === '$5K/month');
})) passed++; else failed++;

// Test: parseProjectCatalog
if (test('parseProjectCatalog parses project catalog', () => {
  const content = `
## Applications

| Repository | Status | Description | Link |
|---|---|---|---|
| **Soul2Bowl** | In Development | Catering platform | [Soul2Bowl](https://github.com/MIDNGHTSAPPHIRE/Soul2Bowl) |
| **Pawsitting** | Deployed | Pet sitting app | [Pawsitting](https://github.com/MIDNGHTSAPPHIRE/Pawsitting) |
`;
  const result = parseProjectCatalog(content);
  assert(result.length >= 2);
  assert(result[0].name === 'Soul2Bowl');
  assert(result[0].status === 'In Development');
  assert(result[0].link === 'https://github.com/MIDNGHTSAPPHIRE/Soul2Bowl');
})) passed++; else failed++;

if (test('parseProjectCatalog handles rows without markdown links', () => {
  const content = `
## Applications

| Repository | Status | Description | Link |
|---|---|---|---|
| **SampleApp** | Active | Test description | N/A |
`;
  const result = parseProjectCatalog(content);
  assert(result.length >= 1);
  assert(result[0].name === 'SampleApp');
})) passed++; else failed++;

// Test: Integration - full dashboard generation
if (test('Dashboard generation runs without errors', () => {
  const { execSync } = require('child_process');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');
  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

  // Write to a temp dir, not the repo root, so a plain `npm test` never rewrites
  // the committed dashboard (WR #14544). The script honors DASHBOARD_OUT_DIR.
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-test-'));
  try {
    // Run the aggregator
    execSync('node scripts/aggregate-project-dashboard.js', {
      cwd: repoRoot,
      stdio: 'pipe',
      env: { ...process.env, DASHBOARD_OUT_DIR: outDir },
    });
    // Check that output files exist
    const dashboardPath = path.join(outDir, 'dashboard.html');
    const dataPath = path.join(outDir, 'dashboard-data.json');
    
    assert(fs.existsSync(dashboardPath));
    assert(fs.existsSync(dataPath));
    
    // Check that data file is valid JSON
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    assert(data.projects);
    assert(data.urls);
    assert(data.domains);
    assert(data.lastUpdated);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
})) passed++; else failed++;

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

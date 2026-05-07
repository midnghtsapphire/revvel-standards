#!/usr/bin/env node
'use strict';

/**
 * Validates that all GitHub Actions workflow YAML files parse correctly
 * and have required top-level keys.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '.github', 'workflows');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// Dynamically test every .yml file in .github/workflows/
const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));

for (const file of files) {
  const filePath = path.join(WORKFLOWS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  test(`${file} — parses as valid YAML`, () => {
    yaml.parse(content);
  });

  test(`${file} — has 'name' key`, () => {
    const doc = yaml.parse(content);
    if (!doc.name) throw new Error(`Missing 'name' key`);
  });

  test(`${file} — has 'on' trigger`, () => {
    const doc = yaml.parse(content);
    if (!doc.on && !doc.true) throw new Error(`Missing 'on' trigger`);
  });
}

test('At least 20 workflow files exist', () => {
  if (files.length < 20) {
    throw new Error(`Expected 20+ workflows, found ${files.length}`);
  }
});

test('openrouter-assignee.yml uses openrouter label as routing idempotency key', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'openrouter-assignee.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const routeNewCheck = doc.jobs['route-new'].steps.find(
    (step) => step.name === 'Check if already routed'
  );
  const discover = doc.jobs['ralph-cron-sweep'].steps.find(
    (step) => step.name === 'Discover unrouted open issues and PRs'
  );

  if (!routeNewCheck || !discover) throw new Error('Required steps not found');

  const routeCheckScript = routeNewCheck.with?.script || '';
  const discoverScript = discover.with?.script || '';

  if (routeCheckScript.includes('assignees.length > 0')) {
    throw new Error('route-new check still uses assignee-based skip');
  }
  if (discoverScript.includes('assignees.length > 0')) {
    throw new Error('cron discover still uses assignee-based skip');
  }
  if (!routeCheckScript.includes("labels.includes('openrouter')")) {
    throw new Error('route-new check is missing openrouter label gate');
  }
  if (!discoverScript.includes("labels.includes('openrouter')")) {
    throw new Error('cron discover is missing openrouter label gate');
  }
});

test('openrouter-assignee.yml applies labels before non-fatal Copilot assignment', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'openrouter-assignee.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));

  const routeNewSteps = doc.jobs['route-new'].steps;
  const labelsIndex = routeNewSteps.findIndex((step) => step.name === 'Apply routing labels');
  const assignIndex = routeNewSteps.findIndex((step) => step.name === 'Assign to Copilot orchestrator');
  if (labelsIndex < 0 || assignIndex < 0 || labelsIndex > assignIndex) {
    throw new Error('route-new step order must be labels before assignment');
  }

  const routeNewAssign = routeNewSteps[assignIndex];
  const routeNewAssignScript = routeNewAssign.with?.script || '';
  if (!routeNewAssignScript.includes('try {') || !routeNewAssignScript.includes('non-fatal')) {
    throw new Error('route-new assignment is not wrapped as non-fatal');
  }

  const routeDiscovered = doc.jobs['ralph-cron-sweep'].steps.find(
    (step) => step.name === 'Route discovered items'
  );
  if (!routeDiscovered) throw new Error('Route discovered items step not found');

  const routeDiscoveredScript = routeDiscovered.with?.script || '';
  const labelsPos = routeDiscoveredScript.indexOf('addLabels');
  const assignPos = routeDiscoveredScript.indexOf('addAssignees');
  if (labelsPos < 0 || assignPos < 0 || labelsPos > assignPos) {
    throw new Error('cron routing must apply labels before assignment');
  }
  if (!routeDiscoveredScript.includes('Could not assign @Copilot (non-fatal)')) {
    throw new Error('cron assignment should log non-fatal notice');
  }
  if (routeDiscoveredScript.includes('process.env.TO_ROUTE_JSON')) {
    throw new Error('cron routing must not depend on TO_ROUTE_JSON env payload');
  }
  if ((routeDiscovered.env || {}).TO_ROUTE_JSON) {
    throw new Error('Route discovered items step should not define TO_ROUTE_JSON env');
  }
  if (!routeDiscoveredScript.includes('github.paginate(github.rest.issues.listForRepo,')) {
    throw new Error('cron routing should recompute candidates from GitHub API pagination');
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

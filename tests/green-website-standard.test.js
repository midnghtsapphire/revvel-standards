#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const root = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.message}`);
    failed++;
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function parseWorkflow(relativePath) {
  return YAML.parse(read(relativePath));
}

function assertGreenWorkflow(relativePath, { requiresFixedDefaultUrl }) {
  const content = read(relativePath);
  const doc = parseWorkflow(relativePath);
  const on = doc.on || doc.true;
  const job = doc.jobs['green-website'];
  const steps = job.steps || [];
  const actionStep = steps.find((step) => step.name === 'green-website');
  const artifactStep = steps.find((step) => step.name === 'Upload carbon artifact');
  const commitStep = steps.find((step) => step.name === 'Commit green website report');
  const resolveStep = steps.find((step) => step.name === 'Resolve target URL');
  const markerStep = steps.find((step) => step.name === 'Verify README carbon marker');

  if (doc.name !== 'Website green-o-meter') {
    throw new Error(`${relativePath} must use the standard workflow name`);
  }
  // COST FREEZE 2026-08-21: the weekly schedule is commented out in place
  // (RVS-AGENT-001), not deleted. See tests/no-scheduled-workflows.test.js.
  if (!on.workflow_dispatch) {
    throw new Error(`${relativePath} must support workflow_dispatch`);
  }
  // Only the live workflow bills us. templates/ is copied into other repos and
  // keeps its schedule so a downstream copy still runs weekly.
  const isLive = relativePath.startsWith('.github/workflows/');
  if (isLive && on.schedule) {
    throw new Error(`${relativePath} schedule must stay frozen (cost freeze)`);
  }
  if (isLive && !/^\s*#\s*schedule:/m.test(content)) {
    throw new Error(`${relativePath} must keep its frozen schedule commented in place`);
  }
  if (!isLive && !on.schedule) {
    throw new Error(`${relativePath} is a template and must keep a weekly schedule`);
  }
  if (doc.permissions?.contents !== 'write') {
    throw new Error(`${relativePath} must grant contents: write for generated report commits`);
  }
  if (!job || job['timeout-minutes'] !== 15) {
    throw new Error(`${relativePath} must define green-website job with timeout-minutes: 15`);
  }
  if (!String(job.if || '').includes('docs: update green website report')) {
    throw new Error(`${relativePath} must skip its own generated report commits`);
  }
  if (!actionStep || actionStep.uses !== 'actions/github-script@v9.0.0') {
    throw new Error(`${relativePath} must collect Website Carbon data with actions/github-script@v9.0.0`);
  }
  if (actionStep.env?.URL !== '${{ steps.target.outputs.url }}') {
    throw new Error(`${relativePath} must pass the resolved target URL to the green-website step`);
  }
  if (!String(actionStep.with?.script || '').includes('api.websitecarbon.com/site?url=')) {
    throw new Error(`${relativePath} must fetch Website Carbon data`);
  }
  if (!String(actionStep.with?.script || '').includes("fs.writeFileSync(carbonPath")) {
    throw new Error(`${relativePath} must write the carbon data file`);
  }
  if (!artifactStep || artifactStep.uses !== 'actions/upload-artifact@v7') {
    throw new Error(`${relativePath} must upload the carbon artifact with actions/upload-artifact@v7`);
  }
  if (artifactStep.with?.name !== 'carbon' || artifactStep.with?.path !== 'carbon') {
    throw new Error(`${relativePath} must upload the generated carbon file as the carbon artifact`);
  }
  if (!resolveStep || !JSON.stringify(resolveStep).includes('GREEN_WEBSITE_URL')) {
    throw new Error(`${relativePath} must resolve vars.GREEN_WEBSITE_URL`);
  }
  if (!markerStep || !String(markerStep.run || '').includes('<!-- CARBON-STATS -->')) {
    throw new Error(`${relativePath} must guard against missing README carbon marker`);
  }
  if (!commitStep || !String(commitStep.run || '').includes('git add README.md carbon')) {
    throw new Error(`${relativePath} must commit README.md and carbon data`);
  }
  if (!String(commitStep.run || '').includes('git diff --cached --quiet')) {
    throw new Error(`${relativePath} must avoid empty report commits`);
  }
  if (!content.includes('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24')) {
    throw new Error(`${relativePath} must include the repo-standard JavaScript action runtime env`);
  }
  if (requiresFixedDefaultUrl && !content.includes('https://midnghtsapphire.github.io/revvel-standards/')) {
    throw new Error(`${relativePath} must default to the revvel-standards GitHub Pages URL`);
  }
}

test('active green website workflow follows Revvel contract', () => {
  assertGreenWorkflow('.github/workflows/green-website.yml', { requiresFixedDefaultUrl: true });
});

test('portable green website template follows Revvel contract', () => {
  assertGreenWorkflow('templates/cicd/green-website.yml', { requiresFixedDefaultUrl: false });
  const content = read('templates/cicd/green-website.yml');
  if (!content.includes('https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}/')) {
    throw new Error('template must default to the consuming repo GitHub Pages URL');
  }
});

test('README exposes carbon card insertion point or generated card', () => {
  const readme = read('README.md');
  if (
    !readme.includes('<!-- CARBON-STATS -->') &&
    !readme.includes('![carbon consumption of this project](https://green-action.vercel.app/api/card?p=')
  ) {
    throw new Error('README.md must contain the green-action marker or generated card');
  }
  if (!readme.includes('standards/GREEN_WEBSITE_REPORTING_STANDARD.md')) {
    throw new Error('README.md must link the green website reporting standard');
  }
});

test('standard documents action, marker, URL override, and verification', () => {
  const standard = read('standards/GREEN_WEBSITE_REPORTING_STANDARD.md');
  for (const required of [
    'actions/github-script@v9.0.0',
    '<!-- CARBON-STATS -->',
    'GREEN_WEBSITE_URL',
    'templates/cicd/green-website.yml',
    'actions/upload-artifact',
    'node tests/green-website-standard.test.js',
  ]) {
    if (!standard.includes(required)) {
      throw new Error(`standard is missing ${required}`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

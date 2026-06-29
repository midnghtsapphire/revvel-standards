'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const workflowPath = path.join(REPO_ROOT, '.github', 'workflows', 'agent-monitor.yml');
const labelsPath = path.join(REPO_ROOT, '.github', 'labels.yml');

test('agent-monitor create-failure-wr uses labels that exist in labels.yml', () => {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const labelsDoc = yaml.parse(fs.readFileSync(labelsPath, 'utf8'));
  const knownLabels = new Set((labelsDoc.labels || []).map((label) => label.name));

  const match = workflow.match(/--label "([^"]+)"/);
  assert.ok(match, 'agent-monitor.yml must pass labels to gh issue create');

  const configuredLabels = match[1]
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);

  assert.ok(configuredLabels.length > 0, 'agent-monitor.yml must configure at least one label');
  for (const label of configuredLabels) {
    assert.ok(knownLabels.has(label), `agent-monitor.yml references missing label "${label}"`);
  }
});

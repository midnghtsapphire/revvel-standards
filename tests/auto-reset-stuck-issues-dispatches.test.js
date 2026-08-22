'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('auto-reset-stuck-issues.yml contains createWorkflowDispatch calls for both assignee and triage', () => {
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'auto-reset-stuck-issues.yml');
  const source = fs.readFileSync(workflowPath, 'utf8');

  // Verify that it contains calls to createWorkflowDispatch for both workflows
  assert.ok(source.includes("workflow_id: 'openrouter-assignee.yml'"), "Missing dispatch for openrouter-assignee.yml");
  assert.ok(source.includes("workflow_id: 'openrouter-triage.yml'"), "Missing dispatch for openrouter-triage.yml");
  assert.ok(source.includes("await github.rest.actions.createWorkflowDispatch"), "Missing createWorkflowDispatch API call");
});

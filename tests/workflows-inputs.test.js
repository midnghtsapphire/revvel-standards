const assert = require('assert');
const fs = require('fs');
const yaml = require('yaml');

async function testWorkflows() {
  const openrouterRaw = fs.readFileSync('.github/workflows/openrouter-assignee.yml', 'utf8');
  const openrouter = yaml.parse(openrouterRaw);
  assert.ok(openrouter.on.workflow_dispatch.inputs.issue_number, 'openrouter-assignee.yml must declare issue_number input');

  const wrPrRaw = fs.readFileSync('.github/workflows/wr-pr-creation.yml', 'utf8');
  const wrPr = yaml.parse(wrPrRaw);
  assert.ok(wrPr.on.workflow_dispatch.inputs.issue_number, 'wr-pr-creation.yml must declare issue_number input');

  const resetRaw = fs.readFileSync('.github/workflows/reset-self-heal-issue.yml', 'utf8');
  assert.ok(resetRaw.includes('success=true'), 'reset-self-heal-issue.yml must not blindly claim success');
}

// Ensure tests are picked up by the test runner properly using node:test
const { test } = require('node:test');

test('workflows inputs declare expected fields', async () => {
  await testWorkflows();
});

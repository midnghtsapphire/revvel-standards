'use strict';

// Regression for WR #16889 / automation-doctor invalid-workflow failure:
// apisec-scan.yml had two sibling `steps:` keys under jobs.archived (live APIsec
// steps + the REVVEL-DISABLED inert echo). YAML unique-key rules reject that,
// so automation-doctor reported Invalid: 1 and npm test failed with
// `invalid.length` 1 !== 0. The archived stub must keep a single steps block;
// the original body stays commented under REVVEL-DISABLED-BODY.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'apisec-scan.yml');
const source = fs.readFileSync(WORKFLOW, 'utf8');

test('apisec-scan.yml parses with unique keys', () => {
  const doc = YAML.parseDocument(source, { uniqueKeys: true });
  assert.deepStrictEqual(
    doc.errors.map((e) => e.message),
    [],
    'duplicate YAML keys (e.g. two steps: blocks) make GitHub and automation-doctor reject the workflow'
  );
});

test('apisec-scan.yml is an inert REVVEL-DISABLED archive stub', () => {
  const workflow = YAML.parse(source);

  assert.match(source, /REVVEL-DISABLED/);
  assert.ok(workflow.on.workflow_dispatch !== undefined);
  assert.ok(workflow.jobs.archived, 'archived job must exist');
  assert.equal(workflow.jobs.archived.if, false);
  assert.equal(workflow.jobs.archived['timeout-minutes'], 45);

  const steps = workflow.jobs.archived.steps;
  assert.ok(Array.isArray(steps), 'archived job must have exactly one steps list');
  assert.equal(steps.length, 1);
  assert.match(steps[0].run, /archived per RVS-AGENT-001/);
  assert.equal(steps[0].uses, undefined, 'archived stub must not invoke third-party actions');
});

test('live APIsec steps remain only in the commented REVVEL-DISABLED-BODY', () => {
  // Active (uncommented) body must not still call the vendor action; restore
  // path is uncommenting REVVEL-DISABLED-BODY after secrets are provisioned.
  const workflow = YAML.parse(source);
  const steps = workflow.jobs.archived.steps || [];
  for (const step of steps) {
    assert.doesNotMatch(
      String(step.uses || ''),
      /apisec-inc\/apisec-run-scan/,
      'vendor scan must stay commented until secrets are provisioned'
    );
  }
  assert.match(source, /REVVEL-DISABLED-BODY/);
  assert.match(source, /#\s*uses:\s*apisec-inc\/apisec-run-scan@/);
});

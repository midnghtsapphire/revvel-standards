'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  findInvalidWorkflows,
  listWorkflowFiles,
  heuristicError,
  workflowRunMissingWorkflows,
} = require('../scripts/check-workflow-yaml');

// ── listWorkflowFiles ────────────────────────────────────────────────────────

test('listWorkflowFiles returns an array', () => {
  const files = listWorkflowFiles();
  assert.ok(Array.isArray(files), 'should return an array');
});

test('listWorkflowFiles returns only .yml or .yaml files', () => {
  const files = listWorkflowFiles();
  assert.ok(files.length > 0, 'should find at least one workflow file');
  for (const f of files) {
    assert.ok(
      f.endsWith('.yml') || f.endsWith('.yaml'),
      `unexpected extension in: ${f}`
    );
  }
});

test('listWorkflowFiles returns absolute paths', () => {
  const files = listWorkflowFiles();
  for (const f of files) {
    assert.ok(f.startsWith('/'), `expected absolute path, got: ${f}`);
  }
});

// ── findInvalidWorkflows ────────────────────────────────────────────────────

test('findInvalidWorkflows returns an array with the expected entry shape', () => {
  // This checks the function runs without crashing and that any results
  // have the expected {file, error} shape (per AGENTS.md, one pre-existing
  // broken workflow is a known fixture, so we don't assert length === 0).
  const bad = findInvalidWorkflows();
  assert.ok(Array.isArray(bad), 'should return an array');
  for (const entry of bad) {
    assert.ok(typeof entry.file === 'string', 'each entry must have a string file field');
    assert.ok(typeof entry.error === 'string', 'each entry must have a string error field');
  }
});

// ── heuristicError ──────────────────────────────────────────────────────────

test('heuristicError returns null for clean YAML', () => {
  const yaml = [
    'name: My Workflow',
    'on:',
    '  push:',
    '    branches: [main]',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
  ].join('\n');
  assert.strictEqual(heuristicError(yaml), null);
});

test('heuristicError flags a flush-left backtick line', () => {
  const broken = [
    'name: Bad Workflow',
    'jobs:',
    '  test:',
    '    steps:',
    '      - uses: actions/github-script@v6',
    '        with:',
    '          script: |',
    '            const lines = [',
    '`First line`,',  // flush-left backtick escaping the block scalar
    '            ].join("\\n")',
  ].join('\n');
  const err = heuristicError(broken);
  assert.ok(err !== null, 'should flag flush-left backtick');
  assert.match(err, /flush-left/);
  assert.match(err, /github-script/);
});

test('heuristicError flags a flush-left pipe character', () => {
  const broken = 'name: Bad\n| some escaped content\n';
  const err = heuristicError(broken);
  assert.ok(err !== null, 'should flag flush-left pipe');
});

test('heuristicError flags a flush-left ).join at column 0', () => {
  // The heuristic regex matches ).join (closing paren before .join) at column 0,
  // which is the exact pattern produced when a template literal escapes a
  // github-script `script: |` block scalar and ends with ).join('\\n').
  const broken = [
    'name: Bad',
    'jobs:',
    '  test:',
    '    steps:',
    '      - uses: actions/github-script@v6',
    '        with:',
    '          script: |',
    "            const b = ('x'",
    ").join('\\n')",  // flush-left ).join at column 0
  ].join('\n');
  const err = heuristicError(broken);
  assert.ok(err !== null, 'should flag flush-left ).join(');
});

test('heuristicError does not flag YAML comment lines', () => {
  const yaml = '# Top-level comment\nname: ok\n';
  assert.strictEqual(heuristicError(yaml), null, 'comment lines must be exempt');
});

test('heuristicError does not flag a document separator', () => {
  const yaml = '---\nname: ok\n';
  assert.strictEqual(heuristicError(yaml), null, '--- is a legal YAML document separator');
});

test('heuristicError reports the line number in the error message', () => {
  const broken = 'name: X\n`flush-left here`\n';
  const err = heuristicError(broken);
  assert.ok(err !== null);
  assert.match(err, /line 2/);
});

// ── workflowRunMissingWorkflows ─────────────────────────────────────────────

test('workflowRunMissingWorkflows returns null when no workflow_run trigger', () => {
  const yaml = 'on:\n  push:\n    branches: [main]\n';
  assert.strictEqual(workflowRunMissingWorkflows(yaml), null);
});

test('workflowRunMissingWorkflows returns null for valid block form with workflows key', () => {
  const yaml = [
    'on:',
    '  workflow_run:',
    '    workflows: ["My CI"]',
    '    types: [completed]',
  ].join('\n');
  assert.strictEqual(workflowRunMissingWorkflows(yaml), null);
});

test('workflowRunMissingWorkflows returns null for valid inline form', () => {
  const yaml = 'on:\n  workflow_run: {workflows: ["Build"], types: [completed]}\n';
  assert.strictEqual(workflowRunMissingWorkflows(yaml), null);
});

test('workflowRunMissingWorkflows flags block form that is missing workflows key', () => {
  const yaml = [
    'on:',
    '  workflow_run:',
    '    types: [completed]',
    'jobs:',
    '  test:',
    '    runs-on: ubuntu-latest',
  ].join('\n');
  const err = workflowRunMissingWorkflows(yaml);
  assert.ok(err !== null, 'should flag missing workflows: key');
  assert.match(err, /workflow_run/);
  assert.match(err, /workflows/);
});

test('workflowRunMissingWorkflows flags inline form that is missing workflows', () => {
  const yaml = 'on:\n  workflow_run: {types: [completed]}\n';
  const err = workflowRunMissingWorkflows(yaml);
  assert.ok(err !== null, 'should flag inline workflow_run with no workflows key');
});

test('workflowRunMissingWorkflows reports the offending line number', () => {
  const yaml = [
    'name: Test',
    'on:',
    '  workflow_run:',
    '    types: [completed]',
  ].join('\n');
  const err = workflowRunMissingWorkflows(yaml);
  assert.ok(err !== null);
  assert.match(err, /line \d+/);
});

#!/usr/bin/env node
'use strict';

/**
 * Regression tests for schemas/registry_rules.json + pure validator + n8n blueprint.
 * Would have caught: missing skill ceiling, broken persona_id pattern, missing alert cargo.
 */

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const {
  validateAgentManifest,
  formatValidationAlert,
  sampleValidManifest,
  sampleInvalidManifest,
  ALLOWED_SKILLS,
  MAX_SKILLS,
} = require('../scripts/lib/validate-agent-manifest');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas', 'registry_rules.json');
const N8N_PATH = path.join(
  REPO_ROOT,
  'workflows/n8n/defensive-validation-guardrail-alerting.json',
);
const CLI_PATH = path.join(REPO_ROOT, 'scripts/validate-agent-manifest.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed += 1;
  }
}

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

test('registry_rules.json exists and declares required top-level shape', () => {
  assert.ok(fs.existsSync(SCHEMA_PATH), 'schemas/registry_rules.json missing');
  const schema = readJson(SCHEMA_PATH);
  assert.equal(schema.title, 'RevvelStandardsAgentManifest');
  assert.deepEqual(schema.required, [
    'persona_id',
    'version',
    'skills',
    'target_artifact_domains',
    'system_constraints',
  ]);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.skills.maxItems, MAX_SKILLS);
  assert.deepEqual(schema.properties.skills.items.enum, [...ALLOWED_SKILLS]);
});

test('Ajv accepts the canonical valid sample', () => {
  const schema = readJson(SCHEMA_PATH);
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(sampleValidManifest());
  assert.equal(ok, true, ajv.errorsText(validate.errors));
});

test('Ajv rejects skill-budget overflow and bad persona_id', () => {
  const schema = readJson(SCHEMA_PATH);
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(sampleInvalidManifest());
  assert.equal(ok, false, 'expected invalid sample to fail Ajv');
  const text = ajv.errorsText(validate.errors);
  assert.match(text, /persona_id|skills|version|target_artifact_domains|system_constraints/i);
});

test('pure validator agrees with Ajv on valid sample', () => {
  const result = validateAgentManifest(sampleValidManifest());
  assert.equal(result.valid, true, result.summary);
  assert.equal(result.skill_budget_remaining, 2);
  assert.equal(result.errors.length, 0);
});

test('pure validator flags skill budget ceiling breach', () => {
  const result = validateAgentManifest(sampleInvalidManifest());
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((e) => e.keyword === 'maxItems'),
    'expected maxItems error for 6 skills',
  );
  assert.ok(
    result.errors.some((e) => e.path === '/persona_id'),
    'expected persona_id pattern error',
  );
  assert.ok(
    result.errors.some((e) => e.path.includes('execution_timeout_seconds')),
    'expected timeout range error',
  );
});

test('pure validator rejects additional top-level properties', () => {
  const manifest = { ...sampleValidManifest(), extra: true };
  const result = validateAgentManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.keyword === 'additionalProperties'));
});

test('pure validator rejects non-objects', () => {
  const result = validateAgentManifest(null);
  assert.equal(result.valid, false);
  assert.match(result.summary, /JSON object/);
});

test('formatValidationAlert emits circuit-breaker markdown cargo', () => {
  const cargo = formatValidationAlert({
    workflowName: 'Unit Test Pipeline',
    executionId: 'exec-42',
    errorName: 'SchemaViolationException',
    errorMessage: 'skills exceeds hard ceiling of 5',
    executionUrl: 'https://n8n.example/execution/42',
  });
  assert.match(cargo, /Validation Circuit Breaker Tripped/);
  assert.match(cargo, /Unit Test Pipeline/);
  assert.match(cargo, /exec-42/);
  assert.match(cargo, /skills exceeds hard ceiling of 5/);
  assert.match(cargo, /https:\/\/n8n\.example\/execution\/42/);
});

test('n8n defensive validation blueprint is importable JSON with required nodes', () => {
  assert.ok(fs.existsSync(N8N_PATH), 'n8n blueprint missing');
  const workflow = readJson(N8N_PATH);
  assert.equal(
    workflow.name,
    'Revvel Standards - Defensive Validation Guardrail Alerting Engine',
  );
  const names = workflow.nodes.map((n) => n.name).sort();
  assert.deepEqual(names, [
    'Discord Alert Hub',
    'Email Provider Dispatch',
    'Error Trigger Node',
    'Format Incident Details',
    'Route Alert Streams',
    'Slack Alert Hub',
  ].sort());
  assert.ok(workflow.connections['Error Trigger Node']);
  assert.ok(workflow.connections['Route Alert Streams']);
  const formatNode = workflow.nodes.find((n) => n.name === 'Format Incident Details');
  assert.match(formatNode.parameters.jsCode, /Validation Circuit Breaker Tripped/);
  const route = workflow.nodes.find((n) => n.name === 'Route Alert Streams');
  // n8n IF v2 uses combinator (not the typo combinATOR from the WR draft)
  assert.equal(route.parameters.conditions.combinator, 'and');
});

test('CLI exits 0 for valid sample and 1 for invalid sample', () => {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'registry-rules-'));
  const validPath = path.join(tmpDir, 'valid.json');
  const invalidPath = path.join(tmpDir, 'invalid.json');
  fs.writeFileSync(validPath, JSON.stringify(sampleValidManifest()));
  fs.writeFileSync(invalidPath, JSON.stringify(sampleInvalidManifest()));

  const okRun = spawnSync(process.execPath, [CLI_PATH, validPath], {
    encoding: 'utf8',
  });
  assert.equal(okRun.status, 0, okRun.stderr || okRun.stdout);
  assert.match(okRun.stdout, /PASS/);

  const badRun = spawnSync(process.execPath, [CLI_PATH, invalidPath], {
    encoding: 'utf8',
  });
  assert.equal(badRun.status, 1, 'invalid manifest must exit non-zero');
  assert.match(`${badRun.stdout}${badRun.stderr}`, /FAIL/);
});

test('CLI --sample prints a document that validates', () => {
  const run = spawnSync(process.execPath, [CLI_PATH, '--sample'], {
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  const doc = JSON.parse(run.stdout);
  assert.equal(validateAgentManifest(doc).valid, true);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

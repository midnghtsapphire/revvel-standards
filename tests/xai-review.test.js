#!/usr/bin/env node
'use strict';

/**
 * Guardrail tests for the XAI Review integration (WR #16875).
 *
 * Marketplace: https://github.com/marketplace/actions/xai-review
 * Action:      Nikita-Filonov/ai-review (single-author → SHA-pin required)
 *
 * Pins the security / ops properties the WR demands:
 *   - opt-in only (no automatic PR open/sync trigger)
 *   - SHA-pinned third-party action
 *   - soft-skip when OPENROUTER_API_KEY is missing
 *   - OpenRouter LLM provider (shared secret, no new vendor)
 *   - continue-on-error so advisory reviews never block merge
 *   - accepted in ACCEPTED_SINGLE_AUTHOR_ACTIONS
 *   - label present in .github/labels.yml
 *   - documented in OPENROUTER_MARKETPLACE_ACTIONS
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const root = path.resolve(__dirname, '..');
const WORKFLOW = path.join(root, '.github', 'workflows', 'xai-review.yml');
const TEMPLATE = path.join(root, 'templates', 'cicd', 'xai-review.yml');
const AUDIT = path.join(root, 'scripts', 'audit-third-party-actions.sh');
const LABELS = path.join(root, '.github', 'labels.yml');
const DOCS = path.join(root, 'docs', 'OPENROUTER_MARKETPLACE_ACTIONS.md');

const ACTION_SHA = '52a2012d13644cfb7bf91b96d8d2373e07a4137e';
const ACTION_REF = `Nikita-Filonov/ai-review@${ACTION_SHA}`;

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function parseOn(doc) {
  // yaml parses `on:` as the boolean true key in some parsers.
  return doc.on || doc[true];
}

test('workflow and template files exist', () => {
  assert.ok(fs.existsSync(WORKFLOW), 'missing .github/workflows/xai-review.yml');
  assert.ok(fs.existsSync(TEMPLATE), 'missing templates/cicd/xai-review.yml');
});

test('workflow YAML parses and has required top-level keys', () => {
  const raw = read(WORKFLOW);
  const doc = yaml.parse(raw);
  assert.equal(doc.name, 'XAI Review');
  const on = parseOn(doc);
  assert.ok(on, 'missing on:');
  assert.ok(on.workflow_dispatch, 'must support workflow_dispatch');
  assert.ok(on.issue_comment, 'must support /xai-review slash command');
  assert.ok(on.pull_request, 'must support xai-review label trigger');
  assert.ok(doc.jobs && doc.jobs['xai-review'], 'missing xai-review job');
});

test('workflow is opt-in only (no automatic PR open/sync)', () => {
  const doc = yaml.parse(read(WORKFLOW));
  const on = parseOn(doc);
  const prTypes = on.pull_request && on.pull_request.types;
  assert.ok(Array.isArray(prTypes), 'pull_request.types must be an array');
  assert.deepEqual(prTypes, ['labeled'], 'only labeled trigger — no open/synchronize');
  // Defensive: the job if-condition must also gate on the label name.
  const jobIf = doc.jobs['xai-review'].if || '';
  assert.match(String(jobIf), /xai-review/);
  assert.match(String(jobIf), /workflow_dispatch/);
  assert.doesNotMatch(read(WORKFLOW), /types:\s*\[opened/);
});

test('third-party action is pinned to the full v0.71.0 commit SHA', () => {
  const raw = read(WORKFLOW);
  assert.match(raw, new RegExp(`uses:\\s*${ACTION_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(raw, /#\s*v0\.71\.0/);
  // Template must use the same SHA so downstream copies stay supply-chain safe.
  assert.match(read(TEMPLATE), new RegExp(ACTION_SHA));
});

test('github-script and checkout are SHA-pinned in workflow and template', () => {
  for (const file of [WORKFLOW, TEMPLATE]) {
    const raw = read(file);
    assert.match(raw, /actions\/github-script@[0-9a-f]{40}/, `${file} github-script must be SHA-pinned`);
    assert.match(raw, /actions\/checkout@[0-9a-f]{40}/, `${file} checkout must be SHA-pinned`);
    assert.doesNotMatch(raw, /actions\/github-script@v\d/, `${file} must not float github-script tag`);
    assert.doesNotMatch(raw, /actions\/checkout@v\d/, `${file} must not float checkout tag`);
  }
});

test('soft-skips when OPENROUTER_API_KEY is missing', () => {
  const raw = read(WORKFLOW);
  assert.match(raw, /OPENROUTER_API_KEY/);
  assert.match(raw, /XAI_SKIP/);
  assert.match(raw, /::warning::OPENROUTER_API_KEY is not set/);
  assert.match(raw, /if:\s*env\.XAI_SKIP\s*==\s*'false'/);
});

test('uses OpenRouter as the LLM provider (no new vendor secret)', () => {
  const raw = read(WORKFLOW);
  assert.match(raw, /LLM__PROVIDER:\s*OPENROUTER/);
  assert.match(raw, /openrouter\.ai\/api\/v1/);
  assert.match(raw, /LLM__HTTP_CLIENT__API_TOKEN:\s*\$\{\{\s*secrets\.OPENROUTER_API_KEY\s*\}\}/);
});

test('advisory: continue-on-error so reviews never block merge', () => {
  const raw = read(WORKFLOW);
  assert.match(raw, /continue-on-error:\s*true/);
});

test('single-author action is accepted in the third-party audit allowlist', () => {
  const audit = read(AUDIT);
  assert.match(audit, /Nikita-Filonov\/ai-review/);
  assert.match(audit, /ACCEPTED_SINGLE_AUTHOR_ACTIONS=\(/);
});

test('xai-review label is declared in .github/labels.yml', () => {
  const labels = read(LABELS);
  assert.match(labels, /name:\s*"xai-review"/);
});

test('documented in OPENROUTER_MARKETPLACE_ACTIONS inventory', () => {
  const docs = read(DOCS);
  assert.match(docs, /xai-review/i);
  assert.match(docs, /Nikita-Filonov\/ai-review/);
  assert.match(docs, /marketplace\/actions\/xai-review/);
});

test('permissions are least-privilege (contents read, PR write)', () => {
  const doc = yaml.parse(read(WORKFLOW));
  assert.equal(doc.permissions.contents, 'read');
  assert.equal(doc.permissions['pull-requests'], 'write');
});

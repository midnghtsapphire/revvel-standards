'use strict';

// Tests for the Octopus quota-death review fallback lane:
// scripts/octopus-review-fallback.js + .github/workflows/octopus-review-fallback.yml
// (see wr/pending/07-review-fallback-when-octopus-quota-dead.md).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const workflowPath = path.join(REPO_ROOT, '.github', 'workflows', 'octopus-review-fallback.yml');

const {
  isQuotaDeathComment,
  loadReviewProfile,
  FALLBACK_MARKER,
  OCTOPUS_BOT_LOGIN,
} = require('../scripts/octopus-review-fallback.js');

test('isQuotaDeathComment matches known Octopus quota banners (case-insensitive)', () => {
  assert.strictEqual(isQuotaDeathComment('Please Add Your Own API Keys to continue reviews'), true);
  assert.strictEqual(isQuotaDeathComment('Your monthly AI usage limit was hit.'), true);
  assert.strictEqual(isQuotaDeathComment('quota exceeded for this billing period'), true);
});

test('isQuotaDeathComment does NOT match healthy reviews or empty bodies', () => {
  assert.strictEqual(isQuotaDeathComment('Found a null-pointer bug in scripts/foo.js line 12'), false);
  assert.strictEqual(isQuotaDeathComment(''), false);
  assert.strictEqual(isQuotaDeathComment(null), false);
  assert.strictEqual(isQuotaDeathComment(undefined), false);
});

test('loadReviewProfile resolves the review profile from agent-models.yml', () => {
  const profile = loadReviewProfile();
  // Per agent-models.yml: Opus 4.7 primary, DeepSeek R1 fallback — but assert
  // structure (drift-proof), not exact model slugs.
  assert.ok(Array.isArray(profile.models) && profile.models.length >= 1);
  const config = yaml.parse(
    fs.readFileSync(path.join(REPO_ROOT, '.github', 'agent-models.yml'), 'utf8')
  );
  assert.strictEqual(profile.models[0], config.profiles.review.primary);
  if (config.profiles.review.fallback) {
    assert.strictEqual(profile.models[1], config.profiles.review.fallback);
  }
  assert.strictEqual(config.profiles.review.provider, 'openrouter');
});

test('dedupe marker and bot login are stable identifiers', () => {
  assert.strictEqual(FALLBACK_MARKER, '<!-- octopus-review-fallback -->');
  assert.strictEqual(OCTOPUS_BOT_LOGIN, 'octopus-review[bot]');
});

test('workflow guards the issue_comment lane to octopus-review[bot] quota banners', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const job = workflow.jobs['fallback-review'];
  assert.ok(job, 'fallback-review job exists');
  assert.match(job.if, /octopus-review\[bot\]/);
  assert.match(job.if, /add your own API keys/);
  assert.strictEqual(workflow.permissions['pull-requests'], 'write');
});

test('workflow covers all three lanes: quota comment, sweep schedule, manual dispatch', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const triggers = workflow.on || workflow[true]; // yaml parses bare `on:` as boolean true
  assert.ok(triggers.issue_comment, 'issue_comment trigger present');
  assert.ok(triggers.schedule, 'schedule trigger present');
  assert.ok(triggers.workflow_dispatch, 'workflow_dispatch trigger present');
});

#!/usr/bin/env node
'use strict';

/**
 * Guardrail tests for .github/workflows/lint-md.yml (WR #16267).
 *
 * The WR requires nosborn/github-action-markdown-cli@v3.5.0 wired as the
 * markdown style gate, SHA-pinned, with repo config/ignore paths (not the
 * action README's examples/* demo paths).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/lint-md.yml');
const configYamlPath = path.join(root, '.markdownlint.yaml');
const ignorePath = path.join(root, '.markdownlintignore');
const prLifecyclePath = path.join(root, '.github/workflows/pr-lifecycle.yml');

const NOSBORN_SHA = '508d6cefd8f0cc99eab5d2d4685b1d5f470042c1';
const NOSBORN_USES = `nosborn/github-action-markdown-cli@${NOSBORN_SHA}`;

const raw = fs.readFileSync(workflowPath, 'utf8');
const doc = yaml.parse(raw);

test('lint-md workflow exists and parses', () => {
  assert.ok(fs.existsSync(workflowPath));
  assert.equal(doc.name, 'Lint Markdown (markdownlint-cli)');
  assert.ok(doc.on || doc.true, 'expected an `on:` trigger block');
});

test('lint-md uses nosborn/github-action-markdown-cli pinned to v3.5.0 SHA', () => {
  assert.match(raw, new RegExp(`uses:\\s*${NOSBORN_USES.replace(/\./g, '\\.')}`));
  assert.match(raw, /#\s*v3\.5\.0/, 'tag comment required next to the SHA pin');
  // Must not float on a mutable tag on the uses: line (comments may mention @v3.5.0).
  const usesLines = raw.split('\n').filter((line) => /^\s*uses:\s*nosborn\//.test(line));
  assert.ok(usesLines.length >= 1, 'expected a nosborn uses: line');
  for (const line of usesLines) {
    assert.match(line, new RegExp(`@${NOSBORN_SHA}\\b`));
    assert.doesNotMatch(line, /@v\d/);
  }
});

test('lint-md wires repo config and ignore_path (not examples/* demos)', () => {
  const job = doc.jobs.markdownlint;
  assert.ok(job, 'expected jobs.markdownlint');
  const step = (job.steps || []).find(
    (s) => s.name === 'markdownlint-cli' || (s.uses || '').includes('nosborn/github-action-markdown-cli'),
  );
  assert.ok(step, 'expected markdownlint-cli step');
  assert.equal(step.with.files, '.');
  assert.equal(step.with.config_file, '.markdownlint.yaml');
  assert.ok(
    step.with.dot === true || step.with.dot === 'true',
    'dot must be enabled so .github markdown is covered',
  );
  assert.equal(step.with.ignore_path, '.markdownlintignore');
  // README demo paths must not ship as production config.
  assert.doesNotMatch(raw, /examples\/ignore/);
  assert.doesNotMatch(raw, /examples\/\.markdownlintignore/);
  assert.doesNotMatch(raw, /examples\/rules\/custom\.js/);
});

test('lint-md is least-privilege and has a hard timeout', () => {
  assert.deepEqual(doc.permissions, { contents: 'read' });
  assert.ok(doc.jobs.markdownlint['timeout-minutes'] <= 15);
});

test('lint-md pins every third-party uses: line to a full commit SHA', () => {
  const uses = raw.split('\n').filter((line) => /^\s*-?\s*uses:\s*[\w.-]+\/[\w.-]+@/.test(line));
  assert.ok(uses.length >= 2, 'expected checkout + nosborn uses lines');
  for (const line of uses) {
    assert.match(
      line,
      /uses:\s*[\w.\/-]+@[0-9a-f]{40}\b/,
      `unpinned action: ${line.trim()}`,
    );
  }
});

test('.markdownlint.yaml and .markdownlintignore exist for the action inputs', () => {
  assert.ok(fs.existsSync(configYamlPath), 'expected .markdownlint.yaml');
  assert.ok(fs.existsSync(ignorePath), 'expected .markdownlintignore');
  const cfg = yaml.parse(fs.readFileSync(configYamlPath, 'utf8'));
  assert.equal(cfg.default, true);
  assert.equal(cfg.MD013, false);
  assert.equal(cfg.MD033, false);
  const ignore = fs.readFileSync(ignorePath, 'utf8');
  assert.match(ignore, /wr\/issues\/\*\*/);
  assert.match(ignore, /node_modules\/\*\*/);
  assert.match(ignore, /docs\/agents/);
});

test('pr-lifecycle allowlist tracks the renamed markdown lint workflow', () => {
  const lifecycle = fs.readFileSync(prLifecyclePath, 'utf8');
  assert.match(lifecycle, /"Lint Markdown \(markdownlint-cli\)"/);
  assert.doesNotMatch(lifecycle, /"Lint Markdown \(markdownlint-cli2\)"/);
});

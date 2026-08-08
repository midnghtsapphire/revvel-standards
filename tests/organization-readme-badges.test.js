#!/usr/bin/env node
'use strict';

// Regression guard for WR #16201 — organization README badge generator.
// Asserts the workflow ships complete (not scaffolded), pins the requested
// action to the v2.0.3 commit SHA, and that README markers + audit allowlist
// stay wired so the scheduled job can inject badges without a manual patch.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/organization-readme-badges.yml');
const ACTION_SHA = '55eed124ca46c09a654d886a98413c5bfc6c3803';
const ACTION_REF = `joshjohanning/organization-readme-badge-generator@${ACTION_SHA}`;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('organization badge workflow lives where GitHub Actions reads workflows', () => {
  assert.ok(fs.existsSync(workflowPath), 'expected .github/workflows/organization-readme-badges.yml');
});

test('organization badge workflow is wired for #16201', () => {
  const wf = read('.github/workflows/organization-readme-badges.yml');
  const doc = yaml.parse(wf);
  const on = doc.on || doc.true;

  assert.equal(doc.name, 'Organization README Badge Generator');
  assert.ok(on.schedule, 'expected daily schedule');
  assert.ok(on.workflow_dispatch, 'expected workflow_dispatch');
  assert.equal(doc.permissions?.contents, 'write');

  const job = doc.jobs['generate-badges'];
  assert.ok(job, 'expected generate-badges job');
  assert.equal(job['timeout-minutes'], 15);

  const steps = job.steps || [];
  const actionStep = steps.find((s) => s.name === 'GitHub Organization Readme Badge Generator');
  assert.ok(actionStep, 'expected the named badge generator step from the issue title');
  assert.equal(
    actionStep.uses,
    ACTION_REF,
    'must pin joshjohanning/organization-readme-badge-generator to the v2.0.3 commit SHA'
  );
  assert.match(wf, new RegExp(`${ACTION_SHA} # v2\\.0\\.3`));

  // Org resolution must not hard-code a user login as an organization — the
  // GraphQL organization(login:) query fails for user accounts.
  assert.match(wf, /vars\.ORG_README_BADGES_ORG/);
  assert.match(wf, /steps\.org\.outputs\.skip/);

  // Marker injection + default-branch-only commit (no surprise pushes from forks).
  assert.match(wf, /<!-- start organization badges -->/);
  assert.match(wf, /<!-- end organization badges -->/);
  assert.match(wf, /docs: update organization readme badges \[skip ci\]/);
  assert.match(wf, /github\.event\.repository\.default_branch/);

  // Token fallback must not use secrets.A || secrets.B (empty secret wins).
  assert.doesNotMatch(wf, /secrets\.ORG_README_BADGES_TOKEN\s*\|\|\s*secrets\.GITHUB_TOKEN/);
  assert.match(wf, /BADGE_API_TOKEN/);
  // Marker rewrite must go through Node (not shell-interpolated perl -e).
  assert.match(wf, /node <<'NODE'/);

  // CLAUDE.md gotcha #8: every remote action ref is a full 40-char SHA.
  const uses = wf.match(/uses:\s*\S+/g) || [];
  assert.ok(uses.length >= 2, 'expected checkout + badge generator at minimum');
  for (const line of uses) {
    assert.match(line, /uses:\s*[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `unpinned action: ${line}`);
  }
});

test('README marker injection handles multi-line badge markdown', () => {
  // Mirrors the workflow's node <<'NODE' block so a regression in the
  // replacement window is caught without needing a live Actions runner.
  const os = require('node:os');
  const start = '<!-- start organization badges -->';
  const end = '<!-- end organization badges -->';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'org-badges-'));
  const readmePath = path.join(dir, 'README.md');
  fs.writeFileSync(readmePath, `# Title\n${start}\nold\n${end}\nfooter\n`);
  const badges = '![a](https://img.shields.io/badge/a-1-blue)\n![b](https://img.shields.io/badge/b-2-blue)';
  const text = fs.readFileSync(readmePath, 'utf8');
  const startIdx = text.indexOf(start);
  const endIdx = text.indexOf(end);
  const next =
    text.slice(0, startIdx + start.length) +
    '\n' +
    badges +
    '\n' +
    text.slice(endIdx);
  fs.writeFileSync(readmePath, next);
  const updated = fs.readFileSync(readmePath, 'utf8');
  assert.match(updated, /!\[a\]/);
  assert.match(updated, /!\[b\]/);
  assert.ok(updated.indexOf(start) < updated.indexOf('![a]'));
  assert.ok(updated.indexOf('![b]') < updated.indexOf(end));
  assert.match(updated, /footer/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('README has organization badge markers for injection', () => {
  const readme = read('README.md');
  assert.match(readme, /<!-- start organization badges -->/);
  assert.match(readme, /<!-- end organization badges -->/);
  // Markers must appear in order so the perl replace window is well-defined.
  const start = readme.indexOf('<!-- start organization badges -->');
  const end = readme.indexOf('<!-- end organization badges -->');
  assert.ok(start >= 0 && end > start, 'end marker must follow start marker');
});

test('single-author audit allowlists the dispositioned badge action', () => {
  const auditScript = read('scripts/audit-third-party-actions.sh');
  assert.match(auditScript, /ACCEPTED_SINGLE_AUTHOR_ACTIONS=\(/);
  assert.match(
    auditScript,
    /joshjohanning\/organization-readme-badge-generator/,
    'WR #16201 disposition must keep the quarterly audit from re-filing'
  );
});

test('organization badge generator is registered in the connections SSOT', () => {
  const registry = yaml.parse(read('config/connections.yml'));
  const entry = registry.connections.find((c) => c.id === 'organization-readme-badge-generator');
  assert.ok(entry, 'expected organization-readme-badge-generator in config/connections.yml');
  assert.equal(entry.type, 'github-action');
  assert.equal(entry.status, 'verified');
  assert.ok(
    Array.isArray(entry.used_by) && entry.used_by.includes('organization-readme-badges.yml'),
    'used_by must reference organization-readme-badges.yml'
  );
});

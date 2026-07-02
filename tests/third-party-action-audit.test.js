#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('stale audited actions are removed or explicitly dispositioned', () => {
  assert.doesNotMatch(read('.github/workflows/match-labels.yml'), /binowork\/match-labels@/);
  assert.doesNotMatch(read('.github/workflows/arsc-labels.yml'), /wagner-cotta\/arsc-label@/);
  assert.doesNotMatch(read('templates/cicd/arsc-labels.yml'), /wagner-cotta\/arsc-label@/);
  assert.doesNotMatch(read('.github/workflows/green-website.yml'), /filiptronicek\/green-action@/);
  assert.doesNotMatch(read('templates/cicd/green-website.yml'), /filiptronicek\/green-action@/);

  const createIssueBranch = read('.github/workflows/create-issue-branch.yml');
  assert.match(createIssueBranch, /robvanderleek\/create-issue-branch@[0-9a-f]{40}/);

  const auditScript = read('scripts/audit-third-party-actions.sh');
  assert.match(auditScript, /ACCEPTED_SINGLE_AUTHOR_ACTIONS=\(/);
  assert.match(auditScript, /robvanderleek\/create-issue-branch/);
});

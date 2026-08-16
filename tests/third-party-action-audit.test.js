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
  // match-labels.yml was removed (dead workflow: its outputs were unreachable).
  // Removal disposes of the deprecated binowork/match-labels@ action entirely.
  assert.ok(!fs.existsSync(path.join(root, '.github/workflows/match-labels.yml')));
  assert.doesNotMatch(read('.github/workflows/arsc-labels.yml'), /^\s*uses:\s+wagner-cotta\/arsc-label@/m);
  assert.doesNotMatch(read('templates/cicd/arsc-labels.yml'), /^\s*uses:\s+wagner-cotta\/arsc-label@/m);
  assert.doesNotMatch(read('.github/workflows/green-website.yml'), /^\s*uses:\s+filiptronicek\/green-action@/m);
  assert.doesNotMatch(read('templates/cicd/green-website.yml'), /^\s*uses:\s+filiptronicek\/green-action@/m);

  const createIssueBranch = read('.github/workflows/create-issue-branch.yml');
  assert.match(createIssueBranch, /robvanderleek\/create-issue-branch@[0-9a-f]{40}/);

  const auditScript = read('scripts/audit-third-party-actions.sh');
  assert.match(auditScript, /ACCEPTED_SINGLE_AUTHOR_ACTIONS=\(/);
  assert.match(auditScript, /robvanderleek\/create-issue-branch/);
});

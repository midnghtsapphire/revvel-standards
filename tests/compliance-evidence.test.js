'use strict';

// Bugbot on PR #18365: NIST_READINESS.md cites evidence as relative markdown
// links. The checker used to collect only backtick paths under a prefix list,
// so deleting one of those linked files still reported missing: [].
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { collectReferences, missingReferences, root } = require('../scripts/compliance-evidence.js');

const docDir = path.join(root, 'docs/compliance');

test('a relative markdown link is a checked repository path', () => {
  const text = 'See [gate](../../scripts/llm-spend-gate.js) and [web](https://csrc.nist.gov/Projects/cosis).';
  const found = [...collectReferences(text, docDir)];
  assert.deepStrictEqual(found, ['scripts/llm-spend-gate.js']);
});

test('a backtick path under the old prefixes is still checked', () => {
  const text = 'Call sites live under `scripts/` and the field is `entry_hash`.';
  const found = [...collectReferences(text, docDir)];
  assert.deepStrictEqual(found, ['scripts/']);
});

test('a markdown link to a file that is not on disk is missing', () => {
  const text = 'See [gone](../../scripts/does-not-exist-18343.js).';
  const found = collectReferences(text, docDir);
  assert.deepStrictEqual(missingReferences(found), ['scripts/does-not-exist-18343.js']);
});

test('the readiness mapping links are present on disk', () => {
  const text = fs.readFileSync(path.join(docDir, 'NIST_READINESS.md'), 'utf8');
  const found = collectReferences(text, docDir);
  assert.ok(found.has('scripts/llm-spend-gate.js'));
  assert.ok(found.has('VISITING_AGENTS.md'));
  assert.deepStrictEqual(missingReferences(found), []);
});

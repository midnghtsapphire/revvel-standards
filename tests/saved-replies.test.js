'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadRegistry,
  validateRegistry,
  getReply,
} = require('../scripts/saved-replies');

test('registry file parses and validates cleanly', () => {
  const registry = loadRegistry();
  assert.deepEqual(validateRegistry(registry), []);
});

test('copilot merge-conflict saved reply exists with the exact body', () => {
  const reply = getReply('copilot-resolve-merge-conflicts');
  assert.ok(reply, 'expected copilot-resolve-merge-conflicts entry');
  assert.equal(
    reply.body,
    '@copilot resolve the merge conflicts in this pull request'
  );
  assert.equal(reply.title, 'Copilot: resolve merge conflicts');
  assert.ok(reply.usage && reply.usage.length > 0);
});

test('getReply returns undefined for unknown keys', () => {
  assert.equal(getReply('does-not-exist'), undefined);
});

test('validateRegistry flags missing fields, bad keys, duplicates, and padding', () => {
  const problems = validateRegistry({
    replies: [
      { key: 'Bad_Key', title: 't', body: ' padded ', usage: 'u' },
      { key: 'dup', title: 't', body: 'b', usage: 'u' },
      { key: 'dup', title: 't', body: 'b', usage: 'u' },
      { key: 'no-usage', title: 't', body: 'b' },
    ],
  });
  assert.ok(problems.some((p) => p.includes('kebab-case')));
  assert.ok(problems.some((p) => p.includes('duplicated')));
  assert.ok(problems.some((p) => p.includes('leading/trailing whitespace')));
  assert.ok(problems.some((p) => p.includes('.usage')));
});

test('validateRegistry rejects non-list and empty registries', () => {
  assert.deepEqual(validateRegistry({}), ['`replies` must be a list']);
  assert.ok(
    validateRegistry({ replies: [] }).some((p) => p.includes('at least one'))
  );
});

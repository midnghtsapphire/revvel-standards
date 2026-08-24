'use strict';

/**
 * Root-gate twin of products/merge-prosecutor/tests/prosecutor.test.js.
 * CircleCI lint-and-test only runs files under tests/, so this file
 * re-runs the product suite. Do not put a glob star-slash in this comment.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('products/merge-prosecutor suite (fail-closed, pagination, Jules regex)', () => {
  const cwd = path.join(__dirname, '..', 'products', 'merge-prosecutor');
  const result = spawnSync(process.execPath, ['--test', 'tests/prosecutor.test.js'], {
    cwd,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
});

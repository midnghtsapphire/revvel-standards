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
  // A nested Node test runner inherits NODE_TEST_CONTEXT; on Node 22+ this
  // disables the requested child discovery. Remove only that internal marker
  // and assert a real test summary so an empty subprocess cannot report green.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  // 2026-11-10, #18313: retain detector suite and execute the owned local adapter.
  // Historical argv: ['--test', 'tests/prosecutor.test.js']
  const result = spawnSync(process.execPath, ['--test', 'tests/prosecutor.test.js', 'tests/local-prosecution.test.js'], {
    cwd,
    env,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
  assert.match(result.stdout, /(?:#|ℹ) tests [1-9]\d*\b/, result.stdout);
});

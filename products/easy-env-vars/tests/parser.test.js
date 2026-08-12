#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  parseEnvBlock,
  PINNED_SHA,
  PINNED_TAG,
} = require('../lib/parse-env.js');

test('product parser: ordered expansion', () => {
  const r = parseEnvBlock('A=1\nB=$A-2\nC="${B}x"');
  assert.equal(r.ok, true);
  assert.equal(r.resolved.A, '1');
  assert.equal(r.resolved.B, '1-2');
  assert.equal(r.resolved.C, '1-2x');
});

test('product parser: default parameter expansion', () => {
  const r = parseEnvBlock('MSG="${GREETING:-hello} ${PLACE:-world}"');
  assert.equal(r.ok, true);
  assert.equal(r.resolved.MSG, 'hello world');
});

test('product parser: continues after earlier failure', () => {
  const r = parseEnvBlock('BAD=$(curl x)\nGOOD=1');
  assert.equal(r.ok, false);
  assert.equal(r.resolved.GOOD, '1');
  assert.equal(r.resolved.BAD, undefined);
});

test('product parser: pins v1.0.0 SHA', () => {
  assert.equal(PINNED_TAG, 'v1.0.0');
  assert.match(PINNED_SHA, /^[0-9a-f]{40}$/);
  const r = parseEnvBlock('X=1');
  assert.match(r.workflowSnippet, new RegExp(`briantist/ezenv@${PINNED_SHA}`));
});

test('product parser module path resolves from tests/', () => {
  const resolved = require.resolve('../lib/parse-env.js');
  assert.ok(path.basename(resolved) === 'parse-env.js');
});

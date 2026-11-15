'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('doctl download refuses an http redirect', () => {
  const script = fs.readFileSync(path.join(__dirname, '../.circleci/scripts/do-app-update.sh'), 'utf8');
  assert.match(script, /curl --proto '=https' --tlsv1\.2 -fsSL/);
  assert.equal(/^\s*curl -fsSL/m.test(script), false);
});

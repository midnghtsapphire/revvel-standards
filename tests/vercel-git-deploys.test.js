'use strict';

/**
 * Owner asked to stop Vercel git-triggered deploys (PR #17907).
 * Manual dashboard / CLI deploys still work when git.deploymentEnabled is false.
 * These two project configs are the ones linked to this repository.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CONFIGS = ['vercel.json', path.join('docs', 'marketplace-relister', 'vercel.json')];

test('linked Vercel projects keep git-triggered deploys off', () => {
  for (const rel of CONFIGS) {
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const cfg = JSON.parse(raw);
    assert.equal(
      cfg.git?.deploymentEnabled,
      false,
      `${rel} must set git.deploymentEnabled to false so the Vercel GitHub App stops building every PR`,
    );
  }
});

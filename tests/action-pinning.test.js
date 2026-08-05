'use strict';

// CLAUDE.md gotcha #8: third-party actions must be pinned to a full commit SHA,
// or an upstream retag/breaking release silently changes every workflow that
// uses them. `peter-evans/create-pull-request` is the one that writes to the
// repository (it opens the automated state/fallback PRs), so it is guarded
// explicitly here — a floating tag on it is a supply-chain write path.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');
const GUARDED = 'peter-evans/create-pull-request';

test(`${GUARDED} is SHA-pinned in every workflow`, () => {
  const floating = [];
  for (const file of fs.readdirSync(WORKFLOW_DIR)) {
    if (!/\.ya?ml$/.test(file)) continue;
    const lines = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const match = line.match(new RegExp(`uses:\\s*${GUARDED}@(\\S+)`));
      if (match && !/^[0-9a-f]{40}$/.test(match[1])) {
        floating.push(`${file}:${i + 1} -> @${match[1]}`);
      }
    });
  }
  assert.deepEqual(floating, [], 'pin these to a full commit SHA with a "# vX.Y.Z" comment');
});

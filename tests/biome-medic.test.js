'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { decideRemediations, DEFAULT_CAPS } = require('../scripts/biome/medic');

test('reruns are OFF by default (storm-safe)', () => {
  const plan = decideRemediations({
    recentFailures: [{ id: 1, name: 'X', path: '.github/workflows/x.yml' }],
  });
  assert.equal(plan.reruns.length, 0);
  assert.equal(DEFAULT_CAPS.allowReruns, false);
});

test('stuck issues get self-heal label + comment, never a content delete', () => {
  const plan = decideRemediations({ stuckIssues: [{ number: 7 }, { number: 8 }] });
  assert.equal(plan.relabels.length, 2);
  for (const r of plan.relabels) {
    assert.deepEqual(r.add, ['self-heal']);
    assert.deepEqual(r.remove, []);
    assert.ok(r.comment);
  }
});

test('key-blocks only cleared when AI lanes are offline', () => {
  const online = decideRemediations({ keyBlockedIssues: [{ number: 1 }], aiLanesOffline: false });
  assert.equal(online.keyUnblocks.length, 0);

  const offline = decideRemediations({ keyBlockedIssues: [{ number: 1 }], aiLanesOffline: true });
  assert.equal(offline.keyUnblocks.length, 1);
  assert.deepEqual(offline.keyUnblocks[0].remove, ['openrouter:needs-key']);
  assert.deepEqual(offline.keyUnblocks[0].add, ['self-heal']);
});

test('reruns (when enabled) exclude BIOME workflows and respect cap', () => {
  const failures = [
    { id: 1, name: 'a', path: '.github/workflows/a.yml' },
    { id: 2, name: 'biome-sheaf', path: '.github/workflows/biome-sheaf.yml' },
    { id: 3, name: 'c', path: '.github/workflows/c.yml' },
    { id: 4, name: 'd', path: '.github/workflows/d.yml' },
    { id: 5, name: 'e', path: '.github/workflows/e.yml' },
  ];
  const plan = decideRemediations({ recentFailures: failures, caps: { allowReruns: true, maxReruns: 3 } });
  assert.ok(plan.reruns.every((r) => r.name !== 'biome-sheaf'));
  assert.equal(plan.reruns.length, 3);
  assert.equal(plan.capped.reruns, true);
});

test('relabels respect cap', () => {
  const stuck = Array.from({ length: 15 }, (_, i) => ({ number: i + 1 }));
  const plan = decideRemediations({ stuckIssues: stuck, caps: { maxRelabels: 10 } });
  assert.equal(plan.relabels.length, 10);
  assert.equal(plan.capped.relabels, true);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { buildState } = require('../scripts/populate-state.js');

test('buildState summarizes projects by status and counts collections', () => {
  const state = buildState({
    projects: [
      { name: 'A', status: 'Existing', revenue: '$5K/month' },
      { name: 'B', status: 'existing', revenue: '' },
      { name: 'C', status: 'New', revenue: '$0' },
    ],
    urls: ['u1', 'u2'],
    domains: ['d1'],
    projectStatus: [{ project: 'x', hasSystemState: true }, { project: 'y', hasSystemState: false }],
    lastUpdated: '2026-07-25T00:00:00.000Z',
  });
  assert.strictEqual(state.projects.total, 3);
  assert.strictEqual(state.projects.byStatus.existing, 2);
  assert.deepStrictEqual(state.projects.withRevenueSignal, ['A']);
  assert.strictEqual(state.urls, 2);
  assert.strictEqual(state.domains, 1);
  assert.strictEqual(state.systemState, 1);
  assert.strictEqual(state.lastUpdated, '2026-07-25T00:00:00.000Z');
});

test('buildState tolerates missing fields', () => {
  const state = buildState({});
  assert.strictEqual(state.projects.total, 0);
  assert.strictEqual(state.urls, 0);
  assert.strictEqual(state.lastUpdated, null);
});

test('checked-in state.json matches dashboard-data.json (never {} again)', () => {
  const root = path.join(__dirname, '..');
  const dashboard = JSON.parse(fs.readFileSync(path.join(root, 'dashboard-data.json'), 'utf8'));
  const state = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'));
  assert.deepStrictEqual(state, buildState(dashboard));
  assert.ok(state.projects.total > 0, 'state.json must not be empty');
});

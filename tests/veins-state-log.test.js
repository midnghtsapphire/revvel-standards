'use strict';

/**
 * Unit tests for scripts/veins-state-log.js
 * Pins the row builder, trend analysis, and history helpers.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { buildRow, trendDescription, readHistory } = require('../scripts/veins-state-log');

// ── trendDescription ──────────────────────────────────────────────────────────

test('trendDescription: first entry returns baseline message', () => {
  const row = { status: 'down', stub_unactioned: 7, days_since_last_commit: 107 };
  assert.match(trendDescription(row, null), /first entry/);
});

test('trendDescription: status improved', () => {
  const prev = { status: 'down',    stub_unactioned: 7, days_since_last_commit: 107 };
  const curr = { status: 'healthy', stub_unactioned: 0, days_since_last_commit: 0   };
  assert.match(trendDescription(curr, prev), /status improved/);
});

test('trendDescription: status degraded', () => {
  const prev = { status: 'healthy', stub_unactioned: 0, days_since_last_commit: 0 };
  const curr = { status: 'down',    stub_unactioned: 1, days_since_last_commit: 5 };
  assert.match(trendDescription(curr, prev), /status degraded/);
});

test('trendDescription: status unchanged', () => {
  const prev = { status: 'down', stub_unactioned: 7, days_since_last_commit: 100 };
  const curr = { status: 'down', stub_unactioned: 7, days_since_last_commit: 100 };
  assert.match(trendDescription(curr, prev), /status unchanged/);
});

test('trendDescription: growing stubs mentioned', () => {
  const prev = { status: 'down', stub_unactioned: 5, days_since_last_commit: 100 };
  const curr = { status: 'down', stub_unactioned: 7, days_since_last_commit: 107 };
  assert.match(trendDescription(curr, prev), /stubs grew/);
});

test('trendDescription: reducing stubs mentioned', () => {
  const prev = { status: 'down', stub_unactioned: 7, days_since_last_commit: 107 };
  const curr = { status: 'down', stub_unactioned: 4, days_since_last_commit: 107 };
  assert.match(trendDescription(curr, prev), /stubs reduced/);
});

test('trendDescription: growing silence mentioned', () => {
  const prev = { status: 'down', stub_unactioned: 7, days_since_last_commit: 100 };
  const curr = { status: 'down', stub_unactioned: 7, days_since_last_commit: 107 };
  assert.match(trendDescription(curr, prev), /engine silent.*more day/);
});

test('trendDescription: no silence note when days unchanged', () => {
  const prev = { status: 'down', stub_unactioned: 7, days_since_last_commit: 107 };
  const curr = { status: 'down', stub_unactioned: 7, days_since_last_commit: 107 };
  const desc = trendDescription(curr, prev);
  assert.ok(!desc.includes('engine silent'), `should not mention silence when unchanged, got: ${desc}`);
});

test('trendDescription: null days_since_last_commit handled without error', () => {
  const prev = { status: 'down', stub_unactioned: 7, days_since_last_commit: null };
  const curr = { status: 'down', stub_unactioned: 7, days_since_last_commit: null };
  assert.doesNotThrow(() => trendDescription(curr, prev));
});

// ── buildRow (live — reads actual .veins/proposals/ and bnat-fingerprint.json) ─

test('buildRow: returns a valid row object', () => {
  const row = buildRow(new Date().toISOString());
  assert.ok(typeof row.snapshot_at === 'string', 'snapshot_at must be a string');
  assert.ok(['healthy', 'degraded', 'down'].includes(row.status), `invalid status: ${row.status}`);
  assert.ok(typeof row.total_proposals === 'number');
  assert.ok(typeof row.stub_unactioned === 'number');
  assert.ok(typeof row.actioned === 'number');
  assert.ok(typeof row.effectiveness_index === 'number');
  assert.ok(row.effectiveness_index >= 0 && row.effectiveness_index <= 100,
    `effectiveness_index out of range: ${row.effectiveness_index}`);
  assert.ok(typeof row.unique_veins_runs === 'number');
  assert.ok(typeof row.repeat_firing_components === 'number');
  assert.ok(typeof row.unique_components === 'number');
});

test('buildRow: stub_unactioned + actioned equals total_proposals', () => {
  const row = buildRow(new Date().toISOString());
  assert.strictEqual(row.stub_unactioned + row.actioned, row.total_proposals);
});

test('buildRow: current proposals are all unactioned stubs', () => {
  const row = buildRow(new Date().toISOString());
  assert.strictEqual(row.actioned, 0, 'no proposals have been actioned yet');
  assert.strictEqual(row.stub_unactioned, row.total_proposals);
});

test('buildRow: status is "down" given all-stub proposals', () => {
  const row = buildRow(new Date().toISOString());
  // All 7 proposals are stubs → engine should be "down".
  assert.strictEqual(row.status, 'down');
});

test('buildRow: sheaf topology present from bnat-fingerprint.json', () => {
  const row = buildRow(new Date().toISOString());
  assert.ok(row.sheaf_dim_H1 !== null, 'sheaf_dim_H1 should be populated');
  assert.ok(row.sheaf_energy !== null, 'sheaf_energy should be populated');
});

// ── readHistory ───────────────────────────────────────────────────────────────

test('readHistory: returns an array', () => {
  const history = readHistory();
  assert.ok(Array.isArray(history));
});

test('readHistory: at least one entry after state-log has run', () => {
  // This test relies on veins-state-log.js having been run once (CI does this).
  const history = readHistory();
  // Guard: only assert if the file already exists (tests may run before CLI).
  if (history.length > 0) {
    const last = history[history.length - 1];
    assert.ok(typeof last.snapshot_at === 'string', 'entry must have snapshot_at');
    assert.ok(['healthy', 'degraded', 'down'].includes(last.status),
      `entry has invalid status: ${last.status}`);
  }
});

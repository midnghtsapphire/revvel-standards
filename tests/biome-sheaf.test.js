'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { worseOf, computeOverallHealth, glueSections, renderStatusHtml } = require('../scripts/biome/sheaf');

test('worseOf returns the more severe status', () => {
  assert.equal(worseOf('healthy', 'degraded'), 'degraded');
  assert.equal(worseOf('down', 'degraded'), 'down');
  assert.equal(worseOf('healthy', 'healthy'), 'healthy');
});

test('computeOverallHealth is the worst across sections (sheaf gluing)', () => {
  assert.equal(computeOverallHealth([{ status: 'healthy' }, { status: 'degraded' }]), 'degraded');
  assert.equal(computeOverallHealth([{ status: 'healthy' }, { status: 'down' }, { status: 'degraded' }]), 'down');
  assert.equal(computeOverallHealth([{ status: 'healthy' }]), 'healthy');
});

test('glueSections produces a credit-free v1 status object keyed by worker', () => {
  const status = glueSections(
    [
      { worker: 'sentinel', status: 'healthy', summary: 's', counts: { a: 1 } },
      { worker: 'homeostat', status: 'degraded', summary: 'h' },
    ],
    '2026-06-30T00:00:00Z'
  );
  assert.equal(status.schema, 'biome-status/v1');
  assert.equal(status.credit_free, true);
  assert.equal(status.generated_at, '2026-06-30T00:00:00Z');
  assert.equal(status.overall, 'degraded');
  assert.ok(status.workers.sentinel);
  assert.equal(status.workers.sentinel.counts.a, 1);
  assert.deepEqual(status.workers.homeostat.counts, {});
});

test('renderStatusHtml is self-contained and escapes content', () => {
  const status = glueSections([{ worker: 'x<script>', status: 'healthy', summary: 'a & b' }], '2026-06-30T00:00:00Z');
  const html = renderStatusHtml(status);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('BIOME Crew Status'));
  assert.ok(html.includes('x&lt;script&gt;'));
  assert.ok(html.includes('a &amp; b'));
  assert.ok(!html.includes('<script>'));
});

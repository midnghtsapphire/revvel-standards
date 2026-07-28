#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const {
  parseDate,
  daysUntil,
  effectiveDueDate,
  subscriptionVerdict,
  reposForSubscription,
  loadSubscriptions,
  buildReport,
  renderIssueBody,
  DEFAULT_WARN_WITHIN_DAYS,
} = require('../scripts/subscription-tracker');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

// Fixed reference clock used across date-sensitive tests.
const AT = (iso) => Date.parse(iso);

(async () => {
  await test('parseDate accepts YYYY-MM-DD and rejects junk', () => {
    assert.equal(parseDate('2026-06-27'), Date.parse('2026-06-27T00:00:00Z'));
    assert.equal(parseDate(null), null);
    assert.equal(parseDate('not-a-date'), null);
    assert.equal(parseDate('2026/06/27'), null);
  });

  await test('daysUntil counts whole days and goes negative when past', () => {
    const now = AT('2026-06-22T12:00:00Z');
    assert.equal(daysUntil('2026-06-27', now), 5);
    assert.equal(daysUntil('2026-06-22', now), 0);
    assert.equal(daysUntil('2026-06-20', now), -2);
    assert.equal(daysUntil(null, now), null);
  });

  await test('effectiveDueDate prefers trial_end while on trial, else renewal', () => {
    assert.deepEqual(
      effectiveDueDate({ status: 'trial', trial_end: '2026-06-27', renewal_date: '2027-01-01' }),
      { kind: 'trial', date: '2026-06-27' }
    );
    assert.deepEqual(
      effectiveDueDate({ status: 'active', renewal_date: '2027-01-01' }),
      { kind: 'renewal', date: '2027-01-01' }
    );
    assert.deepEqual(
      effectiveDueDate({ status: 'trial', trial_end: null }),
      { kind: 'trial', date: null }
    );
  });

  await test('RecurseML trial: due_soon 5 days before it ends (the seeded case)', () => {
    const recurseml = {
      name: 'RecurseML',
      status: 'trial',
      trial_start: '2026-06-13',
      trial_end: '2026-06-27',
    };
    const verdict = subscriptionVerdict(recurseml, { now: AT('2026-06-22T09:00:00Z') });
    assert.equal(verdict.status, 'due_soon');
    assert.equal(verdict.kind, 'trial');
    assert.equal(verdict.daysRemaining, 5);
    assert.equal(verdict.dueDate, '2026-06-27');
  });

  await test('trial that already passed reads as expired', () => {
    const verdict = subscriptionVerdict(
      { name: 'RecurseML', status: 'trial', trial_end: '2026-06-27' },
      { now: AT('2026-06-30T00:00:00Z') }
    );
    assert.equal(verdict.status, 'expired');
    assert.ok(verdict.daysRemaining < 0);
  });

  await test('active sub far from renewal is ok; cancelled is cancelled', () => {
    const ok = subscriptionVerdict(
      { name: 'X', status: 'active', renewal_date: '2027-01-01' },
      { now: AT('2026-06-22T00:00:00Z') }
    );
    assert.equal(ok.status, 'ok');
    const cancelled = subscriptionVerdict(
      { name: 'Y', status: 'cancelled', renewal_date: '2026-06-23' },
      { now: AT('2026-06-22T00:00:00Z') }
    );
    assert.equal(cancelled.status, 'cancelled');
  });

  await test('missing due date surfaces as unknown', () => {
    const verdict = subscriptionVerdict(
      { name: 'Vercel', status: 'active', renewal_date: null },
      { now: AT('2026-06-22T00:00:00Z') }
    );
    assert.equal(verdict.status, 'unknown');
    assert.equal(verdict.daysRemaining, null);
  });

  await test('warnWithinDays is honoured at the boundary', () => {
    const sub = { name: 'X', status: 'active', renewal_date: '2026-06-30' };
    const now = AT('2026-06-22T00:00:00Z'); // 8 days out
    assert.equal(subscriptionVerdict(sub, { now, warnWithinDays: 7 }).status, 'ok');
    assert.equal(subscriptionVerdict(sub, { now, warnWithinDays: 8 }).status, 'due_soon');
  });

  await test('reposForSubscription normalises string and list forms', () => {
    assert.deepEqual(reposForSubscription({ repositories: 'all' }), ['all']);
    assert.deepEqual(reposForSubscription({ repositories: ['a/b', 'c/d'] }), ['a/b', 'c/d']);
    assert.deepEqual(reposForSubscription({}), []);
  });

  await test('buildReport partitions alerts and unknowns', () => {
    const subs = [
      { name: 'RecurseML', status: 'trial', trial_end: '2026-06-27' },
      { name: 'Far', status: 'active', renewal_date: '2027-01-01' },
      { name: 'NoDate', status: 'active', renewal_date: null },
    ];
    const report = buildReport(subs, { now: AT('2026-06-24T00:00:00Z'), warnWithinDays: 7 });
    assert.equal(report.alerts.length, 1);
    assert.equal(report.alerts[0].sub.name, 'RecurseML');
    assert.equal(report.needsAttention.length, 1);
    assert.equal(report.needsAttention[0].sub.name, 'NoDate');
  });

  await test('renderIssueBody includes marker and flags the RecurseML trial', () => {
    const subs = [{ name: 'RecurseML', status: 'trial', trial_end: '2026-06-27', cost: 250, currency: 'USD', billing_cycle: 'annual', repositories: 'all' }];
    const report = buildReport(subs, { now: AT('2026-06-24T00:00:00Z') });
    const body = renderIssueBody(report);
    assert.ok(body.includes('<!-- subscription-tracker -->'));
    assert.ok(body.includes('RecurseML'));
    assert.ok(body.includes('Action needed'));
  });

  await test('the seeded data/subscriptions.yml loads and contains RecurseML', () => {
    const file = path.join(__dirname, '..', 'data', 'subscriptions.yml');
    const subs = loadSubscriptions(file);
    assert.ok(subs.length >= 1);
    const recurseml = subs.find((s) => s.name === 'RecurseML');
    assert.ok(recurseml, 'RecurseML must be seeded');
    assert.equal(recurseml.trial_end, '2026-06-27');
  });

  await test('DEFAULT_WARN_WITHIN_DAYS is a sane positive default', () => {
    assert.ok(DEFAULT_WARN_WITHIN_DAYS > 0);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();

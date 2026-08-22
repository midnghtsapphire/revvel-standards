'use strict';

/**
 * COST FREEZE GUARD (2026-08-21).
 *
 * The repository was billing ~496 scheduled workflow runs per day — roughly
 * 15,000 runs a month — across 46 workflows, on a repository with no product
 * traffic. Three schedules alone accounted for 336 of those runs/day:
 *
 *   every 15 min       agent-monitor.yml       96/day
 *   every 15 min       wr-field-filler.yml     96/day
 *   4x per hour        fleet-controller.yml    96/day
 *   every 30 min       api-monitor.yml         48/day
 *
 * Every one of those runs bills Actions minutes whether or not anything
 * changed, and many of them also spend OpenRouter credits. Nobody was reading
 * the output.
 *
 * The schedules are commented out in place, not deleted (RVS-AGENT-001), and
 * every affected workflow keeps `workflow_dispatch` so it can still be run on
 * demand. This test is the consumer for that decision: without it, a single
 * uncommented `- cron:` line silently restarts the meter, and the way we would
 * find out is a bill.
 *
 * Re-enabling a schedule is allowed. It is not allowed to be invisible: add the
 * workflow's filename to ALLOWED_SCHEDULED below, with a comment saying who
 * decided and what the run rate costs. The list is name-pinned rather than a
 * count (RVS-VERIFY-001) so that swapping one schedule for another cannot pass
 * unnoticed.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');

/** Workflows explicitly permitted to run on a schedule. Empty by decision. */
const ALLOWED_SCHEDULED = [];

/** Budget ceiling. Derived below; asserted so a drift shows up as a number. */
const MAX_SCHEDULED_RUNS_PER_DAY = 0;

const NAMES = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

function toNumber(token) {
  const t = token.trim().toUpperCase();
  return /^\d+$/.test(t) ? Number(t) : NAMES[t];
}

/** Expand one cron field into the set of values it matches. */
function expandField(field, lo, hi) {
  const out = new Set();
  for (const part of field.split(',')) {
    let [range, stepRaw] = part.split('/');
    const step = stepRaw ? Number(stepRaw) : 1;
    let a;
    let b;
    if (range === '*' || range === '') {
      a = lo;
      b = hi;
    } else if (range.includes('-')) {
      const [p, q] = range.split('-');
      a = toNumber(p);
      b = toNumber(q);
    } else {
      a = toNumber(range);
      b = a;
    }
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return out;
}

/** Approximate runs per day for a 5-field cron expression. */
function runsPerDay(cron) {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) return null;
  const minutes = expandField(f[0], 0, 59);
  const hours = expandField(f[1], 0, 23);
  if (!minutes || !hours) return null;
  let perDay = minutes.size * hours.size;
  if (f[2] !== '*') {
    const dom = expandField(f[2], 1, 31);
    if (dom) perDay *= dom.size / 30.44;
  }
  if (f[3] !== '*') {
    const mon = expandField(f[3], 1, 12);
    if (mon) perDay *= mon.size / 12;
  }
  if (f[4] !== '*') {
    const dow = expandField(f[4], 0, 6);
    if (dow) perDay *= dow.size / 7;
  }
  return perDay;
}

/**
 * Only files directly in .github/workflows are executed by GitHub. Files in
 * subdirectories (e.g. .github/workflows/cron/) are inert templates.
 */
function liveWorkflows() {
  return fs
    .readdirSync(WORKFLOW_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

/** Uncommented `- cron:` entries in a workflow, with their expressions. */
function activeCrons(filename) {
  const text = fs.readFileSync(path.join(WORKFLOW_DIR, filename), 'utf8');
  const found = [];
  for (const line of text.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*-\s*cron:\s*(.+?)\s*$/);
    if (!m) continue;
    const expr = m[1]
      .replace(/^['"]/, '')
      .replace(/['"].*$/, '')
      .replace(/\s+#.*$/, '')
      .trim();
    if (expr) found.push(expr);
  }
  return found;
}

test('no live workflow runs on a schedule unless explicitly allowed', () => {
  const offenders = [];
  for (const wf of liveWorkflows()) {
    if (ALLOWED_SCHEDULED.includes(wf)) continue;
    for (const cron of activeCrons(wf)) {
      offenders.push(`${wf}: ${cron} (~${(runsPerDay(cron) ?? 0).toFixed(1)} runs/day)`);
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'Scheduled runs bill Actions minutes on every fire, whether or not anything ' +
      'changed. These schedules are active but not in ALLOWED_SCHEDULED:\n  ' +
      offenders.join('\n  ') +
      '\nIf a schedule is genuinely wanted, add the filename to ALLOWED_SCHEDULED ' +
      'in this file with the decision and its run rate.',
  );
});

test('total scheduled run rate stays within the agreed budget', () => {
  let total = 0;
  const breakdown = [];
  for (const wf of liveWorkflows()) {
    for (const cron of activeCrons(wf)) {
      const rate = runsPerDay(cron);
      if (rate === null) continue;
      total += rate;
      breakdown.push(`${wf}: ${cron} = ${rate.toFixed(1)}/day`);
    }
  }
  assert.ok(
    total <= MAX_SCHEDULED_RUNS_PER_DAY,
    `Scheduled workflow runs total ~${total.toFixed(0)}/day ` +
      `(~${(total * 30).toFixed(0)}/month), over the ${MAX_SCHEDULED_RUNS_PER_DAY}/day ` +
      `ceiling:\n  ${breakdown.join('\n  ')}`,
  );
});

test('every de-scheduled workflow can still be run by hand', () => {
  const stranded = [];
  for (const wf of liveWorkflows()) {
    const text = fs.readFileSync(path.join(WORKFLOW_DIR, wf), 'utf8');
    // Only workflows whose schedule we commented out during the cost freeze.
    if (!/^\s*#\s*schedule:\s*$/m.test(text)) continue;
    if (!/^\s*workflow_dispatch:/m.test(text)) stranded.push(wf);
  }
  assert.deepStrictEqual(
    stranded,
    [],
    'These workflows had their schedule commented out but expose no ' +
      `workflow_dispatch trigger, so there is now no way to run them at all:\n  ${stranded.join('\n  ')}`,
  );
});

'use strict';

// Subscription & repository tracker.
//
// Reads data/subscriptions.yml (the SSOT inventory of paid/trial third-party
// tools, GitHub Apps and SaaS) and computes, per entry, how close it is to a
// trial expiry or a renewal charge — so a trial like RecurseML's 14-day window
// never lapses silently or auto-converts to a paid plan unnoticed.
//
// Everything here is pure and clock-injectable so the logic is unit-testable;
// the workflow (.github/workflows/subscription-tracker.yml) wires it to GitHub.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// Default warning window: surface anything due within this many days.
const DEFAULT_WARN_WITHIN_DAYS = 7;

// Where the SSOT lives, relative to the repo root.
const DEFAULT_SUBSCRIPTIONS_FILE = path.join('data', 'subscriptions.yml');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Parse a YYYY-MM-DD string into a UTC timestamp at midnight. Returns null for
// missing/invalid input so callers can treat the due-date as "unknown".
function parseDate(dateStr) {
  if (!dateStr) return null;
  const value = String(dateStr).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

// Whole days from `now` until `dateStr` (negative = already past). null when the
// date is missing/unparseable.
function daysUntil(dateStr, now = Date.now()) {
  const target = parseDate(dateStr);
  if (target == null) return null;
  return Math.ceil((target - now) / MS_PER_DAY);
}

// The date that actually matters for a subscription: a trial's expiry while on
// trial, otherwise the renewal date. Returns { kind, date } with date possibly
// null when unknown.
function effectiveDueDate(sub) {
  if (sub && sub.status === 'trial' && sub.trial_end) {
    return { kind: 'trial', date: sub.trial_end };
  }
  if (sub && sub.renewal_date) {
    return { kind: 'renewal', date: sub.renewal_date };
  }
  // A trial with no end date is still a trial, just an unknown one.
  if (sub && sub.status === 'trial') {
    return { kind: 'trial', date: sub.trial_end || null };
  }
  return { kind: 'renewal', date: null };
}

// Verdict on a single subscription relative to `now`.
//   status: 'expired' | 'due_soon' | 'ok' | 'unknown' | 'cancelled'
function subscriptionVerdict(sub, { now = Date.now(), warnWithinDays = DEFAULT_WARN_WITHIN_DAYS } = {}) {
  if (sub && sub.status === 'cancelled') {
    return { status: 'cancelled', kind: null, dueDate: null, daysRemaining: null };
  }
  const { kind, date } = effectiveDueDate(sub);
  const daysRemaining = daysUntil(date, now);

  if (daysRemaining == null) {
    return { status: 'unknown', kind, dueDate: date, daysRemaining: null };
  }
  if (daysRemaining < 0) {
    return { status: 'expired', kind, dueDate: date, daysRemaining };
  }
  if (daysRemaining <= warnWithinDays) {
    return { status: 'due_soon', kind, dueDate: date, daysRemaining };
  }
  return { status: 'ok', kind, dueDate: date, daysRemaining };
}

// Normalise the repositories field into an array of strings. "all" stays as
// ["all"]; a single string becomes a one-element array; a list passes through.
function reposForSubscription(sub) {
  const repos = sub ? sub.repositories : null;
  if (repos == null) return [];
  if (Array.isArray(repos)) return repos.filter(Boolean).map(String);
  return [String(repos)];
}

// Load and shallow-validate the subscriptions file.
function loadSubscriptions(file = DEFAULT_SUBSCRIPTIONS_FILE) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = YAML.parse(raw);
  const list = doc && Array.isArray(doc.subscriptions) ? doc.subscriptions : [];
  return list.filter((entry) => entry && entry.name);
}

// Build a full report over a list of subscriptions.
function buildReport(subscriptions, { now = Date.now(), warnWithinDays = DEFAULT_WARN_WITHIN_DAYS } = {}) {
  const items = subscriptions.map((sub) => ({
    sub,
    repos: reposForSubscription(sub),
    verdict: subscriptionVerdict(sub, { now, warnWithinDays }),
  }));

  const alerts = items.filter(
    (item) => item.verdict.status === 'expired' || item.verdict.status === 'due_soon'
  );
  const needsAttention = items.filter((item) => item.verdict.status === 'unknown');

  return { items, alerts, needsAttention, now, warnWithinDays };
}

const STATUS_EMOJI = {
  expired: '🔴',
  due_soon: '🟠',
  unknown: '⚪',
  ok: '🟢',
  cancelled: '⚫',
};

function describeDays(verdict) {
  if (verdict.daysRemaining == null) return '—';
  if (verdict.daysRemaining < 0) return `${Math.abs(verdict.daysRemaining)}d overdue`;
  if (verdict.daysRemaining === 0) return 'today';
  return `${verdict.daysRemaining}d`;
}

// Render a Markdown body suitable for a GitHub tracking issue.
function renderIssueBody(report, { marker = '<!-- subscription-tracker -->' } = {}) {
  const lines = [];
  lines.push(marker);
  lines.push('## 📅 Subscription & Trial Tracker');
  lines.push('');
  lines.push(
    `Generated ${new Date(report.now).toISOString().slice(0, 10)} · warning window: **${report.warnWithinDays} days** · source: \`data/subscriptions.yml\``
  );
  lines.push('');

  if (report.alerts.length > 0) {
    lines.push('### ⚠️ Action needed');
    lines.push('');
    for (const { sub, verdict } of report.alerts) {
      const what = verdict.kind === 'trial' ? 'trial ends' : 'renews';
      const when =
        verdict.status === 'expired'
          ? `**${what} ${describeDays(verdict)}** (was ${verdict.dueDate})`
          : `**${what} in ${describeDays(verdict)}** (${verdict.dueDate})`;
      lines.push(`- ${STATUS_EMOJI[verdict.status]} **${sub.name}** — ${when}.`);
    }
    lines.push('');
  } else {
    lines.push('✅ No trials expiring or subscriptions renewing inside the warning window.');
    lines.push('');
  }

  lines.push('### Inventory');
  lines.push('');
  lines.push('| Status | Name | Kind | Due | When | Cost | Repos |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const { sub, verdict, repos } of report.items) {
    const cost =
      sub.cost == null
        ? '—'
        : `${sub.cost} ${sub.currency || ''}/${sub.billing_cycle || ''}`.trim();
    const repoLabel = repos.length === 0 ? '—' : repos.join(', ');
    const kind = verdict.kind || '—';
    lines.push(
      `| ${STATUS_EMOJI[verdict.status] || ''} ${verdict.status} | ${sub.name} | ${kind} | ${verdict.dueDate || '—'} | ${describeDays(verdict)} | ${cost} | ${repoLabel} |`
    );
  }
  lines.push('');

  if (report.needsAttention.length > 0) {
    lines.push('### ⚪ Missing dates (fill in `data/subscriptions.yml`)');
    lines.push('');
    for (const { sub } of report.needsAttention) {
      lines.push(`- ${sub.name}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('_Maintained by `.github/workflows/subscription-tracker.yml`. Edit `data/subscriptions.yml` to update._');
  return lines.join('\n');
}

// CLI: print the report. Exits non-zero only with --check when something is
// expired/due-soon, so it can optionally gate other automation.
function main(argv = process.argv.slice(2)) {
  const checkMode = argv.includes('--check');
  const fileArg = argv.find((a) => a.startsWith('--file='));
  const file = fileArg ? fileArg.split('=')[1] : DEFAULT_SUBSCRIPTIONS_FILE;
  const warnArg = argv.find((a) => a.startsWith('--warn-within-days='));
  const warnWithinDays = warnArg ? parseInt(warnArg.split('=')[1], 10) : DEFAULT_WARN_WITHIN_DAYS;

  const subscriptions = loadSubscriptions(file);
  const report = buildReport(subscriptions, { warnWithinDays });
  process.stdout.write(`${renderIssueBody(report)}\n`);

  if (checkMode && report.alerts.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_WARN_WITHIN_DAYS,
  DEFAULT_SUBSCRIPTIONS_FILE,
  parseDate,
  daysUntil,
  effectiveDueDate,
  subscriptionVerdict,
  reposForSubscription,
  loadSubscriptions,
  buildReport,
  renderIssueBody,
  main,
};

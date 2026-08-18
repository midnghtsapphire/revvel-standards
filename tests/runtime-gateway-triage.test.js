#!/usr/bin/env node
'use strict';

/**
 * WR-4474 / WR-4481 acceptance tests:
 *  - Sentry → classify → issue → agent-assignment path
 *  - FAILURE-LEDGER write on every triage
 *  - 402/429 failover to keyless Perplexity is machine-checked (not prose)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  normalizeEvent,
  classifyEvent,
  decideRoute,
  issueLabels,
  buildIssueTitle,
  buildIssueBody,
  triageRuntimeEvent,
  RECURRENCE_WINDOW_MS,
  ESCALATION_THRESHOLD,
} = require('../scripts/runtime-gateway-triage');

const {
  buildEntry,
  appendFailureLedger,
  readFailureLedger,
  countRecentMatches,
  ALLOWED_CLASSES,
} = require('../scripts/failure-ledger');

const {
  decideFailover,
  applyFailover,
  extractStatusCode,
  hasExplicitKeylessFailover,
  loadRoutingTable,
} = require('../scripts/lane-failover');

function tmpLedger() {
  return path.join(
    os.tmpdir(),
    `failure-ledger-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
  );
}

// ── failure-ledger ──────────────────────────────────────────────────────────

test('buildEntry rejects unknown class and missing required fields', () => {
  assert.throws(() => buildEntry({ agent: 'a', class: 'nope', trigger: 't', summary: 's' }));
  assert.throws(() => buildEntry({ class: 'other', trigger: 't', summary: 's' }));
  assert.throws(() => buildEntry({ agent: 'a', class: 'other', summary: 's' }));
});

test('appendFailureLedger writes schema-shaped JSONL', () => {
  const p = tmpLedger();
  try {
    const { entry } = appendFailureLedger(
      {
        agent: 'runtime-gateway-triage',
        class: 'runtime-500',
        trigger: '500',
        summary: 'test entry',
        service: 'mind-mappr',
        root_cause: 'fp-1',
      },
      { path: p },
    );
    assert.equal(entry.class, 'runtime-500');
    assert.ok(ALLOWED_CLASSES.has(entry.class));
    const rows = readFailureLedger(p);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].service, 'mind-mappr');
  } finally {
    fs.rmSync(p, { force: true });
  }
});

test('countRecentMatches respects 24h window and fingerprint', () => {
  const p = tmpLedger();
  try {
    const now = '2026-08-08T12:00:00.000Z';
    appendFailureLedger(
      {
        ts: '2026-08-08T10:00:00.000Z',
        agent: 't',
        class: 'runtime-502',
        trigger: '502',
        summary: 'first',
        service: 'api',
        root_cause: 'fp-A',
      },
      { path: p },
    );
    appendFailureLedger(
      {
        ts: '2026-08-07T10:00:00.000Z',
        agent: 't',
        class: 'runtime-502',
        trigger: '502',
        summary: 'old',
        service: 'api',
        root_cause: 'fp-A',
      },
      { path: p },
    );
    const n = countRecentMatches(
      {
        class: 'runtime-502',
        service: 'api',
        root_cause: 'fp-A',
        withinMs: RECURRENCE_WINDOW_MS,
        now,
      },
      p,
    );
    assert.equal(n, 1, 'only the in-window match counts');
  } finally {
    fs.rmSync(p, { force: true });
  }
});

// ── classification + routing ────────────────────────────────────────────────

test('normalizeEvent extracts Sentry exception stack and status', () => {
  const event = normalizeEvent({
    event: {
      event_id: 'abc123',
      title: 'HTTP 500 Internal Server Error',
      environment: 'production',
      server_name: 'music-video-creator',
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'Cannot read properties of undefined',
            stacktrace: {
              frames: [
                { filename: 'app/api/route.ts', lineno: 42, function: 'handler' },
              ],
            },
          },
        ],
      },
      tags: [{ key: 'http_status', value: '500' }],
    },
  });
  assert.equal(event.statusCode, 500);
  assert.equal(event.service, 'music-video-creator');
  assert.match(event.stack, /TypeError/);
  assert.match(event.stack, /handler/);
  assert.ok(event.fingerprint);
});

test('classifyEvent maps 500/stack → 500-app, 502/503/504 → infra, 429/402 → lane', () => {
  assert.equal(
    classifyEvent(normalizeEvent({ statusCode: 500, stack: 'at x', message: 'boom' })).className,
    '500-app',
  );
  assert.equal(
    classifyEvent(normalizeEvent({ statusCode: 502, message: 'Bad Gateway' })).className,
    '502-upstream',
  );
  assert.equal(
    classifyEvent(normalizeEvent({ statusCode: 503, message: 'cold start' })).className,
    '503-capacity',
  );
  assert.equal(
    classifyEvent(normalizeEvent({ statusCode: 504, message: 'gateway timeout' })).className,
    '504-upstream',
  );
  assert.equal(
    classifyEvent(normalizeEvent({ statusCode: 429, message: 'rate limit' })).className,
    '429-model-lane',
  );
  assert.equal(
    classifyEvent(normalizeEvent({ statusCode: 402, message: 'Payment Required' })).className,
    '402-model-lane',
  );
});

test('decideRoute: 500-with-stack opens issue and assigns fix agent', () => {
  const event = normalizeEvent({ statusCode: 500, stack: 'at foo', message: 'err', service: 'svc' });
  const c = classifyEvent(event);
  const r = decideRoute(c, event, {});
  assert.equal(r.action, 'open-issue-assign-fix');
  assert.equal(r.openIssue, true);
  assert.equal(r.assignFixAgent, true);
  const labels = issueLabels(c, r);
  assert.ok(labels.includes('auto-fix'));
  assert.ok(labels.includes('openrouter'));
  assert.ok(labels.includes('work-request'));
});

test('decideRoute: infra is runbook-first; issue only on 24h recurrence', () => {
  const event = normalizeEvent({ statusCode: 502, message: 'bad gateway', service: 'api' });
  const c = classifyEvent(event);
  const first = decideRoute(c, event, { infraRecurrence: 0 });
  assert.equal(first.action, 'runbook-first');
  assert.equal(first.openIssue, false);

  const again = decideRoute(c, event, { infraRecurrence: 1 });
  assert.equal(again.action, 'infra-recurrence-issue');
  assert.equal(again.openIssue, true);
  assert.equal(again.assignFixAgent, false);
  const labels = issueLabels(c, again);
  assert.ok(labels.includes('infrastructure'));
  assert.ok(!labels.includes('auto-fix'), 'infra recurrence is not a fix-agent path');
});

test('decideRoute: 402/429 forces lane-failover (no code-change issue)', () => {
  const event = normalizeEvent({ statusCode: 429, message: 'rate limited' });
  const c = classifyEvent(event);
  const r = decideRoute(c, event, {});
  assert.equal(r.action, 'lane-failover');
  assert.equal(r.openIssue, false);
});

test('decideRoute escalates needs-human at 3×/7d', () => {
  const event = normalizeEvent({ statusCode: 500, stack: 'at x', message: 'e' });
  const c = classifyEvent(event);
  const r = decideRoute(c, event, { weekRecurrence: ESCALATION_THRESHOLD - 1 });
  assert.equal(r.escalateNeedsHuman, true);
  assert.ok(issueLabels(c, r).includes('needs-human'));
});

// ── end-to-end triageRuntimeEvent ───────────────────────────────────────────

test('triageRuntimeEvent: 500-with-stack writes ledger + opens assigned issue', async () => {
  const p = tmpLedger();
  const created = [];
  try {
    const result = await triageRuntimeEvent(
      {
        statusCode: 500,
        message: 'Unhandled exception in /api/render',
        stack: 'Error: boom\n    at render (app/api/render/route.ts:12:3)',
        service: 'music-video-creator',
        environment: 'production',
        url: 'https://sentry.example/issues/1',
      },
      {
        ledgerPath: p,
        dryRun: true,
        createIssue: (args) => {
          created.push(args);
          return { number: 99, url: 'https://github.com/o/r/issues/99', dryRun: true };
        },
      },
    );

    assert.equal(result.classification.className, '500-app');
    assert.equal(result.route.action, 'open-issue-assign-fix');
    assert.equal(result.ledgerEntry.class, 'runtime-500');
    assert.equal(created.length, 1);
    assert.ok(created[0].labels.includes('auto-fix'));
    assert.ok(created[0].labels.includes('openrouter'));
    assert.match(created[0].body, /Trace \/ stack/);
    assert.match(created[0].body, /render/);
    assert.equal(readFailureLedger(p).length, 1);
  } finally {
    fs.rmSync(p, { force: true });
  }
});

test('triageRuntimeEvent: infra first sighting is ledger-only (no issue)', async () => {
  const p = tmpLedger();
  const created = [];
  try {
    const result = await triageRuntimeEvent(
      { statusCode: 503, message: 'capacity', service: 'edge' },
      {
        ledgerPath: p,
        createIssue: (args) => {
          created.push(args);
          return { number: 1, url: 'u', dryRun: true };
        },
      },
    );
    assert.equal(result.route.action, 'runbook-first');
    assert.equal(created.length, 0);
    assert.equal(result.ledgerEntry.class, 'runtime-503');
  } finally {
    fs.rmSync(p, { force: true });
  }
});

test('triageRuntimeEvent: infra recurrence within 24h opens issue', async () => {
  const p = tmpLedger();
  const created = [];
  const now = '2026-08-08T18:00:00.000Z';
  try {
    // Seed prior occurrence.
    appendFailureLedger(
      {
        ts: '2026-08-08T12:00:00.000Z',
        agent: 't',
        class: 'runtime-502',
        trigger: '502',
        summary: 'prior',
        service: 'edge',
        root_cause: normalizeEvent({
          statusCode: 502,
          message: 'Bad Gateway',
          service: 'edge',
        }).fingerprint,
      },
      { path: p },
    );

    const result = await triageRuntimeEvent(
      { statusCode: 502, message: 'Bad Gateway', service: 'edge' },
      {
        ledgerPath: p,
        now,
        createIssue: (args) => {
          created.push(args);
          return { number: 7, url: 'https://example/issues/7', dryRun: true };
        },
      },
    );
    assert.equal(result.route.action, 'infra-recurrence-issue');
    assert.equal(created.length, 1);
    assert.ok(result.counts.infraRecurrence >= 1);
  } finally {
    fs.rmSync(p, { force: true });
  }
});

test('triageRuntimeEvent: every path writes FAILURE-LEDGER (including 429)', async () => {
  const p = tmpLedger();
  try {
    await triageRuntimeEvent(
      { statusCode: 429, message: 'rate limit openrouter', service: 'triage' },
      {
        ledgerPath: p,
        skipSleep: true,
        callTier2: async () => ({ text: 'ok' }),
        createIssue: () => {
          throw new Error('should not open issue on lane failover');
        },
      },
    );
    const rows = readFailureLedger(p);
    assert.ok(rows.length >= 1, 'at least the triage ledger row');
    assert.ok(rows.some((r) => r.class === 'lane-429' || r.class === 'lane-failover'));
  } finally {
    fs.rmSync(p, { force: true });
  }
});

test('buildIssueTitle/body include class and ledger blob', () => {
  const event = normalizeEvent({ statusCode: 500, message: 'x', stack: 'at y', service: 's' });
  const c = classifyEvent(event);
  const r = decideRoute(c, event, {});
  const title = buildIssueTitle(event, c);
  assert.match(title, /runtime-500/);
  const body = buildIssueBody(event, c, r, {
    ts: 't',
    agent: 'a',
    class: 'runtime-500',
    trigger: '500',
    summary: 's',
  });
  assert.match(body, /FAILURE-LEDGER/);
  assert.match(body, /human merge required/i);
});

// ── lane failover (WR-4481) ─────────────────────────────────────────────────

test('routing table wires explicit 402/429 → keyless Perplexity (not prose)', () => {
  const routing = loadRoutingTable();
  assert.equal(hasExplicitKeylessFailover(routing), true);
  const primary = routing.lanes.text.primary;
  assert.equal(primary.triggers['402'], 'failover');
  assert.equal(primary.triggers['429'], 'backoff_then_failover');
  // Fallback id resolves to a keyless node.
  const decision = decideFailover({ status: 402, routing });
  assert.equal(decision.action, 'failover');
  assert.ok(decision.toLane);
  assert.equal(decision.toLane.keyless, true);
  assert.match(decision.toLane.provider, /perplexity/i);
});

test('extractStatusCode reads HTTP 402/429 from Error messages', () => {
  assert.equal(extractStatusCode(new Error('HTTP 402: Payment Required')), 402);
  assert.equal(extractStatusCode(new Error('OpenRouter API returned status 429: ...')), 429);
  assert.equal(extractStatusCode({ status: 503 }), 503);
});

test('decideFailover: 402 immediate failover; 429 backoff_then_failover', () => {
  const d402 = decideFailover({ status: 402 });
  assert.equal(d402.action, 'failover');
  assert.equal(d402.backoffSeconds, 0);
  assert.ok(d402.toLane.keyless);

  const d429 = decideFailover({ status: 429 });
  assert.equal(d429.action, 'backoff_then_failover');
  assert.ok(d429.backoffSeconds > 0 && d429.backoffSeconds <= 30);
  assert.ok(d429.toLane.keyless);
});

test('applyFailover on 402 calls tier-2 and writes lane-failover ledger', async () => {
  const p = tmpLedger();
  const calls = [];
  try {
    const result = await applyFailover({
      status: 402,
      skipSleep: true,
      taskRef: '#16467',
      repo: 'midnghtsapphire/revvel-standards',
      callTier2: async (lane) => {
        calls.push(lane);
        return { text: 'keyless-ok' };
      },
      writeLedger: (partial) => appendFailureLedger(partial, { path: p }),
    });
    assert.equal(result.decision.action, 'failover');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].keyless, true);
    assert.equal(result.result.text, 'keyless-ok');
    assert.equal(result.ledger.class, 'lane-failover');
    assert.equal(readFailureLedger(p).length, 1);
  } finally {
    fs.rmSync(p, { force: true });
  }
});

test('applyFailover on 429 sleeps once (≤30s) then fails over', async () => {
  const sleeps = [];
  const result = await applyFailover({
    status: 429,
    skipSleep: false,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    callTier2: async () => ({ ok: true }),
    writeLedger: (partial) => ({ entry: { ...partial, class: partial.class || 'lane-failover' } }),
  });
  assert.equal(result.decision.action, 'backoff_then_failover');
  assert.equal(sleeps.length, 1);
  assert.ok(sleeps[0] > 0 && sleeps[0] <= 30_000);
});

test('workflow file exists and declares sentry repository_dispatch', () => {
  const wf = fs.readFileSync(
    path.join(__dirname, '../.github/workflows/runtime-gateway-triage.yml'),
    'utf8',
  );
  assert.match(wf, /name:\s*Runtime Gateway Triage/);
  assert.match(wf, /repository_dispatch/);
  assert.match(wf, /sentry/);
  assert.match(wf, /runtime-5xx/);
  assert.match(wf, /runtime-gateway-triage\.js/);
  assert.match(wf, /FAILURE_LEDGER_PATH/);
  // Human-merge note for 4470-band enforcement machinery.
  assert.match(wf, /human merge required/i);
});

test('config/routing-failover.yml exists with keyless tier-2 triggers', () => {
  const raw = fs.readFileSync(
    path.join(__dirname, '../config/routing-failover.yml'),
    'utf8',
  );
  assert.match(raw, /["']?402["']?:\s*failover/);
  assert.match(raw, /["']?429["']?:\s*backoff_then_failover/);
  assert.match(raw, /provider:\s*perplexity/);
  assert.match(raw, /keyless:\s*true/);
});

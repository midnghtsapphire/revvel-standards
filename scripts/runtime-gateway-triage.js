#!/usr/bin/env node
'use strict';

/**
 * WR-4474 Runtime Gateway Triage — Sentry → classify → route → FAILURE-LEDGER.
 *
 * Capture path:
 *   1. Sentry webhook / repository_dispatch / workflow_dispatch payload
 *   2. Classify: 500-app | 502/504-upstream | 503-capacity | 429-model-lane | other
 *   3. Route:
 *        - 500 w/ stack → open issue with trace; Dragnet labels assign fix agent
 *        - 502/503/504  → runbook-first; issue only on recurrence within 24h
 *        - 402/429 lane → WR-4481 lane failover BEFORE any code change
 *   4. EVERY triage writes FAILURE-LEDGER (class, service, root cause, fix ref)
 *
 * Enforcement machinery: human merge required for this wiring (4470-band).
 *
 * Env:
 *   GITHUB_TOKEN / GH_TOKEN   required to open/comment issues
 *   GITHUB_REPOSITORY         owner/repo (default midnghtsapphire/revvel-standards)
 *   SENTRY_EVENT_JSON         raw Sentry event JSON (or pass via --event-file)
 *   RUNTIME_EVENT_JSON        normalized event JSON alternative
 *   DRY_RUN=true              classify + ledger only; do not call GitHub
 *   FAILURE_LEDGER_PATH       override ledger path
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  appendFailureLedger,
  countRecentMatches,
  defaultLedgerPath,
} = require('./failure-ledger');
const {
  decideFailover,
  applyFailover,
  extractStatusCode,
  hasExplicitKeylessFailover,
} = require('./lane-failover');

const RECURRENCE_WINDOW_MS = 24 * 60 * 60 * 1000;
const ESCALATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ESCALATION_THRESHOLD = 3;
const MAX_TRACE_CHARS = 12000;
const MAX_TITLE_CHARS = 180;

const CLASS_TO_LEDGER = {
  '500-app': 'runtime-500',
  '502-upstream': 'runtime-502',
  '503-capacity': 'runtime-503',
  '504-upstream': 'runtime-504',
  '429-model-lane': 'lane-429',
  '402-model-lane': 'lane-402',
  other: 'other',
};

const INFRA_CLASSES = new Set(['502-upstream', '503-capacity', '504-upstream']);
const LANE_CLASSES = new Set(['429-model-lane', '402-model-lane']);

/**
 * Normalize a Sentry-ish or platform payload into a stable event shape.
 *
 * @param {object} raw
 * @returns {{
 *   statusCode: number|null,
 *   message: string,
 *   stack: string,
 *   service: string,
 *   environment: string,
 *   fingerprint: string,
 *   traceUrl: string,
 *   eventId: string,
 *   tags: object,
 *   raw: object,
 * }}
 */
function normalizeEvent(raw = {}) {
  // Sentry issue webhook: { action, data: { issue } } or event payload.
  const issue = raw?.data?.issue || raw?.issue || null;
  const event = raw?.data?.event || raw?.event || raw;

  const tags = collectTags(event, issue);
  const statusCode =
    coerceStatus(
      tags.status_code
        || tags.http_status
        || event?.contexts?.response?.status_code
        || event?.request?.status_code
        || raw?.statusCode
        || raw?.status_code
        || issue?.metadata?.value,
    )
    || coerceStatus(event?.title)
    || coerceStatus(issue?.title)
    || coerceStatus(event?.message)
    || null;

  const message =
    String(
      event?.title
        || issue?.title
        || event?.message
        || raw?.message
        || 'runtime gateway error',
    ).trim();

  const stack = extractStack(event, raw);
  const service = String(
    tags.service
      || tags.server_name
      || event?.server_name
      || issue?.project?.slug
      || raw?.service
      || 'unknown-service',
  );
  const environment = String(
    tags.environment
      || event?.environment
      || issue?.project?.platform
      || raw?.environment
      || 'production',
  );
  const eventId = String(
    event?.event_id || event?.id || issue?.id || raw?.event_id || raw?.id || '',
  );
  const traceUrl = String(
    issue?.permalink
      || event?.web_url
      || raw?.url
      || raw?.traceUrl
      || (eventId ? `sentry://event/${eventId}` : ''),
  );

  const fingerprint = buildFingerprint({
    statusCode,
    message,
    stack,
    service,
    explicit: event?.fingerprint || issue?.fingerprint || raw?.fingerprint,
  });

  return {
    statusCode,
    message,
    stack,
    service,
    environment,
    fingerprint,
    traceUrl,
    eventId,
    tags,
    raw,
  };
}

function collectTags(event, issue) {
  const out = {};
  const sources = [
    event?.tags,
    issue?.tags,
    event?.contexts?.tags,
  ];
  for (const src of sources) {
    if (!src) continue;
    if (Array.isArray(src)) {
      for (const t of src) {
        if (t && t.key != null) out[String(t.key)] = t.value;
      }
    } else if (typeof src === 'object') {
      Object.assign(out, src);
    }
  }
  return out;
}

function coerceStatus(value) {
  if (value == null) return null;
  if (typeof value === 'number' && value >= 100 && value < 600) return value;
  const m = String(value).match(/\b(402|429|500|502|503|504)\b/);
  return m ? Number(m[1]) : null;
}

function extractStack(event, raw) {
  if (typeof raw?.stack === 'string' && raw.stack.trim()) return raw.stack.trim();
  if (typeof event?.stacktrace === 'string') return event.stacktrace;
  const entries =
    event?.exception?.values
    || event?.entries?.find?.((e) => e.type === 'exception')?.data?.values
    || [];
  if (Array.isArray(entries) && entries.length) {
    const parts = [];
    for (const ex of entries) {
      if (ex?.type || ex?.value) {
        parts.push(`${ex.type || 'Error'}: ${ex.value || ''}`);
      }
      const frames = ex?.stacktrace?.frames || [];
      for (const fr of frames.slice(-25)) {
        const loc = [fr.filename || fr.abs_path, fr.lineno, fr.colno]
          .filter((x) => x != null && x !== '')
          .join(':');
        parts.push(`  at ${fr.function || '?'} (${loc || 'unknown'})`);
      }
    }
    if (parts.length) return parts.join('\n');
  }
  if (typeof event?.culprit === 'string') return event.culprit;
  return '';
}

function buildFingerprint({ statusCode, message, stack, service, explicit }) {
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map(String).join('|').slice(0, 200);
  }
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim().slice(0, 200);
  const topFrame = String(stack || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('at ') || l.includes('/')) || '';
  const msgKey = String(message || '')
    .replace(/\b[0-9a-f]{8,}\b/gi, '#')
    .replace(/\d+/g, '#')
    .slice(0, 80);
  return [service || 'svc', statusCode || 'x', msgKey, topFrame.slice(0, 80)]
    .join('|')
    .slice(0, 200);
}

/**
 * Classify a normalized event per WR-4474 table.
 *
 * @param {ReturnType<typeof normalizeEvent>} event
 * @returns {{
 *   className: string,
 *   ledgerClass: string,
 *   isInfra: boolean,
 *   isLane: boolean,
 *   isApp500: boolean,
 *   hasStack: boolean,
 *   runbook: string|null,
 * }}
 */
function classifyEvent(event) {
  const status = event.statusCode;
  const hasStack = Boolean(event.stack && event.stack.trim());
  const msg = `${event.message} ${event.stack}`.toLowerCase();

  let className = 'other';
  let runbook = null;

  if (status === 402 || /\bpayment required\b|\bcredit[s]?\b.*exhaust/i.test(msg)) {
    className = '402-model-lane';
  } else if (status === 429 || /\brate.?limit/.test(msg)) {
    className = '429-model-lane';
  } else if (status === 503 || /\bcold start\b|\bcapacity\b|\bdeploy in flight\b/.test(msg)) {
    className = '503-capacity';
    runbook = 'runbook: scale / wait-for-deploy / retry-with-backoff';
  } else if (status === 502 || /\bport mismatch\b|\bhealth-?check\b|\bupstream\b.*(?:down|refused)/.test(msg)) {
    className = '502-upstream';
    runbook = 'runbook: restart-service / verify-port / health-check';
  } else if (status === 504 || /\bgateway timeout\b|\bupstream timeout\b/.test(msg)) {
    className = '504-upstream';
    runbook = 'runbook: restart-service / raise-timeout / check-upstream';
  } else if (status === 500 || hasStack) {
    className = '500-app';
  } else if (status && status >= 500) {
    className = '502-upstream';
    runbook = 'runbook: restart-service / verify-port / health-check';
  }

  return {
    className,
    ledgerClass: CLASS_TO_LEDGER[className] || 'other',
    isInfra: INFRA_CLASSES.has(className),
    isLane: LANE_CLASSES.has(className),
    isApp500: className === '500-app',
    hasStack,
    runbook,
  };
}

/**
 * Decide routing action from classification + recurrence counts.
 *
 * @param {object} classification
 * @param {object} event
 * @param {{ infraRecurrence?: number, weekRecurrence?: number }} counts
 */
function decideRoute(classification, event, counts = {}) {
  const infraRecurrence = counts.infraRecurrence || 0;
  const weekRecurrence = counts.weekRecurrence || 0;

  if (classification.isLane) {
    return {
      action: 'lane-failover',
      openIssue: false,
      assignFixAgent: false,
      escalateNeedsHuman: false,
      reason: '402/429 on model lane → WR-4481 failover before any code change',
    };
  }

  if (classification.isApp500 && classification.hasStack) {
    return {
      action: 'open-issue-assign-fix',
      openIssue: true,
      assignFixAgent: true,
      escalateNeedsHuman: weekRecurrence + 1 >= ESCALATION_THRESHOLD,
      reason: '500-app with stack → issue + Dragnet fix-agent assignment',
    };
  }

  if (classification.isApp500 && !classification.hasStack) {
    return {
      action: 'open-issue-assign-fix',
      openIssue: true,
      assignFixAgent: true,
      escalateNeedsHuman: false,
      reason: '500-app without stack → still open issue for investigation',
    };
  }

  if (classification.isInfra) {
    // Runbook first; issue only when this fingerprint already hit within 24h.
    if (infraRecurrence >= 1) {
      return {
        action: 'infra-recurrence-issue',
        openIssue: true,
        assignFixAgent: false,
        escalateNeedsHuman: weekRecurrence + 1 >= ESCALATION_THRESHOLD,
        reason: `infra ${classification.className} recurrence within 24h → open issue`,
      };
    }
    return {
      action: 'runbook-first',
      openIssue: false,
      assignFixAgent: false,
      escalateNeedsHuman: false,
      reason: `infra ${classification.className} first sighting → ${classification.runbook}`,
    };
  }

  return {
    action: 'ledger-only',
    openIssue: false,
    assignFixAgent: false,
    escalateNeedsHuman: false,
    reason: 'unclassified / other → ledger only',
  };
}

function buildIssueTitle(event, classification) {
  const status = event.statusCode || '5xx';
  const svc = event.service || 'service';
  const msg = String(event.message || 'runtime error')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
  return `[runtime-${status}] ${svc}: ${msg}`.slice(0, MAX_TITLE_CHARS);
}

function buildIssueBody(event, classification, route, ledgerEntry) {
  const trace = String(event.stack || '').slice(0, MAX_TRACE_CHARS);
  const lines = [
    '## Runtime Gateway Triage (WR-4474)',
    '',
    'Auto-opened by `scripts/runtime-gateway-triage.js` from a captured 5xx/timeout event.',
    '',
    '### Classification',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| Class | \`${classification.className}\` |`,
    `| HTTP | \`${event.statusCode ?? 'unknown'}\` |`,
    `| Service | \`${event.service}\` |`,
    `| Environment | \`${event.environment}\` |`,
    `| Fingerprint | \`${event.fingerprint}\` |`,
    `| Route | \`${route.action}\` |`,
    `| Reason | ${route.reason} |`,
    '',
    '### Trace / stack',
    '',
    '```',
    trace || '(no stack attached)',
    '```',
    '',
    '### Sentry / source',
    '',
    event.traceUrl ? `- Trace: ${event.traceUrl}` : '- Trace: (none)',
    event.eventId ? `- Event id: \`${event.eventId}\`` : null,
    '',
    '### FAILURE-LEDGER',
    '',
    '```json',
    JSON.stringify(ledgerEntry, null, 2),
    '```',
    '',
    '### Agent assignment',
    '',
    route.assignFixAgent
      ? [
        '- Labels include `auto-fix` + `openrouter` so Dragnet / agent-dispatcher',
        '  routes a fix agent (openrouter-coder) without a human re-triage.',
        '- 4470-band enforcement: the resulting fix PR still requires **human merge**.',
      ].join('\n')
      : '- No fix-agent assignment (infra/runbook or lane-failover path).',
    '',
    classification.runbook ? `### Runbook\n\n- ${classification.runbook}` : null,
    '',
    '### Acceptance hooks',
    '',
    '- [ ] Root cause identified',
    '- [ ] Fix PR linked in FAILURE-LEDGER `fix_ref`',
    '- [ ] Sentry issue resolved on merge',
    '',
    '_Human merge required for enforcement machinery (WR-4470 band)._',
  ].filter((line) => line != null);

  return lines.join('\n');
}

function issueLabels(classification, route) {
  const labels = ['auto-error', 'auto-diagnosed', 'work-request'];
  if (route.assignFixAgent) {
    labels.push('auto-fix', 'openrouter');
  }
  if (classification.isInfra) {
    // Distinguish infra recurrence from app-500 fix-agent issues.
    // `infrastructure` is on the canonical allowlist (config/labels-allowlist.yml).
    labels.push('infrastructure');
  }
  if (route.escalateNeedsHuman) {
    labels.push('needs-human');
  }
  if (classification.isLane) {
    labels.push('openrouter');
  }
  // Dedup while preserving order.
  return [...new Set(labels)];
}

/**
 * Create a GitHub issue via `gh`. Injectable for tests.
 */
function createGitHubIssue({
  repo,
  title,
  body,
  labels,
  execFile = execFileSync,
  dryRun = false,
}) {
  if (dryRun) {
    return {
      number: 0,
      url: `dry-run://issue?title=${encodeURIComponent(title)}`,
      dryRun: true,
    };
  }
  const tmpFile = path.join(
    require('os').tmpdir(),
    `runtime-gateway-triage-${Date.now()}.md`,
  );
  fs.writeFileSync(tmpFile, body, 'utf8');
  try {
    const args = [
      'issue', 'create',
      '--repo', repo,
      '--title', title,
      '--body-file', tmpFile,
    ];
    for (const label of labels) {
      args.push('--label', label);
    }
    const out = execFile('gh', args, {
      encoding: 'utf8',
      env: {
        ...process.env,
        GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
      },
    });
    const url = String(out).trim().split(/\s+/).find((t) => t.startsWith('http')) || String(out).trim();
    const m = url.match(/\/issues\/(\d+)/);
    return { number: m ? Number(m[1]) : 0, url, dryRun: false };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Full triage pipeline. Returns a structured result for logging/tests.
 *
 * @param {object} rawEvent
 * @param {object} [opts]
 */
async function triageRuntimeEvent(rawEvent, opts = {}) {
  const dryRun = opts.dryRun ?? process.env.DRY_RUN === 'true';
  const repo = opts.repo || process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';
  const agent = opts.agent || 'runtime-gateway-triage';
  const writeLedger = opts.writeLedger || appendFailureLedger;
  const createIssue = opts.createIssue || createGitHubIssue;
  const now = opts.now || new Date().toISOString();
  const ledgerPath = opts.ledgerPath || defaultLedgerPath();

  const event = normalizeEvent(rawEvent);
  const classification = classifyEvent(event);

  const infraRecurrence = countRecentMatches(
    {
      class: classification.ledgerClass,
      service: event.service,
      root_cause: event.fingerprint,
      withinMs: RECURRENCE_WINDOW_MS,
      now,
    },
    ledgerPath,
  );
  const weekRecurrence = countRecentMatches(
    {
      class: classification.ledgerClass,
      service: event.service,
      root_cause: event.fingerprint,
      withinMs: ESCALATION_WINDOW_MS,
      now,
    },
    ledgerPath,
  );

  const route = decideRoute(classification, event, { infraRecurrence, weekRecurrence });

  // Lane path: failover BEFORE any code-change / issue open.
  let failoverResult = null;
  if (route.action === 'lane-failover') {
    const status = event.statusCode || (classification.className.startsWith('402') ? 402 : 429);
    const failoverWrite =
      opts.failoverWriteLedger
      || ((partial) => writeLedger(partial, { path: ledgerPath }));
    failoverResult = await applyFailover({
      status,
      modality: 'text',
      taskRef: event.traceUrl || event.eventId || event.fingerprint,
      repo,
      agent,
      // Default: honor 429 backoff. Tests pass skipSleep:true to avoid delays.
      skipSleep: opts.skipSleep === true,
      writeLedger: failoverWrite,
      callTier2: opts.callTier2,
      routing: opts.routing,
      sleep: opts.sleep,
    });
  }

  // Always write the triage ledger entry (even when failover already wrote one).
  const { entry: ledgerEntry } = writeLedger({
    ts: now,
    agent,
    class: classification.ledgerClass,
    trigger: String(event.statusCode || classification.className),
    service: event.service,
    repo,
    task_ref: event.traceUrl || event.eventId || undefined,
    root_cause: event.fingerprint,
    summary: `${classification.className}: ${String(event.message).slice(0, 200)} → ${route.action}`,
    attempts: infraRecurrence + 1,
  }, { path: ledgerPath });

  let issue = null;
  if (route.openIssue) {
    const labels = issueLabels(classification, route);
    const title = buildIssueTitle(event, classification);
    const body = buildIssueBody(event, classification, route, ledgerEntry);
    issue = createIssue({
      repo,
      title,
      body,
      labels,
      dryRun,
      execFile: opts.execFile,
    });
  }

  return {
    event,
    classification,
    route,
    ledgerEntry,
    issue,
    failover: failoverResult,
    counts: { infraRecurrence, weekRecurrence },
    keylessFailoverWired: hasExplicitKeylessFailover(opts.routing),
  };
}

function loadEventFromEnvOrArgs(argv = process.argv.slice(2)) {
  const fileFlag = argv.findIndex((a) => a === '--event-file');
  if (fileFlag >= 0 && argv[fileFlag + 1]) {
    return JSON.parse(fs.readFileSync(argv[fileFlag + 1], 'utf8'));
  }
  if (process.env.SENTRY_EVENT_JSON) {
    return JSON.parse(process.env.SENTRY_EVENT_JSON);
  }
  if (process.env.RUNTIME_EVENT_JSON) {
    return JSON.parse(process.env.RUNTIME_EVENT_JSON);
  }
  // repository_dispatch client_payload often lands as GITHUB_EVENT_PATH
  if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    const ghEvent = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    if (ghEvent?.client_payload) return ghEvent.client_payload;
    if (ghEvent?.inputs?.event_json) {
      return JSON.parse(ghEvent.inputs.event_json);
    }
  }
  throw new Error(
    'No event payload: set SENTRY_EVENT_JSON / RUNTIME_EVENT_JSON or pass --event-file',
  );
}

async function main() {
  const raw = loadEventFromEnvOrArgs();
  const result = await triageRuntimeEvent(raw);
  const summary = {
    class: result.classification.className,
    action: result.route.action,
    issue: result.issue?.url || null,
    ledgerClass: result.ledgerEntry.class,
    fingerprint: result.event.fingerprint,
    keylessFailoverWired: result.keylessFailoverWired,
  };
  console.log(JSON.stringify(summary, null, 2));

  // Surface a machine-readable output for Actions.
  if (process.env.GITHUB_OUTPUT) {
    const lines = [
      `class=${result.classification.className}`,
      `action=${result.route.action}`,
      `issue_url=${result.issue?.url || ''}`,
      `issue_number=${result.issue?.number || ''}`,
      `ledger_class=${result.ledgerEntry.class}`,
    ];
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  }
}

module.exports = {
  RECURRENCE_WINDOW_MS,
  ESCALATION_WINDOW_MS,
  ESCALATION_THRESHOLD,
  CLASS_TO_LEDGER,
  normalizeEvent,
  classifyEvent,
  decideRoute,
  buildIssueTitle,
  buildIssueBody,
  issueLabels,
  createGitHubIssue,
  triageRuntimeEvent,
  loadEventFromEnvOrArgs,
  decideFailover,
  hasExplicitKeylessFailover,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`runtime-gateway-triage failed: ${err.message}`);
    process.exit(1);
  });
}

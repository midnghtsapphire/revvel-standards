#!/usr/bin/env node
'use strict';

/**
 * FAILURE-LEDGER writer (WR-4474 / WR-4481).
 *
 * Appends one JSON object per line (JSONL) matching
 * agent-pack/failure-ledger.schema.json. Every runtime triage and every
 * model-lane failover MUST write here — silent degradation is a directive
 * violation.
 *
 * Default path: logs/failure-ledger/FAILURE-LEDGER.jsonl
 * Override with FAILURE_LEDGER_PATH.
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '../agent-pack/failure-ledger.schema.json');
const DEFAULT_LEDGER_PATH = path.resolve(
  __dirname,
  '../logs/failure-ledger/FAILURE-LEDGER.jsonl',
);

const ALLOWED_CLASSES = new Set([
  'lint-loop-exhausted',
  'ci-heal-exhausted',
  'gate-tamper',
  'hook-bypass',
  'runtime-500',
  'runtime-502',
  'runtime-503',
  'runtime-504',
  'lane-402',
  'lane-429',
  'lane-5xx',
  'lane-failover',
  'lane-recovery',
  'restart',
  'capture-gap',
  'other',
]);

function loadAllowedClasses() {
  try {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const classes = schema?.properties?.class?.enum;
    if (Array.isArray(classes) && classes.length > 0) {
      return new Set(classes);
    }
  } catch {
    // Fall through to the baked-in set so missing schema never blocks writes.
  }
  return ALLOWED_CLASSES;
}

const CLASS_SET = loadAllowedClasses();

function defaultLedgerPath() {
  return process.env.FAILURE_LEDGER_PATH
    ? path.resolve(process.env.FAILURE_LEDGER_PATH)
    : DEFAULT_LEDGER_PATH;
}

/**
 * Normalize and validate a FAILURE-LEDGER entry.
 * Throws on missing required fields or unknown class.
 *
 * @param {object} partial
 * @returns {object} schema-shaped entry
 */
function buildEntry(partial = {}) {
  const ts = partial.ts || new Date().toISOString();
  const agent = String(partial.agent || '').trim();
  const cls = String(partial.class || '').trim();
  const trigger = String(partial.trigger || '').trim();
  const summary = String(partial.summary || '').trim().slice(0, 500);

  if (!agent) throw new Error('FAILURE-LEDGER entry requires agent');
  if (!cls || !CLASS_SET.has(cls)) {
    throw new Error(
      `FAILURE-LEDGER entry requires class in schema enum (got ${JSON.stringify(cls)})`,
    );
  }
  if (!trigger) throw new Error('FAILURE-LEDGER entry requires trigger');
  if (!summary) throw new Error('FAILURE-LEDGER entry requires summary');

  const entry = {
    ts,
    agent,
    class: cls,
    trigger,
    summary,
  };

  if (partial.lane != null && partial.lane !== '') entry.lane = String(partial.lane);
  if (partial.service != null && partial.service !== '') entry.service = String(partial.service);
  if (partial.repo != null && partial.repo !== '') entry.repo = String(partial.repo);
  if (partial.task_ref != null && partial.task_ref !== '') entry.task_ref = String(partial.task_ref);
  if (partial.root_cause != null && partial.root_cause !== '') {
    entry.root_cause = String(partial.root_cause);
  }
  if (partial.fix_ref != null && partial.fix_ref !== '') entry.fix_ref = String(partial.fix_ref);
  if (partial.attempts != null) {
    const n = Number(partial.attempts);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('FAILURE-LEDGER attempts must be a non-negative integer');
    }
    entry.attempts = Math.floor(n);
  }

  // Reject unknown keys so additionalProperties:false stays honest.
  const allowed = new Set([
    'ts', 'agent', 'class', 'trigger', 'summary',
    'lane', 'service', 'repo', 'task_ref', 'root_cause', 'fix_ref', 'attempts',
  ]);
  for (const key of Object.keys(partial)) {
    if (!allowed.has(key) && partial[key] !== undefined) {
      throw new Error(`FAILURE-LEDGER rejects unknown field: ${key}`);
    }
  }

  return entry;
}

/**
 * Append one entry to the ledger. Creates parent dirs as needed.
 *
 * @param {object} partial
 * @param {{ path?: string }} [opts]
 * @returns {{ entry: object, path: string }}
 */
function appendFailureLedger(partial, opts = {}) {
  const entry = buildEntry(partial);
  const ledgerPath = opts.path ? path.resolve(opts.path) : defaultLedgerPath();
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
  return { entry, path: ledgerPath };
}

/**
 * Read all valid entries from a ledger file (skips blank/malformed lines).
 *
 * @param {string} [ledgerPath]
 * @returns {object[]}
 */
function readFailureLedger(ledgerPath) {
  const filePath = ledgerPath ? path.resolve(ledgerPath) : defaultLedgerPath();
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines — same convention as agent-scorecard ledger.
    }
  }
  return out;
}

/**
 * Count entries matching fingerprint fields within a lookback window.
 * Used for infra recurrence (same class+service+fingerprint within 24h)
 * and 3×/7d escalation.
 *
 * @param {object} query
 * @param {string} [query.class]
 * @param {string} [query.service]
 * @param {string} [query.root_cause]  // often the fingerprint
 * @param {number} [query.withinMs]
 * @param {string} [query.now] ISO timestamp
 * @param {string} [ledgerPath]
 * @returns {number}
 */
function countRecentMatches(query = {}, ledgerPath) {
  const withinMs = Number.isFinite(query.withinMs) ? query.withinMs : 24 * 60 * 60 * 1000;
  const nowMs = Date.parse(query.now || new Date().toISOString());
  const entries = readFailureLedger(ledgerPath);
  let count = 0;
  for (const e of entries) {
    const ts = Date.parse(e.ts);
    if (!Number.isFinite(ts) || nowMs - ts > withinMs || ts > nowMs) continue;
    if (query.class && e.class !== query.class) continue;
    if (query.service && e.service !== query.service) continue;
    if (query.root_cause && e.root_cause !== query.root_cause) continue;
    count += 1;
  }
  return count;
}

module.exports = {
  ALLOWED_CLASSES: CLASS_SET,
  DEFAULT_LEDGER_PATH,
  defaultLedgerPath,
  buildEntry,
  appendFailureLedger,
  readFailureLedger,
  countRecentMatches,
};

if (require.main === module) {
  // CLI: node scripts/failure-ledger.js '{"agent":"x","class":"other","trigger":"cli","summary":"t"}'
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: node scripts/failure-ledger.js \'<json-entry>\'');
    process.exit(2);
  }
  const { entry, path: written } = appendFailureLedger(JSON.parse(raw));
  console.log(JSON.stringify({ ok: true, path: written, entry }, null, 2));
}

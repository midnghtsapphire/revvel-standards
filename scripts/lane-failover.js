#!/usr/bin/env node
'use strict';

/**
 * WR-4481 model-lane failover — machine-checked triggers, not prose.
 *
 * Explicit routing table: each lane carries fallback + trigger fields.
 * 402 → immediate failover to keyless tier-2 (Perplexity).
 * 429 → one backoff (≤30s), then failover.
 * 5xx/timeout ×2 consecutive → failover.
 *
 * Every failover writes FAILURE-LEDGER. Agents may read this table; they
 * must never edit it in response to 402/429 (WR-4472 gate-tamper class).
 */

const fs = require('fs');
const path = require('path');
const { appendFailureLedger } = require('./failure-ledger');

const DEFAULT_ROUTING_PATH = path.resolve(
  __dirname,
  '../config/routing-failover.yml',
);

/** Hard-coded SSOT when YAML is absent — mirrors agent-pack/routing-failover.example.yml */
const DEFAULT_ROUTING = {
  defaults: {
    backoff_429_seconds: 30,
    consecutive_5xx_failover: 2,
    recovery_probe: 'hourly',
    sticky_downgrade_issue_after: '24h',
    ledger: 'FAILURE-LEDGER',
  },
  lanes: {
    text: {
      primary: {
        id: 'text.primary',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        triggers: {
          402: 'failover',
          429: 'backoff_then_failover',
          '5xx': 'count_then_failover',
        },
        fallback: 'text.tier2',
      },
      'text.tier2': {
        id: 'text.tier2',
        provider: 'perplexity',
        keyless: true,
        model: 'perplexity/sonar',
        alt: 'openrouter:free',
        triggers: {
          402: 'halt_needs_human',
          429: 'backoff_then_halt',
        },
        fallback: null,
      },
    },
  },
};

/**
 * Minimal YAML subset parser for the routing-failover shape.
 * Avoids a hard dependency on js-yaml for the hot path.
 * Accepts the committed config/routing-failover.yml when present.
 *
 * @param {string} raw
 * @returns {object|null}
 */
function parseRoutingYaml(raw) {
  // Prefer js-yaml when available (root package ships it for workflow tests).
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const yaml = require('js-yaml');
    return yaml.load(raw);
  } catch {
    return null;
  }
}

function loadRoutingTable(routingPath) {
  const filePath = routingPath || process.env.ROUTING_FAILOVER_PATH || DEFAULT_ROUTING_PATH;
  if (fs.existsSync(filePath)) {
    try {
      const parsed = parseRoutingYaml(fs.readFileSync(filePath, 'utf8'));
      if (parsed && parsed.lanes) return normalizeRouting(parsed);
    } catch (err) {
      console.warn(`lane-failover: could not parse ${filePath}: ${err.message}`);
    }
  }
  return normalizeRouting(DEFAULT_ROUTING);
}

function normalizeRouting(raw) {
  const defaults = {
    backoff_429_seconds: Number(raw?.defaults?.backoff_429_seconds) || 30,
    consecutive_5xx_failover: Number(raw?.defaults?.consecutive_5xx_failover) || 2,
    recovery_probe: raw?.defaults?.recovery_probe || 'hourly',
    sticky_downgrade_issue_after: raw?.defaults?.sticky_downgrade_issue_after || '24h',
    ledger: raw?.defaults?.ledger || 'FAILURE-LEDGER',
  };

  const lanes = {};
  for (const [modality, table] of Object.entries(raw.lanes || {})) {
    lanes[modality] = {};
    for (const [key, node] of Object.entries(table || {})) {
      const id = node.id || (key === 'primary' ? `${modality}.primary` : key);
      const triggers = normalizeTriggers(node.triggers);
      lanes[modality][id] = {
        id,
        provider: String(node.provider || ''),
        model: node.model || null,
        keyless: Boolean(node.keyless || node.provider === 'perplexity' || /:free$/.test(String(node.alt || ''))),
        alt: node.alt || null,
        triggers,
        fallback: node.fallback == null || node.fallback === 'null' ? null : String(node.fallback),
      };
      // Also index under the short key for primary lookups.
      if (key === 'primary') {
        lanes[modality].primary = lanes[modality][id];
      }
    }
  }
  return { defaults, lanes };
}

function normalizeTriggers(triggers) {
  const out = {};
  if (!triggers || typeof triggers !== 'object') return out;
  for (const [k, v] of Object.entries(triggers)) {
    out[String(k)] = String(v);
  }
  return out;
}

/**
 * Extract HTTP status code from an Error / string / number.
 * @param {unknown} err
 * @returns {number|null}
 */
function extractStatusCode(err) {
  if (err == null) return null;
  if (typeof err === 'number' && Number.isFinite(err)) return err;
  if (typeof err === 'object') {
    if (Number.isFinite(err.status)) return Number(err.status);
    if (Number.isFinite(err.statusCode)) return Number(err.statusCode);
    if (Number.isFinite(err.code) && err.code >= 100 && err.code < 600) return Number(err.code);
    if (err.message) return extractStatusCode(String(err.message));
  }
  const m = String(err).match(/\b(402|429|401|403|500|502|503|504)\b/);
  return m ? Number(m[1]) : null;
}

/**
 * Map a status code to the trigger key used in the routing table.
 * @param {number|null} status
 * @returns {string|null}
 */
function triggerKeyForStatus(status) {
  if (!status) return null;
  if (status === 402) return '402';
  if (status === 429) return '429';
  if (status >= 500 && status < 600) return '5xx';
  return String(status);
}

/**
 * Decide the action for a failed primary call.
 *
 * @param {object} opts
 * @param {string} [opts.modality='text']
 * @param {number|null} opts.status
 * @param {number} [opts.consecutive5xx=0]
 * @param {object} [opts.routing]
 * @returns {{
 *   action: 'failover'|'backoff_then_failover'|'retry'|'halt_needs_human'|'none',
 *   trigger: string|null,
 *   fromLane: object|null,
 *   toLane: object|null,
 *   backoffSeconds: number,
 *   reason: string,
 * }}
 */
function decideFailover(opts = {}) {
  const routing = opts.routing || loadRoutingTable();
  const modality = opts.modality || 'text';
  const laneTable = routing.lanes[modality] || {};
  const fromLane = laneTable.primary || Object.values(laneTable)[0] || null;
  const status = opts.status == null ? null : Number(opts.status);
  const consecutive5xx = Number(opts.consecutive5xx) || 0;
  const backoffSeconds = routing.defaults.backoff_429_seconds;
  const fiveThreshold = routing.defaults.consecutive_5xx_failover;

  if (!fromLane) {
    return {
      action: 'none',
      trigger: null,
      fromLane: null,
      toLane: null,
      backoffSeconds: 0,
      reason: `no lane defined for modality ${modality}`,
    };
  }

  const tKey = triggerKeyForStatus(status);
  const triggerAction = tKey ? fromLane.triggers[tKey] : null;
  const toLane = resolveFallback(laneTable, fromLane.fallback);

  // Explicit 402: immediate failover, no retry on primary.
  if (status === 402 || triggerAction === 'failover') {
    return {
      action: toLane ? 'failover' : 'halt_needs_human',
      trigger: tKey || String(status),
      fromLane,
      toLane,
      backoffSeconds: 0,
      reason: `status ${status} → ${triggerAction || 'failover'}`,
    };
  }

  // Explicit 429: one backoff then failover.
  if (status === 429 || triggerAction === 'backoff_then_failover') {
    return {
      action: toLane ? 'backoff_then_failover' : 'halt_needs_human',
      trigger: tKey || '429',
      fromLane,
      toLane,
      backoffSeconds,
      reason: `status ${status} → backoff ${backoffSeconds}s then failover`,
    };
  }

  // 5xx / timeout: count then failover.
  if ((status && status >= 500) || triggerAction === 'count_then_failover') {
    if (consecutive5xx + 1 >= fiveThreshold) {
      return {
        action: toLane ? 'failover' : 'halt_needs_human',
        trigger: tKey || '5xx',
        fromLane,
        toLane,
        backoffSeconds: 0,
        reason: `consecutive 5xx ${consecutive5xx + 1} ≥ ${fiveThreshold}`,
      };
    }
    return {
      action: 'retry',
      trigger: tKey || '5xx',
      fromLane,
      toLane: null,
      backoffSeconds: 0,
      reason: `consecutive 5xx ${consecutive5xx + 1} < ${fiveThreshold}; retry primary`,
    };
  }

  return {
    action: 'none',
    trigger: tKey,
    fromLane,
    toLane: null,
    backoffSeconds: 0,
    reason: `no failover trigger for status ${status}`,
  };
}

function resolveFallback(laneTable, fallbackId) {
  if (!fallbackId) return null;
  if (laneTable[fallbackId]) return laneTable[fallbackId];
  // Allow short ids like text_tier2 from the example file.
  for (const node of Object.values(laneTable)) {
    if (node && node.id === fallbackId) return node;
  }
  return null;
}

/**
 * Apply failover decision: optionally sleep for backoff, invoke tier-2 caller,
 * write FAILURE-LEDGER. Injectable seams for tests.
 *
 * @param {object} opts
 * @param {number|null} opts.status
 * @param {string} [opts.modality]
 * @param {number} [opts.consecutive5xx]
 * @param {string} [opts.taskRef]
 * @param {string} [opts.repo]
 * @param {string} [opts.agent]
 * @param {function} [opts.callTier2] async () => result
 * @param {function} [opts.sleep] async (ms) => void
 * @param {function} [opts.writeLedger] override appendFailureLedger
 * @param {boolean} [opts.skipSleep=false]
 * @param {object} [opts.routing]
 * @returns {Promise<object>}
 */
async function applyFailover(opts = {}) {
  const decision = decideFailover(opts);
  const writeLedger = opts.writeLedger || appendFailureLedger;
  const sleep = opts.sleep || defaultSleep;
  const agent = opts.agent || 'lane-failover';
  const taskRef = opts.taskRef || '';
  const repo = opts.repo || process.env.GITHUB_REPOSITORY || '';

  const ledgerBase = {
    agent,
    trigger: decision.trigger || String(opts.status || 'unknown'),
    lane: decision.fromLane
      ? `${decision.fromLane.provider}:${decision.fromLane.model || decision.fromLane.id}`
      : opts.modality || 'text',
    repo: repo || undefined,
    task_ref: taskRef || undefined,
  };

  if (decision.action === 'none' || decision.action === 'retry') {
    return { decision, result: null, ledger: null, halted: false };
  }

  if (decision.action === 'halt_needs_human') {
    const { entry } = writeLedger({
      ...ledgerBase,
      class: statusToLedgerClass(opts.status),
      summary: `Lane ladder exhausted (${decision.reason}); needs-human`,
      root_cause: decision.reason,
    });
    return { decision, result: null, ledger: entry, halted: true, needsHuman: true };
  }

  if (decision.action === 'backoff_then_failover' && !opts.skipSleep && decision.backoffSeconds > 0) {
    await sleep(decision.backoffSeconds * 1000);
  }

  // Failover target MUST be the keyless tier-2 lane when configured.
  if (!decision.toLane || !decision.toLane.keyless) {
    const { entry } = writeLedger({
      ...ledgerBase,
      class: 'capture-gap',
      summary: 'Failover target missing keyless tier-2 lane — routing table gap',
      root_cause: 'tier2-not-keyless-or-missing',
    });
    return {
      decision,
      result: null,
      ledger: entry,
      halted: true,
      needsHuman: true,
      error: new Error('No keyless tier-2 failover target configured'),
    };
  }

  let result = null;
  let callError = null;
  if (typeof opts.callTier2 === 'function') {
    try {
      result = await opts.callTier2(decision.toLane);
    } catch (err) {
      callError = err;
    }
  }

  const { entry } = writeLedger({
    ...ledgerBase,
    class: 'lane-failover',
    summary: `Failover ${decision.fromLane.id} → ${decision.toLane.id} on ${decision.trigger}`
      + (callError ? ` (tier2 error: ${String(callError.message || callError).slice(0, 120)})` : ''),
    root_cause: decision.reason,
    attempts: 1,
  });

  if (callError) {
    return {
      decision,
      result: null,
      ledger: entry,
      halted: false,
      error: callError,
    };
  }

  return { decision, result, ledger: entry, halted: false };
}

function statusToLedgerClass(status) {
  if (status === 402) return 'lane-402';
  if (status === 429) return 'lane-429';
  if (status && status >= 500) return 'lane-5xx';
  return 'lane-failover';
}

function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * True when the routing table has an explicit keyless tier-2 target reachable
 * from primary via a 402 or 429 trigger. Used by acceptance tests.
 */
function hasExplicitKeylessFailover(routing) {
  const table = routing || loadRoutingTable();
  const text = table.lanes.text || {};
  const primary = text.primary;
  if (!primary) return false;
  const t402 = primary.triggers['402'];
  const t429 = primary.triggers['429'];
  if (t402 !== 'failover' && t402 !== 'backoff_then_failover') return false;
  if (t429 !== 'failover' && t429 !== 'backoff_then_failover') return false;
  const tier2 = resolveFallback(text, primary.fallback);
  return Boolean(tier2 && tier2.keyless);
}

module.exports = {
  DEFAULT_ROUTING,
  DEFAULT_ROUTING_PATH,
  loadRoutingTable,
  normalizeRouting,
  extractStatusCode,
  triggerKeyForStatus,
  decideFailover,
  applyFailover,
  hasExplicitKeylessFailover,
  statusToLedgerClass,
};

if (require.main === module) {
  const status = Number(process.argv[2] || '402');
  const decision = decideFailover({ status });
  console.log(JSON.stringify({ decision, keylessWired: hasExplicitKeylessFailover() }, null, 2));
}

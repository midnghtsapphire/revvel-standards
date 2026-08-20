#!/usr/bin/env node
'use strict';

/**
 * Copilot / visiting-LLM / OpenRouter timeout auditor (WR #17775).
 *
 * Enforces config/copilot-timeouts.yml:
 *   every targeted execution job must set timeout-minutes >= floor (60).
 *
 * Why this exists:
 *   Long coding-agent runs were dying with
 *   "The job has exceeded the maximum execution time of 10m0s".
 *   A one-off YAML bump is not enough — without a consumer that fails CI
 *   when the floor is dropped, the next edit reintroduces the bug
 *   (see standards/VERIFY_THE_POSTCONDITION.md / RVS-VERIFY-001).
 *
 * Exit codes:
 *   0 — every target meets the floor
 *   1 — one or more violations (or missing workflow/job)
 *   2 — usage / config parse error
 *
 * CLI:
 *   node scripts/copilot-timeout-audit.js
 *   node scripts/copilot-timeout-audit.js --json
 *   node scripts/copilot-timeout-audit.js --markdown
 *   node scripts/copilot-timeout-audit.js --root /path/to/repo
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const DEFAULT_ROOT = path.join(__dirname, '..');
const POLICY_REL = 'config/copilot-timeouts.yml';
const DEVICE_TREE_REL = 'config/device-tree.yml';
const SCHEMA_REL = 'schemas/agent-contract.schema.json';

/**
 * @typedef {{ workflow: string, job_ids?: string[], reason?: string }} Target
 * @typedef {{
 *   ok: boolean,
 *   floor_minutes: number,
 *   recommended_ceiling_minutes: number,
 *   checked_at: string,
 *   violations: Array<{
 *     workflow: string,
 *     job: string,
 *     actual: number | null,
 *     required: number,
 *     detail: string,
 *   }>,
 *   checks: Array<{
 *     workflow: string,
 *     job: string,
 *     actual: number | null,
 *     required: number,
 *     ok: boolean,
 *     reason: string,
 *   }>,
 *   device_tree: { ok: boolean, findings: string[] },
 *   schema: { ok: boolean, findings: string[] },
 *   summary: string,
 *   policy_path: string,
 * }} AuditReport
 */

/**
 * @param {string} root
 * @returns {{ policy: any, raw: string }}
 */
function loadPolicy(root = DEFAULT_ROOT) {
  const p = path.join(root, POLICY_REL);
  if (!fs.existsSync(p)) {
    throw new Error(`missing policy file: ${POLICY_REL}`);
  }
  const raw = fs.readFileSync(p, 'utf8');
  const policy = yaml.parse(raw);
  if (!policy || typeof policy !== 'object') {
    throw new Error(`${POLICY_REL} did not parse to an object`);
  }
  if (!policy.policy || typeof policy.policy.floor_minutes !== 'number') {
    throw new Error(`${POLICY_REL} missing policy.floor_minutes`);
  }
  if (!Array.isArray(policy.targets) || policy.targets.length === 0) {
    throw new Error(`${POLICY_REL} must list at least one target workflow`);
  }
  return { policy, raw };
}

/**
 * Parse a workflow YAML and return job id → timeout-minutes (or null if unset).
 * @param {string} filePath
 * @returns {Record<string, number | null> | null} null when file missing
 */
function readJobTimeouts(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  if (!doc || typeof doc !== 'object' || !doc.jobs || typeof doc.jobs !== 'object') {
    return {};
  }
  /** @type {Record<string, number | null>} */
  const out = {};
  for (const [jobId, job] of Object.entries(doc.jobs)) {
    if (!job || typeof job !== 'object') {
      out[jobId] = null;
      continue;
    }
    const t = job['timeout-minutes'];
    out[jobId] = typeof t === 'number' && Number.isFinite(t) ? t : null;
  }
  return out;
}

/**
 * @param {string} [root]
 * @returns {AuditReport}
 */
function auditTimeouts(root = DEFAULT_ROOT) {
  const { policy } = loadPolicy(root);
  const floor = policy.policy.floor_minutes;
  const ceiling =
    typeof policy.policy.recommended_ceiling_minutes === 'number'
      ? policy.policy.recommended_ceiling_minutes
      : 90;

  /** @type {AuditReport['checks']} */
  const checks = [];
  /** @type {AuditReport['violations']} */
  const violations = [];

  for (const target of /** @type {Target[]} */ (policy.targets)) {
    const rel = target.workflow;
    const abs = path.join(root, rel);
    const reason = target.reason || '';
    const timeouts = readJobTimeouts(abs);

    if (timeouts === null) {
      const v = {
        workflow: rel,
        job: '*',
        actual: null,
        required: floor,
        detail: `workflow file missing: ${rel}`,
      };
      violations.push(v);
      checks.push({
        workflow: rel,
        job: '*',
        actual: null,
        required: floor,
        ok: false,
        reason,
      });
      continue;
    }

    const jobIds =
      Array.isArray(target.job_ids) && target.job_ids.length > 0
        ? target.job_ids
        : Object.keys(timeouts);

    if (jobIds.length === 0) {
      const v = {
        workflow: rel,
        job: '*',
        actual: null,
        required: floor,
        detail: `workflow has no jobs to check: ${rel}`,
      };
      violations.push(v);
      checks.push({
        workflow: rel,
        job: '*',
        actual: null,
        required: floor,
        ok: false,
        reason,
      });
      continue;
    }

    for (const jobId of jobIds) {
      if (!(jobId in timeouts)) {
        const v = {
          workflow: rel,
          job: jobId,
          actual: null,
          required: floor,
          detail: `job '${jobId}' not found in ${rel}`,
        };
        violations.push(v);
        checks.push({
          workflow: rel,
          job: jobId,
          actual: null,
          required: floor,
          ok: false,
          reason,
        });
        continue;
      }
      const actual = timeouts[jobId];
      const ok = typeof actual === 'number' && actual >= floor;
      checks.push({
        workflow: rel,
        job: jobId,
        actual,
        required: floor,
        ok,
        reason,
      });
      if (!ok) {
        violations.push({
          workflow: rel,
          job: jobId,
          actual,
          required: floor,
          detail:
            actual === null
              ? `job '${jobId}' in ${rel} is missing timeout-minutes (need >= ${floor})`
              : `job '${jobId}' in ${rel} has timeout-minutes: ${actual} (need >= ${floor})`,
        });
      }
    }
  }

  const deviceTree = auditDeviceTree(root, policy);
  const schema = auditSchema(root, policy);

  const ok =
    violations.length === 0 && deviceTree.ok && schema.ok;
  const summary = ok
    ? `OK — all ${checks.length} copilot/visiting-LLM job(s) are >= ${floor}m`
    : `FAIL — ${violations.length} job violation(s)` +
      (deviceTree.ok ? '' : `; device-tree: ${deviceTree.findings.length} finding(s)`) +
      (schema.ok ? '' : `; schema: ${schema.findings.length} finding(s)`);

  return {
    ok,
    floor_minutes: floor,
    recommended_ceiling_minutes: ceiling,
    checked_at: new Date().toISOString(),
    violations,
    checks,
    device_tree: deviceTree,
    schema,
    summary,
    policy_path: POLICY_REL,
  };
}

/**
 * Device-tree kinds that prefer OpenRouter must default >= floor
 * (except explicit exemptions like host-decomposer).
 * @param {string} root
 * @param {any} policy
 */
function auditDeviceTree(root, policy) {
  const floor =
    typeof policy.policy.device_tree_floor_minutes === 'number'
      ? policy.policy.device_tree_floor_minutes
      : policy.policy.floor_minutes;
  const exemptions = new Set(
    Array.isArray(policy.policy.device_tree_floor_exemptions)
      ? policy.policy.device_tree_floor_exemptions
      : []
  );
  const p = path.join(root, DEVICE_TREE_REL);
  /** @type {string[]} */
  const findings = [];
  if (!fs.existsSync(p)) {
    findings.push(`${DEVICE_TREE_REL} missing`);
    return { ok: false, findings };
  }
  const tree = yaml.parse(fs.readFileSync(p, 'utf8'));
  const kinds = Array.isArray(tree && tree.kinds) ? tree.kinds : [];
  for (const kind of kinds) {
    if (!kind || typeof kind !== 'object') continue;
    const name = kind.name || '(unnamed)';
    if (exemptions.has(name)) continue;
    const agent = kind.default_agent || '';
    // Only kinds that default to a visiting LLM / OpenRouter path.
    if (agent !== 'openrouter' && agent !== 'OpenHands' && agent !== 'auto') {
      continue;
    }
    const t = kind.default_timeout_minutes;
    if (typeof t !== 'number' || t < floor) {
      findings.push(
        `kind '${name}' default_timeout_minutes=${t} (need >= ${floor} for agent=${agent})`
      );
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Schema default for thread.timeout_minutes must be >= floor.
 * @param {string} root
 * @param {any} policy
 */
function auditSchema(root, policy) {
  const floor =
    typeof policy.policy.host_default_minutes === 'number'
      ? policy.policy.host_default_minutes
      : policy.policy.floor_minutes;
  const p = path.join(root, SCHEMA_REL);
  /** @type {string[]} */
  const findings = [];
  if (!fs.existsSync(p)) {
    findings.push(`${SCHEMA_REL} missing`);
    return { ok: false, findings };
  }
  const schema = JSON.parse(fs.readFileSync(p, 'utf8'));
  const timeoutProp =
    schema &&
    schema.$defs &&
    schema.$defs.thread &&
    schema.$defs.thread.properties &&
    schema.$defs.thread.properties.timeout_minutes;
  if (!timeoutProp) {
    findings.push('schemas/agent-contract.schema.json missing thread.timeout_minutes');
    return { ok: false, findings };
  }
  if (typeof timeoutProp.default === 'number' && timeoutProp.default < floor) {
    findings.push(
      `thread.timeout_minutes default=${timeoutProp.default} (need >= ${floor})`
    );
  }
  if (typeof timeoutProp.minimum === 'number' && timeoutProp.minimum > floor) {
    // minimum above floor is fine; nothing to do
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {AuditReport} report
 */
function renderMarkdownReport(report) {
  const lines = [];
  lines.push('## Copilot / visiting-LLM timeout audit');
  lines.push('');
  lines.push(
    report.ok
      ? `**Answer: YES — floor ${report.floor_minutes}m is held.**`
      : `**Answer: NO — floor ${report.floor_minutes}m is violated.**`
  );
  lines.push('');
  lines.push(report.summary);
  lines.push('');
  lines.push(`Checked: \`${report.checked_at}\` · Policy: \`${report.policy_path}\``);
  lines.push('');
  lines.push('| Workflow | Job | Actual | Required | Status | Reason |');
  lines.push('| --- | --- | ---: | ---: | :---: | --- |');
  for (const c of report.checks) {
    lines.push(
      `| \`${c.workflow}\` | \`${c.job}\` | ${c.actual === null ? '—' : c.actual} | ${c.required} | ${c.ok ? '✅' : '❌'} | ${c.reason || ''} |`
    );
  }
  if (report.device_tree.findings.length) {
    lines.push('');
    lines.push('### Device-tree findings');
    for (const f of report.device_tree.findings) lines.push(`- ${f}`);
  }
  if (report.schema.findings.length) {
    lines.push('');
    lines.push('### Schema findings');
    for (const f of report.schema.findings) lines.push(`- ${f}`);
  }
  if (report.violations.length) {
    lines.push('');
    lines.push('### Violations');
    for (const v of report.violations) lines.push(`- ${v.detail}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Pure classifier used by the product UI (no fs).
 * @param {number | null | undefined} minutes
 * @param {number} floor
 */
function classifyTimeout(minutes, floor = 60) {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
    return { ok: false, label: 'missing', detail: 'timeout-minutes not set' };
  }
  const n = Number(minutes);
  if (n < floor) {
    return {
      ok: false,
      label: 'below-floor',
      detail: `${n}m is below the ${floor}m floor`,
    };
  }
  if (n === floor) {
    return { ok: true, label: 'at-floor', detail: `${n}m meets the ${floor}m floor` };
  }
  return { ok: true, label: 'above-floor', detail: `${n}m is above the ${floor}m floor` };
}

function parseArgs(argv) {
  /** @type {{ root: string, json: boolean, markdown: boolean }} */
  const opts = { root: DEFAULT_ROOT, json: true, markdown: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--root') opts.root = path.resolve(argv[++i] || '');
    else if (a === '--json') {
      opts.json = true;
      opts.markdown = false;
    } else if (a === '--markdown') {
      opts.markdown = true;
      opts.json = false;
    } else if (a === '--help' || a === '-h') {
      process.stdout.write(
        'Usage: node scripts/copilot-timeout-audit.js [--root DIR] [--json|--markdown]\n'
      );
      process.exit(0);
    } else {
      process.stderr.write(`Unknown argument: ${a}\n`);
      process.exit(2);
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  let report;
  try {
    report = auditTimeouts(opts.root);
  } catch (err) {
    process.stderr.write(`copilot-timeout-audit: ${err instanceof Error ? err.message : err}\n`);
    process.exit(2);
  }
  if (opts.markdown) {
    process.stdout.write(renderMarkdownReport(report));
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }
  process.exitCode = report.ok ? 0 : 1;
}

module.exports = {
  POLICY_REL,
  DEVICE_TREE_REL,
  SCHEMA_REL,
  loadPolicy,
  readJobTimeouts,
  auditTimeouts,
  auditDeviceTree,
  auditSchema,
  renderMarkdownReport,
  classifyTimeout,
};

if (require.main === module) {
  main();
}

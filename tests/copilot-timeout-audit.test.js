'use strict';

/**
 * Regression tests for the copilot / visiting-LLM timeout floor (WR #17775).
 *
 * Would have failed when agent-fallback / OpenHands / SWE-agent execution
 * jobs sat at 10–30 minutes and coding sessions died with:
 *   "The job has exceeded the maximum execution time of 10m0s"
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yaml = require('yaml');

const audit = require('../scripts/copilot-timeout-audit');
const host = require('../scripts/host.js');

const ROOT = path.join(__dirname, '..');
const POLICY_PATH = path.join(ROOT, 'config/copilot-timeouts.yml');

test('policy file exists and declares a 60-minute floor', () => {
  assert.ok(fs.existsSync(POLICY_PATH), 'config/copilot-timeouts.yml must exist');
  const policy = yaml.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  assert.equal(policy.policy.floor_minutes, 60);
  assert.ok(policy.policy.recommended_ceiling_minutes >= 60);
  assert.ok(Array.isArray(policy.targets) && policy.targets.length >= 5);
  const workflows = policy.targets.map((t) => t.workflow);
  assert.ok(workflows.includes('.github/workflows/agent-fallback.yml'));
  assert.ok(workflows.includes('.github/workflows/openrouter-coder.yml'));
  assert.ok(workflows.includes('.github/workflows/copilot-setup-steps.yml'));
});

test('auditTimeouts on the real repo holds the 60m floor', () => {
  const report = audit.auditTimeouts(ROOT);
  assert.equal(
    report.ok,
    true,
    `expected floor held, got: ${report.summary}\n` +
      report.violations.map((v) => v.detail).join('\n') +
      '\n' +
      report.device_tree.findings.join('\n') +
      '\n' +
      report.schema.findings.join('\n')
  );
  assert.equal(report.floor_minutes, 60);
  assert.ok(report.checks.length >= 10, 'must check multiple execution jobs');
  assert.ok(report.checks.every((c) => c.ok), 'every check must pass');
});

test('auditTimeouts fails closed when a targeted job drops below the floor', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-timeout-'));
  try {
    // Minimal tree: policy + one workflow below floor
    fs.mkdirSync(path.join(tmp, 'config'), { recursive: true });
    fs.mkdirSync(path.join(tmp, '.github/workflows'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'schemas'), { recursive: true });

    fs.writeFileSync(
      path.join(tmp, 'config/copilot-timeouts.yml'),
      yaml.stringify({
        version: 1,
        policy: {
          floor_minutes: 60,
          recommended_ceiling_minutes: 90,
          host_default_minutes: 60,
          device_tree_floor_minutes: 60,
          device_tree_floor_exemptions: ['host-decomposer'],
        },
        targets: [
          {
            workflow: '.github/workflows/agent-fallback.yml',
            job_ids: ['execute'],
            reason: 'test',
          },
        ],
      })
    );

    fs.writeFileSync(
      path.join(tmp, '.github/workflows/agent-fallback.yml'),
      [
        'name: Agent Fallback Handler',
        'on: workflow_dispatch',
        'jobs:',
        '  execute:',
        '    runs-on: ubuntu-latest',
        '    timeout-minutes: 10',
        '    steps:',
        '      - run: echo hi',
        '',
      ].join('\n')
    );

    // Device tree + schema that pass so only the workflow violation fires
    fs.writeFileSync(
      path.join(tmp, 'config/device-tree.yml'),
      yaml.stringify({
        version: 1,
        kinds: [
          {
            name: 'builder',
            role: 'build',
            default_agent: 'openrouter',
            default_timeout_minutes: 60,
          },
          {
            name: 'host-decomposer',
            role: 'meta',
            default_agent: 'openrouter',
            default_timeout_minutes: 10,
          },
        ],
      })
    );
    fs.writeFileSync(
      path.join(tmp, 'schemas/agent-contract.schema.json'),
      JSON.stringify({
        $defs: {
          thread: {
            properties: {
              timeout_minutes: { type: 'integer', default: 60, minimum: 1, maximum: 360 },
            },
          },
        },
      })
    );

    const report = audit.auditTimeouts(tmp);
    assert.equal(report.ok, false);
    assert.ok(report.violations.some((v) => v.job === 'execute' && v.actual === 10));
    assert.match(report.violations[0].detail, /10/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('classifyTimeout labels missing / below / at / above floor', () => {
  assert.equal(audit.classifyTimeout(null, 60).ok, false);
  assert.equal(audit.classifyTimeout(10, 60).label, 'below-floor');
  assert.equal(audit.classifyTimeout(60, 60).label, 'at-floor');
  assert.equal(audit.classifyTimeout(90, 60).label, 'above-floor');
  assert.equal(audit.classifyTimeout(90, 60).ok, true);
});

test('openrouter-coder workflow locks timeout-minutes at >= 60', () => {
  const wfPath = path.join(ROOT, '.github/workflows/openrouter-coder.yml');
  const workflow = yaml.parse(fs.readFileSync(wfPath, 'utf8'));
  const minutes = workflow.jobs.code['timeout-minutes'];
  assert.ok(
    typeof minutes === 'number' && minutes >= 60,
    `openrouter-coder code job must be >= 60 (got ${minutes})`
  );
});

test('agent-fallback execute job is >= 60 minutes', () => {
  const wfPath = path.join(ROOT, '.github/workflows/agent-fallback.yml');
  const workflow = yaml.parse(fs.readFileSync(wfPath, 'utf8'));
  assert.ok(workflow.jobs.execute, 'execute job must exist');
  assert.ok(
    workflow.jobs.execute['timeout-minutes'] >= 60,
    `agent-fallback execute must be >= 60 (got ${workflow.jobs.execute['timeout-minutes']})`
  );
});

test('Host emits timeout_minutes >= 60 for builder threads', () => {
  const contract = host.decompose({
    wr_number: 17775,
    wr_title: 'copilot timeout floor',
    wr_url: 'https://github.com/midnghtsapphire/revvel-standards/issues/17775',
    labels: ['work-request'],
    body: '## Summary\n\nRaise visiting LLM timeouts.',
  });
  const thread = contract.blocks[0].threads[0];
  assert.ok(
    thread.timeout_minutes >= 60,
    `Host builder thread timeout_minutes must be >= 60 (got ${thread.timeout_minutes})`
  );
});

test('renderMarkdownReport includes floor and status table', () => {
  const report = audit.auditTimeouts(ROOT);
  const md = audit.renderMarkdownReport(report);
  assert.match(md, /Copilot \/ visiting-LLM timeout audit/);
  assert.match(md, /Answer:/);
  assert.match(md, /agent-fallback\.yml/);
  assert.match(md, /60/);
});

test('schema thread.timeout_minutes default is >= 60', () => {
  const schema = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'schemas/agent-contract.schema.json'), 'utf8')
  );
  const def = schema.$defs.thread.properties.timeout_minutes.default;
  assert.ok(def >= 60, `schema default must be >= 60 (got ${def})`);
});

#!/usr/bin/env node
'use strict';

/**
 * Validates that all GitHub Actions workflow YAML files parse correctly
 * and have required top-level keys.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '.github', 'workflows');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// Dynamically test every .yml file in .github/workflows/
const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));

for (const file of files) {
  const filePath = path.join(WORKFLOWS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  test(`${file} — parses as valid YAML`, () => {
    yaml.parse(content);
  });

  test(`${file} — has 'name' key`, () => {
    const doc = yaml.parse(content);
    if (!doc.name) throw new Error(`Missing 'name' key`);
  });

  test(`${file} — has 'on' trigger`, () => {
    const doc = yaml.parse(content);
    if (!doc.on && !doc.true) throw new Error(`Missing 'on' trigger`);
  });
}

test('At least 20 workflow files exist', () => {
  if (files.length < 20) {
    throw new Error(`Expected 20+ workflows, found ${files.length}`);
  }
});

test('openrouter-assignee.yml uses openrouter label as routing idempotency key', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'openrouter-assignee.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const routeNewCheck = doc.jobs['route-new'].steps.find(
    (step) => step.name === 'Check if already routed'
  );
  const discover = doc.jobs['ralph-cron-sweep'].steps.find(
    (step) => step.name === 'Discover unrouted open issues and PRs'
  );

  if (!routeNewCheck || !discover) throw new Error('Required steps not found');

  const routeCheckScript = routeNewCheck.with?.script || '';
  const discoverScript = discover.with?.script || '';

  if (routeCheckScript.includes('assignees.length > 0')) {
    throw new Error('route-new check still uses assignee-based skip');
  }
  if (discoverScript.includes('assignees.length > 0')) {
    throw new Error('cron discover still uses assignee-based skip');
  }
  if (!routeCheckScript.includes("labels.includes('openrouter')")) {
    throw new Error('route-new check is missing openrouter label gate');
  }
  if (!discoverScript.includes("labels.includes('openrouter')")) {
    throw new Error('cron discover is missing openrouter label gate');
  }
});

test('openrouter-assignee.yml listens for issue-open routing and applies labels before non-fatal oAudrey assignment', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'openrouter-assignee.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const on = doc.on || doc.true;
  const issueTypes = Array.isArray(on.issues?.types) ? on.issues.types : [];

  if (!on.issues || !issueTypes.includes('opened') || !issueTypes.includes('reopened')) {
    throw new Error('openrouter-assignee.yml must listen for opened/reopened issues');
  }

  const routeNewSteps = doc.jobs['route-new'].steps;
  const labelsIndex = routeNewSteps.findIndex((step) => step.name === 'Apply routing labels');
  const assignIndex = routeNewSteps.findIndex((step) => step.name === 'Assign to oAudrey orchestrator');
  if (labelsIndex < 0 || assignIndex < 0 || labelsIndex > assignIndex) {
    throw new Error('route-new step order must be labels before assignment');
  }

  const routeNewAssign = routeNewSteps[assignIndex];
  const routeNewAssignScript = routeNewAssign.with?.script || '';
  if (!routeNewAssignScript.includes("assignees: ['oaudrey']")) {
    throw new Error('route-new assignment must target @oaudrey');
  }
  if (!routeNewAssignScript.includes('try {') || !routeNewAssignScript.includes('non-fatal')) {
    throw new Error('route-new assignment is not wrapped as non-fatal');
  }

  const commentIndex = routeNewSteps.findIndex((step) => step.name === 'Post first-line-of-sight comment');
  if (commentIndex < 0 || assignIndex > commentIndex) {
    throw new Error('route-new comment step not found or ordered before assignment');
  }
  const routeNewCommentScript = routeNewSteps[commentIndex].with?.script || '';
  if (!routeNewCommentScript.includes('createComment') || !routeNewCommentScript.includes('try {') || !routeNewCommentScript.includes('catch (error)')) {
    throw new Error('route-new comment posting is not wrapped in try/catch');
  }
  if (!routeNewCommentScript.includes('Could not post first-line-of-sight comment on #') || !routeNewCommentScript.includes('(non-fatal): ${error.message}')) {
    throw new Error('route-new comment failure should log issue/PR number context and error.message as non-fatal notice');
  }

  const routeDiscovered = doc.jobs['ralph-cron-sweep'].steps.find(
    (step) => step.name === 'Route discovered items'
  );
  if (!routeDiscovered) throw new Error('Route discovered items step not found');

  const routeDiscoveredScript = routeDiscovered.with?.script || '';
  const labelsPos = routeDiscoveredScript.indexOf('addLabels');
  const assignPos = routeDiscoveredScript.indexOf('addAssignees');
  if (labelsPos < 0 || assignPos < 0 || labelsPos > assignPos) {
    throw new Error('cron routing must apply labels before assignment');
  }
  if (!routeDiscoveredScript.includes("assignees: ['oaudrey']")) {
    throw new Error('cron routing assignment must target @oaudrey');
  }
  if (!routeDiscoveredScript.includes('Could not assign @oaudrey (non-fatal)')) {
    throw new Error('cron assignment should log non-fatal notice');
  }
  if (routeDiscoveredScript.includes('process.env.TO_ROUTE_JSON')) {
    throw new Error('cron routing must not depend on TO_ROUTE_JSON env payload');
  }
  if ((routeDiscovered.env || {}).TO_ROUTE_JSON) {
    throw new Error('Route discovered items step should not define TO_ROUTE_JSON env');
  }
  if (!routeDiscoveredScript.includes('github.paginate(github.rest.issues.listForRepo,')) {
    throw new Error('cron routing should recompute candidates from GitHub API pagination');
  }
});

test('proof-of-life.yml supports Rex as a label-only assignee lane', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'proof-of-life.yml');
  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('- Rex')) {
    throw new Error('proof-of-life assignee options must include Rex');
  }
  if (!content.includes("labels.push('rex')")) {
    throw new Error('proof-of-life must label Rex runs with rex');
  }
  if (!content.includes('Routed through **Rex**')) {
    throw new Error('proof-of-life comment must describe the Rex lane');
  }
});

test('openrouter-triage.yml listens for issue-open triage', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'openrouter-triage.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const on = doc.on || doc.true;
  const issueTypes = Array.isArray(on.issues?.types) ? on.issues.types : [];

  if (!on.issues || !issueTypes.includes('opened') || !issueTypes.includes('reopened')) {
    throw new Error('openrouter-triage.yml must listen for opened/reopened issues');
  }
});

test('agent-fallback.yml is triggered by routed repair issues', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'agent-fallback.yml');
  const content = fs.readFileSync(filePath, 'utf8');
  const doc = yaml.parse(content);
  const on = doc.on || doc.true;
  const healthCheckIf = doc.jobs['health-check'].if || '';

  if (!on.issues || !on.issues.types.includes('opened') || !on.issues.types.includes('labeled')) {
    throw new Error('agent-fallback.yml must listen for opened/labeled issues');
  }
  for (const label of ['agent-fallback', 'wr:code', 'wr:auto']) {
    if (!healthCheckIf.includes(label)) {
      throw new Error(`agent-fallback health-check is missing ${label} issue routing`);
    }
  }
});

test('stuck-label-watchdog.yml routes conflicts to agent repair issues', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-label-watchdog.yml');
  const content = fs.readFileSync(filePath, 'utf8');
  const doc = yaml.parse(content);
  const script = doc.jobs.sweep.steps[0].with?.script || '';

  if (!script.includes('openAgentRepairIssue')) {
    throw new Error('watchdog must create/dedupe agent repair issues');
  }
  if (!script.includes('watchdog-agent-repair:pr-')) {
    throw new Error('watchdog repair issues must include a dedupe marker');
  }
  for (const label of ['agent-fallback', 'auto-fix', 'openrouter']) {
    if (!script.includes(label)) {
      throw new Error(`watchdog repair issue is missing ${label} routing label`);
    }
  }
  if (!script.includes('Routed follow-up to agent repair issue')) {
    throw new Error('watchdog PR comments must point to the routed repair issue');
  }
});

test('pr-lifecycle.yml does not re-add awaiting-review after approval on review_requested events', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');
  const content = fs.readFileSync(filePath, 'utf8');
  const doc = yaml.parse(content);
  const script = doc.jobs['pr-state'].steps[0].with?.script || '';

  if (!script.includes("case 'review_requested'")) {
    throw new Error('pr-state script must handle review_requested events');
  }
  if (!script.includes("!cur.includes('approved')")) {
    throw new Error('review_requested path must not add awaiting-review when approved is present');
  }
});

test('agent-audit-logger.yml retries non-fast-forward push before summary fallback', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'agent-audit-logger.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const commitStep = doc.jobs['log-agent-action'].steps.find(
    (step) => step.name === 'Commit audit log'
  );

  if (!commitStep) throw new Error('Commit audit log step not found');

  const script = commitStep.run || '';
  if (!script.includes('for attempt in 1 2 3')) {
    throw new Error('Commit step must retry git push attempts');
  }
  if (!script.includes('fetch first|non-fast-forward')) {
    throw new Error('Commit step must detect non-fast-forward push errors');
  }
  if (!script.includes('git pull --rebase origin main')) {
    throw new Error('Commit step must rebase before retrying push');
  }
  if (!script.includes('Rebase failed; audit log push aborted.')) {
    throw new Error('Commit step must log rebase failure details');
  }
  if (!script.includes('Push failed with non-rebaseable error; audit log push aborted.')) {
    throw new Error('Commit step must log non-rebaseable push failures');
  }
  if (!script.includes('exit 0')) {
    throw new Error('Commit step must exit cleanly when push remains blocked');
  }
});

test('wr-pr-creation.yml github-script blocks compile after workflow expression substitution', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'wr-pr-creation.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const steps = doc.jobs['detect-completion'].steps.concat(doc.jobs['create-wr-pr'].steps);
  const namesToCompile = new Set([
    'Check if PR should be created',
    'Apply labels to PR',
    'Update issue labels',
  ]);

  for (const step of steps) {
    if (!namesToCompile.has(step.name)) continue;
    const script = String(step.with?.script || '')
      .replace(/\$\{\{\s*env\.ISSUE_NUMBER\s*\}\}/g, '123')
      .replace(/\$\{\{\s*steps\.create_pr\.outputs\.pr_number\s*\}\}/g, '456')
      .replace(/\$\{\{\s*steps\.create_pr\.outputs\.pr_url\s*\}\}/g, 'https://example.com/pr/456')
      .replace(/\$\{\{\s*steps\.create_branch\.outputs\.BRANCH_NAME\s*\}\}/g, 'wr/test-123');

    try {
      new AsyncFunction('github', 'context', 'core', script);
    } catch (error) {
      throw new Error(`${step.name} github-script block does not compile: ${error.message}`);
    }
  }
});

test('wr-pr-creation.yml uses existing WR templates and preserves issue body', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'wr-pr-creation.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const createJob = doc.jobs['create-wr-pr'];
  const generateStep = createJob.steps.find((step) => step.name === 'Generate WR document');

  if (!createJob.env || createJob.env.ISSUE_BODY !== '${{ needs.detect-completion.outputs.issue_body }}') {
    throw new Error('create-wr-pr job must pass issue_body through ISSUE_BODY env');
  }
  if (!generateStep) {
    throw new Error('Generate WR document step not found');
  }

  const script = generateStep.run || '';
  if (!script.includes('wr/WR_TEMPLATE_FULL.md')) {
    throw new Error('WR generation must prefer the canonical wr/WR_TEMPLATE_FULL.md template');
  }
  if (script.includes('cp wr/WR_TEMPLATE.md "${WR_FILE}"')) {
    throw new Error('WR generation still hardcodes removed wr/WR_TEMPLATE.md path');
  }
  if (!script.includes('printf') || !script.includes('${ISSUE_BODY}') || !script.includes('OUTPUT_TYPE=')) {
    throw new Error('WR generation must parse Output Type from ISSUE_BODY safely');
  }
});

test('wr-pr-creation.yml suppresses operational issue_comment retry loops', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'wr-pr-creation.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const detectJob = doc.jobs['detect-completion'];
  const notifyJob = doc.jobs['notify-skip'];
  const checkStep = detectJob.steps.find((step) => step.name === 'Check if PR should be created');

  if (!detectJob.outputs?.should_notify_skip || !detectJob.outputs?.skip_reason) {
    throw new Error('detect-completion must expose skip notification outputs');
  }
  if (!checkStep) {
    throw new Error('Check if PR should be created step not found');
  }

  const script = checkStep.with?.script || '';
  const requiredSnippets = [
    'operationalCommentMarkers',
    'WR PR Creation Failed',
    'WR PR Creation: Skipped',
    'WR PR Created!',
    'operational_bot_comment',
    "context.eventName !== 'issue_comment'",
  ];
  for (const snippet of requiredSnippets) {
    if (!script.includes(snippet)) {
      throw new Error(`WR PR detection must suppress retry loops; missing ${snippet}`);
    }
  }

  const notifyIf = String(notifyJob.if || '');
  if (!notifyIf.includes("needs.detect-completion.outputs.should_notify_skip == 'true'")) {
    throw new Error('notify-skip job must honor should_notify_skip');
  }
});

test('stuck-wr-detector.yml routes exhausted WR retries to agent fallback and OpenRouter', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-wr-detector.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const healStep = doc.jobs.scan.steps.find((step) => step.name === 'Detect stuck WRs and heal');

  if (!healStep) {
    throw new Error('Detect stuck WRs and heal step not found');
  }

  const script = healStep.with?.script || '';
  const requiredSnippets = [
    'dispatchWorkflowBestEffort',
    "'agent-fallback.yml'",
    "prefer_agent: 'openrouter'",
    "'openrouter-triage.yml'",
    "'wr-pr-creation.yml'",
    "'triage:new'",
    "'agent-fallback'",
    'upsertEscalationComment',
    'WR PR Creation failed',
  ];

  for (const snippet of requiredSnippets) {
    if (!script.includes(snippet)) {
      throw new Error(`stuck detector escalation is missing ${snippet}`);
    }
  }

  if (script.includes('clearAttemptLabels(')) {
    throw new Error('stuck detector escalation should not clear retry labels during escalation');
  }
});

test('research-engine.yml dispatches wr-pr-creation after research run', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'research-engine.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const on = doc.on || doc['true'] || {};
  const issueCommentTypes = on.issue_comment?.types || [];
  const steps = doc.jobs?.research?.steps || [];
  const dispatchStep = steps.find((step) => step.name === 'Dispatch WR PR creation workflow');
  const routeScript = doc.jobs?.route?.steps?.find((step) => step.name === 'Decide route')?.with?.script || '';

  if (!Object.prototype.hasOwnProperty.call(on, 'issue_comment')) {
    throw new Error('research-engine.yml must support issue_comment triggers');
  }
  if (!issueCommentTypes.includes('created') || !issueCommentTypes.includes('edited')) {
    throw new Error('research-engine.yml issue_comment trigger must include created and edited');
  }
  if (!routeScript.includes('isPullRequestComment')) {
    throw new Error('Research engine route must detect pull request comments');
  }
  if (!routeScript.includes('commentTriggered')) {
    throw new Error('Research engine route must evaluate issue comment trigger phrases');
  }
  if (!routeScript.includes('!isPullRequestComment')) {
    throw new Error('Research engine route must ignore pull request comments');
  }

  if (!dispatchStep) {
    throw new Error('Dispatch WR PR creation workflow step not found in research-engine.yml');
  }

  if (dispatchStep.if !== "needs.route.outputs.issue_number != ''") {
    throw new Error('Dispatch WR PR creation workflow step must guard on issue_number presence');
  }

  const script = dispatchStep.with?.script || '';
  if (!script.includes("const workflowId = 'wr-pr-creation.yml'")) {
    throw new Error('Dispatch step script must target wr-pr-creation.yml');
  }
  if (!script.includes('createWorkflowDispatch')) {
    throw new Error('Dispatch step script must call createWorkflowDispatch');
  }
  if (!script.includes('workflow_id: workflowId')) {
    throw new Error('Dispatch step script must pass workflow_id in dispatch payload');
  }
  if (!script.includes('listWorkflowRuns')) {
    throw new Error('Dispatch step script must verify run startup via listWorkflowRuns');
  }
  if (!script.includes("event: 'workflow_dispatch'")) {
    throw new Error('Dispatch step startup check must filter workflow_dispatch runs');
  }
});

test('workflow-monitor.yml re-sweeps stale Copilot runs on a schedule', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'workflow-monitor.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const on = doc.on || doc.true || {};
  const monitorStep = doc.jobs?.monitor?.steps?.find((step) => step.name === 'Monitor workflow');

  if (!on.schedule?.some((entry) => entry.cron === '*/15 * * * *')) {
    throw new Error('workflow-monitor.yml must sweep on a 15-minute schedule');
  }
  if (!monitorStep) {
    throw new Error('Monitor workflow step not found');
  }

  const script = monitorStep.with?.script || '';
  const requiredSnippets = [
    "core.getInput('workflow_run_id')",
    'COPILOT_DYNAMIC_PATH',
    'listWorkflowRunsForRepo',
    'cancelWorkflowRun',
    'reRunWorkflow',
  ];

  for (const snippet of requiredSnippets) {
    if (!script.includes(snippet)) {
      throw new Error(`workflow monitor stale-run sweep is missing ${snippet}`);
    }
  }
});

test('morty-post-mortems.yml stays automated with required write scopes', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'morty-post-mortems.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const on = doc.on || doc.true;
  const permissions = doc.permissions || {};

  if (!Object.prototype.hasOwnProperty.call(on, 'push') ||
      !Object.prototype.hasOwnProperty.call(on, 'pull_request') ||
      !Object.prototype.hasOwnProperty.call(on, 'workflow_dispatch')) {
    throw new Error('morty-post-mortems.yml must support push, pull_request, and workflow_dispatch triggers');
  }
  if (permissions.contents !== 'read') {
    throw new Error('morty-post-mortems.yml must keep contents: read least-privilege access');
  }
  if (permissions.issues !== 'write') {
    throw new Error('morty-post-mortems.yml must grant issues: write for Morty issue operations');
  }
  if (permissions['pull-requests'] !== 'write') {
    throw new Error('morty-post-mortems.yml must grant pull-requests: write for PR comment/update operations');
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

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

test('pdf-work-request-router.yml keeps issue/workflow_dispatch triggers under on', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'pdf-work-request-router.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const on = doc.on || {};
  const issueTypes = Array.isArray(on.issues?.types) ? on.issues.types : [];
  const permissions = doc.permissions || {};

  if (!issueTypes.includes('opened') || !issueTypes.includes('edited') || !issueTypes.includes('labeled')) {
    throw new Error('pdf-work-request-router.yml must listen for opened/edited/labeled issue events');
  }
  if (!on.workflow_dispatch || !on.workflow_dispatch.inputs?.issue_number) {
    throw new Error('pdf-work-request-router.yml must expose workflow_dispatch issue_number input');
  }
  if ('issues' in permissions || 'workflow_dispatch' in permissions) {
    throw new Error('pdf-work-request-router.yml must not nest trigger config under permissions');
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
  if (!script.includes('closeLegacyStaleRepairIssues')) {
    throw new Error('watchdog must close legacy stale-state repair issues to prevent duplicates');
  }
  if (!script.includes('This stale-state repair issue is now closed automatically')) {
    throw new Error('watchdog must document why stale duplicate repair issues are auto-closed');
  }
});

test('stuck-label-watchdog.yml clears lifecycle:stuck once a PR recovers', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-label-watchdog.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const script = doc.jobs.sweep.steps[0].with?.script || '';

  if (!/removeLabel\([^)]*name:\s*'lifecycle:stuck'/.test(script)) {
    throw new Error('watchdog must remove lifecycle:stuck so PRs do not stay stuck permanently');
  }
  if (!script.includes('stillStuck')) {
    throw new Error('watchdog must only clear lifecycle:stuck when no stuck condition remains');
  }
});

test('stuck-check-watchdog.yml clears lifecycle:stuck on recovered issues with write scope', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-check-watchdog.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));

  if (doc.permissions?.issues !== 'write') {
    throw new Error('stuck-check-watchdog must have issues: write to remove lifecycle:stuck');
  }

  const job = doc.jobs['find-stuck-issues'];
  const script = job.steps.map(s => s.with?.script || '').join('\n');
  if (!script.includes("name: 'lifecycle:stuck'") || !script.includes('removeLabel')) {
    throw new Error('stuck-check-watchdog must remove lifecycle:stuck once an issue recovers');
  }
  if (!script.includes('RESOLVED_ACTIONS')) {
    throw new Error('stuck-check-watchdog must only clear lifecycle:stuck for resolved diagnoses');
  }
});

test('stuck-label-automation.yml can dispatch recovery workflows', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-label-automation.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const script = doc.jobs['auto-progress'].steps.map(s => s.with?.script || '').join('\n');

  if (!script.includes('createWorkflowDispatch')) {
    throw new Error('stuck-label-automation must keep workflow dispatch recovery actions');
  }
  if (doc.permissions?.actions !== 'write') {
    throw new Error('stuck-label-automation must have actions: write to dispatch recovery workflows');
  }
});

test('stuck-label-automation.yml ping-reviewers message uses configured threshold', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-label-automation.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const detectScript = doc.jobs['detect-stuck'].steps.map(s => s.with?.script || '').join('\n');
  const autoProgressScript = doc.jobs['auto-progress'].steps.map(s => s.with?.script || '').join('\n');

  if (!detectScript.includes('max_age_hours: Math.round(pattern.max_age_ms / MS_PER_HOUR)')) {
    throw new Error('stuck-label-automation must carry max_age_hours from STUCK_PATTERNS');
  }
  if (!autoProgressScript.includes('over ${thresholdHours} hours')) {
    throw new Error('stuck-label-automation ping-reviewers message must use thresholdHours');
  }
});

test('stuck-label-automation.yml keeps awaiting-approval ping threshold text in sync with configured age limit', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-label-automation.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const detectScript = doc.jobs['detect-stuck'].steps.map(s => s.with?.script || '').join('\n');
  const progressScript = doc.jobs['auto-progress'].steps.map(s => s.with?.script || '').join('\n');

  if (!detectScript.includes('threshold_hours: Math.round(pattern.max_age_ms / MS_PER_HOUR)')) {
    throw new Error('stuck-label-automation must propagate threshold_hours from max_age_ms');
  }
  if (!progressScript.includes('over ${item.threshold_hours} hours')) {
    throw new Error('stuck-label-automation ping-reviewers message must use threshold_hours');
  }
  if (progressScript.includes('over 72 hours')) {
    throw new Error('stuck-label-automation ping-reviewers must not use stale hardcoded 72-hour text');
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

test('agent-audit-logger.yml persists audit entries without committing to main', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'agent-audit-logger.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const steps = doc.jobs['log-agent-action'].steps;

  // The old commit-and-push-to-main step was the source of push contention
  // and a flood of "chore: log agent action" commits. It must be gone.
  const hasGitPush = steps.some((step) => (step.run || '').includes('git push'));
  if (hasGitPush) {
    throw new Error('log-agent-action must not push the audit log to main');
  }

  const persistStep = steps.find((step) => step.name === 'Persist audit entry');
  if (!persistStep) throw new Error('Persist audit entry step not found');
  if (!(persistStep.run || '').includes('GITHUB_STEP_SUMMARY')) {
    throw new Error('Persist step must write the entry to the job summary');
  }

  const checkoutStep = steps.find((step) => step.name === 'Checkout main');
  const checkoutToken = checkoutStep?.with?.token || '';
  if (!checkoutToken.includes('github.token')) {
    throw new Error('Checkout main must fall back to github.token when ADMIN_GITHUB_TOKEN is unavailable');
  }
  if (checkoutToken.includes('secrets.GITHUB_TOKEN')) {
    throw new Error('Checkout main must not rely on secrets.GITHUB_TOKEN fallback');
  }

  const uploadStep = steps.find((step) => step.name === 'Upload audit entry artifact');
  if (!uploadStep || !String(uploadStep.uses || '').startsWith('actions/upload-artifact')) {
    throw new Error('Audit entry must be retained via upload-artifact');
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

test('wr-pr-creation.yml validates local references in generated WR documents', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'wr-pr-creation.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const createJob = doc.jobs['create-wr-pr'];
  const validateStep = createJob.steps.find((step) => step.name === 'Validate WR local references');

  if (!validateStep) {
    throw new Error('Validate WR local references step not found');
  }

  const script = validateStep.run || '';
  const requiredSnippets = [
    'WR_FILE',
    're.finditer',
    'Missing local references',
    'Validated local references',
    "target.split('#', 1)[0]",
  ];
  for (const snippet of requiredSnippets) {
    if (!script.includes(snippet)) {
      throw new Error(`WR local-reference validation missing ${snippet}`);
    }
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

test('stuck-wr-detector.yml only retries WRs that are PR-ready and not duplicates', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-wr-detector.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const healStep = doc.jobs.scan.steps.find((step) => step.name === 'Detect stuck WRs and heal');

  if (!healStep) {
    throw new Error('Detect stuck WRs and heal step not found');
  }

  const script = healStep.with?.script || '';
  if (!script.includes("labelNames.has('duplicate')")) {
    throw new Error('stuck detector must skip duplicate issues before retriggering');
  }
  if (!script.includes("labelNames.has('wr:complete')") || !script.includes("labelNames.has('research:complete')")) {
    throw new Error('stuck detector must require wr:complete or research:complete before retriggering');
  }
});

test('research-engine.yml dispatches wr-pr-creation after research run', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'research-engine.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const on = doc.on || doc['true'] || {};
  const issueCommentTypes = on.issue_comment?.types || [];
  const steps = doc.jobs?.research?.steps || [];
  const dispatchStep = steps.find((step) => step.name === 'Dispatch WR PR creation workflow');
  const dispatchIndex = steps.findIndex((step) => step.name === 'Dispatch WR PR creation workflow');
  const commitIndex = steps.findIndex((step) => step.name === 'Commit research packet');
  const commitStep = steps[commitIndex];
  const routeScript = doc.jobs?.route?.steps?.find((step) => step.name === 'Decide route')?.with?.script || '';

  // Loop-prevention (WR retrigger storms on #14572/#14579): research-engine must
  // NOT auto-run on issue_comment or issues:labeled churn — sibling automation
  // fires those constantly, which re-ran the orchestrator on a loop. It runs on a
  // new issue (opened/reopened) or deliberate workflow_dispatch only.
  void issueCommentTypes;
  const issuesTypes = on.issues?.types || [];
  if (Object.prototype.hasOwnProperty.call(on, 'issue_comment')) {
    throw new Error('research-engine.yml must NOT auto-trigger on issue_comment (loop risk)');
  }
  if (issuesTypes.includes('labeled')) {
    throw new Error('research-engine.yml must NOT auto-trigger on issues:labeled (loop risk)');
  }
  if (!issuesTypes.includes('opened') || !Object.prototype.hasOwnProperty.call(on, 'workflow_dispatch')) {
    throw new Error('research-engine.yml must run on issues:opened + workflow_dispatch');
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
  if (!commitStep) {
    throw new Error('Commit research packet step not found in research-engine.yml');
  }

  if (dispatchStep.if !== "needs.route.outputs.issue_number != ''") {
    throw new Error('Dispatch WR PR creation workflow step must guard on issue_number presence');
  }
  if (!(dispatchIndex !== -1 && commitIndex !== -1 && dispatchIndex < commitIndex)) {
    throw new Error('Dispatch WR PR creation workflow step must run before Commit research packet');
  }
  if (commitStep['continue-on-error'] !== true) {
    throw new Error('Commit research packet step must be best-effort so archival failures do not block WR dispatch');
  }
  if (!(dispatchIndex !== -1 && commitIndex !== -1 && dispatchIndex < commitIndex)) {
    throw new Error('Dispatch WR PR creation workflow step must run before Commit research packet');
  }
  if (commitStep['continue-on-error'] !== true) {
    throw new Error('Commit research packet step must be best-effort so archival failures do not block WR dispatch');
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

test('secret-persistence-guard.yml auto-recover supports force_recovery manual dispatch', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'secret-persistence-guard.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const ifCondition = String(doc.jobs?.['auto-recover']?.if || '');
  const normalizedCondition = ifCondition.replace(/\s+/g, ' ').trim();

  if (!normalizedCondition.includes("needs.monitor-secret-health.outputs.has_missing == 'true'")) {
    throw new Error('auto-recover must still run when missing secrets are detected');
  }
  if (!normalizedCondition.includes('inputs.force_recovery')) {
    throw new Error('auto-recover must allow workflow_dispatch force_recovery overrides');
  }
  if (!normalizedCondition.includes("github.event_name == 'workflow_dispatch'")) {
    throw new Error('force_recovery override must be limited to workflow_dispatch runs');
  }
  const expectedOrPattern = /^needs\.monitor-secret-health\.outputs\.has_missing == 'true' \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.force_recovery\)$/;
  if (!expectedOrPattern.test(normalizedCondition)) {
    throw new Error('auto-recover condition must preserve OR logic between missing-secrets and force_recovery paths');
  }
});

// Regression: resync-all-prs job must use GITHUB_TOKEN directly, not an
// ADMIN_GITHUB_TOKEN fallback.  When ADMIN_GITHUB_TOKEN is set but expired/
// invalid the fallback expression `secrets.ADMIN_GITHUB_TOKEN != '' &&
// secrets.ADMIN_GITHUB_TOKEN || secrets.GITHUB_TOKEN` still resolves to the
// bad token, causing 401 Bad credentials on every scheduled re-sync.
// See: job 83770001732, workflow run 28271626160.
test('pr-state-orchestrator.yml resync-all-prs uses GITHUB_TOKEN (not ADMIN fallback)', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'pr-state-orchestrator.yml');
  const content = fs.readFileSync(filePath, 'utf8');
  const doc = yaml.parse(content);

  const resyncJob = doc.jobs?.['resync-all-prs'];
  if (!resyncJob) throw new Error('resync-all-prs job not found in pr-state-orchestrator.yml');

  const steps = resyncJob.steps || [];
  for (const step of steps) {
    const token = step.with?.['github-token'] || '';
    if (token.includes('ADMIN_GITHUB_TOKEN')) {
      throw new Error(
        `resync-all-prs step "${step.name}" uses ADMIN_GITHUB_TOKEN — ` +
        'use ${{ secrets.GITHUB_TOKEN }} directly to avoid 401 when the PAT is set but invalid'
      );
    }
  }
});

// Regression: find-stuck-issues job must pass owner/repo to every listForRepo call.
// Without them, the Octokit REST client constructs GET /repos///issues (empty
// owner and repo) which returns 404 Not Found and aborts the job.
// See: job 84184617094, workflow run 28401216956.
test('stuck-check-watchdog.yml find-stuck-issues passes owner/repo to all listForRepo calls', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-check-watchdog.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));

  const job = doc.jobs?.['find-stuck-issues'];
  if (!job) throw new Error('find-stuck-issues job not found in stuck-check-watchdog.yml');

  // Extract only the argument block for a single listForRepo( call by tracking
  // paren/brace depth so later calls in the same step cannot satisfy the regex
  // for an earlier call that is missing the params.
  function extractArgBlock(str) {
    let depth = 1; // we are already inside the opening ( of listForRepo(
    for (let j = 0; j < str.length; j++) {
      const ch = str[j];
      if (ch === '(' || ch === '{') depth++;
      else if (ch === ')' || ch === '}') {
        depth--;
        if (depth === 0) return str.slice(0, j);
      }
    }
    return str; // unmatched parens — return whole string as fallback
  }

  // Check each step individually so splits are confined to one step's script.
  for (const [stepIdx, step] of (job.steps || []).entries()) {
    const script = step.with?.script || '';
    if (!script.includes('listForRepo(')) continue;

    const callSections = script.split('listForRepo(');
    for (let i = 1; i < callSections.length; i++) {
      // Scope the check to only the argument block of this specific call.
      const body = extractArgBlock(callSections[i]);
      // Use regex to confirm the param is an actual key assignment, not a comment/string.
      if (!/owner\s*:\s*context\.repo\.owner/.test(body)) {
        throw new Error(
          `stuck-check-watchdog step ${stepIdx + 1}, listForRepo call #${i} ` +
          'is missing owner: context.repo.owner — ' +
          'omitting it produces GET /repos///issues and a 404'
        );
      }
      if (!/repo\s*:\s*context\.repo\.repo/.test(body)) {
        throw new Error(
          `stuck-check-watchdog step ${stepIdx + 1}, listForRepo call #${i} ` +
          'is missing repo: context.repo.repo — ' +
          'omitting it produces GET /repos///issues and a 404'
        );
      }
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

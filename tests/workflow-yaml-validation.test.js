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

test('stuck-label-watchdog.yml reconciles awaiting-review from live approvals on the current head SHA', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-label-watchdog.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const script = doc.jobs.sweep.steps[0].with?.script || '';

  if (!script.includes('github.rest.pulls.listReviews')) {
    throw new Error('watchdog must read live PR reviews before repairing stale awaiting-review state');
  }
  if (!script.includes('review.commit_id') || !script.includes('pr.head.sha')) {
    throw new Error('watchdog must only trust approvals that match the current head SHA');
  }
  if (!script.includes('liveApprovedCurrentHead')) {
    throw new Error('watchdog must derive approval state from live reviews on the current head');
  }
  if (!script.includes('STALE_REVIEW_SYNONYMS')) {
    throw new Error('watchdog must reconcile awaiting-review through a synonym set');
  }
  for (const synonym of ['awaiting-review', 'awaiting-approval', 'status:waiting-for-review']) {
    if (!script.includes(`'${synonym}'`)) {
      throw new Error(`watchdog must strip the stale review synonym '${synonym}' when the current head is approved`);
    }
  }
});

test('stuck-label-watchdog.yml silently self-heals awaiting-review+approved first, escalates only on same-head recurrence', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'stuck-label-watchdog.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const script = doc.jobs.sweep.steps[0].with?.script || '';

  // A per-head-SHA hidden marker is how the watchdog remembers a prior silent repair.
  if (!script.includes('watchdog-silent-repair:awaiting-review-approved:')) {
    throw new Error('watchdog must record a per-head-SHA silent-repair marker for awaiting-review+approved');
  }
  if (!script.includes('alreadySilentlyRepaired')) {
    throw new Error('watchdog must gate escalation on whether a silent repair already happened on this head SHA');
  }
  // First occurrence must NOT create noise: escalation (lifecycle:stuck / repair issue /
  // visible comment) must be guarded behind the recurrence branch, not run unconditionally.
  const blockStart = script.indexOf('const STALE_REVIEW_SYNONYMS');
  const blockEnd = script.indexOf('// Fix: ready-to-merge without approved');
  if (blockStart === -1 || blockEnd === -1 || blockEnd <= blockStart) {
    throw new Error('could not locate the awaiting-review+approved conflict block in the watchdog script');
  }
  const conflictBlock = script.slice(blockStart, blockEnd);
  const recurrenceGateIndex = conflictBlock.indexOf('if (!alreadySilentlyRepaired)');
  if (recurrenceGateIndex === -1) {
    throw new Error('watchdog must branch on !alreadySilentlyRepaired to keep the first self-heal silent');
  }
  const escalationIndex = conflictBlock.indexOf('openAgentRepairIssue');
  if (escalationIndex === -1 || escalationIndex < recurrenceGateIndex) {
    throw new Error('watchdog must only open an agent repair issue after the recurrence gate for awaiting-review+approved');
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
  // The guard must prevent re-adding awaiting-review on an already-approved PR.
  // Trusting the `approved` label alone is racy (the review-state job may not have
  // applied it yet), so the path must also confirm a live approval scoped to the
  // current head SHA before deciding whether to add awaiting-review.
  if (!script.includes('approvedOnHead')) {
    throw new Error('review_requested path must confirm live approval before adding awaiting-review');
  }
  if (!script.includes('commit_id !== pr.head.sha')) {
    throw new Error('review_requested approval check must be scoped to the current head SHA');
  }
  if (!script.includes("cur.includes('approved')")) {
    throw new Error('review_requested path must still treat the approved label as approved');
  }
  if (!script.includes("!approvedOnHead && !cur.includes('awaiting-review')")) {
    throw new Error('awaiting-review must only be added when not approved on head and not already present');
  }
});

test('pr-lifecycle.yml approval handler applies labels atomically via setLabels', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const script = doc.jobs['review-state'].steps[0].with?.script || '';

  // Approval events must clear ALL review-waiting label variants and set the
  // approval state in a single setLabels write — sequential remove/add calls
  // leave a window where awaiting-review + approved can coexist.
  if (!script.includes('setLabels')) {
    throw new Error('review-state must use issues.setLabels for atomic label transitions');
  }
  for (const waiting of ['awaiting-review', 'awaiting-approval', 'status:waiting-for-review']) {
    if (!script.includes(`'${waiting}'`)) {
      throw new Error(`review-state REVIEW_WAITING must include ${waiting}`);
    }
  }
  if (!script.includes('REVIEW_WAITING')) {
    throw new Error('review-state must define the REVIEW_WAITING variant list');
  }
  if (!script.includes('setLabelsAtomic')) {
    throw new Error('review-state approved/changes_requested paths must use setLabelsAtomic');
  }
});

test('pr-review-status.yml removes all review-waiting variants atomically', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'pr-review-status.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const script = doc.jobs['update-review-status'].steps[0].with?.script || '';

  if (!script.includes('setLabels')) {
    throw new Error('update-review-status must use issues.setLabels for atomic label transitions');
  }
  for (const waiting of ['awaiting-review', 'awaiting-approval', 'status:waiting-for-review']) {
    if (!script.includes(`'${waiting}'`)) {
      throw new Error(`update-review-status reviewLabels must include ${waiting}`);
    }
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

// Added 2026-07-08: weekly-research's "Check if issue is WR" script carried
// seven interleaved merge variants and could not compile — and NO gate
// covered it (only wr-pr-creation and compliance-watcher were compiled).
// Every github-script block in weekly-research.yml is now compiled here.
// See standards/GREEN_MAIN_STANDARD.md.
test('weekly-research.yml github-script blocks compile after workflow expression substitution', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'weekly-research.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));

  for (const job of Object.values(doc.jobs)) {
    for (const step of job.steps || []) {
      if (!String(step.uses || '').includes('github-script')) continue;
      const script = String(step.with?.script || '')
        .replace(/\$\{\{\s*steps\.check\.outputs\.issue_number\s*\}\}/g, '123')
        .replace(/\$\{\{\s*needs\.detect-wr\.outputs\.issue_number\s*\}\}/g, '123');

      try {
        new AsyncFunction('github', 'context', 'core', script);
      } catch (error) {
        throw new Error(`${step.name} github-script block does not compile: ${error.message}`);
      }
    }
  }
});

test('compliance-watcher.yml github-script block compiles', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'compliance-watcher.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const step = doc.jobs.watch.steps.find((entry) => entry.name === 'Evaluate deadlines and alert');

  if (!step) {
    throw new Error('Evaluate deadlines and alert step not found');
  }

  try {
    new AsyncFunction('github', 'context', 'core', String(step.with?.script || ''));
  } catch (error) {
    throw new Error(`compliance-watcher github-script block does not compile: ${error.message}`);
  }
});

test('compliance-check.yml urgent step deduplicates before creating an issue', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'compliance-check.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const step = doc.jobs['compliance-check'].steps.find((entry) => entry.name === 'Create Issue on Urgent');

  if (!step) {
    throw new Error('Create Issue on Urgent step not found');
  }

  const script = String(step.with?.script || '');

  // Must query existing open issues before creating, otherwise the daily
  // schedule opens an endless stream of identical urgent issues.
  if (!/listForRepo/.test(script)) {
    throw new Error('urgent step must look up existing issues before creating');
  }
  if (!/\(issue\.title === title\)|\(i\.title === title\)|issue\.title === title/.test(script)) {
    throw new Error('urgent step must match on issue title to deduplicate');
  }

  try {
    new AsyncFunction('github', 'context', 'core', script);
  } catch (error) {
    throw new Error(`compliance-check urgent github-script block does not compile: ${error.message}`);
  }
});

test('subscription-tracker.yml installs repo deps before github-script', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'subscription-tracker.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const steps = doc.jobs.track.steps;
  const setupIndex = steps.findIndex((step) => step.name === 'Setup Node');
  const installIndex = steps.findIndex((step) => step.name === 'Install deps');
  const scriptIndex = steps.findIndex((step) => step.name === 'Compute report and upsert tracking issue');

  if (setupIndex === -1) throw new Error('subscription-tracker must set up Node before running github-script');
  if (installIndex === -1) throw new Error('subscription-tracker must install dependencies before running github-script');
  if (scriptIndex === -1) throw new Error('subscription-tracker github-script step not found');
  if (!(setupIndex < installIndex && installIndex < scriptIndex)) {
    throw new Error('subscription-tracker must install dependencies before the github-script step');
  }
});

test('biome-inspector.yml falls back to the Contents API when direct pushes are blocked', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'biome-inspector.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const step = doc.jobs.inspect.steps.find((entry) => entry.name === 'Commit scoreboard if changed');
  const script = String(step?.run || '');

  if (!String(doc.env?.GH_REPO || '').includes('github.repository')) {
    throw new Error('biome-inspector must define GH_REPO for the Contents API fallback');
  }
  if (!script.includes('Direct push blocked by branch protection')) {
    throw new Error('biome-inspector must log the branch-protection fallback path');
  }
  if (!script.includes('gh api "repos/${GH_REPO}/contents/${encoded_path}" -X PUT')) {
    throw new Error('biome-inspector must update the scoreboard via the Contents API when push fails');
  }
});

test('flow-chart-sync.yml falls back to the Contents API when direct pushes are blocked', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'flow-chart-sync.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const step = doc.jobs.sync.steps.find((entry) => entry.name === 'Commit and push updated flow charts');
  const script = String(step?.run || '');

  if (!String(step?.env?.GH_REPO || '').includes('github.repository')) {
    throw new Error('flow-chart-sync must define GH_REPO for the Contents API fallback');
  }
  if (!String(step?.env?.GH_TOKEN || '').includes('ADMIN_GITHUB_TOKEN')) {
    throw new Error('flow-chart-sync must use the admin-token fallback for the Contents API path');
  }
  if (!script.includes('Direct push blocked after $attempts attempts')) {
    throw new Error('flow-chart-sync must log the branch-protection fallback path');
  }
  if (!script.includes('gh api "repos/${GH_REPO}/contents/${encoded_path}" -X PUT')) {
    throw new Error('flow-chart-sync must update changed files via the Contents API when push fails');
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

test('hourly maintenance workflows are staggered to avoid :00 runner queue spikes', () => {
  const expectedCrons = new Map([
    ['stuck-check-watchdog.yml', '8 * * * *'],
    ['secrets-guardian.yml', '18 * * * *'],
    ['veins-monitor.yml', '28 * * * *'],
  ]);

  for (const [workflowName, expectedCron] of expectedCrons.entries()) {
    const filePath = path.join(WORKFLOWS_DIR, workflowName);
    const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
    const on = doc.on || doc.true || {};
    const schedule = on.schedule || [];
    if (!schedule.some((entry) => entry.cron === expectedCron)) {
      throw new Error(`${workflowName} must schedule at "${expectedCron}" to spread hourly maintenance load`);
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

test('doppler-secrets-sync.yml summary snippet keeps balanced quote for secrets-fetch-action line', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'doppler-secrets-sync.yml');
  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes("echo '  uses: dopplerhq/secrets-fetch-action@v2.0.0' >> \"$GITHUB_STEP_SUMMARY\"")) {
    throw new Error('doppler-secrets-sync.yml must append a properly quoted secrets-fetch-action line to the step summary');
  }
  if (content.includes("echo '  uses: dopplerhq/secrets-fetch-action@v2.0.0 >> \"$GITHUB_STEP_SUMMARY\"")) {
    throw new Error('doppler-secrets-sync.yml contains the previously broken unbalanced quote variant');
  }
});

test('self-healing.yml routes step outputs through env and not bare run interpolation', () => {
  const filePath = path.join(WORKFLOWS_DIR, 'self-healing.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const steps = doc.jobs['research-state'].steps;

  const scan = steps.find((s) => s.id === 'scan');
  if (!scan) throw new Error('Scan for broken areas step (id: scan) not found');

  // Regression for job 84253108720: `AGENTS=${{ steps.agents.outputs.agent_workflows }}`
  // expanded to `AGENTS=missing: agent-dispatcher ...`, which bash parsed as an
  // env-assignment prefix + the command `agent-dispatcher` (exit 127). Step
  // outputs must come through env:, not raw interpolation into the run script.
  if (/^\s*AGENTS=\$\{\{/m.test(scan.run || '')) {
    throw new Error('scan step must not assign AGENTS via bare ${{ }} interpolation (causes exit 127)');
  }
  for (const key of ['ACTIONS_FAILED', 'STUCK', 'AGENTS']) {
    if (!scan.env || !(key in scan.env)) {
      throw new Error(`scan step must expose ${key} via env:`);
    }
  }
});

test('fleet-controller.yml feed push survives branch protection (API fallback, fail-open)', () => {
  // Regression for job 84418694523: bare `git push` to main was rejected by branch
  // protection ("Changes must be made through a pull request — GH013"). The feed
  // step must use `git push || { gh api ... }` so it (a) retries via the Contents
  // API when the push is blocked and (b) exits 0 either way (fail-open design).
  const filePath = path.join(WORKFLOWS_DIR, 'fleet-controller.yml');
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8'));
  const steps = doc.jobs['schedule-grid'].steps;

  const feedStep = steps.find((s) => s.name === 'Commit the monitor feed if it changed');
  if (!feedStep) throw new Error('fleet-controller: "Commit the monitor feed if it changed" step not found');

  const run = feedStep.run || '';

  // Must still contain git push (primary path)
  if (!run.includes('git push')) {
    throw new Error('fleet-controller feed step must attempt git push as the primary path');
  }

  // Must have a gh-api fallback so a branch-protection rejection does not exit non-zero
  if (!run.includes('gh api')) {
    throw new Error('fleet-controller feed step must fall back to gh api repos/.../contents/... when git push is blocked');
  }

  // The push must be guarded by `git push && ... || {` so the fallback fires instead of crashing
  if (!/git push\s*&&[^|]*\|\|/.test(run.replace(/\n/g, ' '))) {
    throw new Error('fleet-controller git push must be followed by && ... || fallback to avoid non-zero exit on branch-protection rejection');
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

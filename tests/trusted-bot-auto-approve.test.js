#!/usr/bin/env node
'use strict';

/**
 * Unit tests for trusted-bot-auto-approve.yml workflow logic
 * 
 * Tests the key decision points:
 * 1. Trusted bot detection (case-insensitive matching)
 * 2. SHA matching logic
 * 3. Check status verification (passing/failing/pending)
 * 4. Approval logic (only approve once)
 * 5. Circular dependency prevention (exclude own check)
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

// === Constants ===
const TRUSTED_BOTS = [
  'devin-ai-integration[bot]',
  'devin-ai[bot]',
  'github-actions[bot]',
  'copilot[bot]',
  'dependabot[bot]',
  'jules[bot]',
  'jules-google[bot]',
  'cursor[bot]',
  'cursor-ai[bot]',
  'octopus-ai[bot]',
  'circleci[bot]',
  'bito-ai[bot]',
  'openhands-ai-integration[bot]',
  'openhands-agent[bot]',
  'renovate[bot]',
];

const WORKFLOW_NAME = 'Auto-approve trusted bot PR';

// === Utility Functions ===

function isTrustedBot(authorLogin) {
  const normalizedLogin = (authorLogin || '').toLowerCase();
  return TRUSTED_BOTS.some(bot => normalizedLogin === bot.toLowerCase());
}

function findMatchingPRs(pulls, headSha) {
  return pulls.filter(pr => pr.head?.sha === headSha);
}

function getCheckStatus(checkRuns) {
  const completed = checkRuns.filter(r => r.status === 'completed');
  const failing = completed.filter(r =>
    ['failure', 'timed_out', 'cancelled'].includes(r.conclusion)
  );
  const pending = checkRuns.filter(r => r.status !== 'completed');
  
  return {
    completed,
    failing,
    pending,
    totalCompleted: completed.length,
    totalFailing: failing.length,
    totalPending: pending.length,
  };
}

function filterExternalChecks(checkRuns, workflowName) {
  return checkRuns.filter(r => r.name !== workflowName);
}

function shouldApprove(pr, checkRuns, reviews, workflowName) {
  // 1. Check if author is trusted bot
  if (!isTrustedBot(pr.user?.login)) {
    return { approved: false, reason: 'not_trusted_bot' };
  }
  
  // 2. Get external check status (exclude own workflow)
  const externalRuns = filterExternalChecks(checkRuns, workflowName);
  const status = getCheckStatus(externalRuns);
  
  // 3. Skip if checks still pending
  if (status.totalPending > 0) {
    return { approved: false, reason: 'checks_pending' };
  }
  
  // 4. Skip if any checks failing
  if (status.totalFailing > 0) {
    return { approved: false, reason: 'checks_failing', failing: status.failing };
  }
  
  // 5. Skip if no completed checks
  if (status.totalCompleted === 0) {
    return { approved: false, reason: 'no_completed_checks' };
  }
  
  // 6. Skip if already has approval
  const hasApproval = reviews.some(r => r.state === 'APPROVED');
  if (hasApproval) {
    return { approved: false, reason: 'already_approved' };
  }
  
  // All conditions met - approve
  return { approved: true, reason: 'all_conditions_met' };
}

function getHeadSha(eventName, payload) {
  if (eventName === 'check_suite') {
    return payload?.check_suite?.head_sha;
  } else if (eventName === 'workflow_run') {
    return payload?.workflow_run?.head_sha;
  }
  return null;
}

function formatApprovalBody(authorLogin, completedCount) {
  return [
    `**Auto-Approved** — PR by trusted bot \`${authorLogin}\`.`,
    `All ${completedCount} CI checks passed.`,
    '',
    '_This review was submitted automatically by the Trusted Bot Auto-Approve workflow._',
  ].join('\n');
}

// === Tests ===

(async () => {
  console.log('=== trusted-bot-auto-approve.yml Unit Tests ===\n');

  // Trusted Bot Detection
  await test('isTrustedBot detects devin-ai-integration[bot]', () => {
    assert.ok(isTrustedBot('devin-ai-integration[bot]'));
    assert.ok(isTrustedBot('Devin-AI-Integration[Bot]')); // case-insensitive
  });

  await test('isTrustedBot detects github-actions[bot]', () => {
    assert.ok(isTrustedBot('github-actions[bot]'));
  });

  await test('isTrustedBot detects copilot[bot]', () => {
    assert.ok(isTrustedBot('copilot[bot]'));
  });

  await test('isTrustedBot detects jules[bot]', () => {
    assert.ok(isTrustedBot('jules[bot]'));
  });

  await test('isTrustedBot detects cursor[bot]', () => {
    assert.ok(isTrustedBot('cursor[bot]'));
  });

  await test('isTrustedBot detects bito-ai[bot]', () => {
    assert.ok(isTrustedBot('bito-ai[bot]'));
  });

  await test('isTrustedBot detects openhands-ai-integration[bot]', () => {
    assert.ok(isTrustedBot('openhands-ai-integration[bot]'));
  });

  await test('isTrustedBot detects dependabot[bot]', () => {
    assert.ok(isTrustedBot('dependabot[bot]'));
  });

  await test('isTrustedBot detects renovate[bot]', () => {
    assert.ok(isTrustedBot('renovate[bot]'));
  });

  await test('isTrustedBot rejects non-bot logins', () => {
    assert.ok(!isTrustedBot('human-user'));
    assert.ok(!isTrustedBot('octocat'));
  });

  await test('isTrustedBot rejects unknown bots', () => {
    assert.ok(!isTrustedBot('unknown-bot[bot]'));
    assert.ok(!isTrustedBot('evil-bot'));
  });

  await test('isTrustedBot handles null/undefined', () => {
    assert.ok(!isTrustedBot(null));
    assert.ok(!isTrustedBot(undefined));
    assert.ok(!isTrustedBot(''));
  });

  // SHA Matching
  await test('findMatchingPRs finds PRs by head SHA', () => {
    const pulls = [
      { number: 1, head: { sha: 'abc123' } },
      { number: 2, head: { sha: 'def456' } },
      { number: 3, head: { sha: 'abc123' } },
    ];
    const matches = findMatchingPRs(pulls, 'abc123');
    assert.equal(matches.length, 2);
    assert.equal(matches[0].number, 1);
    assert.equal(matches[1].number, 3);
  });

  await test('findMatchingPRs returns empty for no matches', () => {
    const pulls = [
      { number: 1, head: { sha: 'abc123' } },
    ];
    const matches = findMatchingPRs(pulls, 'xyz789');
    assert.equal(matches.length, 0);
  });

  await test('findMatchingPRs handles missing head', () => {
    const pulls = [
      { number: 1 },
      { number: 2, head: { sha: 'abc123' } },
    ];
    const matches = findMatchingPRs(pulls, 'abc123');
    assert.equal(matches.length, 1);
  });

  // Check Status
  await test('getCheckStatus identifies passing checks', () => {
    const runs = [
      { status: 'completed', conclusion: 'success' },
      { status: 'completed', conclusion: 'success' },
    ];
    const status = getCheckStatus(runs);
    assert.equal(status.totalCompleted, 2);
    assert.equal(status.totalFailing, 0);
    assert.equal(status.totalPending, 0);
  });

  await test('getCheckStatus identifies failing checks', () => {
    const runs = [
      { status: 'completed', conclusion: 'success' },
      { status: 'completed', conclusion: 'failure' },
      { status: 'completed', conclusion: 'timed_out' },
    ];
    const status = getCheckStatus(runs);
    assert.equal(status.totalCompleted, 3);
    assert.equal(status.totalFailing, 2);
    assert.equal(status.totalPending, 0);
  });

  await test('getCheckStatus identifies pending checks', () => {
    const runs = [
      { status: 'completed', conclusion: 'success' },
      { status: 'in_progress' },
      { status: 'queued' },
    ];
    const status = getCheckStatus(runs);
    assert.equal(status.totalCompleted, 1);
    assert.equal(status.totalFailing, 0);
    assert.equal(status.totalPending, 2);
  });

  await test('getCheckStatus handles cancelled', () => {
    const runs = [
      { status: 'completed', conclusion: 'cancelled' },
    ];
    const status = getCheckStatus(runs);
    assert.equal(status.totalFailing, 1);
  });

  await test('getCheckStatus treats neutral/skipped as passing', () => {
    const runs = [
      { status: 'completed', conclusion: 'success' },
      { status: 'completed', conclusion: 'neutral' },
      { status: 'completed', conclusion: 'skipped' },
    ];
    const status = getCheckStatus(runs);
    assert.equal(status.totalFailing, 0);
    assert.equal(status.totalCompleted, 3);
  });

  // External Check Filtering
  await test('filterExternalChecks removes own workflow', () => {
    const runs = [
      { name: 'Auto-approve trusted bot PR', status: 'completed' },
      { name: 'CI Test', status: 'completed' },
      { name: 'Lint', status: 'completed' },
    ];
    const filtered = filterExternalChecks(runs, WORKFLOW_NAME);
    assert.equal(filtered.length, 2);
    assert.ok(!filtered.some(r => r.name === 'Auto-approve trusted bot PR'));
  });

  await test('filterExternalChecks keeps all when none match', () => {
    const runs = [
      { name: 'CI Test', status: 'completed' },
      { name: 'Lint', status: 'completed' },
    ];
    const filtered = filterExternalChecks(runs, WORKFLOW_NAME);
    assert.equal(filtered.length, 2);
  });

  // Head SHA Extraction
  await test('getHeadSha extracts from check_suite event', () => {
    const sha = getHeadSha('check_suite', {
      check_suite: { head_sha: 'abc123def' }
    });
    assert.equal(sha, 'abc123def');
  });

  await test('getHeadSha extracts from workflow_run event', () => {
    const sha = getHeadSha('workflow_run', {
      workflow_run: { head_sha: 'xyz789abc' }
    });
    assert.equal(sha, 'xyz789abc');
  });

  await test('getHeadSha returns null for unknown event', () => {
    const sha = getHeadSha('push', {});
    assert.equal(sha, null);
  });

  await test('getHeadSha handles missing data', () => {
    const sha = getHeadSha('check_suite', {});
    assert.equal(sha, null);
  });

  // Approval Logic
  await test('shouldApprove approves trusted bot with passing checks', () => {
    const pr = { user: { login: 'github-actions[bot]' } };
    const checkRuns = [
      { name: 'CI Test', status: 'completed', conclusion: 'success' },
    ];
    const reviews = [];
    const result = shouldApprove(pr, checkRuns, reviews, WORKFLOW_NAME);
    assert.ok(result.approved);
  });

  await test('shouldApprove rejects non-trusted bot', () => {
    const pr = { user: { login: 'human-user' } };
    const checkRuns = [{ status: 'completed', conclusion: 'success' }];
    const reviews = [];
    const result = shouldApprove(pr, checkRuns, reviews, WORKFLOW_NAME);
    assert.ok(!result.approved);
    assert.equal(result.reason, 'not_trusted_bot');
  });

  await test('shouldApprove rejects when checks pending', () => {
    const pr = { user: { login: 'github-actions[bot]' } };
    const checkRuns = [
      { name: 'CI Test', status: 'completed', conclusion: 'success' },
      { name: 'Build', status: 'in_progress' },
    ];
    const reviews = [];
    const result = shouldApprove(pr, checkRuns, reviews, WORKFLOW_NAME);
    assert.ok(!result.approved);
    assert.equal(result.reason, 'checks_pending');
  });

  await test('shouldApprove rejects when checks failing', () => {
    const pr = { user: { login: 'github-actions[bot]' } };
    const checkRuns = [
      { name: 'CI Test', status: 'completed', conclusion: 'failure' },
    ];
    const reviews = [];
    const result = shouldApprove(pr, checkRuns, reviews, WORKFLOW_NAME);
    assert.ok(!result.approved);
    assert.equal(result.reason, 'checks_failing');
  });

  await test('shouldApprove rejects when already approved', () => {
    const pr = { user: { login: 'github-actions[bot]' } };
    const checkRuns = [{ status: 'completed', conclusion: 'success' }];
    const reviews = [{ state: 'APPROVED' }];
    const result = shouldApprove(pr, checkRuns, reviews, WORKFLOW_NAME);
    assert.ok(!result.approved);
    assert.equal(result.reason, 'already_approved');
  });

  await test('shouldApprove rejects when no completed checks', () => {
    const pr = { user: { login: 'github-actions[bot]' } };
    const checkRuns = [{ status: 'in_progress' }];
    const reviews = [];
    const result = shouldApprove(pr, checkRuns, reviews, WORKFLOW_NAME);
    assert.ok(!result.approved);
    assert.equal(result.reason, 'checks_pending');
  });

  // Approval Body Formatting
  await test('formatApprovalBody includes bot name', () => {
    const body = formatApprovalBody('github-actions[bot]', 5);
    assert.ok(body.includes('github-actions[bot]'));
    assert.ok(body.includes('5'));
  });

  await test('formatApprovalBody includes automated notice', () => {
    const body = formatApprovalBody('copilot[bot]', 3);
    assert.ok(body.includes('automatically'));
    assert.ok(body.includes('Trusted Bot Auto-Approve'));
  });

  // Security: Ensure no injection in bot detection
  await test('isTrustedBot handles special characters safely', () => {
    assert.ok(!isTrustedBot("'; DROP TABLE users;--"));
    assert.ok(!isTrustedBot('<script>alert(1)</script>'));
  });

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed');
  }
})();
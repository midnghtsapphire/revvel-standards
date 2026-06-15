#!/usr/bin/env node
'use strict';

/**
 * Unit tests for self-healing.yml workflow logic
 * 
 * Tests the key decision points:
 * 1. System health detection (failed actions, stuck issues, missing workflows)
 * 2. Broken area identification
 * 3. Healing action selection
 * 4. Health threshold logic
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
const FAILED_ACTIONS_THRESHOLD = 3;
const STUCK_ISSUES_THRESHOLD = 5;

const REQUIRED_WORKFLOWS = [
  'agent-dispatcher',
  'issue-state-machine',
  'stuck-check-watchdog',
  'api-rate-limit-handler',
];

// === Utility Functions ===

function parseActionsStatus(actionsJson) {
  if (!actionsJson || actionsJson.length === 0) return { failedCount: 0, totalCount: 0 };
  
  let failedCount = 0;
  let totalCount = 0;
  
  for (const run of actionsJson) {
    totalCount++;
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
      failedCount++;
    }
  }
  
  return { failedCount, totalCount };
}

function parseStuckCount(stuckIssues) {
  const count = parseInt(stuckIssues, 10);
  return isNaN(count) ? 0 : count;
}

function checkWorkflowsPresent(workflowsList, requiredWorkflows) {
  const missing = [];
  
  for (const required of requiredWorkflows) {
    const found = workflowsList.some(wf => 
      wf.name?.toLowerCase().includes(required.toLowerCase())
    );
    if (!found) {
      missing.push(required);
    }
  }
  
  return {
    healthy: missing.length === 0,
    missing,
  };
}

function identifyBrokenAreas(actionsFailedCount, stuckCount, agentWorkflowsStatus) {
  const broken = [];
  
  if (actionsFailedCount > FAILED_ACTIONS_THRESHOLD) {
    broken.push(`GitHub Actions: ${actionsFailedCount} recent failures`);
  }
  
  if (stuckCount > STUCK_ISSUES_THRESHOLD) {
    broken.push(`Stuck issues: ${stuckCount} open`);
  }
  
  if (!agentWorkflowsStatus.healthy) {
    broken.push(`Missing workflows: ${agentWorkflowsStatus.missing.join(', ')}`);
  }
  
  return broken;
}

function getSystemHealth(brokenAreas) {
  if (!brokenAreas || brokenAreas.length === 0) {
    return 'healthy';
  }
  return 'needs-healing';
}

function shouldHealStuckIssues(brokenAreas) {
  return brokenAreas.some(area => area.includes('Stuck issues'));
}

function shouldHealFailedWorkflows(brokenAreas) {
  return brokenAreas.some(area => area.includes('GitHub Actions'));
}

function shouldCreateHealingIssue(brokenAreas, existingIssuesCount) {
  // Only create issue if no existing healing issue and system needs healing
  if (existingIssuesCount > 0) return false;
  return brokenAreas.length > 0;
}

function formatBrokenAreasList(brokenAreas) {
  return brokenAreas.join('; ');
}

function parseBrokenAreasList(brokenString) {
  if (!brokenString || brokenString === '') return [];
  return brokenString.split('; ').filter(s => s.trim().length > 0);
}

function getHealingActions(brokenAreas) {
  const actions = [];
  
  if (shouldHealStuckIssues(brokenAreas)) {
    actions.push('heal_stuck_issues');
  }
  
  if (shouldHealFailedWorkflows(brokenAreas)) {
    actions.push('heal_failed_workflows');
  }
  
  return actions;
}

// === Tests ===

(async () => {
  console.log('=== self-healing.yml Unit Tests ===\n');

  // Actions Status Parsing
  await test('parseActionsStatus counts failures', () => {
    const result = parseActionsStatus([
      { name: 'CI', conclusion: 'success' },
      { name: 'Test', conclusion: 'failure' },
      { name: 'Lint', conclusion: 'success' },
    ]);
    assert.equal(result.failedCount, 1);
    assert.equal(result.totalCount, 3);
  });

  await test('parseActionsStatus handles empty array', () => {
    const result = parseActionsStatus([]);
    assert.equal(result.failedCount, 0);
    assert.equal(result.totalCount, 0);
  });

  await test('parseActionsStatus handles null/undefined', () => {
    const result = parseActionsStatus(null);
    assert.equal(result.failedCount, 0);
  });

  await test('parseActionsStatus counts timed_out as failure', () => {
    const result = parseActionsStatus([
      { name: 'CI', conclusion: 'timed_out' },
    ]);
    assert.equal(result.failedCount, 1);
  });

  await test('parseActionsStatus treats cancelled separately (not failure)', () => {
    // Workflow only counts 'failure' and 'timed_out' as failures
    const result = parseActionsStatus([
      { name: 'CI', conclusion: 'cancelled' },
    ]);
    assert.equal(result.failedCount, 0);
  });

  // Stuck Issues Parsing
  await test('parseStuckCount parses valid number', () => {
    assert.equal(parseStuckCount('5'), 5);
    assert.equal(parseStuckCount('10'), 10);
  });

  await test('parseStuckCount handles zero', () => {
    assert.equal(parseStuckCount('0'), 0);
  });

  await test('parseStuckCount handles invalid input', () => {
    assert.equal(parseStuckCount('abc'), 0);
    assert.equal(parseStuckCount(''), 0);
  });

  // Workflow Presence Check
  await test('checkWorkflowsPresent returns healthy when all present', () => {
    const workflows = [
      { name: 'agent-dispatcher' },
      { name: 'issue-state-machine' },
      { name: 'stuck-check-watchdog' },
      { name: 'api-rate-limit-handler' },
    ];
    const result = checkWorkflowsPresent(workflows, REQUIRED_WORKFLOWS);
    assert.ok(result.healthy);
    assert.deepEqual(result.missing, []);
  });

  await test('checkWorkflowsPresent identifies missing workflows', () => {
    const workflows = [
      { name: 'agent-dispatcher' },
    ];
    const result = checkWorkflowsPresent(workflows, REQUIRED_WORKFLOWS);
    assert.ok(!result.healthy);
    assert.ok(result.missing.length > 0);
  });

  await test('checkWorkflowsPresent handles case insensitivity', () => {
    const workflows = [
      { name: 'Agent-Dispatcher' },
      { name: 'ISSUE-STATE-MACHINE' },
    ];
    const result = checkWorkflowsPresent(workflows, ['agent-dispatcher', 'issue-state-machine']);
    assert.ok(result.healthy);
  });

  // Broken Area Identification
  await test('identifyBrokenAreas detects failed actions', () => {
    const broken = identifyBrokenAreas(5, 0, { healthy: true });
    assert.ok(broken.some(a => a.includes('GitHub Actions')));
    assert.ok(broken.some(a => a.includes('5')));
  });

  await test('identifyBrokenAreas detects stuck issues', () => {
    const broken = identifyBrokenAreas(0, 10, { healthy: true });
    assert.ok(broken.some(a => a.includes('Stuck issues')));
  });

  await test('identifyBrokenAreas detects missing workflows', () => {
    const broken = identifyBrokenAreas(0, 0, { healthy: false, missing: ['agent-dispatcher'] });
    assert.ok(broken.some(a => a.includes('Missing workflows')));
  });

  await test('identifyBrokenAreas returns empty when healthy', () => {
    const broken = identifyBrokenAreas(0, 0, { healthy: true });
    assert.equal(broken.length, 0);
  });

  await test('identifyBrokenAreas respects thresholds', () => {
    // Below threshold
    let broken = identifyBrokenAreas(2, 0, { healthy: true });
    assert.equal(broken.length, 0);
    
    // At threshold (not >, so not broken)
    broken = identifyBrokenAreas(3, 0, { healthy: true });
    assert.equal(broken.length, 0);
    
    // Above threshold
    broken = identifyBrokenAreas(4, 0, { healthy: true });
    assert.ok(broken.length > 0);
  });

  // System Health
  await test('getSystemHealth returns healthy for empty broken areas', () => {
    assert.equal(getSystemHealth([]), 'healthy');
    assert.equal(getSystemHealth(null), 'healthy');
  });

  await test('getSystemHealth returns needs-healing when broken', () => {
    assert.equal(getSystemHealth(['GitHub Actions: 5 failures']), 'needs-healing');
  });

  // Healing Action Selection
  await test('shouldHealStuckIssues returns true when stuck issues broken', () => {
    assert.ok(shouldHealStuckIssues(['Stuck issues: 10 open']));
  });

  await test('shouldHealStuckIssues returns false when not broken', () => {
    assert.ok(!shouldHealStuckIssues(['GitHub Actions: 5 failures']));
  });

  await test('shouldHealFailedWorkflows returns true when actions broken', () => {
    assert.ok(shouldHealFailedWorkflows(['GitHub Actions: 5 failures']));
  });

  await test('shouldHealFailedWorkflows returns false when not broken', () => {
    assert.ok(!shouldHealFailedWorkflows(['Stuck issues: 10 open']));
  });

  // Issue Creation Logic
  await test('shouldCreateHealingIssue returns false when issue exists', () => {
    assert.ok(!shouldCreateHealingIssue(['GitHub Actions: 5 failures'], 1));
  });

  await test('shouldCreateHealingIssue returns true when needs healing', () => {
    assert.ok(shouldCreateHealingIssue(['GitHub Actions: 5 failures'], 0));
  });

  await test('shouldCreateHealingIssue returns false when system healthy', () => {
    assert.ok(!shouldCreateHealingIssue([], 0));
  });

  // Broken Areas List Formatting
  await test('formatBrokenAreasList joins with semicolon', () => {
    const formatted = formatBrokenAreasList(['Area 1', 'Area 2']);
    assert.equal(formatted, 'Area 1; Area 2');
  });

  await test('parseBrokenAreasList splits correctly', () => {
    const parsed = parseBrokenAreasList('Area 1; Area 2');
    assert.deepEqual(parsed, ['Area 1', 'Area 2']);
  });

  await test('parseBrokenAreasList handles empty string', () => {
    const parsed = parseBrokenAreasList('');
    assert.deepEqual(parsed, []);
  });

  await test('parseBrokenAreasList handles null', () => {
    const parsed = parseBrokenAreasList(null);
    assert.deepEqual(parsed, []);
  });

  // Healing Actions
  await test('getHealingActions returns stuck healing when needed', () => {
    const actions = getHealingActions(['Stuck issues: 10 open']);
    assert.ok(actions.includes('heal_stuck_issues'));
  });

  await test('getHealingActions returns workflow healing when needed', () => {
    const actions = getHealingActions(['GitHub Actions: 5 failures']);
    assert.ok(actions.includes('heal_failed_workflows'));
  });

  await test('getHealingActions returns multiple when both needed', () => {
    const actions = getHealingActions([
      'Stuck issues: 10 open',
      'GitHub Actions: 5 failures'
    ]);
    assert.ok(actions.includes('heal_stuck_issues'));
    assert.ok(actions.includes('heal_failed_workflows'));
  });

  await test('getHealingActions returns empty when healthy', () => {
    const actions = getHealingActions([]);
    assert.equal(actions.length, 0);
  });

  // Integration Tests
  await test('full health check cycle - healthy system', () => {
    const actionsStatus = parseActionsStatus([{ conclusion: 'success' }]);
    const stuckCount = parseStuckCount('0');
    const workflowsStatus = checkWorkflowsPresent(
      [{ name: 'agent-dispatcher' }, { name: 'issue-state-machine' }],
      ['agent-dispatcher', 'issue-state-machine']
    );
    const broken = identifyBrokenAreas(actionsStatus.failedCount, stuckCount, workflowsStatus);
    const health = getSystemHealth(broken);
    
    assert.equal(health, 'healthy');
  });

  await test('full health check cycle - broken system', () => {
    const actionsStatus = parseActionsStatus([
      { conclusion: 'failure' },
      { conclusion: 'failure' },
      { conclusion: 'failure' },
      { conclusion: 'failure' },
    ]);
    const stuckCount = parseStuckCount('10');
    const workflowsStatus = checkWorkflowsPresent([], ['agent-dispatcher']);
    const broken = identifyBrokenAreas(actionsStatus.failedCount, stuckCount, workflowsStatus);
    const health = getSystemHealth(broken);
    const actions = getHealingActions(broken);
    
    assert.equal(health, 'needs-healing');
    assert.ok(actions.length > 0);
  });

  // Threshold Constants
  await test('FAILED_ACTIONS_THRESHOLD is 3', () => {
    assert.equal(FAILED_ACTIONS_THRESHOLD, 3);
  });

  await test('STUCK_ISSUES_THRESHOLD is 5', () => {
    assert.equal(STUCK_ISSUES_THRESHOLD, 5);
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
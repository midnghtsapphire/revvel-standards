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
// Grounding gate: more than this many ship-quality failures in the last 5 runs
// triggers escalation. Value of 1 means a single flake is tolerated but 2+
// consecutive failures are treated as a persistently red test suite.
const GROUNDING_GATE_FAILURE_THRESHOLD = 1;

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
  const normalizedPaths = workflowsList.map(wf => (wf.path || '').toLowerCase());

  // Mirrors the "Check agent health" step in self-healing.yml: match on the
  // workflow FILE PATH (slug), never the display name. The API's .name field
  // is the display name ("Agent Dispatcher") and does not contain the
  // hyphenated slug ("agent-dispatcher"), which caused every sweep to report
  // all required workflows missing (false-positive [SELF-HEAL] issues,
  // e.g. #15683 / #15684).
  for (const required of requiredWorkflows) {
    const ymlPath = `.github/workflows/${required}.yml`;
    const yamlPath = `.github/workflows/${required}.yaml`;
    const found = normalizedPaths.includes(ymlPath) || normalizedPaths.includes(yamlPath);
    if (!found) {
      missing.push(required);
    }
  }

  return {
    healthy: missing.length === 0,
    missing,
  };
}

// Mirrors the "Check grounding gate" step in self-healing.yml.
// Returns true when the count of recent ship-quality failures exceeds the
// threshold (> 1, so a single transient flake is not escalated).
function isGroundingGateBroken(failures) {
  return failures > GROUNDING_GATE_FAILURE_THRESHOLD;
}

function identifyBrokenAreas(actionsFailedCount, stuckCount, agentWorkflowsStatus, groundingGateFailures = 0) {
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

  if (isGroundingGateBroken(groundingGateFailures)) {
    broken.push(`Grounding gate: ${groundingGateFailures} ship-quality failures`);
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

// Mirrors the "Heal grounding gate failures" step: returns true when the
// broken areas list contains a grounding gate entry, signalling that a
// targeted WR should be filed / updated in place.
function shouldHealGroundingGate(brokenAreas) {
  return brokenAreas.some(area => area.includes('Grounding gate'));
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

  if (shouldHealGroundingGate(brokenAreas)) {
    actions.push('file_grounding_gate_wr');
  }
  
  return actions;
}

// Mirror of the self-heal job's "Verify healing" step: after healing actions,
// re-check the same thresholds. Healed only when nothing remains broken.
function verifyHealing(failedCount, stuckCount) {
  const remaining = [];
  if (failedCount > FAILED_ACTIONS_THRESHOLD) {
    remaining.push(`GitHub Actions: ${failedCount} recent failures`);
  }
  if (stuckCount > STUCK_ISSUES_THRESHOLD) {
    remaining.push(`Stuck issues: ${stuckCount} open`);
  }
  return { healed: remaining.length === 0, remaining };
}

// Mirror of "Close healed issues or escalate in place": verified healed →
// close every open [SELF-HEAL] issue as completed; not healed → update the
// first open issue in place (biome-sentinel pattern) and consolidate
// duplicates; not healed with no open issue → create one escalation issue.
function selectJournalAction(healed, openIssueNumbers) {
  if (healed) {
    return { action: 'close-completed', close: openIssueNumbers, keep: null };
  }
  if (openIssueNumbers.length > 0) {
    return {
      action: 'update-in-place',
      keep: openIssueNumbers[0],
      close: openIssueNumbers.slice(1),
    };
  }
  return { action: 'create-escalation', keep: null, close: [] };
}

// Mirror of "Save healing memory": one JSONL record per healing pass.
function buildHealingMemoryRecord({ ts, broken, stuckRelabeled, reranRunIds, healed, remaining, outcome, closedIssues, runUrl }) {
  return {
    ts,
    event: 'self-heal',
    broken,
    actions: { stuck_relabeled: stuckRelabeled, reran_run_ids: reranRunIds },
    healed,
    remaining,
    outcome,
    closed_issues: closedIssues,
    run_url: runUrl,
  };
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
      { name: 'Agent Dispatcher', path: '.github/workflows/agent-dispatcher.yml' },
      { name: 'Issue State Machine', path: '.github/workflows/issue-state-machine.yml' },
      { name: 'Stuck Check Watchdog', path: '.github/workflows/stuck-check-watchdog.yml' },
      { name: 'API Rate Limit Handler', path: '.github/workflows/api-rate-limit-handler.yml' },
    ];
    const result = checkWorkflowsPresent(workflows, REQUIRED_WORKFLOWS);
    assert.ok(result.healthy);
    assert.deepEqual(result.missing, []);
  });

  await test('checkWorkflowsPresent identifies missing workflows', () => {
    const workflows = [
      { name: 'Agent Dispatcher', path: '.github/workflows/agent-dispatcher.yml' },
    ];
    const result = checkWorkflowsPresent(workflows, REQUIRED_WORKFLOWS);
    assert.ok(!result.healthy);
    assert.ok(result.missing.length > 0);
  });

  await test('checkWorkflowsPresent matches file path, not display name (issue #15684)', () => {
    // Display names like "Agent Dispatcher" never contain the slug
    // "agent-dispatcher"; the check must key off the workflow file path.
    const workflows = [
      { path: '.github/workflows/Agent-Dispatcher.YML' },
      { path: '.github/workflows/ISSUE-STATE-MACHINE.yaml' },
    ];
    const result = checkWorkflowsPresent(workflows, ['agent-dispatcher', 'issue-state-machine']);
    assert.ok(result.healthy);

    // A name-only match (no path) must NOT count as present.
    const nameOnly = checkWorkflowsPresent(
      [{ name: 'agent-dispatcher' }],
      ['agent-dispatcher']
    );
    assert.ok(!nameOnly.healthy);
    assert.deepEqual(nameOnly.missing, ['agent-dispatcher']);
  });

  await test('checkWorkflowsPresent flags workflows absent from a truncated page (issue #15684)', () => {
    // The live API returns 30 workflows per page by default; this repo has
    // 150+. The workflow step must use `gh api --paginate` — a truncated
    // first page that omits a required workflow must be reported missing,
    // which is why pagination is mandatory in self-healing.yml.
    const truncatedFirstPage = Array.from({ length: 30 }, (_, i) => ({
      name: `Unrelated Workflow ${i}`,
      path: `.github/workflows/unrelated-${i}.yml`,
    }));
    const result = checkWorkflowsPresent(truncatedFirstPage, REQUIRED_WORKFLOWS);
    assert.ok(!result.healthy);
    assert.deepEqual(result.missing, REQUIRED_WORKFLOWS);
  });

  // Regression: issue #15683 — the check used to grep the display name
  // (.name), which never contains the file slug, so every sweep reported all
  // required workflows as missing and filed a bogus [SELF-HEAL] issue.
  await test('checkWorkflowsPresent matches on path, not display name (issue #15683)', () => {
    const workflows = REQUIRED_WORKFLOWS.map(slug => ({
      name: slug.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      path: `.github/workflows/${slug}.yml`,
    }));
    const result = checkWorkflowsPresent(workflows, REQUIRED_WORKFLOWS);
    assert.ok(result.healthy, `expected healthy, missing: ${result.missing.join(', ')}`);
  });

  await test('checkWorkflowsPresent does not false-match a slug substring in another path', () => {
    const workflows = [
      { name: 'Other', path: '.github/workflows/not-agent-dispatcher-really.yml' },
    ];
    const result = checkWorkflowsPresent(workflows, ['agent-dispatcher']);
    assert.ok(!result.healthy);
    assert.deepEqual(result.missing, ['agent-dispatcher']);
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

  // Grounding Gate Detection
  await test('isGroundingGateBroken returns false for 0 failures', () => {
    assert.ok(!isGroundingGateBroken(0));
  });

  await test('isGroundingGateBroken returns false for exactly 1 failure (tolerated transient flake)', () => {
    assert.ok(!isGroundingGateBroken(1));
  });

  await test('isGroundingGateBroken returns true for 2 failures (persistent red suite)', () => {
    assert.ok(isGroundingGateBroken(2));
  });

  await test('isGroundingGateBroken returns true for 5 failures', () => {
    assert.ok(isGroundingGateBroken(5));
  });

  await test('identifyBrokenAreas detects grounding gate when 2+ failures', () => {
    const broken = identifyBrokenAreas(0, 0, { healthy: true }, 2);
    assert.ok(broken.some(a => a.includes('Grounding gate')));
    assert.ok(broken.some(a => a.includes('2')));
  });

  await test('identifyBrokenAreas does not flag grounding gate for 1 failure', () => {
    const broken = identifyBrokenAreas(0, 0, { healthy: true }, 1);
    assert.ok(!broken.some(a => a.includes('Grounding gate')));
  });

  await test('identifyBrokenAreas does not flag grounding gate when 0 failures (default)', () => {
    const broken = identifyBrokenAreas(0, 0, { healthy: true });
    assert.ok(!broken.some(a => a.includes('Grounding gate')));
  });

  await test('shouldHealGroundingGate returns true for grounding gate broken area', () => {
    assert.ok(shouldHealGroundingGate(['Grounding gate: 3 ship-quality failures']));
  });

  await test('shouldHealGroundingGate returns false when not in broken areas', () => {
    assert.ok(!shouldHealGroundingGate(['GitHub Actions: 5 failures']));
    assert.ok(!shouldHealGroundingGate([]));
  });

  await test('getHealingActions includes file_grounding_gate_wr when grounding gate broken', () => {
    const actions = getHealingActions(['Grounding gate: 3 ship-quality failures']);
    assert.ok(actions.includes('file_grounding_gate_wr'));
    assert.ok(!actions.includes('heal_stuck_issues'));
    assert.ok(!actions.includes('heal_failed_workflows'));
  });

  await test('getHealingActions includes all three actions when everything is broken', () => {
    const actions = getHealingActions([
      'Stuck issues: 10 open',
      'GitHub Actions: 5 failures',
      'Grounding gate: 3 ship-quality failures',
    ]);
    assert.ok(actions.includes('heal_stuck_issues'));
    assert.ok(actions.includes('heal_failed_workflows'));
    assert.ok(actions.includes('file_grounding_gate_wr'));
  });

  // Integration Tests
  await test('full health check cycle - healthy system', () => {
    const actionsStatus = parseActionsStatus([{ conclusion: 'success' }]);
    const stuckCount = parseStuckCount('0');
    const workflowsStatus = checkWorkflowsPresent(
      [
        { path: '.github/workflows/agent-dispatcher.yml' },
        { path: '.github/workflows/issue-state-machine.yml' },
      ],
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

  // Healing Verification (self-heal "Verify healing" step)
  await test('verifyHealing reports healed when everything below thresholds', () => {
    const result = verifyHealing(0, 0);
    assert.ok(result.healed);
    assert.deepEqual(result.remaining, []);
  });

  await test('verifyHealing reports not healed when failures remain', () => {
    const result = verifyHealing(5, 0);
    assert.ok(!result.healed);
    assert.ok(result.remaining.some(a => a.includes('GitHub Actions')));
  });

  await test('verifyHealing reports not healed when stuck issues remain', () => {
    const result = verifyHealing(0, 10);
    assert.ok(!result.healed);
    assert.ok(result.remaining.some(a => a.includes('Stuck issues')));
  });

  await test('verifyHealing uses same thresholds as detection (at-threshold is healed)', () => {
    const result = verifyHealing(FAILED_ACTIONS_THRESHOLD, STUCK_ISSUES_THRESHOLD);
    assert.ok(result.healed);
  });

  // Journal Action Selection (close-as-completed vs escalate-in-place)
  await test('selectJournalAction closes all open issues as completed when healed', () => {
    const result = selectJournalAction(true, [15680, 15682, 15684]);
    assert.equal(result.action, 'close-completed');
    assert.deepEqual(result.close, [15680, 15682, 15684]);
  });

  await test('selectJournalAction updates first issue in place and consolidates duplicates when not healed', () => {
    const result = selectJournalAction(false, [15680, 15682, 15684]);
    assert.equal(result.action, 'update-in-place');
    assert.equal(result.keep, 15680);
    assert.deepEqual(result.close, [15682, 15684]);
  });

  await test('selectJournalAction creates one escalation issue when not healed and none open', () => {
    const result = selectJournalAction(false, []);
    assert.equal(result.action, 'create-escalation');
    assert.deepEqual(result.close, []);
  });

  await test('selectJournalAction is a no-op close when healed with none open', () => {
    const result = selectJournalAction(true, []);
    assert.equal(result.action, 'close-completed');
    assert.deepEqual(result.close, []);
  });

  // Healing Memory Record (wr/memory/healing.jsonl)
  await test('buildHealingMemoryRecord captures full provenance', () => {
    const record = buildHealingMemoryRecord({
      ts: '2026-07-11T12:00:00Z',
      broken: 'Stuck issues: 10 open; ',
      stuckRelabeled: 4,
      reranRunIds: ['111', '222'],
      healed: true,
      remaining: '',
      outcome: 'healed',
      closedIssues: ['15684'],
      runUrl: 'https://github.com/midnghtsapphire/revvel-standards/actions/runs/1',
    });
    assert.equal(record.event, 'self-heal');
    assert.equal(record.healed, true);
    assert.equal(record.outcome, 'healed');
    assert.equal(record.actions.stuck_relabeled, 4);
    assert.deepEqual(record.actions.reran_run_ids, ['111', '222']);
    assert.deepEqual(record.closed_issues, ['15684']);
    assert.ok(record.ts && record.run_url);
    // Must serialize to a single JSONL line, and round-trip losslessly.
    const line = JSON.stringify(record);
    assert.ok(!line.includes('\n'));
    assert.deepEqual(JSON.parse(line), record);
  });

  // Threshold Constants
  await test('FAILED_ACTIONS_THRESHOLD is 3', () => {
    assert.equal(FAILED_ACTIONS_THRESHOLD, 3);
  });

  await test('STUCK_ISSUES_THRESHOLD is 5', () => {
    assert.equal(STUCK_ISSUES_THRESHOLD, 5);
  });

  await test('GROUNDING_GATE_FAILURE_THRESHOLD is 1', () => {
    assert.equal(GROUNDING_GATE_FAILURE_THRESHOLD, 1);
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
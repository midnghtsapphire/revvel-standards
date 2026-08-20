#!/usr/bin/env node
'use strict';

/**
 * Unit tests for wr-pr-creation.yml workflow logic
 * 
 * Tests the key decision points:
 * 1. Issue number parsing (workflow_dispatch vs issue events)
 * 2. WR detection (title prefix, labels, issue types)
 * 3. PR creation conditions (completion signals, duplicate prevention)
 * 4. Branch name generation
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

// === Test Data ===

const wrIssue = {
  number: 14569,
  title: '[WR] I need 5 sellable .pdf on gumloop',
  body: 'Some content',
  state: 'open',
  labels: [
    { name: 'work-request' },
    { name: 'weekly-research' },
    { name: 'research:complete' },
  ],
};

const nonWrIssue = {
  number: 14570,
  title: 'Bug: Something is broken',
  body: 'Description',
  state: 'open',
  labels: [],
};

const closedWrIssue = {
  number: 14571,
  title: '[WR] Completed work',
  body: 'Done',
  state: 'closed',
  labels: [{ name: 'work-request' }],
};

// === Utility Functions (extracted from workflow) ===

function parseIssueNumber(payload, inputs, runUrl) {
  // 1. Try issue number from payload
  let issueNumber = payload?.issue?.number || inputs?.issue_number;
  
  // Ensure we have a string for regex
  const rawIssueNumber = String(issueNumber || '');
  
  // Parse numeric part from various formats
  const numericMatch = rawIssueNumber.match(/#?(\d+)/);
  if (numericMatch) {
    return numericMatch[1];
  }
  
  // Fallback: extract from run URL
  const runIdMatch = runUrl?.match(/\/runs\/(\d+)\//);
  if (runIdMatch) {
    return runIdMatch[1];
  }
  
  return null;
}

function isWrIssue(title, labels, issueType) {
  const labelSet = new Set(
    labels.map(l => typeof l === 'string' ? l : l.name)
  );
  const normalizedIssueType = (issueType || '').trim().toLowerCase();

  // Mirrors the three-tier route-tag detection in wr-pr-creation.yml
  // ("Check if PR should be created"). RECONSTRUCTED 2026-07-08: four
  // interleaved variants of this function had been merged on top of each
  // other, leaving the file unparseable (standards/GREEN_MAIN_STANDARD.md).
  const hasWrRouteTag = /#(?:app|apps|tool|tools|pdf|pdfs|doc|docs|api|apis|cli|mcp|skill|skills|website)\b/i.test(title);
  const hasRouteTag = /(^|\s)#(app|web-app|tool|tools|pdf|docs?|documentation|api|cli|mcp|video|skill|skills|website)\b/i.test(title);
  const hasTitleRouteTag = /(?:^|\s)#(?:app|apps|tool|tools|cli|api|mcp|pdf|doc|docs|skill|skills|website)(?=\s|$)/i.test(title);

  return (
    title.match(/^\[WR\]/i) ||
    hasWrRouteTag ||
    hasRouteTag ||
    labelSet.has('weekly-research') ||
    labelSet.has('work-request') ||
    (labelSet.has('wr:new') && hasTitleRouteTag) ||
    ['basic wr', 'wr', 'work request'].includes(normalizedIssueType)
  );
}

function isCompletionLabel(labelName) {
  const COMPLETION_LABELS = new Set(['research:complete', 'wr:complete', 'wr:research', 'wr:reset']);
  return COMPLETION_LABELS.has(labelName);
}

function shouldCreatePr(issue, eventName, action, label) {
  // Skip if issue is closed or has issue:done
  let actuallyDone = false;
  if (issue.state === 'closed') {
    actuallyDone = true;
  } else {
    const labels = issue.labels.map(l => typeof l === 'string' ? l : l.name);
    const labelSet = new Set(labels);
    if (labelSet.has('issue:done')) {
      // Mock the graphql behavior: only skip if closedByPrsCount > 0
      const closedByPrsCount = issue._mockClosedByPrsCount || 0;
      if (closedByPrsCount > 0) {
        actuallyDone = true;
      }
    }
  }
  
  if (actuallyDone) return false;
  
  // Skip bot-created failure/alert issues
  if (eventName === 'issues' && action === 'labeled') {
    const title = issue.title || '';
    if (title.startsWith('[FAILURE]') || title.startsWith('[ALERT]')) {
      return false;
    }
  }
  
  return true;
}

function generateBranchName(issueNumber, issueTitle) {
  const slug = issueTitle
    .replace(/^\[WR\]\s*/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `wr/issue-${issueNumber}-${slug}`;
}

function isOperationalBotComment(commentBody, commentAuthor) {
  const operationalMarkers = [
    'WR PR Creation Failed',
    'WR PR Creation: Skipped',
    'WR PR Created!',
  ];
  return (
    commentAuthor === 'github-actions[bot]' &&
    operationalMarkers.some(marker => commentBody.includes(marker))
  );
}

function isCompletionTrigger(eventName, action, labelName) {
  if (eventName === 'issues' && action === 'labeled') {
    return isCompletionLabel(labelName);
  }
  // workflow_dispatch and opened/reopened are always valid triggers
  if (eventName === 'workflow_dispatch') return true;
  if (eventName === 'issues' && ['opened', 'reopened'].includes(action)) return true;
  return false;
}

// === Tests ===

(async () => {
  console.log('=== wr-pr-creation.yml Unit Tests ===\n');

  // Issue Number Parsing
  await test('parseIssueNumber extracts from payload.issue', () => {
    const result = parseIssueNumber(
      { issue: { number: 14569 } },
      {},
      ''
    );
    assert.equal(result, '14569');
  });

  await test('parseIssueNumber extracts from inputs.issue_number', () => {
    const result = parseIssueNumber(
      {},
      { issue_number: '14569' },
      ''
    );
    assert.equal(result, '14569');
  });

  await test('parseIssueNumber handles # prefix', () => {
    const result = parseIssueNumber(
      { issue: { number: '#14569' } },
      {},
      ''
    );
    assert.equal(result, '14569');
  });

  await test('parseIssueNumber handles plain number string', () => {
    const result = parseIssueNumber(
      { issue: { number: '14569' } },
      {},
      ''
    );
    assert.equal(result, '14569');
  });

  await test('parseIssueNumber extracts from run URL as fallback', () => {
    const result = parseIssueNumber(
      {},
      {},
      'https://github.com/org/repo/actions/runs/27566386345/jobs/123'
    );
    assert.equal(result, '27566386345');
  });

  await test('parseIssueNumber returns null when no source available', () => {
    const result = parseIssueNumber({}, {}, '');
    assert.equal(result, null);
  });

  // WR Detection
  await test('isWrIssue detects [WR] prefix in title', () => {
    assert.ok(isWrIssue('[WR] Test issue', [], null));
    assert.ok(isWrIssue('[wr] lowercase', [], null));
    assert.ok(!isWrIssue('WR: Test issue', [], null));
  });

  await test('isWrIssue detects work-request label', () => {
    assert.equal(isWrIssue('Some issue', [{ name: 'work-request' }], null), true);
  });

  await test('isWrIssue detects weekly-research label', () => {
    assert.equal(isWrIssue('Some issue', [{ name: 'weekly-research' }], null), true);
  });

  await test('isWrIssue detects WR issue type', () => {
    assert.equal(isWrIssue('Some issue', [], 'wr'), true);
    assert.equal(isWrIssue('Some issue', [], 'basic wr'), true);
    assert.equal(isWrIssue('Some issue', [], 'work request'), true);
  });
  // CONSOLIDATED 2026-07-08: six spliced generations of this test are merged
  // below. One older generation required `wr:new` before trusting bare title
  // tags; the newest intent (fix #15274, "recognize title-tagged WR intake")
  // accepts route tags unconditionally, so that is what the workflow and
  // this suite now pin. See standards/GREEN_MAIN_STANDARD.md.
  await test('isWrIssue detects title route tags for title-only intake', () => {
    assert.equal(isWrIssue('places to buy pbmt tools #tool #app', [], null), true);
    assert.equal(isWrIssue('Need a new CLI helper #cli', [], null), true);
    assert.equal(isWrIssue('Regulation-of-Skin-Collagen.pdf#tools #app', [], null), true);
    assert.equal(isWrIssue('Red light guide #pdf', [], null), true);
    assert.equal(isWrIssue('s12967-025-07466-3.pdf#tools #apps', [], null), true);
    assert.equal(isWrIssue('landing page #app', [], null), true);
    assert.equal(isWrIssue('Red light therapy stretch marks #tools #app', [], null), true);
    assert.equal(isWrIssue('Red Light Therapy for Stretch Marks: Science & Protocols (20#tool #app', [], null), true);
    assert.equal(isWrIssue('Red light therapy guide#tools #app', [], null), true);
    assert.equal(isWrIssue('Clinical workflow #tool', [], null), true);
    assert.equal(isWrIssue('Lead scoring helper #skill', [], null), true);
    assert.equal(isWrIssue('Oz landing page #website', [], null), true);
  });

  await test('isWrIssue accepts wr:new seeded route-tag intake', () => {
    assert.equal(isWrIssue('Photobiomodulation study #tools #app', [{ name: 'wr:new' }], null), true);
  });

  await test('isWrIssue returns false for non-WR issues', () => {
    assert.equal(isWrIssue('Bug: Something broken', [], null), false);
  });

  // Completion Labels
  await test('isCompletionLabel detects research:complete', () => {
    assert.equal(isCompletionLabel('research:complete'), true);
  });

  await test('isCompletionLabel detects wr:complete', () => {
    assert.equal(isCompletionLabel('wr:complete'), true);
  });

  await test('isCompletionLabel detects wr:research', () => {
    assert.equal(isCompletionLabel('wr:research'), true);
  });

  await test('isCompletionLabel detects wr:reset (self-heal force-create)', () => {
    assert.equal(isCompletionLabel('wr:reset'), true);
  });

  await test('isCompletionLabel rejects non-completion labels', () => {
    assert.equal(isCompletionLabel('work-request'), false);
    assert.equal(isCompletionLabel('needs-action'), false);
  });

  // PR Creation Conditions
  await test('shouldCreatePr returns false for closed issues', () => {
    assert.equal(shouldCreatePr(closedWrIssue, 'issues', 'labeled', null), false);
  });

  await test('shouldCreatePr returns false for issue:done label when closed by PR', () => {
    const issue = { ...wrIssue, labels: [...wrIssue.labels, { name: 'issue:done' }], _mockClosedByPrsCount: 1 };
    assert.equal(shouldCreatePr(issue, 'issues', 'labeled', null), false);
  });

  await test('shouldCreatePr returns true for open issue with issue:done label but no closing PR', () => {
    const issue = { ...wrIssue, labels: [...wrIssue.labels, { name: 'issue:done' }], _mockClosedByPrsCount: 0 };
    assert.equal(shouldCreatePr(issue, 'issues', 'labeled', null), true);
  });

  await test('shouldCreatePr returns true for open WR issues', () => {
    assert.equal(shouldCreatePr(wrIssue, 'issues', 'labeled', null), true);
  });

  // Branch Name Generation
  await test('generateBranchName creates valid branch name', () => {
    const result = generateBranchName(14569, '[WR] I need 5 sellable .pdf on gumloop');
    assert.ok(result.startsWith('wr/issue-14569-'));
    assert.ok(result.includes('sellable'));
  });

  await test('generateBranchName handles special characters', () => {
    const result = generateBranchName(14569, '[WR] Test! @#$% special chars');
    assert.ok(/^[a-z0-9-]+$/.test(result.split('-').slice(2).join('-')));
  });

  await test('generateBranchName truncates long titles', () => {
    const longTitle = '[WR] ' + 'a'.repeat(100);
    const result = generateBranchName(14569, longTitle);
    assert.ok(result.length <= 60 + 20); // prefix + number + truncated slug
  });

  // Operational Comment Detection
  await test('isOperationalBotComment detects failure comment', () => {
    assert.equal(
      isOperationalBotComment('❌ **WR PR Creation Failed**', 'github-actions[bot]'),
      true
    );
  });

  await test('isOperationalBotComment detects skip comment', () => {
    assert.equal(
      isOperationalBotComment('⏭️ **WR PR Creation: Skipped**', 'github-actions[bot]'),
      true
    );
  });

  await test('isOperationalBotComment detects success comment', () => {
    assert.equal(
      isOperationalBotComment('🎉 **WR PR Created!**', 'github-actions[bot]'),
      true
    );
  });

  await test('isOperationalBotComment rejects non-bot comments', () => {
    assert.equal(
      isOperationalBotComment('Some comment', 'user'),
      false
    );
  });

  await test('isOperationalBotComment rejects unrelated bot comments', () => {
    assert.equal(
      isOperationalBotComment('Random bot comment', 'github-actions[bot]'),
      false
    );
  });

  // Completion Trigger Detection
  await test('isCompletionTrigger allows research:complete labeled event', () => {
    assert.equal(
      isCompletionTrigger('issues', 'labeled', 'research:complete'),
      true
    );
  });

  await test('isCompletionTrigger allows wr:complete labeled event', () => {
    assert.equal(
      isCompletionTrigger('issues', 'labeled', 'wr:complete'),
      true
    );
  });

  await test('isCompletionTrigger allows wr:reset labeled event (self-heal)', () => {
    assert.equal(
      isCompletionTrigger('issues', 'labeled', 'wr:reset'),
      true
    );
  });

  await test('isCompletionTrigger blocks non-completion labels', () => {
    assert.equal(
      isCompletionTrigger('issues', 'labeled', 'needs-action'),
      false
    );
    assert.equal(
      isCompletionTrigger('issues', 'labeled', 'work-request'),
      false
    );
  });

  await test('isCompletionTrigger allows workflow_dispatch', () => {
    assert.equal(isCompletionTrigger('workflow_dispatch', null, null), true);
  });

  await test('isCompletionTrigger allows opened issues', () => {
    assert.equal(isCompletionTrigger('issues', 'opened', null), true);
  });

  await test('isCompletionTrigger allows reopened issues', () => {
    assert.equal(isCompletionTrigger('issues', 'reopened', null), true);
  });

  // Edge Cases
  await test('handles issue with string labels array', () => {
    const issue = {
      ...wrIssue,
      labels: ['work-request', 'weekly-research'],
    };
    assert.ok(isWrIssue(issue.title, issue.labels, null));
  });

  await test('handles issue with mixed label formats', () => {
    const issue = {
      ...wrIssue,
      labels: ['work-request', { name: 'weekly-research' }],
    };
    assert.ok(isWrIssue(issue.title, issue.labels, null));
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
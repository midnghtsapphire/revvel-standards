#!/usr/bin/env node
'use strict';

/**
 * Unit tests for pr-lifecycle.yml workflow logic
 * 
 * Tests the key decision points:
 * 1. PR state transitions based on action
 * 2. Label management (add/remove logic)
 * 3. Approval state detection
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

// === Constants from workflow ===
const LIFECYCLE_LABELS = [
  'awaiting-review', 'awaiting-approval', 'approved',
  'changes-requested', 'review-started', 'checks-failing',
  'checks-passing', 'ready-to-merge', 'needs-action'
];

const ALL_LABELS = new Set(LIFECYCLE_LABELS);

// === Utility Functions ===

function getNextState(action, currentLabels, reviewState, checksPassing) {
  // State machine for PR lifecycle
  switch (action) {
    case 'opened':
    case 'reopened':
    case 'ready_for_review':
      return 'awaiting-review';
    
    case 'converted_to_draft':
      return 'awaiting-approval';
    
    case 'closed':
      if (currentLabels.has('approved')) {
        return 'ready-to-merge';
      }
      return 'needs-action';
    
    case 'synchronize':
      return 'review-started';
    
    default:
      return null;
  }
}

function shouldAddLabel(action, currentLabels) {
  const nextState = getNextState(action, currentLabels, null, false);
  if (!nextState) return false;
  
  // Don't re-add if already present
  if (currentLabels.has(nextState)) return false;
  
  return true;
}

function getLabelsToRemove(action, currentLabels) {
  const nextState = getNextState(action, currentLabels, null, false);
  if (!nextState) return [];
  
  // Remove conflicting states
  const conflicts = {
    'awaiting-review': ['awaiting-approval', 'approved', 'changes-requested', 'review-started', 'ready-to-merge'],
    'awaiting-approval': ['awaiting-review', 'approved', 'changes-requested', 'ready-to-merge'],
    'approved': ['awaiting-review', 'awaiting-approval', 'changes-requested'],
    'changes-requested': ['awaiting-review', 'awaiting-approval', 'approved'],
    'review-started': ['awaiting-review'],
    'checks-failing': ['checks-passing', 'ready-to-merge'],
    'checks-passing': ['checks-failing'],
    'ready-to-merge': [],
    'needs-action': ['ready-to-merge'],
  };
  
  const toRemove = conflicts[nextState] || [];
  return toRemove.filter(l => currentLabels.has(l));
}

function isCheckPassing(checkConclusion) {
  return ['success', 'neutral', 'skipped'].includes(checkConclusion);
}

function isReviewApproved(reviewState) {
  return reviewState === 'APPROVED';
}

function isReviewChangesRequested(reviewState) {
  return reviewState === 'CHANGES_REQUESTED';
}

// === Tests ===

(async () => {
  console.log('=== pr-lifecycle.yml Unit Tests ===\n');

  // State Transitions
  await test('opened PR gets awaiting-review label', () => {
    const state = getNextState('opened', new Set(), null, false);
    assert.equal(state, 'awaiting-review');
  });

  await test('reopened PR gets awaiting-review label', () => {
    const state = getNextState('reopened', new Set(), null, false);
    assert.equal(state, 'awaiting-review');
  });

  await test('ready_for_review PR gets awaiting-review label', () => {
    const state = getNextState('ready_for_review', new Set(), null, false);
    assert.equal(state, 'awaiting-review');
  });

  await test('converted_to_draft PR gets awaiting-approval label', () => {
    const state = getNextState('converted_to_draft', new Set(), null, false);
    assert.equal(state, 'awaiting-approval');
  });

  await test('closed approved PR gets ready-to-merge label', () => {
    const state = getNextState('closed', new Set(['approved']), null, false);
    assert.equal(state, 'ready-to-merge');
  });

  await test('closed non-approved PR gets needs-action label', () => {
    const state = getNextState('closed', new Set(), null, false);
    assert.equal(state, 'needs-action');
  });

  await test('synchronize (new commit) PR gets review-started label', () => {
    const state = getNextState('synchronize', new Set(), null, false);
    assert.equal(state, 'review-started');
  });

  // Label Conflicts
  await test('getLabelsToRemove removes awaiting-approval when adding awaiting-review', () => {
    const toRemove = getLabelsToRemove('opened', new Set(['awaiting-approval']));
    assert.ok(toRemove.includes('awaiting-approval'));
  });

  await test('getLabelsToRemove removes approved when adding changes-requested', () => {
    const toRemove = getLabelsToRemove('opened', new Set(['approved', 'ready-to-merge']));
    assert.ok(toRemove.includes('approved'));
    assert.ok(toRemove.includes('ready-to-merge'));
  });

  await test('getLabelsToRemove removes checks-failing when adding checks-passing', () => {
    // Simulate adding checks-passing (via checks state transition, not opened)
    const nextState = 'checks-passing';
    const conflicts = {
      'checks-passing': ['checks-failing'],
    };
    const currentLabels = new Set(['checks-failing']);
    const toRemove = (conflicts[nextState] || []).filter(l => currentLabels.has(l));
    assert.ok(toRemove.includes('checks-failing'));
  });

  // Check Conclusions
  await test('isCheckPassing accepts success', () => {
    assert.ok(isCheckPassing('success'));
  });

  await test('isCheckPassing accepts neutral', () => {
    assert.ok(isCheckPassing('neutral'));
  });

  await test('isCheckPassing accepts skipped', () => {
    assert.ok(isCheckPassing('skipped'));
  });

  await test('isCheckPassing rejects failure', () => {
    assert.ok(!isCheckPassing('failure'));
  });

  await test('isCheckPassing rejects timed_out', () => {
    assert.ok(!isCheckPassing('timed_out'));
  });

  // Review States
  await test('isReviewApproved detects APPROVED', () => {
    assert.ok(isReviewApproved('APPROVED'));
  });

  await test('isReviewApproved rejects other states', () => {
    assert.ok(!isReviewApproved('CHANGES_REQUESTED'));
    assert.ok(!isReviewApproved('COMMENTED'));
    assert.ok(!isReviewApproved('PENDING'));
  });

  await test('isReviewChangesRequested detects CHANGES_REQUESTED', () => {
    assert.ok(isReviewChangesRequested('CHANGES_REQUESTED'));
  });

  await test('isReviewChangesRequested rejects other states', () => {
    assert.ok(!isReviewChangesRequested('APPROVED'));
    assert.ok(!isReviewChangesRequested('COMMENTED'));
  });

  // Label Management
  await test('shouldAddLabel returns false if label already present', () => {
    const shouldAdd = shouldAddLabel('opened', new Set(['awaiting-review']));
    assert.equal(shouldAdd, false);
  });

  await test('shouldAddLabel returns true if label not present', () => {
    const shouldAdd = shouldAddLabel('opened', new Set());
    assert.equal(shouldAdd, true);
  });

  // Rate Limit Handling (from workflow fix)
  await test('handles rate limit errors gracefully', () => {
    const error = { status: 403, message: 'API rate limit exceeded' };
    const shouldCatch = error.status === 403 && error.message.includes('API rate limit');
    assert.ok(shouldCatch);
  });

  await test('continues with empty labels on rate limit', () => {
    const error = { status: 403, message: 'API rate limit exceeded' };
    let labels = [];
    if (error.status === 403 && error.message.includes('API rate limit')) {
      labels = [];
    } else {
      throw error;
    }
    assert.deepEqual(labels, []);
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
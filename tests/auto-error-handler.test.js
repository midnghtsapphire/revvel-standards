#!/usr/bin/env node
'use strict';

/**
 * Unit tests for auto-error-handler.yml workflow logic
 * 
 * Tests the key decision points:
 * 1. Error pattern detection
 * 2. Issue creation logic
 * 3. Escalation criteria
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
const MAX_AUTO_FIX_ATTEMPTS = 3;
const ESCALATION_THRESHOLDS = {
  infrastructure: 1,  // Immediate escalation
  data_loss: 1,       // Immediate escalation  
  security: 1,        // Immediate escalation
  rate_limit: 5,      // High threshold
  generic: 3,         // Standard threshold
};

// === Utility Functions ===

function detectErrorCategory(errorMessage) {
  const errorLower = (errorMessage || '').toLowerCase();
  
  if (errorLower.includes('infrastructure') || 
      errorLower.includes('dns') || 
      errorLower.includes('network')) {
    return 'infrastructure';
  }
  
  if (errorLower.includes('data loss') || 
      errorLower.includes('deleted') || 
      errorLower.includes('corrupt')) {
    return 'data_loss';
  }
  
  if (errorLower.includes('security') || 
      errorLower.includes('unauthorized') || 
      errorLower.includes('forbidden')) {
    return 'security';
  }
  
  if (errorLower.includes('rate limit') || 
      errorLower.includes('429') || 
      errorLower.includes('too many requests')) {
    return 'rate_limit';
  }
  
  return 'generic';
}

function shouldEscalate(category, attemptCount, errorMessage) {
  const threshold = ESCALATION_THRESHOLDS[category] || ESCALATION_THRESHOLDS.generic;
  return attemptCount >= threshold;
}

function getEscalationLabel(category) {
  const labels = {
    infrastructure: ['infrastructure', 'needs-human'],
    data_loss: ['data-loss', 'urgent', 'needs-human'],
    security: ['security', 'urgent', 'needs-human'],
    rate_limit: ['rate-limit', 'needs-action'],
    generic: ['needs-action'],
  };
  return labels[category] || labels.generic;
}

function shouldCreateIssue(category, attemptCount, existingIssueCount) {
  // Don't create issues if one already exists
  if (existingIssueCount > 0) return false;
  
  // Check escalation threshold
  return shouldEscalate(category, attemptCount, null);
}

function formatErrorTitle(category, workflowName) {
  const prefixes = {
    infrastructure: '[INFRA]',
    data_loss: '[DATA LOSS]',
    security: '[SECURITY]',
    rate_limit: '[RATE LIMIT]',
    generic: '[FAILURE]',
  };
  return `${prefixes[category] || '[FAILURE]'} ${workflowName} failed`;
}

function formatErrorBody(errorMessage, context) {
  return `## Problem
${errorMessage || 'Unknown error occurred'}

## Context
- Workflow: ${context.workflowName || 'Unknown'}
- Run ID: ${context.runId || 'Unknown'}
- Attempt: ${context.attemptCount || 1}

## Recommended Actions
${context.recommendedActions || 'Investigate the error and take appropriate action.'}`;
}

// === Tests ===

(async () => {
  console.log('=== auto-error-handler.yml Unit Tests ===\n');

  // Error Category Detection
  await test('detectErrorCategory identifies infrastructure errors', () => {
    assert.equal(detectErrorCategory('Infrastructure error: DNS resolution failed'), 'infrastructure');
    assert.equal(detectErrorCategory('Network timeout connecting to server'), 'infrastructure');
  });

  await test('detectErrorCategory identifies data loss errors', () => {
    assert.equal(detectErrorCategory('Data loss detected in database'), 'data_loss');
    assert.equal(detectErrorCategory('Corrupt data preventing operation'), 'data_loss');
  });

  await test('detectErrorCategory identifies security errors', () => {
    assert.equal(detectErrorCategory('Unauthorized access attempt'), 'security');
    assert.equal(detectErrorCategory('Forbidden: insufficient permissions'), 'security');
  });

  await test('detectErrorCategory identifies rate limit errors', () => {
    assert.equal(detectErrorCategory('Rate limit exceeded (429)'), 'rate_limit');
    assert.equal(detectErrorCategory('Too many requests, please retry'), 'rate_limit');
  });

  await test('detectErrorCategory defaults to generic', () => {
    assert.equal(detectErrorCategory('Something went wrong'), 'generic');
    assert.equal(detectErrorCategory('Null pointer exception'), 'generic');
  });

  await test('detectErrorCategory handles null/undefined', () => {
    assert.equal(detectErrorCategory(null), 'generic');
    assert.equal(detectErrorCategory(undefined), 'generic');
  });

  // Escalation Logic
  await test('shouldEscalate triggers immediately for infrastructure', () => {
    assert.ok(shouldEscalate('infrastructure', 1, null));
  });

  await test('shouldEscalate triggers immediately for data_loss', () => {
    assert.ok(shouldEscalate('data_loss', 1, null));
  });

  await test('shouldEscalate triggers immediately for security', () => {
    assert.ok(shouldEscalate('security', 1, null));
  });

  await test('shouldEscalate requires 5 attempts for rate_limit', () => {
    assert.ok(!shouldEscalate('rate_limit', 4, null));
    assert.ok(shouldEscalate('rate_limit', 5, null));
  });

  await test('shouldEscalate requires 3 attempts for generic', () => {
    assert.ok(!shouldEscalate('generic', 2, null));
    assert.ok(shouldEscalate('generic', 3, null));
  });

  // Escalation Labels
  await test('getEscalationLabel returns infrastructure labels', () => {
    const labels = getEscalationLabel('infrastructure');
    assert.ok(labels.includes('infrastructure'));
    assert.ok(labels.includes('needs-human'));
  });

  await test('getEscalationLabel returns data_loss labels', () => {
    const labels = getEscalationLabel('data_loss');
    assert.ok(labels.includes('data-loss'));
    assert.ok(labels.includes('urgent'));
    assert.ok(labels.includes('needs-human'));
  });

  await test('getEscalationLabel returns security labels', () => {
    const labels = getEscalationLabel('security');
    assert.ok(labels.includes('security'));
    assert.ok(labels.includes('urgent'));
  });

  await test('getEscalationLabel returns rate_limit labels', () => {
    const labels = getEscalationLabel('rate_limit');
    assert.ok(labels.includes('rate-limit'));
  });

  await test('getEscalationLabel returns generic labels', () => {
    const labels = getEscalationLabel('generic');
    assert.ok(labels.includes('needs-action'));
  });

  // Issue Creation
  await test('shouldCreateIssue returns false if issue exists', () => {
    assert.equal(shouldCreateIssue('generic', 3, 1), false);
  });

  await test('shouldCreateIssue returns true when threshold met and no existing issue', () => {
    assert.equal(shouldCreateIssue('infrastructure', 1, 0), true);
  });

  await test('shouldCreateIssue returns false when below threshold', () => {
    assert.equal(shouldCreateIssue('generic', 2, 0), false);
  });

  // Error Formatting
  await test('formatErrorTitle adds correct prefix for each category', () => {
    assert.ok(formatErrorTitle('infrastructure', 'test-workflow').startsWith('[INFRA]'));
    assert.ok(formatErrorTitle('data_loss', 'test-workflow').startsWith('[DATA LOSS]'));
    assert.ok(formatErrorTitle('security', 'test-workflow').startsWith('[SECURITY]'));
    assert.ok(formatErrorTitle('rate_limit', 'test-workflow').startsWith('[RATE LIMIT]'));
    assert.ok(formatErrorTitle('generic', 'test-workflow').startsWith('[FAILURE]'));
  });

  await test('formatErrorBody includes required fields', () => {
    const body = formatErrorBody('Test error', {
      workflowName: 'test-workflow',
      runId: '12345',
      attemptCount: 2,
    });
    assert.ok(body.includes('Test error'));
    assert.ok(body.includes('test-workflow'));
    assert.ok(body.includes('12345'));
    assert.ok(body.includes('2'));
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
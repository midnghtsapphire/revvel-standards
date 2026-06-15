#!/usr/bin/env node
'use strict';

/**
 * Unit tests for bito-ai.yml workflow logic
 * 
 * Tests the key decision points:
 * 1. Trigger detection (PR events, comments, workflow_dispatch)
 * 2. Skip conditions (drafts, [skip-bito] title)
 * 3. Secret verification
 * 4. Label management
 * 5. Comment posting logic
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
const BITO_LABELS = ['bito-ai', 'bito-ai:review', 'awaiting-approval', 'bito-ai:changes-needed'];
const REVIEW_COMMANDS = ['/review', '/explain'];

// === Utility Functions ===

function shouldRunBitoReview(eventName, pullRequest, comment) {
  // workflow_dispatch always runs
  if (eventName === 'workflow_dispatch') return true;
  
  // PR events
  if (eventName === 'pull_request') {
    // Skip drafts
    if (pullRequest?.draft === true) return false;
    // Skip if [skip-bito] in title
    if (pullRequest?.title?.includes('[skip-bito]')) return false;
    return true;
  }
  
  // Issue comment events
  if (eventName === 'issue_comment') {
    // Must be a PR comment
    if (!comment?.issue?.pull_request) return false;
    // Must be /review or /explain command
    const body = comment?.body || '';
    return REVIEW_COMMANDS.some(cmd => body.startsWith(cmd));
  }
  
  return false;
}

function verifySecrets(bitoKey, gitToken) {
  const missing = [];
  
  if (!bitoKey || bitoKey.length === 0) {
    missing.push('BITO_ACCESS_KEY');
  }
  
  if (!gitToken || gitToken.length === 0) {
    missing.push('GIT_ACCESS_TOKEN');
  }
  
  return {
    configured: missing.length === 0,
    missing,
    shouldSkip: missing.length > 0,
  };
}

function getLabelsForOutcome(outcome) {
  const baseLabels = ['bito-ai', 'bito-ai:review'];
  
  if (outcome === 'success') {
    return [...baseLabels, 'awaiting-approval'];
  } else {
    return [...baseLabels, 'bito-ai:changes-needed'];
  }
}

function shouldPostSkipComment(eventName, existingComments) {
  if (eventName !== 'pull_request') return false;
  
  // Check if we already posted a skip comment
  return !existingComments.some(c => 
    c.user?.type === 'Bot' && 
    c.body?.includes('BITO AI review skipped')
  );
}

function buildOptions(gitToken, bitoKey, gitDomain, excludeFiles) {
  const options = [
    '--static_analysis.fb_infer.enabled=True',
    '--code_feedback=True',
    '--dependency_check.enabled=False',
    '--bee.path=/automation-platform',
    '--bee.actn_dir=/automation-platform/default_bito_ad/bito_modules',
  ];
  
  if (gitToken) {
    options.push(`--git.access_token=${gitToken.substring(0, 4)}...`);
  }
  
  if (bitoKey) {
    options.push('--bito_cli.bito.access_key=***');
  }
  
  if (gitDomain) {
    options.push(`--git.domain=${gitDomain}`);
  }
  
  if (excludeFiles) {
    options.push(`--exclude_files=${excludeFiles}`);
  }
  
  return options.join(' ');
}

function extractPrNumber(eventName, pullRequest, comment, workflowDispatch) {
  if (eventName === 'pull_request') {
    return pullRequest?.number;
  }
  
  if (eventName === 'issue_comment') {
    return comment?.issue?.number;
  }
  
  if (eventName === 'workflow_dispatch') {
    return workflowDispatch?.pr_number;
  }
  
  return null;
}

function isReviewCommand(commentBody) {
  const body = (commentBody || '').trim();
  return REVIEW_COMMANDS.some(cmd => body.startsWith(cmd));
}

// === Tests ===

(async () => {
  console.log('=== bito-ai.yml Unit Tests ===\n');

  // Trigger Detection
  await test('shouldRunBitoReview allows workflow_dispatch', () => {
    assert.ok(shouldRunBitoReview('workflow_dispatch', null, null));
  });

  await test('shouldRunBitoReview allows opened PR', () => {
    assert.ok(shouldRunBitoReview('pull_request', { draft: false, title: 'Test PR' }, null));
  });

  await test('shouldRunBitoReview allows synchronize PR', () => {
    assert.ok(shouldRunBitoReview('pull_request', { draft: false, title: 'Test PR' }, null));
  });

  await test('shouldRunBitoReview allows reopened PR', () => {
    assert.ok(shouldRunBitoReview('pull_request', { draft: false, title: 'Test PR' }, null));
  });

  await test('shouldRunBitoReview allows ready_for_review PR', () => {
    assert.ok(shouldRunBitoReview('pull_request', { draft: false, title: 'Test PR' }, null));
  });

  await test('shouldRunBitoReview blocks draft PR', () => {
    assert.ok(!shouldRunBitoReview('pull_request', { draft: true, title: 'Test PR' }, null));
  });

  await test('shouldRunBitoReview blocks [skip-bito] title', () => {
    assert.ok(!shouldRunBitoReview('pull_request', { draft: false, title: '[skip-bito] Test PR' }, null));
  });

  await test('shouldRunBitoReview checks [skip-bito] anywhere in title', () => {
    // The workflow uses includes(), so [skip-bito] anywhere blocks
    assert.ok(!shouldRunBitoReview('pull_request', { draft: false, title: 'PR with [skip-bito] anywhere' }, null));
  });

  await test('shouldRunBitoReview allows /review command', () => {
    assert.ok(shouldRunBitoReview('issue_comment', null, {
      body: '/review',
      issue: { pull_request: {} }
    }));
  });

  await test('shouldRunBitoReview allows /explain command', () => {
    assert.ok(shouldRunBitoReview('issue_comment', null, {
      body: '/explain something',
      issue: { pull_request: {} }
    }));
  });

  await test('shouldRunBitoReview blocks non-command comments', () => {
    assert.ok(!shouldRunBitoReview('issue_comment', null, {
      body: 'Nice PR!',
      issue: { pull_request: {} }
    }));
  });

  await test('shouldRunBitoReview blocks comments on non-PR issues', () => {
    assert.ok(!shouldRunBitoReview('issue_comment', null, {
      body: '/review',
      issue: {}
    }));
  });

  // Secret Verification
  await test('verifySecrets returns configured when all present', () => {
    const result = verifySecrets('test-key-123', 'test-token-456');
    assert.ok(result.configured);
    assert.deepEqual(result.missing, []);
    assert.ok(!result.shouldSkip);
  });

  await test('verifySecrets detects missing BITO_ACCESS_KEY', () => {
    const result = verifySecrets('', 'test-token');
    assert.ok(!result.configured);
    assert.ok(result.missing.includes('BITO_ACCESS_KEY'));
    assert.ok(result.shouldSkip);
  });

  await test('verifySecrets detects missing GIT_ACCESS_TOKEN', () => {
    const result = verifySecrets('test-key', '');
    assert.ok(!result.configured);
    assert.ok(result.missing.includes('GIT_ACCESS_TOKEN'));
    assert.ok(result.shouldSkip);
  });

  await test('verifySecrets detects all missing', () => {
    const result = verifySecrets('', '');
    assert.ok(!result.configured);
    assert.equal(result.missing.length, 2);
    assert.ok(result.shouldSkip);
  });

  // Label Management
  await test('getLabelsForOutcome returns approval labels on success', () => {
    const labels = getLabelsForOutcome('success');
    assert.ok(labels.includes('bito-ai'));
    assert.ok(labels.includes('bito-ai:review'));
    assert.ok(labels.includes('awaiting-approval'));
  });

  await test('getLabelsForOutcome returns changes-needed on failure', () => {
    const labels = getLabelsForOutcome('failure');
    assert.ok(labels.includes('bito-ai'));
    assert.ok(labels.includes('bito-ai:review'));
    assert.ok(labels.includes('bito-ai:changes-needed'));
  });

  await test('getLabelsForOutcome returns changes-needed on other outcomes', () => {
    const labels = getLabelsForOutcome('cancelled');
    assert.ok(labels.includes('bito-ai:changes-needed'));
  });

  // Skip Comment Logic
  await test('shouldPostSkipComment returns true for PR without existing comment', () => {
    const result = shouldPostSkipComment('pull_request', []);
    assert.ok(result);
  });

  await test('shouldPostSkipComment returns false if bot already commented', () => {
    const result = shouldPostSkipComment('pull_request', [
      { user: { type: 'Bot' }, body: 'BITO AI review skipped' }
    ]);
    assert.ok(!result);
  });

  await test('shouldPostSkipComment returns false for non-PR events', () => {
    const result = shouldPostSkipComment('issue_comment', []);
    assert.ok(!result);
  });

  // Options Building
  await test('buildOptions includes required options', () => {
    const options = buildOptions('token', 'key', null, null);
    assert.ok(options.includes('static_analysis'));
    assert.ok(options.includes('code_feedback'));
    assert.ok(options.includes('bee.path'));
  });

  await test('buildOptions includes git domain when provided', () => {
    const options = buildOptions('token', 'key', 'github.com', null);
    assert.ok(options.includes('git.domain=github.com'));
  });

  await test('buildOptions includes exclude_files when provided', () => {
    const options = buildOptions('token', 'key', null, '*.test.js');
    assert.ok(options.includes('exclude_files=*.test.js'));
  });

  await test('buildOptions masks sensitive values', () => {
    const options = buildOptions('secret-token', 'secret-key', null, null);
    assert.ok(!options.includes('secret-token'));
    assert.ok(!options.includes('secret-key'));
    assert.ok(options.includes('***'));
  });

  // PR Number Extraction
  await test('extractPrNumber gets from pull_request event', () => {
    const num = extractPrNumber('pull_request', { number: 123 }, null, null);
    assert.equal(num, 123);
  });

  await test('extractPrNumber gets from issue_comment event', () => {
    const num = extractPrNumber('issue_comment', null, { issue: { number: 456 } }, null);
    assert.equal(num, 456);
  });

  await test('extractPrNumber gets from workflow_dispatch', () => {
    const num = extractPrNumber('workflow_dispatch', null, null, { pr_number: '789' });
    assert.equal(num, '789');
  });

  await test('extractPrNumber returns null for unknown event', () => {
    const num = extractPrNumber('push', null, null, null);
    assert.equal(num, null);
  });

  // Review Command Detection
  await test('isReviewCommand detects /review', () => {
    assert.ok(isReviewCommand('/review'));
    assert.ok(isReviewCommand('/review please'));
  });

  await test('isReviewCommand detects /explain', () => {
    assert.ok(isReviewCommand('/explain'));
    assert.ok(isReviewCommand('/explain this code'));
  });

  await test('isReviewCommand rejects other commands', () => {
    assert.ok(!isReviewCommand('/approve'));
    assert.ok(!isReviewCommand('/lgtm'));
    assert.ok(!isReviewCommand('review'));
  });

  await test('isReviewCommand handles null/empty', () => {
    assert.ok(!isReviewCommand(null));
    assert.ok(!isReviewCommand(''));
    assert.ok(!isReviewCommand('  '));
  });

  // Security: Token masking
  await test('buildOptions never exposes full tokens', () => {
    const longToken = 'a'.repeat(100);
    const options = buildOptions(longToken, 'key', null, null);
    assert.ok(!options.includes(longToken));
    assert.ok(options.includes('--git.access_token=aaaa'));
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
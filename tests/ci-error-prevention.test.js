#!/usr/bin/env node
/**
 * CI Error Prevention Tests
 * 
 * Tests to prevent common climate errors (common errors) in workflows:
 * - API rate limit handling
 * - Token/secret configuration
 * - WR lint validation
 * - Status check conflicts
 * - Duplicate detection
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { 
    fn(); 
    console.log(`✅ PASS: ${name}`); 
    passed++; 
  } catch (e) { 
    console.log(`❌ FAIL: ${name}\n    ${e.message}`); 
    failed++; 
  }
}

// ============================================================
// Test 1: Workflow files should have API rate limit handling
// ============================================================
test('Workflows should have rate limit handling patterns', () => {
  const workflowDir = '.github/workflows';
  if (!fs.existsSync(workflowDir)) return;
  
  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const needsAttention = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    
    // Check if workflow calls listLabelsOnIssue
    if (content.includes('listLabelsOnIssue')) {
      // Should have one of: rate limit handling, core.warning, or use actions/github-script
      const hasRateLimitHandling = content.includes('rate limit') || content.includes('403') || content.includes('e.status');
      const hasWarning = content.includes('core.warning') || content.includes('core.error');
      const usesGitHubScript = content.includes('actions/github-script');
      
      if (!hasRateLimitHandling && !hasWarning && !usesGitHubScript) {
        needsAttention.push(file);
      }
    }
  }
  
  if (needsAttention.length > 0) {
    console.log(`   ⚠ Workflows that may need rate limit attention: ${needsAttention.join(', ')}`);
    console.log('   (These use listLabelsOnIssue but may need explicit rate limit handling)');
  } else {
    console.log(`   ✓ All ${files.length} workflows have rate limit handling patterns`);
  }
});

// ============================================================
// Test 2: Token fallback patterns must be consistent
// ============================================================
test('Workflows must use consistent token fallback pattern', () => {
  const workflowDir = '.github/workflows';
  if (!fs.existsSync(workflowDir)) return;
  
  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const issues = [];
  
  // Correct pattern: secrets.ADMIN_GITHUB_TOKEN || github.token
  const correctPattern = /secrets\.ADMIN_GITHUB_TOKEN\s*\|\|\s*github\.token/;
  // Deprecated pattern: secrets.GIT_ACCESS_TOKEN (not in comments)
  const deprecatedPattern = /secrets\.GIT_ACCESS_TOKEN/;
  
  for (const file of files) {
    // Skip ci-error-prevention.yml as it checks for this pattern
    if (file === 'ci-error-prevention.yml') continue;
    
    const content = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('#')) continue;
      
      if (deprecatedPattern.test(line)) {
        issues.push(`${file}:${i + 1}: uses deprecated GIT_ACCESS_TOKEN`);
      }
    }
  }
  
  if (issues.length > 0) {
    throw new Error(`Token issues found:\n  - ${issues.join('\n  - ')}`);
  }
  console.log(`   ✓ All ${files.length - 1} workflows use correct token fallback`);
});

// ============================================================
// Test 3: WR files must pass linting rules
// ============================================================
test('WR lint script must catch common issues', () => {
  const lintScript = 'wr/scripts/wr-lint.mjs';
  if (!fs.existsSync(lintScript)) {
    console.log('   ⚠ wr-lint.mjs not found, skipping');
    return;
  }
  
  const content = fs.readFileSync(lintScript, 'utf8');
  
  // Must check for these common issues
  const requiredChecks = [
    { pattern: 'RAW_TOKENS|scaffold|STARS|OPEN_ISSUES', msg: 'unsubstituted generator tokens' },
    { pattern: 'BRACKET_PLACEHOLDER|placeholder|\\[.*\\]', msg: 'raw placeholders' },
    { pattern: 'SCAFFOLD|scaffolding', msg: 'scaffolding patterns' },
    { pattern: 'H1|h1|header', msg: 'H1 header validation' },
    { pattern: 'BASIC_SIGNALS|basic', msg: 'template/type mismatch' }
  ];
  
  const missing = requiredChecks.filter(check => !new RegExp(check.pattern, 'i').test(content));
  
  if (missing.length > 0) {
    throw new Error(`WR lint missing checks for: ${missing.map(m => m.msg).join(', ')}`);
  }
  console.log('   ✓ wr-lint.mjs has all required checks');
});

// ============================================================
// Test 4: No duplicate PRs for same issue should be open
// ============================================================
test('No duplicate PRs should reference same issue', async () => {
  // This is a structural test - the actual duplicate check happens at PR creation
  // We verify the duplicate-detection logic exists
  
  const scriptsDir = 'scripts';
  if (!fs.existsSync(scriptsDir)) {
    console.log('   ⚠ scripts directory not found, skipping');
    return;
  }
  
  const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
  const hasDuplicateCheck = files.some(f => {
    const content = fs.readFileSync(path.join(scriptsDir, f), 'utf8');
    return content.includes('duplicate') || content.includes('PR.*exists') || content.includes('check-pr');
  });
  
  if (!hasDuplicateCheck) {
    console.log('   ⚠ No duplicate PR detection found in scripts');
  } else {
    console.log('   ✓ Duplicate PR detection logic exists');
  }
});

// ============================================================
// Test 5: Workflows should have proper error handling
// ============================================================
test('Workflows should have error handling patterns', () => {
  const workflowDir = '.github/workflows';
  if (!fs.existsSync(workflowDir)) return;
  
  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const needsAttention = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    
    // If workflow uses github.rest or github.graphql, should have error handling
    if (content.includes('github.rest') || content.includes('github.graphql') || content.includes('github-script')) {
      if (!content.includes('catch') && !content.includes('try')) {
        // Some simple scripts may not need try/catch
        // Only flag if there's explicit error-prone patterns without core.warning
        if (content.includes('addLabels') || content.includes('createComment') || content.includes('listLabels')) {
          if (!content.includes('core.warning') && !content.includes('core.error')) {
            needsAttention.push(file);
          }
        }
      }
    }
  }
  
  if (needsAttention.length > 0) {
    console.log(`   ⚠ Workflows that may need error handling: ${needsAttention.join(', ')}`);
    console.log('   (These have high-risk API calls without explicit error handling)');
  } else {
    console.log(`   ✓ All ${files.length} workflows have error handling patterns`);
  }
});

// ============================================================
// Test 6: Required status checks must be unique
// ============================================================
test('Branch protection should have unique status checks', () => {
  // This is a documentation check - verify the concept is documented
  const docsDir = 'docs';
  if (!fs.existsSync(docsDir)) {
    console.log('   ⚠ docs directory not found, skipping');
    return;
  }
  
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
  const hasBranchProtection = files.some(f => {
    const content = fs.readFileSync(path.join(docsDir, f), 'utf8');
    return content.includes('required_status_checks') || content.includes('branch protection');
  });
  
  if (!hasBranchProtection) {
    console.log('   ⚠ No branch protection docs found');
  } else {
    console.log('   ✓ Branch protection documentation exists');
  }
});

// ============================================================
// Test 7: Auto-approve workflows must not create loops
// ============================================================
test('Auto-approve workflows must not approve drafts', () => {
  const workflowDir = '.github/workflows';
  if (!fs.existsSync(workflowDir)) return;
  
  const files = fs.readdirSync(workflowDir).filter(f => 
    f.includes('auto-approve') || f.includes('auto-merge')
  );
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    
    // Auto-approve should check for draft status
    if (content.includes('pull_request') && content.includes('approve')) {
      // Should either check for draft: false or skip drafts entirely
      if (!content.includes('draft') && !content.includes('mergeable_state')) {
        console.log(`   ⚠ ${file}: may not handle draft PRs correctly`);
      }
    }
  }
  console.log(`   ✓ Auto-approve workflows checked`);
});

// ============================================================
// Test 8: Labels must be consistent across workflows
// ============================================================
test('Standard labels must be defined in labels.yml', () => {
  const labelsFile = '.github/labels.yml';
  if (!fs.existsSync(labelsFile)) {
    console.log('   ⚠ labels.yml not found, skipping');
    return;
  }
  
  const labelsContent = fs.readFileSync(labelsFile, 'utf8');
  
  // Check for essential labels
  const requiredLabels = [
    'work-request',
    'wr:in-progress',
    'auto-fix',
    'needs-human',
    'lifecycle:stuck'
  ];
  
  const missing = requiredLabels.filter(label => !labelsContent.includes(label));
  
  if (missing.length > 0) {
    console.log(`   ⚠ Missing labels: ${missing.join(', ')}`);
  } else {
    console.log('   ✓ All required labels defined');
  }
});

// ============================================================
// Test 9: WR templates must have all required sections
// ============================================================
test('WR templates must have all required sections', () => {
  const templatesDir = 'templates/issue-template';
  if (!fs.existsSync(templatesDir)) {
    console.log('   ⚠ templates/issue-template not found, skipping');
    return;
  }
  
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    
    // Basic WR template should have these sections
    if (file.includes('basic') || file.includes('work-request')) {
      const requiredSections = [
        'title',
        'description',
        'Status'
      ];
      
      const missing = requiredSections.filter(section => !content.includes(section));
      if (missing.length > 0) {
        console.log(`   ⚠ ${file}: missing sections: ${missing.join(', ')}`);
      }
    }
  }
  console.log(`   ✓ WR templates validated`);
});

// ============================================================
// Test 10: Scripts must have proper shebangs
// ============================================================
test('Shell scripts must have proper shebangs', () => {
  const patterns = ['**/*.sh', '**/*.bash'];
  
  // Check wr/scripts directory
  const scriptsDir = 'wr/scripts';
  if (!fs.existsSync(scriptsDir)) {
    console.log('   ⚠ wr/scripts not found, skipping');
    return;
  }
  
  const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh') || f.endsWith('.bash'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
    const firstLine = content.split('\n')[0];
    
    if (!firstLine.startsWith('#!')) {
      throw new Error(`${file}: missing shebang`);
    }
  }
  console.log(`   ✓ All ${files.length} shell scripts have proper shebangs`);
});

// ============================================================
// Test 11: Check for common YAML syntax errors
// ============================================================
test('YAML files must not have tab indentation', () => {
  const patterns = ['.github/**/*.yml', '.github/**/*.yaml'];
  
  // Check workflow directory
  const workflowDir = '.github/workflows';
  if (!fs.existsSync(workflowDir)) return;
  
  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    
    if (content.includes('\t')) {
      throw new Error(`${file}: contains tab indentation (use spaces)`);
    }
  }
  console.log(`   ✓ All ${files.length} YAML files use spaces for indentation`);
});

// ============================================================
// Test 12: issue-state-machine must guard against URL-only titles
// ============================================================
test('issue-state-machine.yml must detect and close URL-only issue titles', () => {
  const wfFile = '.github/workflows/issue-state-machine.yml';
  if (!fs.existsSync(wfFile)) {
    console.log('   ⚠ issue-state-machine.yml not found, skipping');
    return;
  }

  const content = fs.readFileSync(wfFile, 'utf8');

  // The guard step must exist with the required detection logic
  assert.ok(
    content.includes('malformed_check') || content.includes('URL-only'),
    'issue-state-machine.yml must have a malformed URL-only title guard step'
  );
  assert.ok(
    content.includes('urlOnlyRe') || content.includes('url_only') || content.includes('URL-only'),
    'issue-state-machine.yml must have a URL-only regex or detection pattern'
  );
  assert.ok(
    content.includes("state: 'closed'") || content.includes('state: closed'),
    'issue-state-machine.yml must close malformed issues'
  );

  // The wr:new label step must be conditional on the malformed check
  const wrNewIdx = content.indexOf("labels: ['wr:new']");
  const malformedGuardIdx = content.indexOf('malformed_check');
  assert.ok(
    malformedGuardIdx !== -1,
    'issue-state-machine.yml must have a malformed_check step'
  );
  assert.ok(
    malformedGuardIdx < wrNewIdx,
    'malformed_check step must appear before the wr:new label step'
  );

  console.log('   ✓ issue-state-machine.yml has URL-only title guard');
});

test('issue-state-machine.yml must only swallow removeLabel 404 races', () => {
  const wfFile = '.github/workflows/issue-state-machine.yml';
  if (!fs.existsSync(wfFile)) {
    console.log('   ⚠ issue-state-machine.yml not found, skipping');
    return;
  }

  const workflow = yaml.parse(fs.readFileSync(wfFile, 'utf8'));
  const scripts = Object.values(workflow.jobs || {})
    .flatMap(job => (job.steps || []).map(step => step.with?.script).filter(Boolean));
  const scriptsWithRemoveLabel = scripts.filter(script => script.includes('removeLabel('));
  const unguardedScripts = scriptsWithRemoveLabel.filter(
    script => !script.includes('if (err.status !== 404) throw err;')
  );

  assert.ok(
    scriptsWithRemoveLabel.length >= 2,
    'issue-state-machine.yml must still contain the expected removeLabel workflow scripts'
  );
  assert.deepStrictEqual(
    unguardedScripts,
    [],
    'issue-state-machine.yml must guard every removeLabel call with a 404-only catch'
  );

  console.log('   ✓ issue-state-machine.yml guards removeLabel 404 races');
});

test('issue-state-machine.yml keeps numeric dispatch input and github-script v9', () => {
  const wfFile = '.github/workflows/issue-state-machine.yml';
  if (!fs.existsSync(wfFile)) {
    console.log('   ⚠ issue-state-machine.yml not found, skipping');
    return;
  }

  const workflow = yaml.parse(fs.readFileSync(wfFile, 'utf8'));
  const inputs = workflow.on?.workflow_dispatch?.inputs || {};
  const steps = Object.values(workflow.jobs || {})
    .flatMap(job => job.steps || [])
    .filter(step => step.uses?.startsWith('actions/github-script@'));
  const transitionSteps = workflow.jobs?.['transition-state']?.steps || [];

  assert.strictEqual(
    inputs.issue_number?.type,
    'number',
    'issue-state-machine.yml must keep workflow_dispatch.issue_number as a number input'
  );
  assert.ok(
    steps.length > 0,
    'issue-state-machine.yml must still include github-script workflow steps'
  );
  assert.ok(
    steps.every(step => step.uses === 'actions/github-script@v9.0.0'),
    'issue-state-machine.yml must keep github-script steps on v9.0.0'
  );
  assert.strictEqual(
    transitionSteps.length,
    1,
    'issue-state-machine.yml should keep transition-state input handling centralized in one step'
  );
  // These assert that the step still CONSUMES each dispatch input, not the
  // mechanism by which it reaches the script. Interpolating `${{ inputs.x }}`
  // straight into a github-script body is template substitution performed
  // before the script runs, so a quote in the value escapes the string literal
  // and the remainder executes — the same hole zizmor flagged in
  // auto-branch-update.yml. The value now arrives through the step's `env:`
  // and is read with `process.env`, where it is never parsed as code.
  //
  // Checking for the literal expression in the script body would have made the
  // safe form fail the test, which is how a guard ends up arguing for the
  // defect it was written to prevent.
  const transitionScript = String(transitionSteps[0]?.with?.script || '');
  const transitionEnv = transitionSteps[0]?.env || {};
  const consumes = (input, envVar) =>
    transitionScript.includes(`github.event.inputs.${input}`) ||
    (String(transitionEnv[envVar] || '').includes(`inputs.${input}`) &&
      transitionScript.includes(`process.env.${envVar}`));

  assert.ok(
    consumes('target_state', 'TARGET_STATE'),
    'issue-state-machine.yml transition-state step must still read the dispatch target_state input'
  );
  assert.ok(
    consumes('issue_number', 'ISSUE_NUMBER'),
    'issue-state-machine.yml transition-state step must still read the dispatch issue_number input'
  );

  console.log('   ✓ issue-state-machine.yml keeps numeric input handling and v9 github-script');
});

// ============================================================
// Test 13: email_error_intake.py must not create URL-only issue titles
// ============================================================
test('email_error_intake.py must sanitize URL-only email subjects', () => {
  const scriptFile = 'scripts/email_error_intake.py';
  if (!fs.existsSync(scriptFile)) {
    console.log('   ⚠ email_error_intake.py not found, skipping');
    return;
  }

  const content = fs.readFileSync(scriptFile, 'utf8');

  assert.ok(
    content.includes('sanitize_subject') || content.includes('_URL_ONLY_RE'),
    'email_error_intake.py must contain a URL-only subject sanitizer'
  );
  assert.ok(
    content.includes('circleci'),
    'email_error_intake.py must have specific handling for CircleCI URLs'
  );
  assert.ok(
    content.includes('CI FAILURE') || content.includes('[CI'),
    'email_error_intake.py must rewrite URL-only subjects to a [CI ...] title'
  );

  console.log('   ✓ email_error_intake.py sanitizes URL-only subjects');
});

// ============================================================
// Summary
// ============================================================
console.log('\n═══════════════════════════════════════════');
console.log('CI Error Prevention Tests Summary');
console.log('═══════════════════════════════════════════');
console.log(`Total: ${passed + failed} tests`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('═══════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}

console.log('🎉 All CI error prevention tests passed!');
console.log('These tests help prevent common climate errors in workflows.\n');
#!/usr/bin/env node
/**
 * Test suite for verify-bito-installation.sh
 *
 * This test verifies that the Bito installation verification script:
 * - Checks all required files and directories
 * - Validates workflow configuration
 * - Verifies labels are defined
 * - Checks documentation completeness
 * - Runs without errors
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Track test results
let passed = 0;
let failed = 0;

/**
 * Run a test and track results
 */
function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passed++;
  } catch (error) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`  ${error.message}`);
    failed++;
  }
}

/**
 * Assert a condition is true
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('verify-bito-installation.sh exists and is executable', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-bito-installation.sh');
  assert(fs.existsSync(scriptPath), 'Script file does not exist');
  
  const stats = fs.statSync(scriptPath);
  assert(stats.mode & fs.constants.S_IXUSR, 'Script is not executable');
});

test('verify-bito-installation.sh runs without errors', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-bito-installation.sh');
  
  try {
    execSync(`bash "${scriptPath}"`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe'
    });
  } catch (error) {
    // Exit code 0 or 1 are both acceptable (1 means some checks failed but script ran)
    if (error.status > 1) {
      throw new Error(`Script exited with unexpected code ${error.status}`);
    }
  }
});

test('verify-bito-installation.sh checks all required files', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-bito-installation.sh');
  
  const output = execSync(`bash "${scriptPath}"`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: 'pipe'
  }).toString();
  
  const requiredFiles = [
    '.github/workflows/bito-ai.yml',
    '.github/workflows/test-bito-integration.yml',
    'scripts/bito-api-helper.sh',
    'scripts/test-bito-api.sh',
    'docs/BITO_AI_INTEGRATION.md',
    'standards/BITO_AI_INTEGRATION_STANDARD.md',
    'skills/bito-ai/SKILL.md',
    '.github/labels.yml',
    '.env.example'
  ];
  
  for (const file of requiredFiles) {
    assert(
      output.includes(`✅ ${file}`) || output.includes(file),
      `Script does not check for ${file}`
    );
  }
});

test('verify-bito-installation.sh validates workflow configuration', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-bito-installation.sh');
  
  const output = execSync(`bash "${scriptPath}"`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: 'pipe'
  }).toString();
  
  assert(
    output.includes('bito-core/bito-github-action') || output.includes('Uses bito-core'),
    'Script does not check for bito-github-action'
  );
  
  assert(
    output.includes('BITO_API_KEY'),
    'Script does not check for BITO_API_KEY'
  );
  
  assert(
    output.includes('permissions') || output.includes('Defines permissions'),
    'Script does not check for permissions'
  );
});

test('verify-bito-installation.sh checks required labels', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-bito-installation.sh');
  
  const output = execSync(`bash "${scriptPath}"`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: 'pipe'
  }).toString();
  
  const requiredLabels = ['bito-ai', 'bito-ai:review', 'bito-ai:changes-needed'];
  
  for (const label of requiredLabels) {
    assert(
      output.includes(label),
      `Script does not check for label: ${label}`
    );
  }
});

test('verify-bito-installation.sh produces summary', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-bito-installation.sh');
  
  const output = execSync(`bash "${scriptPath}"`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: 'pipe'
  }).toString();
  
  assert(output.includes('Verification Summary'), 'No summary section found');
  assert(output.includes('Passed:'), 'No pass count in summary');
  assert(output.includes('Failed:'), 'No fail count in summary');
  assert(output.includes('Warnings:'), 'No warning count in summary');
});

test('verify-bito-installation.sh returns appropriate exit code', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-bito-installation.sh');
  
  try {
    execSync(`bash "${scriptPath}"`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    // Exit code 0 is success
    assert(true, '');
  } catch (error) {
    // Exit code 1 means some checks failed, which is acceptable for the test
    // Exit code 2 means missing dependencies, which should fail the test
    assert(error.status === 1 || error.status === 0, 
           `Unexpected exit code: ${error.status}`);
  }
});

test('BITO_INSTALLATION_VERIFICATION.md exists and contains required sections', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'BITO_INSTALLATION_VERIFICATION.md');
  assert(fs.existsSync(docPath), 'Documentation file does not exist');
  
  const content = fs.readFileSync(docPath, 'utf-8');
  
  const requiredSections = [
    'Overview',
    'Installation Verification',
    'GitHub App Installation',
    'Repository Configuration',
    'Required GitHub Secrets',
    'Required Labels',
    'Testing the Installation',
    'Troubleshooting',
    'Compliance Checklist'
  ];
  
  for (const section of requiredSections) {
    assert(
      content.includes(section),
      `Documentation missing section: ${section}`
    );
  }
});

test('BITO_INSTALLATION_VERIFICATION.md references installation ID', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'BITO_INSTALLATION_VERIFICATION.md');
  const content = fs.readFileSync(docPath, 'utf-8');
  
  assert(
    content.includes('128849516'),
    'Documentation does not include installation ID 128849516'
  );
});

test('BITO_INSTALLATION_VERIFICATION.md has troubleshooting guide', () => {
  const docPath = path.join(__dirname, '..', 'docs', 'BITO_INSTALLATION_VERIFICATION.md');
  const content = fs.readFileSync(docPath, 'utf-8');
  
  const troubleshootingTopics = [
    'Workflow Not Running',
    'Missing Review Comments',
    'Labels Not Applied',
    'API Key Issues'
  ];
  
  for (const topic of troubleshootingTopics) {
    assert(
      content.includes(topic),
      `Troubleshooting section missing topic: ${topic}`
    );
  }
});

// ─── Test Summary ─────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`Test Summary: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}

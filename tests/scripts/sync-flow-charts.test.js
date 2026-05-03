#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  function runTest(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${e.stack || e.message}`);
      testsFailed++;
    }
  }

  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
  const repoRoot = path.join(__dirname, '..', '..');

  // Test 1: Verify script file exists and is executable
  runTest('sync-flow-charts.js exists', () => {
    assert(fs.existsSync(scriptPath), 'Script file should exist');
    const stats = fs.statSync(scriptPath);
    assert(stats.isFile(), 'Should be a file');
  });

  // Test 2: Verify script has proper shebang
  runTest('sync-flow-charts.js has proper shebang', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.startsWith('#!/usr/bin/env node'), 'Script should have node shebang');
  });

  // Test 3: Script runs in DRY_RUN mode without errors
  runTest('sync-flow-charts.js runs in DRY_RUN mode', () => {
    try {
      const result = execSync(`REPO_ROOT="${repoRoot}" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: repoRoot
      });
      assert(result.includes('DRY_RUN mode'), 'Should indicate DRY_RUN mode');
      assert(result.includes('Sync complete'), 'Should complete successfully');
    } catch (err) {
      throw new Error(`Script execution failed: ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}`);
    }
  });

  // Test 4: Script detects flow charts directory
  runTest('sync-flow-charts.js detects flow charts directory', () => {
    try {
      const result = execSync(`REPO_ROOT="${repoRoot}" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: repoRoot
      });
      assert(result.includes('Flow charts dir:'), 'Should report flow charts directory');
    } catch (err) {
      throw new Error(`Script execution failed: ${err.message}`);
    }
  });

  // Test 5: Script counts docs
  runTest('sync-flow-charts.js counts documentation files', () => {
    try {
      const result = execSync(`REPO_ROOT="${repoRoot}" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: repoRoot
      });
      assert(result.includes('Docs found:'), 'Should report docs found');
      // Extract the number and verify it's reasonable (should be > 0)
      const match = result.match(/Docs found:\s+(\d+)/);
      assert(match, 'Should have doc count in output');
      const docCount = parseInt(match[1], 10);
      assert(docCount > 0, `Should find at least 1 doc, found ${docCount}`);
    } catch (err) {
      throw new Error(`Script execution failed: ${err.message}`);
    }
  });

  // Test 6: Script reports metadata updates
  runTest('sync-flow-charts.js reports metadata updates', () => {
    try {
      const result = execSync(`REPO_ROOT="${repoRoot}" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: repoRoot
      });
      assert(result.includes('Meta updates:'), 'Should report metadata updates count');
    } catch (err) {
      throw new Error(`Script execution failed: ${err.message}`);
    }
  });

  // Test 7: Script checks for broken references
  runTest('sync-flow-charts.js checks for broken references', () => {
    try {
      const result = execSync(`REPO_ROOT="${repoRoot}" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: repoRoot
      });
      assert(result.includes('Checking for broken file references'), 'Should check for broken references');
      assert(result.includes('Ref patches:'), 'Should report reference patches count');
    } catch (err) {
      throw new Error(`Script execution failed: ${err.message}`);
    }
  });

  // Test 8: Script doesn't modify files in DRY_RUN mode
  runTest('sync-flow-charts.js does not modify files in DRY_RUN mode', () => {
    try {
      const result = execSync(`REPO_ROOT="${repoRoot}" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: repoRoot
      });
      assert(result.includes('DRY_RUN — no files were modified'), 'Should confirm no files modified');
    } catch (err) {
      throw new Error(`Script execution failed: ${err.message}`);
    }
  });

  // Test 9: Script fails gracefully when flow charts directory doesn't exist
  runTest('sync-flow-charts.js fails gracefully with missing directory', () => {
    try {
      const result = execSync(`REPO_ROOT="/tmp/nonexistent" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 10000,
        stdio: 'pipe'
      });
      // Should not reach here
      throw new Error('Script should have exited with error for missing directory');
    } catch (err) {
      // Expected to fail with exit code
      const output = (err.stdout || '') + (err.stderr || '') + (err.message || '');
      assert(output.includes('Flow charts directory not found') || err.status === 1, 
        'Should report directory not found or exit with error code');
    }
  });

  // Test 10: Script processes expected flow chart files
  runTest('sync-flow-charts.js processes expected flow chart files', () => {
    try {
      const result = execSync(`REPO_ROOT="${repoRoot}" DRY_RUN=true node "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: repoRoot
      });
      // Should mention some of the expected files
      const expectedFiles = ['README.md', 'MASTER_FLOW_SIMPLE.md', 'TOOLS_CATALOG.md'];
      let foundFiles = 0;
      for (const file of expectedFiles) {
        if (result.includes(file)) foundFiles++;
      }
      assert(foundFiles >= 2, `Should mention at least 2 of the expected files, found ${foundFiles}`);
    } catch (err) {
      throw new Error(`Script execution failed: ${err.message}`);
    }
  });

  // Print summary
  console.log(`\n${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Check if we are running directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };

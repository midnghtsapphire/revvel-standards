#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test helper to avoid running main() when requiring the module
const originalArgv = process.argv;
const originalExit = process.exit;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Mock process.exit and console output
let exitCalled = false;
let consoleOutput = [];

process.exit = (code) => {
  exitCalled = true;
  throw new Error(`process.exit(${code})`);
};

console.log = (...args) => {
  consoleOutput.push(args.join(' '));
};

console.error = (...args) => {
  consoleOutput.push('[ERROR] ' + args.join(' '));
};

function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  function runTest(name, fn) {
    try {
      fn();
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.log(`✅ PASS: ${name}`);
      console.log = (...args) => consoleOutput.push(args.join(' '));
      console.error = (...args) => consoleOutput.push('[ERROR] ' + args.join(' '));
      testsPassed++;
    } catch (e) {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${e.stack || e.message}`);
      console.log = (...args) => consoleOutput.push(args.join(' '));
      console.error = (...args) => consoleOutput.push('[ERROR] ' + args.join(' '));
      testsFailed++;
    }
  }

  // Test 1: Verify script file exists
  runTest('sync-flow-charts.js exists', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    assert(fs.existsSync(scriptPath), 'Script file should exist');
  });

  // Test 2: Verify script has proper shebang
  runTest('sync-flow-charts.js has proper shebang', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.startsWith('#!/usr/bin/env node'), 'Script should have node shebang');
  });

  // Test 3: Verify script has expected config constants
  runTest('sync-flow-charts.js defines expected constants', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('const REPO_ROOT'), 'Should define REPO_ROOT');
    assert(content.includes('const DRY_RUN'), 'Should define DRY_RUN');
    assert(content.includes('const FLOW_CHARTS_DIR'), 'Should define FLOW_CHARTS_DIR');
  });

  // Test 4: Verify script has main function
  runTest('sync-flow-charts.js has main function', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('async function main()'), 'Should have main function');
    assert(content.includes('main().catch'), 'Should call main with error handling');
  });

  // Test 5: Verify script handles DRY_RUN mode
  runTest('sync-flow-charts.js handles DRY_RUN environment variable', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('DRY_RUN === "true"'), 'Should check DRY_RUN environment variable');
    assert(content.includes('DRY_RUN mode'), 'Should mention DRY_RUN mode in output');
  });

  // Test 6: Verify script has expected flow chart files list
  runTest('sync-flow-charts.js defines FLOW_CHART_FILES array', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('const FLOW_CHART_FILES'), 'Should define FLOW_CHART_FILES');
    assert(content.includes('MASTER_FLOW_SIMPLE.md'), 'Should include MASTER_FLOW_SIMPLE.md');
    assert(content.includes('TOOLS_CATALOG.md'), 'Should include TOOLS_CATALOG.md');
  });

  // Test 7: Verify script has metadata block markers
  runTest('sync-flow-charts.js defines metadata markers', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('META_START'), 'Should define META_START marker');
    assert(content.includes('META_END'), 'Should define META_END marker');
    assert(content.includes('SYNC-META-START'), 'Should use SYNC-META-START comment');
    assert(content.includes('SYNC-META-END'), 'Should use SYNC-META-END comment');
  });

  // Test 8: Verify script has buildMetaBlock function
  runTest('sync-flow-charts.js has buildMetaBlock function', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('function buildMetaBlock'), 'Should have buildMetaBlock function');
    assert(content.includes('Last sync:'), 'Should include Last sync metadata');
    assert(content.includes('Total docs in repo:'), 'Should include doc count metadata');
  });

  // Test 9: Verify script has walk function for directory traversal
  runTest('sync-flow-charts.js has walk function', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('async function walk'), 'Should have walk function');
    assert(content.includes('WALK_SKIP_DIRS'), 'Should define directories to skip');
  });

  // Test 10: Verify script has patchBrokenRefs function
  runTest('sync-flow-charts.js has patchBrokenRefs function', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('function patchBrokenRefs'), 'Should have patchBrokenRefs function');
    assert(content.includes('linkPattern'), 'Should define link pattern for markdown links');
  });

  // Test 11: Verify script has security check for path traversal
  runTest('sync-flow-charts.js has path traversal security check', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('Skipping link outside repo root'), 'Should have security check');
  });

  // Test 12: Verify script checks for flow charts directory existence
  runTest('sync-flow-charts.js validates flow charts directory exists', () => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'sync-flow-charts.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes('Flow charts directory not found'), 'Should validate directory exists');
  });

  // Restore original functions
  process.exit = originalExit;
  console.log = originalConsoleLog;
  console.error = originalConsoleError;

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

#!/usr/bin/env node
'use strict';

/**
 * Tests for scripts/chaosmender.js
 *
 * Validates the error pattern scanners and ledger loading logic.
 * All tests run purely in memory with no GitHub API calls and no filesystem
 * side effects outside /tmp.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  loadLedger,
  runChecks,
  scanBareRemoveLabel,
  scanWorkflowRunMissingWorkflowsList,
  scanGithubScriptColumn0,
  buildIssueBody,
  CHECKS,
} = require('../scripts/chaosmender');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    failed += 1;
  }
}

// ---------------------------------------------------------------------------
// Helpers — create temporary workflow dirs / files for scanner tests
// ---------------------------------------------------------------------------

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chaosmender-test-'));
}

function writeWorkflow(dir, name, content) {
  const wfDir = path.join(dir, '.github', 'workflows');
  fs.mkdirSync(wfDir, { recursive: true });
  fs.writeFileSync(path.join(wfDir, name), content, 'utf8');
  return dir;
}

(async () => {
  console.log('=== ChaosMender Unit Tests ===\n');

  // ---------------------------------------------------------------------------
  // loadLedger
  // ---------------------------------------------------------------------------

  await test('loadLedger loads the real error-ledger.json', () => {
    const ledger = loadLedger(path.join(__dirname, '..', 'config', 'error-ledger.json'));
    assert.ok(ledger.version, 'ledger should have a version');
    assert.ok(Array.isArray(ledger.errors), 'ledger.errors should be an array');
    assert.ok(ledger.errors.length > 0, 'ledger should have at least one entry');
  });

  await test('loadLedger throws on missing file', () => {
    assert.throws(() => loadLedger('/tmp/no-such-file-xyz.json'), /not found/);
  });

  await test('real ledger entries have required fields', () => {
    const ledger = loadLedger(path.join(__dirname, '..', 'config', 'error-ledger.json'));
    for (const entry of ledger.errors) {
      assert.ok(entry.id, `entry missing id: ${JSON.stringify(entry)}`);
      assert.ok(entry.title, `entry ${entry.id} missing title`);
      assert.ok(entry.fix, `entry ${entry.id} missing fix`);
      assert.ok(['critical', 'high', 'medium', 'low'].includes(entry.severity),
        `entry ${entry.id} has invalid severity: ${entry.severity}`);
    }
  });

  await test('LABEL-RACE-001 is in the ledger', () => {
    const ledger = loadLedger(path.join(__dirname, '..', 'config', 'error-ledger.json'));
    const entry = ledger.errors.find(e => e.id === 'LABEL-RACE-001');
    assert.ok(entry, 'LABEL-RACE-001 must be in the ledger');
    assert.ok(entry.auto_detectable, 'LABEL-RACE-001 must be auto_detectable');
    assert.equal(entry.chaosmender_check, 'bare-remove-label');
    assert.ok(entry.fix_code_snippet, 'LABEL-RACE-001 must have a fix_code_snippet');
  });

  // ---------------------------------------------------------------------------
  // scanBareRemoveLabel
  // ---------------------------------------------------------------------------

  await test('scanBareRemoveLabel: flags unguarded removeLabel call', () => {
    const root = writeWorkflow(tmpDir(), 'test.yml', [
      'name: Test',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/github-script@v9',
      '        with:',
      '          script: |',
      '            await github.rest.issues.removeLabel({',
      '              owner: context.repo.owner,',
      '              repo: context.repo.repo,',
      '              issue_number: 1,',
      '              name: "wr:checking",',
      '            });',
    ].join('\n'));

    const findings = scanBareRemoveLabel(root);
    assert.equal(findings.length, 1, 'should find 1 unguarded removeLabel');
    assert.ok(findings[0].file.endsWith('test.yml'));
    assert.equal(findings[0].errorId, 'LABEL-RACE-001');
  });

  await test('scanBareRemoveLabel: does NOT flag guarded removeLabel (404 catch)', () => {
    const root = writeWorkflow(tmpDir(), 'guarded.yml', [
      'name: Test',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/github-script@v9',
      '        with:',
      '          script: |',
      '            await github.rest.issues.removeLabel({',
      '              owner: context.repo.owner,',
      '              repo: context.repo.repo,',
      '              issue_number: 1,',
      '              name: "wr:checking",',
      '            }).catch(err => { if (err.status !== 404) throw err; });',
    ].join('\n'));

    const findings = scanBareRemoveLabel(root);
    assert.equal(findings.length, 0, 'guarded call should not be flagged');
  });

  await test('scanBareRemoveLabel: does NOT flag removeLabelSafe wrapper pattern', () => {
    const root = writeWorkflow(tmpDir(), 'wrapper.yml', [
      'name: Test',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/github-script@v9',
      '        with:',
      '          script: |',
      '            async function removeLabelSafe(issueNumber, label) {',
      '              try {',
      '                await github.rest.issues.removeLabel({',
      '                  owner: context.repo.owner, repo: context.repo.repo,',
      '                  issue_number: issueNumber, name: label,',
      '                });',
      '              } catch (err) {',
      '                if (err.status !== 404) throw err;',
      '              }',
      '            }',
      '            await removeLabelSafe(1, "triage:new");',
    ].join('\n'));

    const findings = scanBareRemoveLabel(root);
    assert.equal(findings.length, 0, 'removeLabelSafe wrapper should not be flagged');
  });

  await test('scanBareRemoveLabel: does NOT flag silent-catch pattern', () => {
    const root = writeWorkflow(tmpDir(), 'silent.yml', [
      'name: Test',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/github-script@v9',
      '        with:',
      '          script: |',
      '            await github.rest.issues.removeLabel({',
      '              owner: context.repo.owner,',
      '              repo: context.repo.repo,',
      '              issue_number: 1, name: "lbl",',
      '            }).catch(() => {});',
    ].join('\n'));

    const findings = scanBareRemoveLabel(root);
    assert.equal(findings.length, 0, 'silent .catch() should not be flagged');
  });

  await test('scanBareRemoveLabel: returns empty on workflows dir missing', () => {
    const findings = scanBareRemoveLabel(tmpDir());
    assert.deepEqual(findings, []);
  });

  // ---------------------------------------------------------------------------
  // scanWorkflowRunMissingWorkflowsList
  // ---------------------------------------------------------------------------

  await test('scanWorkflowRunMissingWorkflowsList: flags workflow_run without workflows key', () => {
    const root = writeWorkflow(tmpDir(), 'bad.yml', [
      'name: Bad',
      'on:',
      '  workflow_run:',
      '    types: [completed]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps: []',
    ].join('\n'));

    const findings = scanWorkflowRunMissingWorkflowsList(root);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].errorId, 'WORKFLOW-RUN-001');
  });

  await test('scanWorkflowRunMissingWorkflowsList: does NOT flag when workflows key present', () => {
    const root = writeWorkflow(tmpDir(), 'good.yml', [
      'name: Good',
      'on:',
      '  workflow_run:',
      '    workflows: ["CI"]',
      '    types: [completed]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps: []',
    ].join('\n'));

    const findings = scanWorkflowRunMissingWorkflowsList(root);
    assert.equal(findings.length, 0);
  });

  await test('scanWorkflowRunMissingWorkflowsList: does NOT flag workflows key beyond a long comment block (pr-lifecycle regression)', () => {
    const comments = Array.from({ length: 30 }, (_, i) => `    # explanatory comment line ${i + 1}`);
    const root = writeWorkflow(tmpDir(), 'commented.yml', [
      'name: Commented',
      'on:',
      '  workflow_run:',
      ...comments,
      '    workflows: ["CI"]',
      '    types: [completed]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps: []',
    ].join('\n'));

    const findings = scanWorkflowRunMissingWorkflowsList(root);
    assert.equal(findings.length, 0);
  });

  await test('scanWorkflowRunMissingWorkflowsList: skips files with no workflow_run', () => {
    const root = writeWorkflow(tmpDir(), 'noevent.yml', [
      'name: No Event',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps: []',
    ].join('\n'));

    const findings = scanWorkflowRunMissingWorkflowsList(root);
    assert.equal(findings.length, 0);
  });

  // ---------------------------------------------------------------------------
  // scanGithubScriptColumn0
  // ---------------------------------------------------------------------------

  await test('scanGithubScriptColumn0: flags column-0 line inside script block', () => {
    const root = writeWorkflow(tmpDir(), 'col0.yml', [
      'name: Col0',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/github-script@v7',
      '        with:',
      '          script: |',
      '            const x = 1;',
      'this-is-at-column-0-and-breaks-yaml',
      '            const y = 2;',
    ].join('\n'));

    const findings = scanGithubScriptColumn0(root);
    assert.ok(findings.length >= 1, 'should detect the column-0 line');
    assert.equal(findings[0].errorId, 'GITHUB-SCRIPT-INLINE-001');
  });

  await test('scanGithubScriptColumn0: no findings for correctly indented scripts', () => {
    const root = writeWorkflow(tmpDir(), 'clean.yml', [
      'name: Clean',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/github-script@v7',
      '        with:',
      '          script: |',
      '            const x = 1;',
      '            const y = 2;',
    ].join('\n'));

    const findings = scanGithubScriptColumn0(root);
    assert.equal(findings.length, 0);
  });

  // ---------------------------------------------------------------------------
  // runChecks integration
  // ---------------------------------------------------------------------------

  await test('runChecks: returns findings for known patterns in a test repo', () => {
    const root = writeWorkflow(tmpDir(), 'check.yml', [
      'name: Check',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/github-script@v9',
      '        with:',
      '          script: |',
      '            await github.rest.issues.removeLabel({',
      '              owner: context.repo.owner, repo: context.repo.repo,',
      '              issue_number: 1, name: "wr:checking",',
      '            });',
    ].join('\n'));

    const ledger = loadLedger(path.join(__dirname, '..', 'config', 'error-ledger.json'));
    const findings = runChecks(root, ledger);
    assert.ok(findings.length > 0, 'should find at least one pattern');
    assert.ok(findings.every(f => f.title), 'every finding should have a title');
    assert.ok(findings.every(f => f.fix), 'every finding should have a fix');
  });

  await test('runChecks: returns empty findings for a clean repo', () => {
    const root = writeWorkflow(tmpDir(), 'clean.yml', [
      'name: Clean',
      'on: [push]',
      'jobs:',
      '  job:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: echo hi',
    ].join('\n'));

    const ledger = loadLedger(path.join(__dirname, '..', 'config', 'error-ledger.json'));
    const findings = runChecks(root, ledger);
    assert.equal(findings.length, 0);
  });

  await test('CHECKS registry contains all auto-detectable ledger entries', () => {
    const ledger = loadLedger(path.join(__dirname, '..', 'config', 'error-ledger.json'));
    for (const entry of ledger.errors) {
      if (!entry.auto_detectable || !entry.chaosmender_check) continue;
      assert.ok(
        CHECKS[entry.chaosmender_check],
        `CHECKS is missing scanner for chaosmender_check='${entry.chaosmender_check}' (entry ${entry.id})`
      );
    }
  });

  // ---------------------------------------------------------------------------
  // buildIssueBody
  // ---------------------------------------------------------------------------

  await test('buildIssueBody: produces a non-empty body with error id', () => {
    const findings = [
      {
        errorId: 'LABEL-RACE-001',
        title: 'removeLabel 404 crashes job',
        category: 'label-race-condition',
        severity: 'high',
        file: '.github/workflows/test.yml',
        line: 42,
        excerpt: 'await github.rest.issues.removeLabel({',
        fix: 'Wrap in .catch',
        fix_code_snippet: '.catch(err => { if (err.status !== 404) throw err; })',
        references: ['learnings.md'],
      },
    ];
    const body = buildIssueBody(findings);
    assert.ok(body.includes('LABEL-RACE-001'), 'body must include error id');
    assert.ok(body.includes('test.yml'), 'body must include filename');
    assert.ok(body.includes('42'), 'body must include line number');
    assert.ok(body.includes('ChaosMender'), 'body must reference ChaosMender');
  });

  await test('buildIssueBody: groups multiple findings by errorId', () => {
    const findings = [
      { errorId: 'LABEL-RACE-001', title: 'Test', category: 'cat', severity: 'high', file: 'a.yml', line: 1, excerpt: '', fix: 'f', references: [] },
      { errorId: 'LABEL-RACE-001', title: 'Test', category: 'cat', severity: 'high', file: 'b.yml', line: 2, excerpt: '', fix: 'f', references: [] },
    ];
    const body = buildIssueBody(findings);
    // Only one H3 heading for the group
    const headingCount = (body.match(/^### LABEL-RACE-001/m) || []).length;
    assert.equal(headingCount, 1, 'should produce one heading per error id group');
    // Both files should appear
    assert.ok(body.includes('a.yml') && body.includes('b.yml'));
  });

  // ---------------------------------------------------------------------------
  // Real repo scan (informational — never fails CI on medium/low)
  // ---------------------------------------------------------------------------

  await test('chaosmender scan on real repo completes without throwing', () => {
    // Informational only. ChaosMender exits 1 for high/critical findings
    // but this test only checks that the scan function itself does not throw.
    const ledger = loadLedger(path.join(__dirname, '..', 'config', 'error-ledger.json'));
    const repoRoot = path.join(__dirname, '..');
    let findings;
    assert.doesNotThrow(() => { findings = runChecks(repoRoot, ledger); });
    console.log(`  → real repo: ${findings.length} finding(s) detected`);
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log(`\n=== ChaosMender Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed');
  }
})();

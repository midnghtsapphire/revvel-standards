#!/usr/bin/env node
/**
 * check-workflow-yaml.js — self-healing guard for GitHub Actions workflows.
 *
 * Why this exists (2026-06-17):
 *   Three workflows (credential-autonomy-agent, repo-self-healer,
 *   secrets-guardian) embedded a multi-line `github-script` template literal
 *   whose continuation lines were written flush-left (column 1). That
 *   terminated the YAML `script: |` block scalar and made the whole file
 *   invalid YAML. The repo-wide "Workflow Lint" check failed on the first
 *   bad file alphabetically and thus failed on EVERY pr — silently, for a
 *   long time, because nothing surfaced *which* file or *how* to fix it.
 *
 * What it does:
 *   - Validates every .github/workflows/*.yml|*.yaml with a real YAML parse
 *     when the `yaml` package is available; otherwise falls back to a
 *     conservative textual heuristic that catches the exact flush-left
 *     block-scalar regression (no external dependency, no child_process).
 *   - Returns a list of { file, error } for invalid workflows.
 *
 * Remediation (the "what to do if it happens again"):
 *   A github-script body must stay indented INSIDE the `script: |` block.
 *   Rebuild multi-line strings as an array of backtick lines joined with
 *   '\n', e.g.:
 *       body: [
 *         `## Title`,
 *         ``,
 *         `**Field:** ${value}`,
 *       ].join('\n')
 *   Never write template-literal continuation lines flush-left.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '.github', 'workflows');

// Lines that begin at column 0 and start with one of these fragments are almost
// always a github-script template literal that escaped its `script: |` block
// scalar (the real failure mode). Deliberately EXCLUDES `#` (a legal YAML
// comment) and `---` (a legal document separator) to avoid false positives on
// the many workflows that open with a top-level comment.
const FLUSH_LEFT_BROKEN = /^(\*|`|_|\|\s|\d+\.\s|\)\.join)/;

function listWorkflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(WORKFLOWS_DIR, f));
}

function tryLoadYamlParser() {
  try {
    // Prefer the repo's `yaml` dependency when node_modules is present.
    return require('yaml');
  } catch {
    return null;
  }
}

function heuristicError(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (FLUSH_LEFT_BROKEN.test(l)) {
      return `line ${i + 1}: flush-left line "${l.slice(0, 40)}" — looks like a github-script template literal that escaped its 'script: |' block scalar`;
    }
  }
  return null;
}

// GitHub Actions SCHEMA check (beyond plain YAML validity): the `workflow_run`
// event REQUIRES a `workflows:` list. Without it GitHub rejects the entire file
// as an "Invalid workflow file" (startup_failure, 0s, no jobs) on every run —
// a class that plain yaml.safe_load (the old "Workflow Lint") does NOT catch.
// Line-based so it works with or without a YAML parser installed.
function workflowRunMissingWorkflows(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)workflow_run:\s*(\S.*)?$/);
    if (!m) continue;
    const indent = m[1].length;
    const inline = (m[2] || '').trim();
    if (inline) {
      // Inline mapping form, e.g. `workflow_run: {workflows: [..], ...}`
      return inline.includes('workflows')
        ? null
        : `line ${i + 1}: 'on.workflow_run' has no 'workflows:' — GitHub rejects the whole file as an invalid workflow`;
    }
    // Block form: scan the more-indented lines that belong to this mapping.
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '') continue;
      const curIndent = lines[j].match(/^(\s*)/)[1].length;
      if (curIndent <= indent) break; // left the workflow_run block
      if (/^\s*workflows:/.test(lines[j])) return null; // found it — valid
    }
    return `line ${i + 1}: 'on.workflow_run' has no 'workflows:' — GitHub rejects the whole file as an invalid workflow`;
  }
  return null;
}

// Windows-only shells (2026-07-24): wr-rewrite.yml ran every step with
// `shell: powershell` on a Linux self-hosted runner. The runner has no
// PowerShell, so every run died with "pwsh: command not found" before the
// first command executed. All fleet runners are Linux — steps must use bash
// (or sh/python). Line-based so it catches both step-level `shell:` and
// `defaults.run.shell:`.
const WINDOWS_ONLY_SHELL = /^\s*(?:-\s+)?shell:\s*['"]?(powershell|pwsh|cmd)\b/;

function windowsOnlyShell(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(WINDOWS_ONLY_SHELL);
    if (m) {
      return `line ${i + 1}: 'shell: ${m[1]}' is Windows-only — fleet runners are Linux, use 'shell: bash' (fails at runtime with "pwsh: command not found")`;
    }
  }
  return null;
}

/** @returns {{file:string,error:string}[]} */
function findInvalidWorkflows() {
  const parser = tryLoadYamlParser();
  const bad = [];
  const root = path.resolve(__dirname, '..');
  for (const file of listWorkflowFiles()) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, 'utf8');

    // 1) YAML validity (real parse when available, flush-left heuristic otherwise)
    if (parser) {
      try {
        parser.parse(text);
      } catch (e) {
        bad.push({ file: rel, error: e.message.split('\n')[0] });
        continue; // can't trust structural checks on unparseable YAML
      }
    } else {
      const err = heuristicError(text);
      if (err) {
        bad.push({ file: rel, error: err });
        continue;
      }
    }

    // 2) GitHub Actions schema checks (caught even when YAML is valid)
    const schemaErr = workflowRunMissingWorkflows(text);
    if (schemaErr) bad.push({ file: rel, error: schemaErr });

    // 3) Runtime environment checks: shells that cannot exist on the runners
    const shellErr = windowsOnlyShell(text);
    if (shellErr) bad.push({ file: rel, error: shellErr });
  }
  return bad;
}

module.exports = { findInvalidWorkflows, listWorkflowFiles, heuristicError, workflowRunMissingWorkflows, windowsOnlyShell };

// CLI: print report, exit 1 if any invalid (usable as a CI gate too).
if (require.main === module) {
  const bad = findInvalidWorkflows();
  if (bad.length === 0) {
    console.log('✅ All workflow YAML files are valid.');
    process.exit(0);
  }
  console.log(`❌ ${bad.length} invalid workflow file(s):`);
  for (const b of bad) console.log(`   - ${b.file}: ${b.error}`);
  console.log('\nFix: keep github-script bodies indented inside the `script: |` block —');
  console.log('rebuild multi-line strings as `[ `line`, `` ].join(\'\\n\')`. Never flush-left.');
  process.exit(1);
}

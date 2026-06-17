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

// Lines that begin at column 0 inside a workflow are almost always a broken
// block scalar when they start with one of these markdown/JS fragments — none
// is a legal start for a top-level YAML key, list item, comment, or doc marker.
const FLUSH_LEFT_BROKEN = /^(\*|`|_|\||#{1,6}\s|\d+\.\s|-{3,}\s*$|\)\.join)/;

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

/** @returns {{file:string,error:string}[]} */
function findInvalidWorkflows() {
  const parser = tryLoadYamlParser();
  const bad = [];
  for (const file of listWorkflowFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    if (parser) {
      try {
        parser.parse(text);
      } catch (e) {
        bad.push({ file: path.relative(path.resolve(__dirname, '..'), file), error: e.message.split('\n')[0] });
      }
    } else {
      const err = heuristicError(text);
      if (err) bad.push({ file: path.relative(path.resolve(__dirname, '..'), file), error: err });
    }
  }
  return bad;
}

module.exports = { findInvalidWorkflows, listWorkflowFiles };

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

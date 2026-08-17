#!/usr/bin/env node
'use strict';

// A workflow GitHub never reads is not a workflow.
//
// GitHub Actions registers workflows found at `.github/workflows/*.yml` only.
// Nested directories are not searched, not warned about, and not reported
// anywhere in the UI — the file simply does not exist as far as Actions is
// concerned. `.github/workflows/cron/api-monitor.yml` sat there since it was
// written, scheduled `*/30 * * * *`, and ran exactly zero times:
//
//   GET /actions/workflows/cron/api-monitor.yml/runs  ->  404 Not Found
//
// It was also absent from all 242 registered workflows, sorting exactly where
// it should have appeared between `API Rate Limit Handler` and `APIsec
// Security Scan`.
//
// This is the same failure mode as a Python file that does not compile or a
// status check that reports one suite as all of them: the artifact is present,
// reads as healthy, and asserts nothing. Presence is not evidence of
// execution, so this test asserts the one property that makes execution
// possible.
//
// DORMANT below is a ratchet, not an ignore list. It may only shrink. Moving a
// file out of it activates a schedule, which is an operational decision rather
// than a cleanup — so the list keeps each one visible and counted until
// somebody makes that call deliberately.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowsDir = path.join(root, '.github/workflows');

// Known-dormant and awaiting an activation decision, not a repair. Each is a
// scheduled external prober that has never executed; switching them on adds
// recurring load and, for status-universal, opens issues on failure. Tracked,
// visible, and shrink-only.
const DORMANT = new Set([
  'cron/health-check.yml',
  'cron/link-checker.yml',
  'cron/status-universal.yml',
]);

/**
 * A REVVEL-DISABLED tombstone is an archive, not a workflow. RVS-AGENT-001
 * (`standards/COMMENT-DONT-DELETE.md`) requires a moved or removed file to
 * leave one behind at its old path, so the archival policy check and this
 * guard would otherwise contradict each other: one demands the path exist,
 * the other demands it not. Nobody expects a tombstone to run, so "GitHub
 * will not read this" is the intended state for it.
 */
function isTombstone(absPath) {
  return /^[^\n]*REVVEL-DISABLED \|/m.test(fs.readFileSync(absPath, 'utf8').slice(0, 4096));
}

/** @returns {string[]} live workflow files nested below `.github/workflows`, relative to it */
function nestedWorkflowFiles(dir = workflowsDir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...nestedWorkflowFiles(abs, rel));
    } else if (prefix && /\.ya?ml$/.test(entry.name) && !isTombstone(abs)) {
      // `prefix` is non-empty only below the top level, which is exactly the
      // set GitHub will not read.
      out.push(rel);
    }
  }
  return out;
}

test('no workflow is filed where GitHub Actions will not read it', () => {
  const nested = nestedWorkflowFiles();
  const unexpected = nested.filter((f) => !DORMANT.has(f));

  assert.deepEqual(
    unexpected,
    [],
    'these workflow files sit in a subdirectory of .github/workflows, so GitHub ' +
      'never registers or runs them — move them up one level:\n' +
      unexpected.map((f) => `  .github/workflows/${f}`).join('\n')
  );
});

test('the dormant list only shrinks', () => {
  // If a dormant workflow has been activated, it must leave the list in the
  // same change. Otherwise the list outlives the problem and starts hiding
  // regressions again — the exact failure mode that produced it.
  const nested = new Set(nestedWorkflowFiles());
  const activated = [...DORMANT].filter((f) => !nested.has(f));

  assert.deepEqual(
    activated,
    [],
    'these are no longer nested; delete them from DORMANT in this file:\n' +
      activated.map((f) => `  ${f}`).join('\n')
  );
});

test('api-monitor is registered at the top level and fails on an unhealthy API', () => {
  // Regression test for the specific workflow this guard was written for. It
  // is not enough that the file moved: the version that was nested also
  // exited 0 after detecting a dead endpoint, so relocating it alone would
  // have produced a workflow that runs and still never fails.
  const file = path.join(workflowsDir, 'api-monitor.yml');
  assert.ok(fs.existsSync(file), 'api-monitor.yml must sit directly in .github/workflows');

  const body = fs.readFileSync(file, 'utf8');
  assert.match(body, /^permissions:$/m, 'must declare least-privilege permissions');
  assert.match(body, /timeout-minutes:/, 'must bound its runtime');
  assert.match(body, /exit 1/, 'must exit non-zero when an endpoint is unhealthy');
  // Match the redirection, not the identifier: the file documents why that
  // write was removed, and a bare /GITHUB_OUTPUT/ would forbid explaining the
  // defect as well as committing it.
  assert.doesNotMatch(
    body,
    />>\s*"?\$(\{)?GITHUB_OUTPUT/,
    'the old multi-line $GITHUB_OUTPUT write was invalid and unread; do not reintroduce it'
  );
});

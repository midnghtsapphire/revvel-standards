#!/usr/bin/env node
// ============================================================================
// pr-lifecycle.js — Scripts-as-CI extraction of .github/workflows/pr-lifecycle.yml
// ("PR Lifecycle"). Currently observational by design: logs PR state and
// re-aggregates check-suite counts for a head SHA with a rate-limit guard.
// Zero deps; runs on any runner/laptop/client box (METAL principles #3/#8).
//
// Modes: pr-state | check-state
// ============================================================================
'use strict';

const { core, runCli } = require('./lib/mini-github');

// pull_request / pull_request_target events
async function runPrState(github, context) {
  const pr = context.payload.pull_request;
  if (!pr) return;
  core.info(`PR #${pr.number} state=${pr.state} draft=${pr.draft}`);
}

// check_suite completed / workflow_run completed events
async function runCheckState(github, context) {
  const sha = context.payload.workflow_run?.head_sha
    || context.payload.check_suite?.head_sha;
  if (!sha) {
    core.info('No head SHA on event payload; nothing to do.');
    return;
  }
  core.info(`Re-aggregating check state for SHA ${sha}`);

  // Rate-limit guard: bail early if remaining budget is low.
  try {
    const { data: rl } = await github.rest.rateLimit.get();
    const remaining = rl?.resources?.core?.remaining ?? 0;
    if (remaining < 100) {
      core.warning(`Core API remaining=${remaining}; skipping to preserve budget.`);
      return;
    }
  } catch (e) {
    core.warning(`rateLimit.get() failed: ${e.message}`);
  }

  const { owner, repo } = context.repo;
  const { data: prs } = await github.rest.pulls.list({ owner, repo, state: 'open', per_page: 100 });
  const matching = prs.filter((p) => p.head.sha === sha);
  if (matching.length === 0) {
    core.info('No open PRs match this SHA.');
    return;
  }
  const { data: suites } = await github.rest.checks.listSuitesForRef({ owner, repo, ref: sha });
  core.info(`Found ${matching.length} PR(s) and ${suites.total_count} check suite(s) for SHA.`);
}

if (require.main === module) {
  runCli({
    'pr-state': runPrState,
    'check-state': runCheckState,
    _byEvent: {
      pull_request: 'pr-state',
      pull_request_target: 'pr-state',
      check_suite: 'check-state',
      workflow_run: 'check-state',
    },
  }, '🔄 PR Lifecycle').catch((e) => { console.error(`❌ pr-lifecycle failed: ${e.message}`); process.exit(1); });
}

module.exports = { runPrState, runCheckState };

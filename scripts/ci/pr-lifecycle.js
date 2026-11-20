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
// 2026-11-15: additive metadata-only completion gate; existing lifecycle owns
// event timing. Trusted-default checkout only; no PR body command execution.
const { observeOwnership, openPrs } = require('./lib/ownership-lifecycle');

// pull_request / pull_request_target events
async function runPrState(github, context) {
  const pr = context.payload.pull_request;
  if (!pr) return;
  core.info(`PR #${pr.number} state=${pr.state} draft=${pr.draft}`);
  return observeOwnership(github, context, pr);
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
  // 2026-11-15 retired first-page-only lookup (Audrey completion WR/PR).
  // const { data: prs } = await github.rest.pulls.list({ owner, repo, state: 'open', per_page: 100 });
  const prs = await openPrs(github, owner, repo);
  const matching = prs.filter((p) => p.head.sha === sha);
  if (matching.length === 0) {
    core.info('No open PRs match this SHA.');
    return;
  }
  const { data: suites } = await github.rest.checks.listSuitesForRef({ owner, repo, ref: sha });
  core.info(`Found ${matching.length} PR(s) and ${suites.total_count} check suite(s) for SHA.`);
  for (const pr of matching) await observeOwnership(github, context, pr);
  // A failed check is only a continuation signal, not permission to create a
  // paid reviewer task. Manus continuation proposal is documented, not active.
  if (['failure', 'timed_out'].includes(context.payload.workflow_run?.conclusion || context.payload.check_suite?.conclusion)) {
    core.warning('Failed check: owning agent must resume the existing task; Manus API review dispatcher is not activated.');
  }
}

// On-demand continuation scan for the existing monitor/operator. No timer is
// installed; all open PRs are paginated and metadata-only. Do not create WRs.
async function runOwnershipScan(github, context) {
  const prs = await openPrs(github, context.repo.owner, context.repo.repo);
  for (const pr of prs) await observeOwnership(github, context, pr);
}

if (require.main === module) {
  runCli({
    'pr-state': runPrState,
    'check-state': runCheckState,
    'ownership-scan': runOwnershipScan,
    _byEvent: {
      pull_request: 'pr-state',
      pull_request_target: 'pr-state',
      check_suite: 'check-state',
      workflow_run: 'check-state',
    },
  }, '🔄 PR Lifecycle').catch((e) => { console.error(`❌ pr-lifecycle failed: ${e.message}`); process.exit(1); });
}

module.exports = { runPrState, runCheckState, runOwnershipScan };

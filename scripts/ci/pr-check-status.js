#!/usr/bin/env node
// ============================================================================
// pr-check-status.js — Scripts-as-CI extraction of
// .github/workflows/pr-check-status.yml ("PR Check Status Automation").
// The REAL check-state labeler: aggregated pass/fail across ALL check runs
// plus combined commit status (CircleCI/Vercel report there), sticky comment
// updated in place, labels WITHOUT the status: prefix (checks-passing /
// checks-failing / ready-to-merge / approved) — do not confuse with the
// orchestrator's status:* family.
//
// Modes: check-suite | workflow-run (dormant upstream; kept for history)
// Zero deps; runs on any runner/laptop/client box (METAL principles #3/#8).
// ============================================================================
'use strict';

const { core, runCli } = require('./lib/mini-github');

const MARKER = '<!-- pr-check-status:sticky -->';
// timed_out / startup_failure / action_required / stale must clear a stale
// checks-passing or ready-to-merge state (cubic P1 on #15623). 'cancelled' is
// deliberately a no-op: with cancel-in-progress concurrency, cancellations are
// routine supersessions and mapping them to failing would flap the labels.
const FAILING = ['failure', 'timed_out', 'action_required', 'startup_failure', 'stale'];

// A check suite's conclusion describes THAT SUITE ONLY. This repo runs many
// suites per commit — Actions, CircleCI, Vercel and other apps — so one green
// suite is not a green pull request. A failing suite is conclusive on its own
// (short circuits, no extra API calls); only the success path pays for
// verification.
async function aggregateState(github, context, ref) {
  const { owner, repo } = context.repo;
  const { data: { check_runs: runs } } = await github.rest.checks.listForRef({ owner, repo, ref });
  // Skip this workflow's own check run: it is necessarily still in progress
  // right here, and would pin the PR to "pending".
  const selfPrefix = `/actions/runs/${context.runId}/`;
  const others = runs.filter((r) => !(r.details_url || '').includes(selfPrefix));

  if (others.some((r) => r.status === 'completed' && FAILING.includes(r.conclusion))) {
    return 'failing';
  }

  // Commit statuses are a separate surface from check runs, and are where
  // CircleCI and Vercel report. Checking only check runs is what let
  // "Account is blocked" sit under a green banner.
  const { data: combined } = await github.rest.repos.getCombinedStatusForRef({ owner, repo, ref });
  if (combined.state === 'failure' || combined.state === 'error') {
    return 'failing';
  }

  // Anything still running means we cannot yet claim success.
  if (others.some((r) => r.status !== 'completed')) return null;
  if (combined.total_count > 0 && combined.state === 'pending') return null;

  return 'passing';
}

async function runCheckSuite(github, context) {
  const suite = context.payload.check_suite;
  const conclusion = suite.conclusion;
  const prs = suite.pull_requests || [];

  if (!prs || prs.length === 0) {
    core.info('No PRs associated with this check suite');
    return;
  }

  const { owner, repo } = context.repo;

  let desired = null;
  if (FAILING.includes(conclusion)) {
    desired = 'failing';
  } else if (conclusion === 'success' || conclusion === 'neutral') {
    desired = await aggregateState(github, context, suite.head_sha);
  }

  if (!desired) {
    core.info(`Suite conclusion ${conclusion} -> no confirmed state; leaving PR status unchanged`);
    return;
  }

  for (const pr of prs) {
    const prNumber = pr.number;
    core.info(`Processing PR #${prNumber}, conclusion: ${conclusion} -> ${desired}`);

    // ONE read of current labels; every write below is conditional on an
    // actual state transition.
    const { data: prLabels } = await github.rest.issues.listLabelsOnIssue({ owner, repo, issue_number: prNumber });
    const names = prLabels.map((l) => l.name);
    const approved = names.includes('approved');

    // removeLabel is not idempotent (CLAUDE.md gotcha 1). A blanket catch
    // would also swallow 401/403, so a token that has lost label permission
    // looks exactly like a label that was already gone. Swallow 404 only.
    const dropLabel = (name) =>
      github.rest.issues.removeLabel({ owner, repo, issue_number: prNumber, name })
        .catch((err) => { if (err.status !== 404) throw err; });

    if (desired === 'passing') {
      if (names.includes('checks-failing')) await dropLabel('checks-failing');
      if (!names.includes('checks-passing')) {
        await github.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: ['checks-passing'] });
      }
      if (approved && !names.includes('ready-to-merge')) {
        await github.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: ['ready-to-merge'] });
        core.info(`PR #${prNumber} is now ready to merge!`);
      }
    } else {
      if (names.includes('checks-passing')) await dropLabel('checks-passing');
      if (!names.includes('checks-failing')) {
        await github.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: ['checks-failing'] });
      }
      if (names.includes('ready-to-merge')) await dropLabel('ready-to-merge');
    }

    // Sticky status comment: update the ONE marked comment in place; create it
    // only the first time; write nothing when unchanged. The PR's own checks
    // tab is always valid (the check_suite webhook payload has no html_url).
    const body = desired === 'passing'
      ? `${MARKER}\n✅ **CI Checks Passing** — All checks have passed.${approved ? ' This PR is now ready to merge!' : ''}`
      : `${MARKER}\n❌ **CI Checks Failed** — One or more checks failed. Please review the [check results](https://github.com/${owner}/${repo}/pull/${prNumber}/checks) and push a fix.`;

    const { data: comments } = await github.rest.issues.listComments({ owner, repo, issue_number: prNumber });
    const existing = comments.find((c) => c.body && c.body.includes(MARKER));
    if (existing && existing.body === body) {
      core.info(`PR #${prNumber}: sticky status unchanged — no write`);
    } else if (existing) {
      await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
    }
  }
}

// Dormant upstream (workflow_run trigger disabled 2026-06-17 — see workflow
// comments); logic kept for history and in case the trigger is re-enabled.
async function runWorkflowRun(github, context) {
  const run = context.payload.workflow_run;
  const conclusion = run.conclusion;
  const prs = run.pull_requests || [];

  if (!prs || prs.length === 0) {
    core.info('No PRs associated with this workflow run');
    return;
  }

  for (const pr of prs) {
    const prNumber = pr.number;
    core.info(`Processing PR #${prNumber} from workflow run, conclusion: ${conclusion}`);
    if (conclusion === 'success') {
      await github.rest.issues.addLabels({
        owner: context.repo.owner, repo: context.repo.repo,
        issue_number: prNumber, labels: ['checks-passing'],
      });
    } else if (conclusion === 'failure') {
      await github.rest.issues.addLabels({
        owner: context.repo.owner, repo: context.repo.repo,
        issue_number: prNumber, labels: ['checks-failing'],
      });
    }
  }
}

if (require.main === module) {
  runCli({
    'check-suite': runCheckSuite,
    'workflow-run': runWorkflowRun,
    _byEvent: { check_suite: 'check-suite', workflow_run: 'workflow-run' },
  }, '✅ PR Check Status').catch((e) => { console.error(`❌ pr-check-status failed: ${e.message}`); process.exit(1); });
}

module.exports = { runCheckSuite, runWorkflowRun };

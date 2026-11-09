#!/usr/bin/env node
// ============================================================================
// pr-state-orchestrator.js — Scripts-as-CI extraction of the PR State
// Orchestrator (previously 1,270 lines of inline JS duplicated across 5 jobs
// in .github/workflows/pr-state-orchestrator.yml).
//
// METAL principles honored (oaudrey governance/METAL/ci-docker-runners-principles.md):
//   #3 Scripts-as-CI  — ALL logic lives here, versioned; the workflow only invokes.
//   #8 Client-portable — runs identically on GitHub-hosted runners, the
//                        self-hosted runner (CARESSE), a laptop, or client infra.
//   #4 No marketplace  — plain node + fetch, zero npm deps, zero actions/*
//                        required to execute the logic itself.
//
// Usage:
//   In Actions (thin shim):  node scripts/ci/pr-state-orchestrator.js <mode>
//     env: GH_TOKEN (or GITHUB_TOKEN), GITHUB_EVENT_NAME, GITHUB_EVENT_PATH,
//          GITHUB_REPOSITORY  — all standard runner vars.
//   Local / laptop / client: GH_TOKEN=<pat> node scripts/ci/pr-state-orchestrator.js \
//                            resync --owner midnghtsapphire --repo revvel-standards
//                            reevaluate --pr 123
//
// Modes: lifecycle | review | check-suite | check-run | resync | reevaluate
// (mode is inferred from GITHUB_EVENT_NAME when not passed explicitly).
// ============================================================================
'use strict';

const fs = require('fs');

// ---------------------------------------------------------------------------
// Minimal Octokit-compatible client over fetch (no dependencies).
// Throws { status, message } on non-2xx so the ported logic's error handling
// (err.status === 404 guards, rate-limit regex) behaves identically.
// ---------------------------------------------------------------------------
function makeClient(token) {
  const API = 'https://api.github.com';
  async function req(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 204) return { data: null };
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const err = new Error((data && data.message) || `${method} ${path} -> ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return { data };
  }
  const q = (o) => Object.entries(o).filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return {
    rest: {
      issues: {
        listLabelsOnIssue: ({ owner, repo, issue_number }) =>
          req('GET', `/repos/${owner}/${repo}/issues/${issue_number}/labels`),
        listLabelsForRepo: ({ owner, repo, per_page = 100 }) =>
          req('GET', `/repos/${owner}/${repo}/labels?${q({ per_page })}`),
        createLabel: ({ owner, repo, name, color, description }) =>
          req('POST', `/repos/${owner}/${repo}/labels`, { name, color, description }),
        addLabels: ({ owner, repo, issue_number, labels }) =>
          req('POST', `/repos/${owner}/${repo}/issues/${issue_number}/labels`, { labels }),
        removeLabel: ({ owner, repo, issue_number, name }) =>
          req('DELETE', `/repos/${owner}/${repo}/issues/${issue_number}/labels/${encodeURIComponent(name)}`),
        listComments: ({ owner, repo, issue_number, per_page = 100 }) =>
          req('GET', `/repos/${owner}/${repo}/issues/${issue_number}/comments?${q({ per_page })}`),
        createComment: ({ owner, repo, issue_number, body }) =>
          req('POST', `/repos/${owner}/${repo}/issues/${issue_number}/comments`, { body }),
        updateComment: ({ owner, repo, comment_id, body }) =>
          req('PATCH', `/repos/${owner}/${repo}/issues/comments/${comment_id}`, { body }),
      },
      pulls: {
        get: ({ owner, repo, pull_number }) =>
          req('GET', `/repos/${owner}/${repo}/pulls/${pull_number}`),
        list: ({ owner, repo, state = 'open', per_page = 100 }) =>
          req('GET', `/repos/${owner}/${repo}/pulls?${q({ state, per_page })}`),
        listReviews: ({ owner, repo, pull_number }) =>
          req('GET', `/repos/${owner}/${repo}/pulls/${pull_number}/reviews`),
      },
      checks: {
        listForRef: ({ owner, repo, ref, per_page = 100 }) =>
          req('GET', `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/check-runs?${q({ per_page })}`),
      },
    },
    graphql: (query, variables) => req('POST', '/graphql', { query, variables }),
  };
}

// ---------------------------------------------------------------------------
// Console-backed `core` shim (matches @actions/core surface we use).
// ---------------------------------------------------------------------------
const core = {
  warning: (m) => console.log(`::warning::${m}`),
  setFailed: (m) => { console.log(`::error::${m}`); process.exitCode = 1; },
};

// ---------------------------------------------------------------------------
// Shared constants & helpers (were copy-pasted into all 5 jobs).
// ---------------------------------------------------------------------------
const ALL_STATUS = [
  'status:draft', 'status:waiting-for-review', 'status:approved',
  'status:needs-action', 'status:checks-failing', 'status:checks-passing', 'status:ready-to-merge',
];

const LABEL_PALETTE = {
  'status:draft':              { color: 'BFD4F2', description: '🚧 Draft — not ready for review' },
  'status:waiting-for-review': { color: '0075CA', description: '👀 Ready — awaiting review' },
  'status:approved':           { color: '0E8A16', description: '✅ Approved by reviewer' },
  'status:needs-action':       { color: 'E4E669', description: '🔧 Changes requested' },
  'status:checks-failing':     { color: 'D93F0B', description: '❌ CI checks failing' },
  'status:checks-passing':     { color: '0E8A16', description: '✅ CI checks passing' },
  'status:ready-to-merge':     { color: '6F42C1', description: '🚀 Approved + checks passing' },
};

const BADGE_MARKER = '<!-- revvel-status-badge -->';
const BADGE_MAP = {
  'status:draft':              `![status](https://img.shields.io/badge/status-draft-BFD4F2?style=flat-square) 🚧 This PR is a **draft** and not yet ready for review.`,
  'status:waiting-for-review': `![status](https://img.shields.io/badge/status-waiting%20for%20review-0075CA?style=flat-square&labelColor=0075CA&color=white) 👀 This PR is **awaiting review**.`,
  'status:approved':           `![status](https://img.shields.io/badge/status-approved-0E8A16?style=flat-square&labelColor=0E8A16&color=white) ✅ This PR is **approved**.`,
  'status:needs-action':       `![status](https://img.shields.io/badge/status-needs%20action-E4E669?style=flat-square) 🔧 This PR has **changes requested** and needs action.`,
  'status:checks-failing':     `![status](https://img.shields.io/badge/status-checks%20failing-D93F0B?style=flat-square&labelColor=D93F0B&color=white) ❌ CI checks are **failing** — please investigate.`,
  'status:ready-to-merge':     `![status](https://img.shields.io/badge/status-ready%20to%20merge-6F42C1?style=flat-square&labelColor=6F42C1&color=white) 🚀 This PR is **approved + passing** and is **ready to merge**!`,
};
const STATUS_PRIORITY = [
  'status:ready-to-merge', 'status:checks-failing', 'status:approved',
  'status:needs-action', 'status:waiting-for-review', 'status:draft',
];

// Wrap fallible reads so a transient API error degrades to a warning instead
// of failing the whole run. Rate-limit 403s are expected under event storms.
function makeSafeApi(github) {
  return async function safeApi(callName, fn, fallback) {
    try {
      return await fn();
    } catch (e) {
      const rateLimited = e?.status === 403 && /rate limit/i.test(e?.message || '');
      core.warning(`${callName} failed${rateLimited ? ' (API rate limit exceeded — degrading gracefully)' : ''}: ${e.message}`);
      return fallback;
    }
  };
}

// Small pause between PRs (150ms keeps sequential mutations under GitHub's
// secondary rate limit guidance for rapid content writes).
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function upsertStatusBadge(github, owner, repo, prNum, labels) {
  const activeStatus = STATUS_PRIORITY.find((s) => labels.includes(s));
  if (!activeStatus) return;
  const badgeBody = `${BADGE_MARKER}\n${BADGE_MAP[activeStatus]}`;
  try {
    const { data: comments } = await github.rest.issues.listComments({
      owner, repo, issue_number: prNum, per_page: 100,
    });
    const existing = comments.find((c) => c.body && c.body.includes(BADGE_MARKER));
    if (existing) {
      if (existing.body === badgeBody) { console.log(`🏷️ PR #${prNum}: badge unchanged`); return; }
      await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: badgeBody });
      console.log(`🏷️ PR #${prNum}: updated status badge → ${activeStatus}`);
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: prNum, body: badgeBody });
      console.log(`🏷️ PR #${prNum}: created status badge → ${activeStatus}`);
    }
  } catch (e) {
    console.log(`⚠️ PR #${prNum}: could not upsert badge — ${e.message}`);
  }
}

// Never arm auto-merge on a PR that delivers nothing (empty diff — #17058
// merged with ZERO changed files) or one titled [WIP] (#17756). Re-read the
// PR rather than trusting the event payload; fail closed when unverifiable.
async function enableAutoMerge(github, owner, repo, prNum, nodeId) {
  try {
    const { data: fresh } = await github.rest.pulls.get({ owner, repo, pull_number: prNum });
    if (typeof fresh.changed_files !== 'number') {
      core.warning(`PR #${prNum}: auto-merge NOT enabled — could not read changed_files.`);
      return;
    }
    if (fresh.changed_files === 0) {
      core.warning(`PR #${prNum}: auto-merge NOT enabled — the diff is empty (0 changed files).`);
      return;
    }
    if (/\[wip\]|\bwip\s*:|do not merge/i.test(fresh.title || '')) {
      core.warning(`PR #${prNum}: auto-merge NOT enabled — the title marks it unfinished: ${fresh.title}`);
      return;
    }
  } catch (e) {
    core.warning(`PR #${prNum}: auto-merge NOT enabled — could not verify the diff: ${e.message}`);
    return;
  }
  try {
    await github.graphql(`
      mutation($pullRequestId: ID!) {
        enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: SQUASH }) {
          pullRequest { number autoMergeRequest { mergeMethod } }
        }
      }
    `, { pullRequestId: nodeId });
    console.log(`🤖 PR #${prNum}: auto-merge (SQUASH) enabled`);
  } catch (e) {
    console.log(`⚠️ PR #${prNum}: could not enable auto-merge — ${e.message}`);
  }
}

// Label helpers bound to a live currentLabels array. removeLabel treats 404
// as success (LABEL-RACE-001: already-absent IS the desired end state) but
// rethrows anything else (401/403/5xx) so we never record a removal that
// did not happen (gotcha #6).
function makeLabelOps(github, owner, repo, prNumber, currentLabels, { createMissing = false, safeApi } = {}) {
  async function ensureLabelsExist(labels) {
    const repoLabelsResult = await safeApi(
      'listLabelsForRepo',
      () => github.rest.issues.listLabelsForRepo({ owner, repo, per_page: 100 }),
      { data: [] },
    );
    const existing = new Set(repoLabelsResult.data.map((l) => l.name));
    for (const label of labels) {
      if (!existing.has(label) && LABEL_PALETTE[label]) {
        try {
          await github.rest.issues.createLabel({ owner, repo, name: label, ...LABEL_PALETTE[label] });
          console.log(`🏷️ Created label: ${label}`);
        } catch (e) { console.log(`⚠️ Could not create label "${label}": ${e.message}`); }
      }
    }
  }
  async function addLabel(label) {
    if (createMissing) await ensureLabelsExist([label]);
    if (!currentLabels.includes(label)) {
      try {
        await github.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: [label] });
        currentLabels.push(label);
        console.log(`✅ Added: ${label}`);
      } catch (e) {
        console.log(`⚠️ Could not add "${label}": ${e.message}`);
      }
    }
  }
  async function removeLabel(label) {
    if (currentLabels.includes(label)) {
      await github.rest.issues.removeLabel({ owner, repo, issue_number: prNumber, name: label })
        .catch((err) => { if (err.status !== 404) throw err; });
      const i = currentLabels.indexOf(label);
      currentLabels.splice(i, 1);
      console.log(`🗑️ Removed: ${label}`);
    }
  }
  return { addLabel, removeLabel };
}

async function readCurrentLabels(github, safeApi, owner, repo, prNumber) {
  const labelResult = await safeApi(
    `listLabelsOnIssue for PR #${prNumber}`,
    () => github.rest.issues.listLabelsOnIssue({ owner, repo, issue_number: prNumber }),
    { data: [] },
  );
  return labelResult.data.map((l) => l.name);
}

// Review state: latest per-reviewer decision wins.
async function deriveReviewState(github, safeApi, owner, repo, prNumber) {
  const { data: reviews } = await safeApi(
    `pulls.listReviews for PR #${prNumber}`,
    () => github.rest.pulls.listReviews({ owner, repo, pull_number: prNumber }),
    { data: [] },
  );
  const latestReviews = {};
  for (const r of reviews) {
    if (r.state !== 'COMMENTED') latestReviews[r.user.login] = r.state;
  }
  const states = Object.values(latestReviews);
  return {
    isApproved: states.includes('APPROVED') && !states.includes('CHANGES_REQUESTED'),
    needsChanges: states.includes('CHANGES_REQUESTED'),
  };
}

// CI state: full picture from check runs for a SHA.
async function deriveCiState(github, safeApi, owner, repo, prNumber, sha) {
  const { data: checkRuns } = await safeApi(
    `checks.listForRef for PR #${prNumber}`,
    () => github.rest.checks.listForRef({ owner, repo, ref: sha, per_page: 100 }),
    { data: { check_runs: [] } },
  );
  const runs = checkRuns.check_runs;
  return {
    completed: runs.filter((r) => r.status === 'completed'),
    failing: runs.filter((r) => r.status === 'completed' && ['failure', 'timed_out'].includes(r.conclusion)),
    passing: runs.filter((r) => r.status === 'completed' && r.conclusion === 'success'),
    pending: runs.filter((r) => r.status !== 'completed'),
  };
}

// ---------------------------------------------------------------------------
// MODE: lifecycle  (pull_request events)
// ---------------------------------------------------------------------------
async function runLifecycle(github, context) {
  const pr = context.payload.pull_request;
  const prNumber = pr.number;
  const isDraft = pr.draft;
  const action = context.payload.action;
  const { owner, repo } = context.repo;
  const safeApi = makeSafeApi(github);

  const currentLabels = await readCurrentLabels(github, safeApi, owner, repo, prNumber);
  const { addLabel, removeLabel } = makeLabelOps(github, owner, repo, prNumber, currentLabels, { createMissing: true, safeApi });

  // Skip label events that are just our own automation echoing back
  if (action === 'labeled' || action === 'unlabeled') {
    console.log('🏷️ Label event — skipping to avoid echo loops');
    return;
  }

  if (action === 'converted_to_draft' || (action === 'opened' && isDraft)) {
    await addLabel('status:draft');
    for (const l of ['status:waiting-for-review', 'status:approved', 'status:ready-to-merge', 'status:needs-action']) await removeLabel(l);
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    return;
  }

  if (action === 'ready_for_review') {
    await addLabel('status:waiting-for-review');
    for (const l of ['status:draft', 'status:approved', 'status:needs-action']) await removeLabel(l);
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    return;
  }

  if (action === 'opened' && !isDraft) {
    await addLabel('status:waiting-for-review');
    await removeLabel('status:draft');
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    return;
  }

  if (action === 'reopened') {
    await (isDraft ? addLabel('status:draft') : addLabel('status:waiting-for-review'));
    for (const l of ['status:approved', 'status:ready-to-merge']) await removeLabel(l);
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    return;
  }

  if (action === 'synchronize') {
    for (const l of ['status:approved', 'status:ready-to-merge']) await removeLabel(l);
    if (!isDraft) await addLabel('status:waiting-for-review');
    console.log('📤 New commits — approval invalidated, back to review');
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    return;
  }

  if (action === 'closed') {
    for (const l of ALL_STATUS) await removeLabel(l);
    console.log(pr.merged ? '🎉 Merged — all status labels cleared' : '🚫 Closed — labels cleared');
  }
}

// ---------------------------------------------------------------------------
// MODE: review  (pull_request_review submitted)
// ---------------------------------------------------------------------------
async function runReview(github, context) {
  const review = context.payload.review;
  const pr = context.payload.pull_request;
  const prNumber = pr.number;
  const state = review.state.toLowerCase();
  const { owner, repo } = context.repo;
  const safeApi = makeSafeApi(github);

  if (state === 'commented') { console.log('💬 Comment only — no state change'); return; }

  const currentLabels = await readCurrentLabels(github, safeApi, owner, repo, prNumber);
  const { addLabel, removeLabel } = makeLabelOps(github, owner, repo, prNumber, currentLabels);

  if (state === 'approved') {
    await addLabel('status:approved');
    for (const l of ['status:waiting-for-review', 'status:needs-action']) await removeLabel(l);
    // Re-check live CI status to immediately promote to ready-to-merge if checks already passed
    const { failing, passing } = await deriveCiState(github, safeApi, owner, repo, prNumber, pr.head.sha);
    if (failing.length === 0 && passing.length > 0) {
      await addLabel('status:checks-passing');
      await removeLabel('status:checks-failing');
      await addLabel('status:ready-to-merge');
      await enableAutoMerge(github, owner, repo, prNumber, pr.node_id);
      console.log('🚀 Approved + checks already passing = READY TO MERGE');
    } else if (failing.length > 0) {
      await addLabel('status:checks-failing');
      await removeLabel('status:checks-passing');
      console.log('✅ Approved — but checks are failing; not yet ready');
    } else {
      console.log('✅ Approved — CI still running; will promote when checks complete');
    }
  }

  if (state === 'changes_requested') {
    await addLabel('status:needs-action');
    for (const l of ['status:waiting-for-review', 'status:approved', 'status:ready-to-merge']) await removeLabel(l);
    console.log('🔧 Changes requested — needs action');
  }

  await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
}

// ---------------------------------------------------------------------------
// MODE: check-suite  (check_suite completed)
// ---------------------------------------------------------------------------
async function runCheckSuite(github, context) {
  const suite = context.payload.check_suite;
  const conclusion = suite.conclusion;
  const headSha = suite.head_sha;
  const { owner, repo } = context.repo;
  const safeApi = makeSafeApi(github);

  if (!conclusion || ['skipped', 'neutral', 'stale', 'cancelled'].includes(conclusion)) {
    console.log(`ℹ️ Suite conclusion: ${conclusion} — no action`);
    return;
  }

  const { data: prs } = await safeApi(
    'pulls.list (open PRs)',
    () => github.rest.pulls.list({ owner, repo, state: 'open', per_page: 100 }),
    { data: [] },
  );
  const matchingPRs = prs.filter((pr) => pr.head.sha === headSha);

  if (matchingPRs.length === 0) {
    console.log(`No open PRs for SHA ${headSha}`);
    return;
  }

  for (const pr of matchingPRs) {
    const prNumber = pr.number;
    const currentLabels = await readCurrentLabels(github, safeApi, owner, repo, prNumber);
    const { addLabel, removeLabel } = makeLabelOps(github, owner, repo, prNumber, currentLabels);

    if (conclusion === 'success') {
      await addLabel('status:checks-passing');
      await removeLabel('status:checks-failing');
      console.log(`✅ PR #${prNumber}: checks PASSING`);
      if (currentLabels.includes('status:approved')) {
        await addLabel('status:ready-to-merge');
        await enableAutoMerge(github, owner, repo, prNumber, pr.node_id);
        console.log(`🚀 PR #${prNumber}: approved + passing = READY TO MERGE`);
      }
    } else if (['failure', 'timed_out'].includes(conclusion)) {
      await addLabel('status:checks-failing');
      for (const l of ['status:checks-passing', 'status:ready-to-merge']) await removeLabel(l);
      console.log(`❌ PR #${prNumber}: checks FAILING (${conclusion})`);
    }
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    await sleep(150);
  }
}

// ---------------------------------------------------------------------------
// MODE: check-run  (check_run completed)
// ---------------------------------------------------------------------------
async function runCheckRun(github, context) {
  const run = context.payload.check_run;
  const conclusion = run.conclusion;
  const headSha = run.head_sha;
  const { owner, repo } = context.repo;
  const safeApi = makeSafeApi(github);

  if (!conclusion || ['skipped', 'neutral', 'stale', 'action_required', 'cancelled'].includes(conclusion)) {
    console.log(`ℹ️ check_run conclusion: ${conclusion} — no action`);
    return;
  }

  const { data: prs } = await safeApi(
    'pulls.list (open PRs)',
    () => github.rest.pulls.list({ owner, repo, state: 'open', per_page: 100 }),
    { data: [] },
  );
  const matchingPRs = prs.filter((pr) => pr.head.sha === headSha);
  if (matchingPRs.length === 0) return;

  for (const pr of matchingPRs) {
    const prNumber = pr.number;

    // Fetch labels fresh first (prevents stale-cache race when multiple check_run events fire simultaneously)
    const currentLabels = await readCurrentLabels(github, safeApi, owner, repo, prNumber);
    const { addLabel, removeLabel } = makeLabelOps(github, owner, repo, prNumber, currentLabels);

    // Get full picture of ALL checks for this SHA before deciding
    const { failing, passing, pending } = await deriveCiState(github, safeApi, owner, repo, prNumber, headSha);

    if (failing.length > 0) {
      await addLabel('status:checks-failing');
      for (const l of ['status:checks-passing', 'status:ready-to-merge']) await removeLabel(l);
      console.log(`❌ PR #${prNumber}: ${failing.length} check(s) failing`);
    } else if (pending.length === 0 && passing.length > 0) {
      // All checks done and all passing
      await addLabel('status:checks-passing');
      await removeLabel('status:checks-failing');
      console.log(`✅ PR #${prNumber}: ALL checks PASSING`);
      if (currentLabels.includes('status:approved')) {
        await addLabel('status:ready-to-merge');
        await enableAutoMerge(github, owner, repo, prNumber, pr.node_id);
        console.log(`🚀 PR #${prNumber}: approved + passing = READY TO MERGE`);
      }
    } else {
      console.log(`⏳ PR #${prNumber}: ${pending.length} check(s) still running`);
    }
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    await sleep(150);
  }
}

// ---------------------------------------------------------------------------
// MODE: resync  (schedule / workflow_dispatch with blank pr_number)
// ---------------------------------------------------------------------------
async function runResync(github, context) {
  const { owner, repo } = context.repo;
  const safeApi = makeSafeApi(github);

  const { data: openPRs } = await safeApi(
    'pulls.list (open PRs)',
    () => github.rest.pulls.list({ owner, repo, state: 'open', per_page: 100 }),
    { data: [] },
  );
  console.log(`🔍 Re-syncing ${openPRs.length} open PRs...`);

  for (const pr of openPRs) {
    const prNumber = pr.number;
    try {
      const currentLabels = await readCurrentLabels(github, safeApi, owner, repo, prNumber);
      const { addLabel, removeLabel } = makeLabelOps(github, owner, repo, prNumber, currentLabels);

      // 1. Draft?
      if (pr.draft) {
        await addLabel('status:draft');
        for (const l of ALL_STATUS.filter((s) => s !== 'status:draft')) await removeLabel(l);
        console.log(`  PR #${prNumber}: DRAFT`);
        await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
        continue;
      }
      await removeLabel('status:draft');

      // 2. Review state — latest per-reviewer decision wins
      const { isApproved, needsChanges } = await deriveReviewState(github, safeApi, owner, repo, prNumber);

      if (needsChanges) {
        await addLabel('status:needs-action');
        for (const l of ['status:waiting-for-review', 'status:approved', 'status:ready-to-merge']) await removeLabel(l);
      } else if (isApproved) {
        await addLabel('status:approved');
        for (const l of ['status:waiting-for-review', 'status:needs-action']) await removeLabel(l);
      } else {
        await addLabel('status:waiting-for-review');
        for (const l of ['status:approved', 'status:needs-action', 'status:ready-to-merge']) await removeLabel(l);
      }

      // 3. CI state — full picture from check runs
      const { failing, passing, pending } = await deriveCiState(github, safeApi, owner, repo, prNumber, pr.head.sha);

      if (failing.length > 0) {
        await addLabel('status:checks-failing');
        for (const l of ['status:checks-passing', 'status:ready-to-merge']) await removeLabel(l);
        console.log(`  PR #${prNumber}: ❌ ${failing.length} check(s) failing`);
      } else if (pending.length === 0 && passing.length > 0) {
        await addLabel('status:checks-passing');
        await removeLabel('status:checks-failing');
        if (isApproved) {
          await addLabel('status:ready-to-merge');
          await enableAutoMerge(github, owner, repo, prNumber, pr.node_id);
          console.log(`  PR #${prNumber}: 🚀 READY TO MERGE`);
        } else {
          console.log(`  PR #${prNumber}: ✅ checks passing, awaiting approval`);
        }
      } else if (pending.length > 0) {
        console.log(`  PR #${prNumber}: ⏳ ${pending.length} check(s) still running`);
      } else {
        console.log(`  PR #${prNumber}: no check runs found`);
      }

      await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    } catch (err) {
      console.log(`  PR #${prNumber}: ⚠️ error — ${err.message}`);
    }
    await sleep(150);
  }
  console.log('✅ Re-sync complete');
}

// ---------------------------------------------------------------------------
// MODE: reevaluate  (workflow_dispatch with pr_number)
// ---------------------------------------------------------------------------
async function runReevaluate(github, context) {
  const rawPrNumber = (context.payload.inputs || {}).pr_number;
  const prNumber = parseInt(rawPrNumber, 10);
  if (Number.isNaN(prNumber) || prNumber <= 0) {
    // Fail fast with a friendly message — otherwise a NaN surfaces later as a
    // confusing API 404 from pulls.get.
    core.setFailed(`Invalid pr_number input: "${rawPrNumber}" — expected a positive integer PR number.`);
    return;
  }
  const { owner, repo } = context.repo;
  const safeApi = makeSafeApi(github);

  // Unguarded on purpose — a missing PR is a legitimate hard stop.
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
  const currentLabels = await readCurrentLabels(github, safeApi, owner, repo, prNumber);
  const { addLabel, removeLabel } = makeLabelOps(github, owner, repo, prNumber, currentLabels);

  // Clear all status labels first
  for (const l of ALL_STATUS) await removeLabel(l);

  if (pr.draft) {
    await addLabel('status:draft');
    console.log(`PR #${prNumber}: DRAFT`);
    await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
    return;
  }

  const { isApproved, needsChanges } = await deriveReviewState(github, safeApi, owner, repo, prNumber);

  if (needsChanges) {
    await addLabel('status:needs-action');
  } else if (isApproved) {
    await addLabel('status:approved');
  } else {
    await addLabel('status:waiting-for-review');
  }

  const { failing, passing, pending } = await deriveCiState(github, safeApi, owner, repo, prNumber, pr.head.sha);

  if (failing.length > 0) {
    await addLabel('status:checks-failing');
    console.log(`PR #${prNumber}: ${failing.length} check(s) failing`);
  } else if (pending.length === 0 && passing.length > 0) {
    await addLabel('status:checks-passing');
    if (isApproved) {
      await addLabel('status:ready-to-merge');
      await enableAutoMerge(github, owner, repo, prNumber, pr.node_id);
      console.log(`PR #${prNumber}: READY TO MERGE 🚀`);
    } else {
      console.log(`PR #${prNumber}: checks passing, awaiting approval`);
    }
  } else if (pending.length > 0) {
    console.log(`PR #${prNumber}: ${pending.length} check(s) still running`);
  }
  await upsertStatusBadge(github, owner, repo, prNumber, currentLabels);
  console.log(`PR #${prNumber} re-evaluated successfully`);
}

// ---------------------------------------------------------------------------
// Entry point — builds context from standard runner env vars (or CLI flags
// for local/client use) and dispatches to the mode. No github-script needed.
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Missing GH_TOKEN/GITHUB_TOKEN env var.');
    process.exit(1);
  }

  const [defOwner, defRepo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  const owner = args.owner || defOwner;
  const repo = args.repo || defRepo;
  if (!owner || !repo) {
    console.error('Missing repo: set GITHUB_REPOSITORY or pass --owner/--repo.');
    process.exit(1);
  }

  // Event payload: from the runner's payload file, or synthesized for local use.
  let payload = {};
  if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  }
  if (args.pr) payload = { ...payload, inputs: { ...(payload.inputs || {}), pr_number: String(args.pr) } };

  // Mode: explicit CLI arg wins; otherwise infer from the event name.
  const eventName = process.env.GITHUB_EVENT_NAME || '';
  let mode = args._[0];
  if (!mode) {
    mode = {
      pull_request: 'lifecycle',
      pull_request_review: 'review',
      check_suite: 'check-suite',
      check_run: 'check-run',
      schedule: 'resync',
      workflow_dispatch: (payload.inputs || {}).pr_number ? 'reevaluate' : 'resync',
    }[eventName];
  }

  const modes = {
    lifecycle: runLifecycle,
    review: runReview,
    'check-suite': runCheckSuite,
    'check-run': runCheckRun,
    resync: runResync,
    reevaluate: runReevaluate,
  };
  if (!modes[mode]) {
    console.error(`Unknown mode "${mode || eventName}". Use: ${Object.keys(modes).join(' | ')}`);
    process.exit(1);
  }

  const github = makeClient(token);
  const context = { repo: { owner, repo }, payload, eventName };
  console.log(`🎛️ PR State Orchestrator — mode: ${mode} — ${owner}/${repo}`);
  await modes[mode](github, context);
  if (process.exitCode) process.exit(process.exitCode);
}

if (require.main === module) {
  main().catch((e) => { console.error(`❌ Orchestrator failed: ${e.message}`); process.exit(1); });
}

module.exports = { runLifecycle, runReview, runCheckSuite, runCheckRun, runResync, runReevaluate };

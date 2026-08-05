#!/usr/bin/env node
'use strict';

/**
 * BIOME · medic — the crew's macrophage (immune cell).
 *
 * Credit-free, rule-based remediation. medic does NOT call any AI. Its default
 * remediations are deliberately storm-safe metadata operations (it never deletes
 * content — COMMENT-DONT-DELETE / RVS-AGENT-001):
 *   1. Re-surface stuck items by adding the `self-heal` label + a comment.
 *   2. When AI lanes are offline, clear dead `openrouter:needs-key` blocks so the
 *      rule-based lanes can pick the item back up (the block can never clear on
 *      its own while the key is wiped).
 *
 * Re-running failed workflow runs is OFF by default (it is storm-prone). It can be
 * enabled with caps.allowReruns and excludes BIOME's own workflows to avoid loops.
 *
 * Pure decision function exported for tests; CLI applies the plan.
 */

const DEFAULT_CAPS = { maxRelabels: 10, maxReruns: 3, allowReruns: false };

function decideRemediations({
  recentFailures = [],
  stuckIssues = [],
  keyBlockedIssues = [],
  aiLanesOffline = false,
  caps = DEFAULT_CAPS,
} = {}) {
  const c = { ...DEFAULT_CAPS, ...caps };

  const relabels = stuckIssues.slice(0, c.maxRelabels).map((it) => ({
    issue: it.number,
    add: ['self-heal'],
    remove: [],
    comment: 'biome-medic: re-surfacing stuck item for the self-healing loop (rule-based, credit-free).',
  }));

  // Dead key-blocks only clear when AI lanes are offline (otherwise the real
  // OpenRouter lane owns them). Removing a label is metadata, not content.
  const keyUnblocks = aiLanesOffline
    ? keyBlockedIssues.slice(0, c.maxRelabels).map((it) => ({
        issue: it.number,
        add: ['self-heal'],
        remove: ['openrouter:needs-key'],
        comment:
          'biome-medic: AI lanes are offline, so `openrouter:needs-key` can never clear on its own. ' +
          'Clearing the block (metadata only) and re-surfacing for the credit-free rule-based lanes.',
      }))
    : [];

  const reruns = c.allowReruns
    ? recentFailures
        .filter((f) => f.id != null && !String(f.path || '').includes('biome-'))
        .slice(0, c.maxReruns)
        .map((f) => ({ run_id: f.id, name: f.name, reason: 'recent failure — rule-based re-run' }))
    : [];

  return {
    relabels,
    keyUnblocks,
    reruns,
    capped: {
      relabels: stuckIssues.length > c.maxRelabels,
      keyUnblocks: aiLanesOffline && keyBlockedIssues.length > c.maxRelabels,
      reruns: c.allowReruns && recentFailures.length > c.maxReruns,
    },
  };
}

module.exports = { DEFAULT_CAPS, decideRemediations };

// --- CLI -------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    const { repoApi } = require('./gh');
    const { classifyRuns, detectStuckIssues } = require('./sentinel');
    const { assessKeyHealth } = require('./homeostat');

    const allowReruns = String(process.env.BIOME_ALLOW_RERUNS || '').toLowerCase() === 'true';

    // allowError: true — a single transient API error (rate limit, 5xx) here must
    // degrade this sweep gracefully, not crash the whole crew (see gh.js: allowError
    // callers get null back instead of a throw). Warn loudly so a degraded sweep is
    // never mistaken for "genuinely healthy".
    const runsResp = await repoApi('/actions/runs?per_page=100', { allowError: true });
    if (!runsResp) console.warn('[biome-medic] warning: failed to fetch recent workflow runs (API error) — treating as 0 runs for this sweep');
    const issuesRespRaw = await repoApi('/issues?state=open&per_page=100&filter=all', { allowError: true });
    if (!issuesRespRaw) console.warn('[biome-medic] warning: failed to fetch open issues (API error) — treating as 0 issues for this sweep');
    const issuesResp = issuesRespRaw || [];
    const runClass = classifyRuns((runsResp && runsResp.workflow_runs) || []);
    const stuck = detectStuckIssues(issuesResp, Date.now());
    const assessment = assessKeyHealth(process.env);

    const labelNames = (it) => (it.labels || []).map((l) => (typeof l === 'string' ? l : (l && l.name) || ''));
    const keyBlocked = issuesResp.filter(
      (it) => !it.pull_request && it.state === 'open' && labelNames(it).includes('openrouter:needs-key')
    );

    const plan = decideRemediations({
      recentFailures: runClass.recentFailures,
      stuckIssues: stuck,
      keyBlockedIssues: keyBlocked,
      aiLanesOffline: assessment.aiLanesOffline,
      caps: { allowReruns },
    });

    console.log(
      `[biome-medic] relabels=${plan.relabels.length} keyUnblocks=${plan.keyUnblocks.length} reruns=${plan.reruns.length} (allowReruns=${allowReruns})`
    );

    for (const action of [...plan.relabels, ...plan.keyUnblocks]) {
      if (action.remove && action.remove.length) {
        for (const lbl of action.remove) {
          await repoApi(`/issues/${action.issue}/labels/${encodeURIComponent(lbl)}`, {
            method: 'DELETE',
            allowError: true,
          });
        }
      }
      if (action.add && action.add.length) {
        await repoApi(`/issues/${action.issue}/labels`, { method: 'POST', body: { labels: action.add }, allowError: true });
      }
      if (action.comment) {
        await repoApi(`/issues/${action.issue}/comments`, { method: 'POST', body: { body: action.comment }, allowError: true });
      }
      console.log(`[biome-medic] remediated #${action.issue}`);
    }

    for (const r of plan.reruns) {
      await repoApi(`/actions/runs/${r.run_id}/rerun`, { method: 'POST', allowError: true });
      console.log(`[biome-medic] re-ran run ${r.run_id} (${r.name})`);
    }
  })().catch((err) => {
    console.error(`[biome-medic] error: ${err.message}`);
    process.exit(1);
  });
}

#!/usr/bin/env node
/**
 * Who: Codex lifecycle implementation agent. When: 2026-11-06.
 * Why: label reconciliation must run without the Actions scheduler/billing path.
 * What: deterministic GitHub state -> seven existing status labels, with a dry run.
 * Run on an existing host/timer; no npm install or LLM. Optional deterministic
 * status badge comments reuse the existing marker; merging is never performed.
 * On errors the process exits nonzero. Fix credentials/rate limits and rerun;
 * never substitute empty successful responses for failed state reads.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const MANAGED_LABELS = Object.freeze([
  'status:draft', 'status:waiting-for-review', 'status:approved',
  'status:needs-action', 'status:checks-failing', 'status:checks-passing',
  'status:ready-to-merge',
]);
const managed = new Set(MANAGED_LABELS);
const API = 'https://api.github.com';

export function validateRepo(repo) {
  if (typeof repo !== 'string' || !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repo) || repo.endsWith('/..')) {
    throw new Error('Use --repo owner/repository.');
  }
  return repo;
}
function positiveInteger(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new Error('PR number must be a positive integer.');
  }
  return Number(value);
}

export function labelPlan(snapshot) {
  const { pr, reviews, checks, statuses, summary } = snapshot;
  if (!pr || !Array.isArray(snapshot.labels) || !Array.isArray(reviews) || !Array.isArray(checks) || !Array.isArray(statuses)) {
    throw new Error('Incomplete snapshot; PR, labels, reviews, checks and statuses are required.');
  }
  if (!['open', 'closed'].includes(pr.state) || typeof pr.draft !== 'boolean' || !pr.head?.sha) {
    throw new Error('Malformed PR state; no label decision made.');
  }
  let desired = [];
  let reason = 'closed';
  if (pr.state === 'open' && pr.draft) {
    desired = ['status:draft'];
    reason = 'draft';
  } else if (pr.state === 'open') {
    // COMMENTED and PENDING are not review decisions. A later DISMISSED
    // replaces an earlier decision; an old-head approval cannot approve new code.
    const latestReviews = new Map();
    for (const review of [...reviews].sort((a, b) => (Date.parse(a.submitted_at) || 0) - (Date.parse(b.submitted_at) || 0) || a.id - b.id)) {
      if (review.user?.login && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) {
        latestReviews.set(review.user.login, review);
      }
    }
    const decisions = [...latestReviews.values()];
    const needsChanges = decisions.some(r => r.state === 'CHANGES_REQUESTED');
    const approved = !needsChanges && decisions.some(r => r.state === 'APPROVED' && r.commit_id === pr.head.sha);
    desired.push(needsChanges ? 'status:needs-action' : approved ? 'status:approved' : 'status:waiting-for-review');

    // GET check-runs uses filter=latest; collapse reruns by app/name rather than
    // retaining a failed previous attempt forever. Commit statuses are newest
    // per context. Missing/unknown conclusions are pending, never success.
    const latestChecks = new Map();
    for (const check of [...checks].sort((a, b) => a.id - b.id)) {
      latestChecks.set(`${check.app?.id ?? 'unknown'}:${check.name}`, check);
    }
    const latestStatuses = new Map();
    for (const status of [...statuses].sort((a, b) => a.id - b.id)) latestStatuses.set(status.context, status);
    const runs = [...latestChecks.values()];
    const contexts = [...latestStatuses.values()];
    const failing = runs.some(r => r.status === 'completed' && ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure', 'stale'].includes(r.conclusion)) || contexts.some(s => ['error', 'failure'].includes(s.state));
    const passing = runs.length + contexts.length > 0 && runs.every(r => r.status === 'completed' && ['success', 'neutral', 'skipped'].includes(r.conclusion)) && contexts.every(s => s.state === 'success');
    if (failing || summary?.rollupState === 'FAILURE' || summary?.rollupState === 'ERROR') desired.push('status:checks-failing');
    else if (passing && summary?.rollupState === 'SUCCESS') desired.push('status:checks-passing');

    // GitHub's server-side merge calculation accounts for required checks and
    // branch restrictions; a locally counted approval alone cannot establish it.
    // A label is only a snapshot, never permission to merge. This CLI cannot merge.
    if (approved && desired.includes('status:checks-passing') && summary?.headRefOid === pr.head.sha && summary?.mergeStateStatus === 'CLEAN' && summary?.reviewDecision === 'APPROVED') {
      desired.push('status:ready-to-merge');
    }
    reason = needsChanges ? 'changes-requested' : approved ? 'approved' : 'awaiting-review';
  }
  const current = snapshot.labels.map(l => typeof l === 'string' ? l : l.name);
  return {
    number: pr.number, head: pr.head.sha, reason, desired,
    add: desired.filter(l => !current.includes(l)),
    remove: current.filter(l => managed.has(l) && !desired.includes(l)),
  };
}

export function githubClient({ token, fetchImpl = globalThis.fetch } = {}) {
  const remaining = { core: Infinity, graphql: Infinity };
  async function request(path, { method = 'GET', body, absentOK = false } = {}) {
    // Only locally constructed paths are accepted. Never follow response URLs or
    // redirects with credentials; pagination below constructs the next page itself.
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid GitHub API path.');
    const resource = path === '/graphql' ? 'graphql' : 'core';
    if (remaining[resource] < 20) {
      const error = new Error('GitHub API remaining budget is below 20; wait for reset and rerun.');
      error.status = 429;
      throw error;
    }
    let response;
    try {
      response = await fetchImpl(`${API}${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'revvel-lifecycle-labels', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error(`GitHub ${method} request failed; check network access and rerun.`);
    }
    const budget = response.headers?.get('x-ratelimit-remaining');
    if (budget !== null && budget !== undefined && /^\d+$/.test(budget)) remaining[resource] = Number(budget);
    if (absentOK && response.status === 404) return null;
    if (!response.ok) {
      // Do not echo arbitrary remote response bodies or request headers: these can
      // contain credentials. Rate limits are surfaced, never retried in a hot loop.
      const error = new Error(`GitHub ${method} HTTP ${response.status}; check token permissions, rate limits and repository access, then rerun.`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    try { return await response.json(); } catch { throw new Error('GitHub returned invalid JSON; rerun after service recovery.'); }
  }
  async function pages(path, key) {
    const result = [];
    for (let page = 1; page <= 1000; page++) {
      const data = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      const rows = key ? data[key] : data;
      if (!Array.isArray(rows)) throw new Error('GitHub returned an incomplete paginated response.');
      result.push(...rows);
      if (rows.length < 100) return result;
    }
    throw new Error('Pagination exceeded 1000 pages; narrow the run to a PR.');
  }
  return { request, pages };
}

export async function readSnapshot(client, repo, number) {
  validateRepo(repo); positiveInteger(number);
  const base = `/repos/${repo}`;
  const pr = await client.request(`${base}/pulls/${number}`);
  const labels = await client.pages(`${base}/issues/${number}/labels`);
  if (pr.state === 'closed' || pr.draft) return { pr, labels, reviews: [], checks: [], statuses: [], summary: null };
  if (!/^[a-f0-9]{40,64}$/i.test(pr.head?.sha || '')) throw new Error('Invalid commit SHA in GitHub response.');
  const sha = pr.head.sha;
  const reviews = await client.pages(`${base}/pulls/${number}/reviews`);
  const checks = await client.pages(`${base}/commits/${sha}/check-runs?filter=latest`, 'check_runs');
  const statuses = await client.pages(`${base}/commits/${sha}/statuses`);
  const [owner, name] = repo.split('/');
  const data = await client.request('/graphql', { method: 'POST', body: {
    query: 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid mergeStateStatus reviewDecision commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}',
    variables: { owner, name, number },
  } });
  const node = data.data?.repository?.pullRequest;
  if (data.errors?.length || !node) throw new Error('GitHub merge-state query failed; check token permissions and retry.');
  const summary = { ...node, rollupState: node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state ?? null };
  if (node.headRefOid !== sha) throw new Error(`PR #${number} changed during read; rerun with fresh state.`);
  return { pr, labels, reviews, checks, statuses, summary };
}

export const BADGE_MARKER = '<!-- revvel-status-badge -->';
const BADGES = {
  'status:draft': ['draft', 'BFD4F2', '🚧 This PR is a **draft** and not yet ready for review.'],
  'status:waiting-for-review': ['waiting for review', '0075CA', '👀 This PR is **awaiting review**.'],
  'status:approved': ['approved', '0E8A16', '✅ This PR is **approved**.'],
  'status:needs-action': ['needs action', 'E4E669', '🔧 This PR has **changes requested** and needs action.'],
  'status:checks-failing': ['checks failing', 'D93F0B', '❌ CI checks are **failing** — please investigate.'],
  'status:checks-passing': ['checks passing', '0E8A16', '✅ CI checks are **passing**.'],
  'status:ready-to-merge': ['ready to merge', '6F42C1', '🚀 Approved + passing; GitHub currently reports this PR **ready to merge**.'],
  closed: ['closed', '6E7781', 'This PR is **closed without merging**.'],
  merged: ['merged', '8250DF', 'This PR is **merged**.'],
};
// Keep the existing badge vocabulary. Changes requested outrank stale approval;
// ready is already derived from complete current checks and GitHub merge state.
const BADGE_PRIORITY = ['status:ready-to-merge', 'status:checks-failing', 'status:needs-action', 'status:approved', 'status:waiting-for-review', 'status:draft', 'status:checks-passing'];
export function badgeBody(snapshot, desired = labelPlan(snapshot).desired) {
  const key = snapshot.pr.state === 'closed' ? (snapshot.pr.merged || snapshot.pr.merged_at ? 'merged' : 'closed') : BADGE_PRIORITY.find(label => desired.includes(label));
  if (!key) throw new Error('No deterministic badge state could be established.');
  const [label, color, text] = BADGES[key];
  return `${BADGE_MARKER}\n![status](https://img.shields.io/badge/status-${encodeURIComponent(label)}-${color}?style=flat-square) ${text}`;
}
export function parseBadgeAuthors(value) {
  const authors = typeof value === 'string' ? value.split(',').map(author => author.trim()).filter(Boolean) : value;
  if (!Array.isArray(authors) || !authors.length || authors.some(author => typeof author !== 'string' || !/^[A-Za-z0-9_-]+(?:\[bot\])?$/.test(author))) {
    throw new Error('--badges requires --badge-author login[,login] for the existing badge author and current token actor.');
  }
  return [...new Set(authors.map(author => author.toLowerCase()))];
}
export function planBadge(comments, body, badgeAuthors) {
  const authors = parseBadgeAuthors(badgeAuthors);
  const markers = comments.filter(comment => typeof comment.body === 'string' && comment.body.startsWith(BADGE_MARKER));
  if (markers.length > 1) throw new Error('Multiple status badge comments exist; select one owner-managed badge before retrying.');
  const existing = markers[0];
  if (existing && !authors.includes(existing.user?.login?.toLowerCase())) {
    throw new Error('Existing badge belongs to an unconfigured author; inspect it and configure --badge-author before updating.');
  }
  if (existing && !Number.isSafeInteger(existing.id)) throw new Error('Badge comment has an invalid ID.');
  // Fingerprint what was read as well as the desired result. Otherwise an owner
  // edit between scans would still look like the same update and be overwritten.
  const previousBodySha256 = existing ? createHash('sha256').update(existing.body).digest('hex') : null;
  return { action: existing ? existing.body === body ? 'unchanged' : 'update' : 'create', commentId: existing?.id ?? null, previousBodySha256, body };
}
async function writeBadge(client, repo, number, plan, badgeAuthors) {
  const path = `/repos/${repo}/issues/${number}/comments`;
  // A repeated run updates the same known comment. Never edit a lookalike marker
  // from another account, and never create a second badge beside one we cannot own.
  const latest = planBadge(await client.pages(path), plan.body, badgeAuthors);
  if (JSON.stringify(latest) !== JSON.stringify(plan)) throw new Error(`PR #${number} badge changed before write; rerun.`);
  if (plan.action === 'unchanged') return { ...plan, applied: false };
  const result = await client.request(plan.action === 'create' ? path : `/repos/${repo}/issues/comments/${plan.commentId}`, {
    method: plan.action === 'create' ? 'POST' : 'PATCH', body: { body: plan.body },
  });
  if (!result || !parseBadgeAuthors(badgeAuthors).includes(result.user?.login?.toLowerCase())) {
    throw new Error(`PR #${number} badge may have been written by an unconfigured token actor; inspect the comment and add its login to --badge-author.`);
  }
  const verified = planBadge(await client.pages(path), plan.body, badgeAuthors);
  if (verified.action !== 'unchanged') throw new Error(`PR #${number} badge verification failed; inspect competing writers and rerun.`);
  return { ...verified, action: plan.action, applied: true };
}

export async function reconcile(client, repo, number, { apply = false, badges = false, badgeAuthors } = {}) {
  if (badges) parseBadgeAuthors(badgeAuthors);
  const snapshot = await readSnapshot(client, repo, number);
  const plan = labelPlan(snapshot);
  const badge = badges ? planBadge(await client.pages(`/repos/${repo}/issues/${number}/comments`), badgeBody(snapshot, plan.desired), badgeAuthors) : null;
  if (!apply || (!plan.add.length && !plan.remove.length && (!badge || badge.action === 'unchanged'))) return { ...plan, applied: false, ...(badge ? { badge: { ...badge, applied: false } } : {}) };
  // Re-read the complete state, including labels, immediately before writes.
  // This catches head/review/check changes seen during the first API scan.
  const fresh = await readSnapshot(client, repo, number);
  const freshPlan = labelPlan(fresh);
  if (JSON.stringify(plan) !== JSON.stringify(freshPlan)) throw new Error(`PR #${number} changed before write; rerun.`);
  const base = `/repos/${repo}/issues/${number}/labels`;
  // Remove stale claims first. Never PUT the full label list: it would overwrite
  // labels concurrently added by Audrey or another automation.
  for (const label of plan.remove) await client.request(`${base}/${encodeURIComponent(label)}`, { method: 'DELETE', absentOK: true });
  if (plan.add.length) await client.request(base, { method: 'POST', body: { labels: plan.add } });
  const actual = (await client.pages(base)).map(l => l.name).filter(l => managed.has(l)).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...plan.desired].sort())) throw new Error(`PR #${number} label verification failed; check for competing writers and rerun.`);
  const after = await client.request(`/repos/${repo}/pulls/${number}`);
  if (after.head?.sha !== plan.head || after.state !== snapshot.pr.state || after.draft !== snapshot.pr.draft) throw new Error(`PR #${number} changed during write; labels may be stale, rerun now.`);
  const badgeResult = badge ? await writeBadge(client, repo, number, badge, badgeAuthors) : null;
  return { ...plan, applied: true, ...(badgeResult ? { badge: badgeResult } : {}) };
}

/** Include recently closed PRs so the timer clears their former status claims.
 * This bounded sweep costs one page on quiet repositories. A PR closed before
 * the window needs an explicit --pr run; no hidden claim of all-history repair.
 */
export async function discoverPrNumbers(client, repo, { closedDays = 7, now = Date.now() } = {}) {
  validateRepo(repo);
  if (!Number.isInteger(closedDays) || closedDays < 0 || closedDays > 365) throw new Error('--closed-days must be an integer from 0 to 365.');
  const numbers = (await client.pages(`/repos/${repo}/pulls?state=open`)).map(pr => positiveInteger(pr.number));
  if (closedDays > 0) {
    const cutoff = now - closedDays * 86400000;
    let complete = false;
    for (let page = 1; page <= 1000; page++) {
      const rows = await client.request(`/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`);
      if (!Array.isArray(rows)) throw new Error('GitHub returned an incomplete closed-PR list.');
      for (const pr of rows) {
        const updated = Date.parse(pr.updated_at);
        if (!Number.isFinite(updated)) throw new Error('Closed PR has an invalid updated_at date.');
        if (updated < cutoff) { complete = true; break; }
        numbers.push(positiveInteger(pr.number));
      }
      if (complete || rows.length < 100) { complete = true; break; }
    }
    if (!complete) throw new Error('Closed-PR pagination exceeded 1000 pages; narrow --closed-days.');
  }
  return [...new Set(numbers)];
}

export async function runBatch(client, repo, numbers, { apply = false, badges = false, badgeAuthors, report = entry => console.log(JSON.stringify(entry)) } = {}) {
  let failures = 0;
  for (const number of numbers) {
    try { report(await reconcile(client, repo, number, { apply, badges, badgeAuthors })); }
    catch (error) {
      report({ number, applied: apply ? null : false, mayHaveChanged: apply, error: error.message });
      failures++;
      // One racing PR must not starve the rest. Authentication and exhausted
      // budgets affect the whole run, so stop instead of hammering the API.
      if ([401, 403, 429].includes(error.status)) throw error;
    }
  }
  if (failures) throw new Error(`${failures} PR reconciliation(s) failed; inspect the per-PR receipts and rerun.`);
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--badges') options.badges = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (['--repo', '--pr', '--snapshot', '--closed-days', '--badge-author'].includes(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}.`);
      options[arg.slice(2)] = argv[++i];
    } else if (arg === '--help') {
      console.log('Usage: node scripts/pr-lifecycle-labels.mjs --repo owner/repo [--pr N] [--closed-days 7] [--badges --badge-author login[,login]] [--apply]\n       node scripts/pr-lifecycle-labels.mjs --snapshot file.json\nDry run is default. Live queries require GH_TOKEN or GITHUB_TOKEN (GraphQL).');
      return;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.snapshot) {
    if (options.apply) throw new Error('Snapshot mode cannot apply labels.');
    const snapshot = JSON.parse(await readFile(options.snapshot, 'utf8'));
    const plan = labelPlan(snapshot);
    console.log(JSON.stringify({ ...plan, ...(options.badges ? { badgeBody: badgeBody(snapshot, plan.desired) } : {}) }, null, 2));
    return;
  }
  if (options.badges) parseBadgeAuthors(options['badge-author']);
  validateRepo(options.repo);
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GH_TOKEN or GITHUB_TOKEN on the host; never put the token in command arguments.');
  const client = githubClient({ token });
  const numbers = options.pr ? [positiveInteger(options.pr)] : await discoverPrNumbers(client, options.repo, { closedDays: options['closed-days'] === undefined ? 7 : Number(options['closed-days']) });
  // Sequential processing avoids burst writes and keeps each PR's receipt clear.
  await runBatch(client, options.repo, numbers, { apply: options.apply, badges: options.badges, badgeAuthors: options['badge-author'] });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

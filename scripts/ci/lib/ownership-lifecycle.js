// Who/When/Why/What: lifecycle specialist, 2026-11-15, Audrey. Add ownership
// validation to existing lifecycle invocations. This module only reads metadata
// and writes lifecycle labels/sticky comments; never executes candidate code.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { core } = require('./mini-github');
const o = require('./ownership');
const REGISTRY = path.resolve(__dirname, '../../../wr/agents/ownership.jsonl');
function readTrustedRegistry() {
  // Workflow checkout MUST be trusted default branch. Session CLI separately
  // reads that branch with gh; no PR-supplied path is ever used here.
  return o.parseJournal(fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, 'utf8') : '');
}
async function observeOwnership(github, context, candidate, { registry = readTrustedRegistry(), now = Date.now() } = {}) {
  const { owner, repo } = context.repo;
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: candidate.number });
  const { data: comments } = await github.rest.issues.listComments({ owner, repo, issue_number: pr.number });
  let record = null; let invalid = false; let flags = [];
  try {
    const records = registry.filter((r) => r.repo === `${owner}/${repo}` && r.task.pr === pr.number);
    for (const c of comments) {
      const r = o.parseRecord(c.body);
      if (r && r.owner.github.toLowerCase() === c.user?.login?.toLowerCase()) records.push(r);
    }
    // Body is a discovery index, never trusted instructions. Accept the author's
    // own claim or an assigned owner's index corroborated by their comment.
    const bodyRecords = String(pr.body || '').split(o.RECORD_MARKER).slice(1)
      .map((part) => o.parseRecord(o.RECORD_MARKER + part));
    for (const r of bodyRecords) {
      if (r.owner.github.toLowerCase() === pr.user?.login?.toLowerCase()
        || records.some((entry) => entry.id === r.id && entry.owner.github === r.owner.github)) records.push(r);
    }
    for (const r of records) {
      if (r.repo !== `${owner}/${repo}` || r.task.pr !== pr.number || r.task.ref !== pr.head?.ref) throw new Error('Ownership PR/ref binding mismatch');
    }
    const resolved = o.latestRecords(records);
    if (resolved.length > 1) throw new Error('Multiple ownership IDs claim the same PR; reconcile with owner');
    record = resolved[0] || null;
    if (record) o.assertValid(record, { now });
    flags = o.reasons(record, pr, now);
  } catch (e) {
    invalid = true; flags = ['invalid-ownership-schema-or-proof'];
    // Never echo untrusted record text into an executable log/command.
    core.warning(`PR #${pr.number}: invalid ownership metadata; recorded owner must repair schema/proof, no auto-retry.`);
  }
  const failed = invalid || flags.includes('proof-head-mismatch')
    || (!pr.draft && (flags.includes('missing-ownership') || flags.includes('empty-pr')));
  const body = o.alertBody(record, flags, pr);
  // Only update our own bot's metadata. A user may paste a marker but that does
  // not confer permission to overwrite their comment. Never touch status badges.
  const sticky = comments.find((c) => c.user?.login === 'github-actions[bot]' && c.body?.startsWith(o.ALERT_MARKER));
  if (sticky) {
    if (sticky.body !== body) await github.rest.issues.updateComment({ owner, repo, comment_id: sticky.id, body });
  } else if (flags.length > 0) {
    await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
  }
  if (flags.length > 0 && !(pr.labels || []).some((l) => l.name === 'status:needs-action')) {
    await github.rest.issues.addLabels({ owner, repo, issue_number: pr.number, labels: ['status:needs-action'] });
  }
  // Never clear another lifecycle component's needs-action label, arm auto-merge
  // or close a stale/empty task as fake completion. Owner review remains required.
  if (failed) core.setFailed(`PR #${pr.number}: Ownership completion gate blocked. Repair existing task metadata/proof; no new task or paid retry.`);
  return { pr: pr.number, record, flags, failed };
}
async function openPrs(github, owner, repo) {
  const out = [];
  for (let page = 1; page <= 1000; page++) {
    const { data } = await github.rest.pulls.list({ owner, repo, state: 'open', per_page: 100, page });
    if (!Array.isArray(data)) throw new Error('Open PR pagination schema failed');
    out.push(...data);
    if (data.length < 100) return out;
  }
  throw new Error('Open PR pagination budget exceeded; no incomplete lifecycle scan');
}
module.exports = { readTrustedRegistry, observeOwnership, openPrs };

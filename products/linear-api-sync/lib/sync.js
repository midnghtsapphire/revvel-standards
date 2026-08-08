'use strict';

/**
 * Linear API Synchronization — pure helpers.
 *
 * Used by:
 *   - products/linear-api-sync Next.js API routes + playground UI
 *   - scripts/linear-api-sync.js CLI
 *   - root tests/linear-api-sync.test.js
 *
 * Flow (mirrors the Agent Factory n8n blueprint):
 *   1. Receive a GitHub push webhook payload
 *   2. Extract Linear issue keys (e.g. ENG-105) from commit messages
 *   3. Build a Linear GraphQL mutation that marks the issue Done + comments
 *
 * Secrets (names only — never commit values):
 *   LINEAR_API_KEY, LINEAR_DONE_STATE_ID, GITHUB_WEBHOOK_SECRET
 */

const crypto = require('crypto');

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';

/** Match Linear-style keys: TEAM-123 (uppercase letters, hyphen, digits). */
const ISSUE_ID_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

/**
 * Extract unique Linear issue identifiers from free text (commit message, PR title, etc.).
 * @param {string} text
 * @returns {string[]}
 */
function extractLinearIssueIds(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const found = text.match(ISSUE_ID_RE) || [];
  return [...new Set(found)];
}

/**
 * Normalize a GitHub push webhook body into zero-or-more commit sync items.
 * Accepts either the raw GitHub payload or a playground-shaped object.
 *
 * @param {unknown} payload
 * @returns {Array<{
 *   issueIds: string[],
 *   commitMessage: string,
 *   author: string,
 *   url: string,
 *   sha: string,
 *   primaryIssueId: string | null
 * }>}
 */
function parseGithubPushPayload(payload) {
  if (!payload || typeof payload !== 'object') return [];

  /** @type {Record<string, unknown>} */
  const root = /** @type {Record<string, unknown>} */ (payload);
  // n8n webhook nodes nest the body under .body; GitHub delivers it at the root.
  const body =
    root.body && typeof root.body === 'object'
      ? /** @type {Record<string, unknown>} */ (root.body)
      : root;

  /** @type {Array<Record<string, unknown>>} */
  const commits = [];

  if (body.head_commit && typeof body.head_commit === 'object') {
    commits.push(/** @type {Record<string, unknown>} */ (body.head_commit));
  }

  if (Array.isArray(body.commits)) {
    for (const c of body.commits) {
      if (c && typeof c === 'object') commits.push(/** @type {Record<string, unknown>} */ (c));
    }
  }

  // Playground / CLI shape: { message, author, url, sha }
  if (typeof body.message === 'string') {
    commits.push({
      message: body.message,
      url: body.url,
      id: body.sha || body.id,
      author:
        typeof body.author === 'string'
          ? { name: body.author }
          : body.author && typeof body.author === 'object'
            ? body.author
            : { name: 'unknown' },
    });
  }

  const seen = new Set();
  /** @type {ReturnType<typeof parseGithubPushPayload>} */
  const out = [];

  for (const commit of commits) {
    const message = typeof commit.message === 'string' ? commit.message : '';
    const sha =
      (typeof commit.id === 'string' && commit.id) ||
      (typeof commit.sha === 'string' && commit.sha) ||
      '';
    const url = typeof commit.url === 'string' ? commit.url : '';
    const authorObj =
      commit.author && typeof commit.author === 'object'
        ? /** @type {Record<string, unknown>} */ (commit.author)
        : {};
    const author =
      (typeof authorObj.name === 'string' && authorObj.name) ||
      (typeof authorObj.username === 'string' && authorObj.username) ||
      (typeof authorObj.email === 'string' && authorObj.email) ||
      'unknown';

    const dedupeKey = `${sha}|${message}|${url}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const issueIds = extractLinearIssueIds(message);
    out.push({
      issueIds,
      commitMessage: message,
      author,
      url,
      sha,
      primaryIssueId: issueIds[0] || null,
    });
  }

  return out;
}

/**
 * Keep only commits that reference at least one Linear issue.
 * @param {ReturnType<typeof parseGithubPushPayload>} items
 */
function filterCommitsWithIssues(items) {
  return items.filter((item) => item.issueIds.length > 0);
}

/**
 * Build the GraphQL document + variables used to mark an issue Done and leave a sync comment.
 *
 * @param {{
 *   issueId: string,
 *   commentText: string,
 *   doneStateId?: string | null,
 * }} opts
 */
function buildLinearSyncMutation(opts) {
  const issueId = String(opts.issueId || '').trim();
  const commentText = String(opts.commentText || '').trim();
  const doneStateId =
    opts.doneStateId == null || opts.doneStateId === ''
      ? null
      : String(opts.doneStateId).trim();

  if (!issueId) {
    throw new Error('issueId is required');
  }
  if (!commentText) {
    throw new Error('commentText is required');
  }

  // When no Done state is configured we only post a comment (safe default).
  if (!doneStateId) {
    return {
      query: `mutation AgentFactoryComment($id: String!, $commentText: String!) {
  commentCreate(input: { issueId: $id, body: $commentText }) {
    success
    comment { id url }
  }
}`,
      variables: { id: issueId, commentText },
      mode: /** @type {const} */ ('comment-only'),
    };
  }

  return {
    query: `mutation AgentFactorySync($id: String!, $commentText: String!, $stateId: String!) {
  issueUpdate(id: $id, input: { stateId: $stateId }) {
    success
    issue { id identifier url state { id name } }
  }
  commentCreate(input: { issueId: $id, body: $commentText }) {
    success
    comment { id url }
  }
}`,
    variables: { id: issueId, commentText, stateId: doneStateId },
    mode: /** @type {const} */ ('state-and-comment'),
  };
}

/**
 * Default comment body used by the Agent Factory automation.
 * @param {{ commitMessage: string, author: string, url: string, sha?: string }} item
 */
function buildSyncCommentText(item) {
  const lines = [
    'Automated Synchronization Success via Agent Factory Platform.',
    '',
    `**Commit:** ${item.commitMessage.split('\n')[0]}`,
    `**Author:** ${item.author}`,
  ];
  if (item.url) lines.push(`**URL:** ${item.url}`);
  if (item.sha) lines.push(`**SHA:** \`${item.sha}\``);
  lines.push('', '_Healed / shipped code linked from the repository push webhook._');
  return lines.join('\n');
}

/**
 * Prepare every Linear update that should fire for a parsed push payload.
 * @param {unknown} payload
 * @param {{ doneStateId?: string | null }} [opts]
 */
function planLinearUpdates(payload, opts = {}) {
  const items = filterCommitsWithIssues(parseGithubPushPayload(payload));
  /** @type {Array<{
   *   issueId: string,
   *   commitMessage: string,
   *   author: string,
   *   url: string,
   *   sha: string,
   *   commentText: string,
   *   mutation: ReturnType<typeof buildLinearSyncMutation>
   * }>} */
  const plans = [];

  for (const item of items) {
    const commentText = buildSyncCommentText(item);
    for (const issueId of item.issueIds) {
      plans.push({
        issueId,
        commitMessage: item.commitMessage,
        author: item.author,
        url: item.url,
        sha: item.sha,
        commentText,
        mutation: buildLinearSyncMutation({
          issueId,
          commentText,
          doneStateId: opts.doneStateId,
        }),
      });
    }
  }

  return plans;
}

/**
 * POST a GraphQL mutation to Linear.
 * @param {{
 *   apiKey: string,
 *   query: string,
 *   variables: Record<string, string>,
 *   fetchImpl?: typeof fetch,
 *   endpoint?: string,
 * }} args
 */
async function executeLinearGraphql(args) {
  const fetchImpl = args.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available in this runtime');
  }
  const apiKey = String(args.apiKey || '').trim();
  if (!apiKey) throw new Error('LINEAR_API_KEY is required for live Linear calls');

  const endpoint = args.endpoint || LINEAR_GRAPHQL_URL;
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: args.query, variables: args.variables }),
  });

  const text = await res.text();
  /** @type {unknown} */
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Linear API returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`Linear API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const errList =
    json && typeof json === 'object' && Array.isArray(/** @type {any} */ (json).errors)
      ? /** @type {any} */ (json).errors
      : null;
  if (errList && errList.length) {
    const msg = errList.map((e) => e.message || String(e)).join('; ');
    throw new Error(`Linear GraphQL errors: ${msg}`);
  }

  return json;
}

/**
 * Run planned updates. When dryRun is true (default), no network calls are made.
 * @param {unknown} payload
 * @param {{
 *   apiKey?: string | null,
 *   doneStateId?: string | null,
 *   dryRun?: boolean,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
async function syncGithubPayloadToLinear(payload, opts = {}) {
  const dryRun = opts.dryRun !== false;
  const plans = planLinearUpdates(payload, { doneStateId: opts.doneStateId });

  if (dryRun) {
    return {
      dryRun: true,
      planned: plans.length,
      results: plans.map((p) => ({
        issueId: p.issueId,
        mode: p.mutation.mode,
        status: 'planned',
        commentText: p.commentText,
        variables: p.mutation.variables,
      })),
    };
  }

  if (!opts.apiKey) {
    throw new Error('LINEAR_API_KEY is required when dryRun=false');
  }

  /** @type {Array<Record<string, unknown>>} */
  const results = [];
  for (const plan of plans) {
    try {
      const data = await executeLinearGraphql({
        apiKey: opts.apiKey,
        query: plan.mutation.query,
        variables: plan.mutation.variables,
        fetchImpl: opts.fetchImpl,
      });
      results.push({
        issueId: plan.issueId,
        mode: plan.mutation.mode,
        status: 'ok',
        data,
      });
    } catch (err) {
      results.push({
        issueId: plan.issueId,
        mode: plan.mutation.mode,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    dryRun: false,
    planned: plans.length,
    results,
  };
}

/**
 * Timing-safe compare for webhook secrets.
 * @param {string} a
 * @param {string} b
 */
function safeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) {
    const dummy = Buffer.alloc(left.length);
    crypto.timingSafeEqual(left, dummy);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

/**
 * Validate optional shared webhook secret.
 * When no secret is configured, validation passes (local/dev mode).
 * @param {{ configuredSecret?: string | null, providedSecret?: string | null }} args
 */
function verifyWebhookSecret(args) {
  const configured = (args.configuredSecret || '').trim();
  if (!configured) return { ok: true, reason: 'no-secret-configured' };
  const provided = (args.providedSecret || '').trim();
  if (!provided) return { ok: false, reason: 'missing-secret' };
  if (!safeEqualString(configured, provided)) return { ok: false, reason: 'mismatch' };
  return { ok: true, reason: 'matched' };
}

/**
 * Summarize config for the playground UI (never includes secret values).
 * @param {NodeJS.ProcessEnv} [env]
 */
function getPublicConfig(env = process.env) {
  return {
    hasLinearApiKey: Boolean((env.LINEAR_API_KEY || '').trim()),
    hasDoneStateId: Boolean((env.LINEAR_DONE_STATE_ID || '').trim()),
    hasWebhookSecret: Boolean((env.GITHUB_WEBHOOK_SECRET || '').trim()),
    linearEndpoint: LINEAR_GRAPHQL_URL,
    defaultDryRun: true,
  };
}

module.exports = {
  LINEAR_GRAPHQL_URL,
  ISSUE_ID_RE,
  extractLinearIssueIds,
  parseGithubPushPayload,
  filterCommitsWithIssues,
  buildLinearSyncMutation,
  buildSyncCommentText,
  planLinearUpdates,
  executeLinearGraphql,
  syncGithubPayloadToLinear,
  safeEqualString,
  verifyWebhookSecret,
  getPublicConfig,
};

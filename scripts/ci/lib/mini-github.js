// ============================================================================
// lib/mini-github.js — shared zero-dependency GitHub client + runner shims
// for all scripts/ci/* automation (METAL scripts-as-CI: logic in versioned
// scripts, runnable identically on hosted/self-hosted/laptop/client infra).
//
// Octokit-compatible shapes for the endpoints we use; errors carry
// { status, message } so 404/403 handling matches actions/github-script.
// NOTE: listForRef and listComments PAGINATE fully (the YAML originals used
// github.paginate in pr-check-status but only first-page in the orchestrator;
// with 166+ workflows a PR can have >100 check runs — first-page-only reads
// could misjudge state, so the shared client always collects all pages).
// ============================================================================
'use strict';

const core = {
  info: (m) => console.log(m),
  warning: (m) => console.log(`::warning::${m}`),
  setFailed: (m) => { console.log(`::error::${m}`); process.exitCode = 1; },
};

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

  // Collect every page. key: envelope field holding items (e.g. 'check_runs'),
  // or null for bare-array endpoints (comments).
  async function reqAll(path, key, params = {}) {
    const out = [];
    let page = 1;
    let total = null;
    for (;;) {
      const { data } = await req('GET', `${path}?${q({ ...params, per_page: 100, page })}`);
      const items = key ? (data[key] || []) : data;
      out.push(...items);
      if (key && typeof data.total_count === 'number') total = data.total_count;
      if (items.length < 100 || (total !== null && out.length >= total)) break;
      page++;
    }
    return { items: out, total };
  }

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
        listComments: async ({ owner, repo, issue_number }) => {
          const { items } = await reqAll(`/repos/${owner}/${repo}/issues/${issue_number}/comments`, null);
          return { data: items };
        },
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
        listForRef: async ({ owner, repo, ref }) => {
          const { items, total } = await reqAll(
            `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/check-runs`, 'check_runs');
          return { data: { check_runs: items, total_count: total } };
        },
        listSuitesForRef: ({ owner, repo, ref }) =>
          req('GET', `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/check-suites`),
      },
      repos: {
        getCombinedStatusForRef: ({ owner, repo, ref }) =>
          req('GET', `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/status`),
      },
      rateLimit: {
        get: () => req('GET', '/rate_limit'),
      },
    },
    graphql: (query, variables) => req('POST', '/graphql', { query, variables }),
  };
}

// Wrap fallible reads so a transient API error degrades to a warning instead
// of failing the whole run. Rate-limit 403s are expected under event storms.
function makeSafeApi() {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Shared entry-point helper: builds (github, context) from standard runner
// env vars or CLI flags, then dispatches to a mode.
//   node <script>.js <mode> [--owner O --repo R --pr N --payload file.json]
// ---------------------------------------------------------------------------
function runCli(modes, banner) {
  const fs = require('fs');
  const args = { _: [] };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
    else args._.push(argv[i]);
  }

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) { console.error('Missing GH_TOKEN/GITHUB_TOKEN env var.'); process.exit(1); }

  const [defOwner, defRepo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  const owner = args.owner || defOwner;
  const repo = args.repo || defRepo;
  if (!owner || !repo) {
    console.error('Missing repo: set GITHUB_REPOSITORY or pass --owner/--repo.');
    process.exit(1);
  }

  let payload = {};
  if (args.payload) {
    payload = JSON.parse(fs.readFileSync(args.payload, 'utf8'));
  } else if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  }
  if (args.pr) payload = { ...payload, inputs: { ...(payload.inputs || {}), pr_number: String(args.pr) } };

  const eventName = process.env.GITHUB_EVENT_NAME || '';
  const mode = args._[0] || modes._byEvent?.[eventName];
  if (!modes[mode]) {
    console.error(`Unknown mode "${mode || eventName}". Use: ${Object.keys(modes).filter((k) => k !== '_byEvent').join(' | ')}`);
    process.exit(1);
  }

  const github = makeClient(token);
  const context = {
    repo: { owner, repo }, payload, eventName,
    runId: Number(process.env.GITHUB_RUN_ID || 0),
  };
  console.log(`${banner} — mode: ${mode} — ${owner}/${repo}`);
  return modes[mode](github, context).then(() => {
    if (process.exitCode) process.exit(process.exitCode);
  });
}

module.exports = { makeClient, makeSafeApi, core, sleep, runCli };

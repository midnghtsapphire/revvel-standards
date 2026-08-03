#!/usr/bin/env node
'use strict';

// Looks up a Neon branch by exact name so the PR-cleanup workflow
// (.github/workflows/neon-branch.yml) can skip `delete-branch-action` when the
// branch is already gone — a long-lived PR outlives the 14-day branch expiry,
// and `neonctl branches delete` fails hard on a missing branch, turning routine
// cleanup into a red check.
//
// The listing endpoint is cursor-paginated (`pagination.next`), so a project
// with many branches would hide the one we want past page 1 and we would skip a
// delete that was actually needed, leaking a preview branch (and its cost)
// until expiry. Hence: follow every page, and narrow with `search` first.
//
// Exit codes (the workflow maps these to the `exists` step output):
//   0 — branch exists
//   3 — branch does not exist
//   1 — usage error, or the Neon API did not answer with 200 (bad key, outage);
//       cleanup must fail loudly in that case rather than silently "not found".
//
// Env: NEON_API_KEY, NEON_PROJECT_ID, NEON_BRANCH, optional NEON_API_HOST.

const DEFAULT_API_HOST = 'https://console.neon.tech/api/v2';
const PAGE_SIZE = 100;

class NeonApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NeonApiError';
  }
}

async function branchExists({
  apiKey,
  projectId,
  branchName,
  apiHost = DEFAULT_API_HOST,
  fetchImpl = globalThis.fetch,
}) {
  const seenCursors = new Set();
  let cursor = null;

  for (;;) {
    const url = new URL(`${apiHost.replace(/\/+$/, '')}/projects/${encodeURIComponent(projectId)}/branches`);
    url.searchParams.set('limit', String(PAGE_SIZE));
    // Partial name/id match — shrinks the result set on busy projects, but is
    // not a substitute for the exact comparison below.
    url.searchParams.set('search', branchName);
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetchImpl(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status !== 200) {
      throw new NeonApiError(
        `Neon API returned HTTP ${response.status} while listing branches for project ${projectId}`
      );
    }

    const body = await response.json();
    if (!Array.isArray(body.branches)) {
      throw new NeonApiError(
        `Neon API returned a malformed response (missing "branches" array) for project ${projectId}`
      );
    }
    const branches = body.branches;
    if (branches.some((branch) => branch && branch.name === branchName)) return true;

    const next = body.pagination && body.pagination.next;
    // Stop on an empty page, a missing cursor, or a cursor we already followed
    // (a repeated cursor would otherwise spin forever).
    if (branches.length === 0 || !next || seenCursors.has(next)) return false;
    seenCursors.add(next);
    cursor = next;
  }
}

async function main() {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  const branchName = process.env.NEON_BRANCH;

  for (const [name, value] of Object.entries({
    NEON_API_KEY: apiKey,
    NEON_PROJECT_ID: projectId,
    NEON_BRANCH: branchName,
  })) {
    if (!value) {
      console.error(`${name} is required`);
      process.exit(1);
    }
  }

  const exists = await branchExists({
    apiKey,
    projectId,
    branchName,
    apiHost: process.env.NEON_API_HOST || DEFAULT_API_HOST,
  });
  process.exit(exists ? 0 : 3);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { branchExists, NeonApiError, DEFAULT_API_HOST, PAGE_SIZE };

#!/usr/bin/env node
'use strict';

/**
 * BIOME — minimal credit-free GitHub REST helper.
 *
 * Uses ONLY the free, built-in GITHUB_TOKEN (or the ADMIN_GITHUB_TOKEN PAT when
 * present). No OpenRouter / Anthropic / paid keys are ever required. This is the
 * shared I/O layer for every BIOME worker so the crew keeps running even when
 * Doppler wipes the AI-lane secrets.
 */

const REPO = process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';
const [OWNER, NAME] = REPO.split('/');
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'biome-crew',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok && !options.allowError) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${options.method || 'GET'} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null; // empty body (e.g. 204-equivalent)
  // allowError + non-ok: a 5xx may return an HTML error page. Signal "no data"
  // (null) rather than throwing, so callers using allowError degrade gracefully.
  if (!res.ok) return null;
  try {
    return JSON.parse(text);
  } catch {
    // allowError callers opted into graceful degradation — hand them null
    // rather than throwing on an unexpected non-JSON body.
    if (options.allowError) return null;
    // Otherwise a successful response that isn't JSON is a genuine anomaly —
    // surface it instead of silently masking it as null (which callers read as
    // "no match").
    throw new Error(
      `GitHub API ${options.method || 'GET'} ${path} -> ${res.status} returned non-JSON: ${text.slice(0, 200)}`
    );
  }
}

function repoApi(path, options) {
  return api(`/repos/${OWNER}/${NAME}${path}`, options);
}

function hasToken() {
  return TOKEN.trim() !== '';
}

module.exports = { OWNER, NAME, REPO, hasToken, api, repoApi };

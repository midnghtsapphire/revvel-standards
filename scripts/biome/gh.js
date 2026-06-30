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
  return res.json().catch(() => null);
}

function repoApi(path, options) {
  return api(`/repos/${OWNER}/${NAME}${path}`, options);
}

function hasToken() {
  return TOKEN.trim() !== '';
}

module.exports = { OWNER, NAME, REPO, hasToken, api, repoApi };

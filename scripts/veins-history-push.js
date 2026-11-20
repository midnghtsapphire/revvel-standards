#!/usr/bin/env node
'use strict';

/**
 * veins-history-push — push the latest docs/veins-history.jsonl to GitHub.
 *
 * Purpose: `scripts/veins-state-log.js` appends a new row to
 * docs/veins-history.jsonl inside every CircleCI build, but those builds are
 * ephemeral. Without this script the JSONL only accumulates when someone
 * manually commits. This script pushes the file back via the GitHub Contents
 * API so the trend history persists across every push.
 *
 * Requirements:
 *   GITHUB_TOKEN (or ADMIN_GITHUB_TOKEN) with contents: write on this repo.
 *   CIRCLE_BRANCH must be "main" (enforced here — no history commits on PRs).
 *
 * Usage (in .circleci/config.yml):
 *   node scripts/veins-history-push.js
 *
 * Exit codes:
 *   0 — file pushed successfully, or skipped (non-main branch / no token).
 *   1 — push attempted but failed.
 *
 * What to check if it fails:
 *   - GITHUB_TOKEN not set → step prints "SKIPPED — no token" and exits 0.
 *   - 422 Conflict → another commit beat this one; pull and retry manually.
 *   - 403 → token lacks contents: write; switch to ADMIN_GITHUB_TOKEN.
 *
 * Loop-safety: the commit message contains "[skip ci]" so GitHub Actions
 * and CircleCI will not trigger a new build from this commit.
 */

const fs      = require('fs');
const path    = require('path');
const https   = require('https');

const HISTORY_PATH = path.join(process.cwd(), 'docs', 'veins-history.jsonl');

// Repo identity — read from env vars set by CircleCI.
const CIRCLE_BRANCH        = process.env.CIRCLE_BRANCH || '';
const CIRCLE_PROJECT_REPONAME = process.env.CIRCLE_PROJECT_REPONAME || 'revvel-standards';
const CIRCLE_PROJECT_USERNAME = process.env.CIRCLE_PROJECT_USERNAME || 'midnghtsapphire';
const TOKEN = process.env.ADMIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
const OWNER = CIRCLE_PROJECT_USERNAME;
const REPO  = CIRCLE_PROJECT_REPONAME;

function skip(reason) {
  console.log(`[veins-history-push] SKIPPED — ${reason}`);
  process.exitCode = 0;
}

function fail(reason, err) {
  console.error(`[veins-history-push] FAILED — ${reason}`);
  if (err) console.error(err);
  process.exitCode = 1;
}

/** Minimal GitHub API request (no deps — node built-ins only). */
function ghRequest(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path:     urlPath,
      method,
      headers: {
        'User-Agent':    'veins-history-push/1.0',
        'Authorization': `token ${token}`,
        'Accept':        'application/vnd.github+json',
        'Content-Type':  'application/json',
      },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  if (!TOKEN) return skip('no GITHUB_TOKEN or ADMIN_GITHUB_TOKEN set');
  if (CIRCLE_BRANCH !== 'main') return skip(`branch is "${CIRCLE_BRANCH}", only runs on main`);
  if (!fs.existsSync(HISTORY_PATH)) return skip('docs/veins-history.jsonl not found');

  const content = fs.readFileSync(HISTORY_PATH, 'utf8');

  // 1. Get the current file SHA (required for PUT).
  const getPath = `/repos/${OWNER}/${REPO}/contents/docs/veins-history.jsonl`;
  const getResp = await ghRequest('GET', getPath, null, TOKEN);

  if (getResp.status !== 200) {
    return fail(`GET ${getPath} returned HTTP ${getResp.status}`, getResp.body);
  }

  const remoteSha     = getResp.body.sha;
  const remoteContent = Buffer.from(getResp.body.content || '', 'base64').toString('utf8');

  if (remoteContent.trim() === content.trim()) {
    console.log('[veins-history-push] No change — remote matches local. Nothing to push.');
    process.exitCode = 0;
    return;
  }

  // 2. Push the updated file.
  const encoded = Buffer.from(content, 'utf8').toString('base64');
  const putBody = {
    message: 'chore(veins): monitoring snapshot [skip ci]',
    content: encoded,
    sha:     remoteSha,
    branch:  'main',
    committer: {
      name:  'VEINS Monitor',
      email: 'veins-monitor@revvel-standards.local',
    },
  };

  const putResp = await ghRequest('PUT', getPath, putBody, TOKEN);

  if (putResp.status === 200 || putResp.status === 201) {
    const sha = putResp.body && putResp.body.commit && putResp.body.commit.sha;
    console.log(`[veins-history-push] Pushed docs/veins-history.jsonl — commit ${sha || '(unknown)'}`);
    process.exitCode = 0;
  } else {
    fail(`PUT returned HTTP ${putResp.status}`, putResp.body);
  }
})().catch((err) => fail('unexpected error', err));

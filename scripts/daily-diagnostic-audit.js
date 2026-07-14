#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Bounded code-level bug diagnosis:
 *  - Scope: files changed on main in the last 48h, restricted to
 *    .github/workflows/*.yml and scripts/*.js (capped at MAX_SCOPE_FILES).
 *  - Uses one OpenRouter call (review profile) to diagnose one bug.
 *  - Files at most ONE [WR] issue per run when confidence is medium/high.
 *  - Fail-open on missing keys, LLM errors, or parse failures.
 *
 * NEVER auto-fixes, NEVER opens a PR, NEVER auto-merges.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const MAX_SCOPE_FILES = 8;
const WINDOW_HOURS = 48;
const REPO = process.env.GITHUB_REPOSITORY || '';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const OR_KEY = process.env.OPENROUTER_API_KEY || '';

function log(msg) {
  console.log(`[daily-diagnostic-audit] ${msg}`);
}
function warn(msg) {
  console.warn(`[daily-diagnostic-audit] WARN: ${msg}`);
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    warn(`command failed: ${cmd} -> ${err.message}`);
    return '';
  }
}

function getChangedFiles() {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
  const raw = sh(`git log --since="${since}" --name-only --pretty=format: origin/main 2>/dev/null || git log --since="${since}" --name-only --pretty=format:`);
  if (!raw) return [];
  const files = Array.from(new Set(raw.split('\n').map(s => s.trim()).filter(Boolean)));
  const filtered = files.filter(f =>
    (f.startsWith('.github/workflows/') && f.endsWith('.yml')) ||
    (f.startsWith('scripts/') && f.endsWith('.js'))
  ).filter(f => {
    try { return fs.statSync(f).isFile(); } catch { return false; }
  });
  return filtered.slice(0, MAX_SCOPE_FILES);
}

const EMBEDDED_PLAYBOOK = `
Audit method: read each file top-to-bottom, look for these 8 recurring patterns:
1. Missing continue-on-error / allowError on non-critical steps that gate downstream logic.
2. Unguarded label race conditions (label added then read without refetch).
3. Missing GITHUB_TOKEN / API token scoping (permissions: block absent or over-broad).
4. Exit code used as proxy metric (e.g., grep exit code treated as boolean signal without || true).
5. Unpinned action versions on security-sensitive steps.
6. Silent JSON.parse without try/catch on untrusted input.
7. Shell interpolation of untrusted GitHub context (\${{ github.event.* }}) into run: blocks.
8. Cron collision or unbounded scheduled cost (missing timeout-minutes, no scope cap).
`;

function loadPlaybookContext() {
  const p = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').slice(0, 8000);
  } catch {}
  return EMBEDDED_PLAYBOOK;
}

function buildPrompt(files, playbook) {
  const fileBlocks = files.map(f => {
    let content = '';
    try { content = fs.readFileSync(f, 'utf8').slice(0, 12000); } catch {}
    return `--- FILE: ${f} ---\n${content}\n`;
  }).join('\n');

  const system = `You are a code auditor. Diagnose at most ONE concrete code-level bug in the provided files.

Rules:
- If you cannot ground a finding in the actual file content, respond with {"issueFound": false}.
- Do NOT manufacture findings. Do NOT guess.
- If confidence is low, still return issueFound: true with confidence: "low" — the caller will drop it.
- If you cannot construct a concrete fix, set proposedFix to "No clear fix — needs human investigation".

Respond with a single JSON object, no prose:
{
  "issueFound": boolean,
  "confidence": "high" | "medium" | "low",
  "file": "path/to/file",
  "lineHint": "approximate line or symbol",
  "title": "short imperative title",
  "diagnosis": "what is wrong and why",
  "proposedFix": "concrete change to make",
  "pattern": "which of the 8 catalog patterns (or 'other')"
}`;

  const user = `Audit playbook context:\n${playbook}\n\nFiles in scope:\n${fileBlocks}`;
  return { system, user };
}

function openrouterCall({ system, user }) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'anthropic/claude-opus-4',
      models: ['anthropic/claude-opus-4', 'deepseek/deepseek-r1'],
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: 1200,
    });
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OR_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed?.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (e) {
          warn(`openrouter parse failed: ${e.message}`);
          resolve('');
        }
      });
    });
    req.on('error', (e) => { warn(`openrouter request failed: ${e.message}`); resolve(''); });
    req.write(body);
    req.end();
  });
}

function parseDiagnosis(raw) {
  if (!raw) return null;
  // Strip code fences if present
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  // Extract first {...} block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    warn(`diagnosis JSON parse failed: ${e.message}`);
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d || d.issueFound !== true) return false;
  const conf = String(d.confidence || '').toLowerCase();
  if (conf !== 'high' && conf !== 'medium') return false;
  if (!d.file || !d.title || !d.diagnosis || !d.proposedFix) return false;
  return true;
}

function ghApi(method, urlPath, payload) {
  return new Promise((resolve) => {
    const body = payload ? JSON.stringify(payload) : null;
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GH_TOKEN}`,
        'User-Agent': 'daily-diagnostic-audit',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: null });
        }
      });
    });
    req.on('error', (e) => { warn(`github api failed: ${e.message}`); resolve({ status: 0, body: null }); });
    if (body) req.write(body);
    req.end();
  });
}

async function hasExistingOpenDiagnosis(file) {
  if (!REPO || !GH_TOKEN) return false;
  const q = encodeURIComponent(`repo:${REPO} is:issue is:open label:auto-diagnosed "${file}"`);
  const res = await ghApi('GET', `/search/issues?q=${q}`);
  if (res.status !== 200 || !res.body) return false;
  return (res.body.total_count || 0) > 0;
}

function renderWRBody(d) {
  const learnings = `## Learnings — What & Why

This WR was auto-filed by \`daily-diagnostic-audit.yml\` because a bounded
code-level audit flagged pattern **${d.pattern || 'other'}** in \`${d.file}\`
with confidence **${d.confidence}**.

- **Verify** the proposed fix against the current file — do not blindly apply.
- See \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\` for the 8-pattern catalog.
- If this represents a new recurring pattern, propose adding it to the catalog.
`;

  const body = `## Auto-diagnosed issue

**File:** \`${d.file}\`  
**Line hint:** ${d.lineHint || 'n/a'}  
**Pattern:** ${d.pattern || 'other'}  
**Confidence:** ${d.confidence}

### Diagnosis
${d.diagnosis}

### Proposed fix
${d.proposedFix}

<!-- LEARNINGS_PLACEHOLDER -->
${learnings}

---
_Filed by \`daily-diagnostic-audit.yml\`. Never auto-fixed, never auto-merged._
`;
  return body;
}

async function fileWR(d) {
  if (!REPO || !GH_TOKEN) {
    warn('missing REPO or GH_TOKEN — skipping issue creation');
    return null;
  }
  const title = `[WR] ${d.title}`;
  const body = renderWRBody(d);
  const res = await ghApi('POST', `/repos/${REPO}/issues`, {
    title,
    body,
    labels: ['WR', 'auto-diagnosed', 'daily-diagnostic-audit'],
  });
  if (res.status !== 201 || !res.body) {
    warn(`issue creation failed: status=${res.status}`);
    return null;
  }
  const issue = res.body;
  const comment = `@coding-agent — please verify the diagnosis above against the current file content before implementing. If the diagnosis is stale or wrong, close this WR with a note. If correct, follow the WR-PR pipeline (do not push to main directly).`;
  await ghApi('POST', `/repos/${REPO}/issues/${issue.number}/comments`, { body: comment });
  return issue;
}

async function main() {
  if (!OR_KEY) {
    warn('OPENROUTER_API_KEY missing — exiting 0 (fail-open)');
    return;
  }
  const files = getChangedFiles();
  if (files.length === 0) {
    log('no in-scope files changed in the last 48h — nothing to audit');
    return;
  }
  log(`scope: ${files.length} file(s) -> ${files.join(', ')}`);

  const playbook = loadPlaybookContext();
  const prompt = buildPrompt(files, playbook);
  const raw = await openrouterCall(prompt);
  if (!raw) {
    warn('empty response from openrouter — exiting');
    return;
  }
  const diagnosis = parseDiagnosis(raw);
  if (!diagnosis) {
    warn('could not parse diagnosis — exiting');
    return;
  }
  if (!isActionableDiagnosis(diagnosis)) {
    log(`diagnosis not actionable (issueFound=${diagnosis.issueFound}, confidence=${diagnosis.confidence}) — no WR filed`);
    return;
  }
  const dup = await hasExistingOpenDiagnosis(diagnosis.file);
  if (dup) {
    log(`open auto-diagnosed WR already exists for ${diagnosis.file} — skipping`);
    return;
  }
  const issue = await fileWR(diagnosis);
  if (issue) log(`filed WR #${issue.number}: ${issue.title}`);
}

main().catch(err => {
  warn(`unhandled error: ${err.message}`);
  process.exit(0);
});

module.exports = {
  getChangedFiles,
  loadPlaybookContext,
  buildPrompt,
  parseDiagnosis,
  isActionableDiagnosis,
  renderWRBody,
};

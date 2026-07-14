#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Reads static file content of recently-changed workflow YAML and scripts,
 * asks an LLM (via OpenRouter) to diagnose a code-level bug in a bounded
 * scope, and files at most ONE `[WR]` issue with an embedded proposed fix
 * when it can ground a diagnosis at medium+ confidence.
 *
 * Never:
 *   - inspects Actions run history
 *   - inspects issue labels/state (except a best-effort duplicate check)
 *   - auto-fixes, opens a PR, or auto-merges
 *
 * Fail-open: any error logs a warning and exits 0.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WINDOW_HOURS = parseInt(process.env.WINDOW_HOURS || '48', 10);
const MAX_SCOPE_FILES = parseInt(process.env.MAX_SCOPE_FILES || '8', 10);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const MAX_FILE_BYTES = 24 * 1024;

function log(msg) {
  console.log(`[daily-diagnostic-audit] ${msg}`);
}
function warn(msg) {
  console.warn(`[daily-diagnostic-audit] WARN: ${msg}`);
}

/**
 * Return list of files changed on main in the last WINDOW_HOURS,
 * filtered to .github/workflows/*.yml and scripts/*.js, capped.
 */
function getRecentlyChangedFiles() {
  try {
    const since = `${WINDOW_HOURS} hours ago`;
    const raw = execSync(
      `git log --since="${since}" --name-only --pretty=format: -- .github/workflows scripts`,
      { encoding: 'utf8' }
    );
    const seen = new Set();
    const files = [];
    for (const line of raw.split('\n')) {
      const p = line.trim();
      if (!p) continue;
      if (seen.has(p)) continue;
      if (!/^\.github\/workflows\/.+\.ya?ml$/.test(p) && !/^scripts\/.+\.js$/.test(p)) continue;
      if (!fs.existsSync(p)) continue;
      seen.add(p);
      files.push(p);
      if (files.length >= MAX_SCOPE_FILES) break;
    }
    return files;
  } catch (err) {
    warn(`getRecentlyChangedFiles failed: ${err.message}`);
    return [];
  }
}

function loadPlaybookContext() {
  const p = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';
  try {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      return content.slice(0, 8000);
    }
  } catch (_) {}
  // Embedded 8-pattern catalog fallback
  return [
    'AUDIT PATTERN CATALOG (embedded fallback):',
    '1. Missing `continue-on-error` / `if: always()` where a soft step can fail the job.',
    '2. Unguarded label races (multiple workflows add/remove same label concurrently).',
    '3. Token/permission gaps (GITHUB_TOKEN used where PAT is required, or missing `permissions:` block).',
    '4. Exit code used as a proxy metric (e.g. `|| true` swallowing signal that should be counted).',
    '5. `if: github.event_name == "schedule"` guards missing on manual/workflow_dispatch paths.',
    '6. Unbounded scope (loops over full repo without cap; missing pagination limits).',
    '7. Secret drift: workflow references a secret not documented in SECRETS_MAP.',
    '8. Silent JSON.parse without try/catch on external/model responses.',
  ].join('\n');
}

function readFileBounded(p) {
  try {
    const stat = fs.statSync(p);
    const size = Math.min(stat.size, MAX_FILE_BYTES);
    const fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);
    fs.closeSync(fd);
    return buf.toString('utf8') + (stat.size > MAX_FILE_BYTES ? '\n... [truncated]' : '');
  } catch (err) {
    warn(`readFileBounded(${p}): ${err.message}`);
    return null;
  }
}

function buildPrompt(scopeFiles, playbook) {
  const fileSections = scopeFiles
    .map((f) => {
      const c = readFileBounded(f);
      if (c === null) return '';
      return `\n----- FILE: ${f} -----\n${c}\n`;
    })
    .join('\n');

  const system = [
    'You are a bounded static-code diagnostic auditor.',
    'You look ONLY at the file content provided. You do not have access to',
    'workflow run history, issues, or the wider internet.',
    '',
    'Your job: find AT MOST ONE real, code-level bug in the files below,',
    'grounded in the audit pattern catalog. If nothing grounds a diagnosis',
    'at medium or higher confidence, respond with issueFound: false. Do NOT',
    'manufacture findings. If you cannot ground a concrete fix, set',
    'proposedFix to the exact string "No clear fix — needs human investigation".',
    '',
    'Respond with a SINGLE JSON object (no prose, no code fences) matching:',
    '{',
    '  "issueFound": boolean,',
    '  "confidence": "high" | "medium" | "low",',
    '  "file": string,          // repo-relative path of the file with the bug',
    '  "title": string,         // short title suitable for a GitHub issue',
    '  "summary": string,       // 1-3 sentence description of the bug',
    '  "patternRef": string,    // which catalog pattern this maps to',
    '  "proposedFix": string,   // concrete fix (diff-like snippet OK) or the exact fallback string above',
    '  "reasoning": string      // why this is grounded in the file content',
    '}',
  ].join('\n');

  const user = [
    'AUDIT PATTERN CATALOG:',
    playbook,
    '',
    'FILES IN SCOPE (recently changed on main):',
    fileSections || '(none)',
  ].join('\n');

  return { system, user };
}

async function callOpenRouter(system, user) {
  const body = {
    model: 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
    max_tokens: 1200,
  };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/' + (GITHUB_REPOSITORY || ''),
      'X-Title': 'daily-diagnostic-audit',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter response missing content');
  return content;
}

function parseDiagnosis(raw) {
  try {
    // Strip code fences if the model added them despite instructions.
    const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (err) {
    warn(`parseDiagnosis failed: ${err.message}`);
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  if (!['high', 'medium'].includes(String(d.confidence).toLowerCase())) return false;
  if (!d.file || !d.title || !d.summary || !d.proposedFix) return false;
  return true;
}

async function ghApi(method, endpoint, body) {
  const url = `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'daily-diagnostic-audit',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GitHub ${method} ${endpoint} HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function hasExistingOpenDiagnosis(file) {
  try {
    const q = encodeURIComponent(
      `repo:${GITHUB_REPOSITORY} is:issue is:open label:auto-diagnosed "${file}" in:body`
    );
    const res = await fetch(`https://api.github.com/search/issues?q=${q}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'daily-diagnostic-audit',
      },
    });
    if (!res.ok) return false;
    const json = await res.json();
    return (json?.total_count || 0) > 0;
  } catch (err) {
    warn(`hasExistingOpenDiagnosis failed (fail-open): ${err.message}`);
    return false;
  }
}

function renderWrBody(d) {
  const learnings = [
    '## Learnings — What & Why',
    '',
    `This WR was auto-filed by \`daily-diagnostic-audit.yml\` because a static`,
    `read of \`${d.file}\` matched pattern **${d.patternRef || 'unclassified'}**`,
    `from \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\`.`,
    '',
    'Please **verify** (do not blindly apply) the proposed fix below, and',
    'consider whether this represents a new catalog-worthy pattern.',
  ].join('\n');

  const base = [
    `## Diagnosis`,
    '',
    d.summary,
    '',
    `**File:** \`${d.file}\``,
    `**Confidence:** ${d.confidence}`,
    `**Pattern:** ${d.patternRef || 'unclassified'}`,
    '',
    '## Proposed Fix',
    '',
    '```',
    d.proposedFix,
    '```',
    '',
    '## Reasoning',
    '',
    d.reasoning || '(none provided)',
    '',
    '<!-- LEARNINGS_PLACEHOLDER -->',
  ].join('\n');

  if (base.includes('<!-- LEARNINGS_PLACEHOLDER -->')) {
    return base.replace('<!-- LEARNINGS_PLACEHOLDER -->', learnings);
  }
  return base + '\n\n' + learnings;
}

async function fileWr(d) {
  const title = `[WR] ${d.title}`;
  const body = renderWrBody(d);
  const issue = await ghApi('POST', `/repos/${GITHUB_REPOSITORY}/issues`, {
    title,
    body,
    labels: ['auto-diagnosed', 'wr', 'daily-diagnostic-audit'],
  });
  const num = issue.number;
  log(`Filed WR #${num}: ${title}`);

  const coderComment = [
    '@coding-agent — please pick this up:',
    '',
    `1. Verify the diagnosis in \`${d.file}\` (do not trust it blindly).`,
    '2. If confirmed, apply the proposed fix (adapt as needed).',
    '3. Open a PR closing this issue. Follow the standard WR → PR flow.',
    '',
    '_Filed by daily-diagnostic-audit._',
  ].join('\n');
  try {
    await ghApi('POST', `/repos/${GITHUB_REPOSITORY}/issues/${num}/comments`, {
      body: coderComment,
    });
  } catch (err) {
    warn(`Comment failed on #${num}: ${err.message}`);
  }
  return num;
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY not set — exiting cleanly (fail-open).');
    return;
  }
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    warn('GITHUB_TOKEN or GITHUB_REPOSITORY missing — exiting cleanly.');
    return;
  }

  const scope = getRecentlyChangedFiles();
  log(`Scope: ${scope.length} file(s) changed in last ${WINDOW_HOURS}h`);
  if (scope.length === 0) {
    log('Quiet window — 0 API calls, 0 WRs. Done.');
    return;
  }

  const playbook = loadPlaybookContext();
  const { system, user } = buildPrompt(scope, playbook);

  let raw;
  try {
    raw = await callOpenRouter(system, user);
  } catch (err) {
    warn(`OpenRouter call failed (fail-open): ${err.message}`);
    return;
  }

  const diag = parseDiagnosis(raw);
  if (!diag) {
    warn('Could not parse diagnosis — exiting cleanly.');
    return;
  }
  if (!isActionableDiagnosis(diag)) {
    log(`No actionable diagnosis (issueFound=${diag.issueFound}, confidence=${diag.confidence}). Done.`);
    return;
  }

  if (await hasExistingOpenDiagnosis(diag.file)) {
    log(`Open auto-diagnosed WR already exists for ${diag.file} — skipping.`);
    return;
  }

  try {
    await fileWr(diag);
  } catch (err) {
    warn(`Filing WR failed: ${err.message}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    warn(`Unhandled: ${err.message}`);
    process.exit(0);
  });
}

module.exports = {
  getRecentlyChangedFiles,
  loadPlaybookContext,
  buildPrompt,
  parseDiagnosis,
  isActionableDiagnosis,
  renderWrBody,
};

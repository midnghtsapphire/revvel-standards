#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Runs once/day. Reads static content of recently-changed workflow YAML
 * and scripts, asks an LLM (via OpenRouter, `review` profile lane) to
 * diagnose a code-level bug, and — only when it can ground a diagnosis at
 * medium+ confidence — files ONE WR issue with an embedded proposed fix
 * plus a coder-facing comment.
 *
 * Fail-open everywhere: missing key, LLM error, parse error, dupe-check
 * failure all log a warning and exit 0.
 *
 * Never auto-fixes, never opens a PR, never auto-merges. Never inspects
 * actions/runs or issue state — only static file content.
 *
 * See standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md for the method and
 * the 8-entry fix-pattern catalog this is grounded in.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WINDOW_HOURS = parseInt(process.env.SCOPE_WINDOW_HOURS || '48', 10);
const MAX_SCOPE_FILES = parseInt(process.env.MAX_SCOPE_FILES || '8', 10);
const MAX_FILE_BYTES = 20_000;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL = 'anthropic/claude-3.5-sonnet';
const FALLBACK_MODEL = 'deepseek/deepseek-r1';

function log(msg) {
  console.log(`[daily-diagnostic-audit] ${msg}`);
}
function warn(msg) {
  console.warn(`[daily-diagnostic-audit] WARN: ${msg}`);
}

/**
 * Return list of in-scope files changed on main in the last WINDOW_HOURS.
 * Restricted to .github/workflows/*.yml and scripts/*.js.
 */
function selectScopeFiles() {
  let out;
  try {
    out = execSync(
      `git log --since="${WINDOW_HOURS} hours ago" --name-only --pretty=format: HEAD`,
      { encoding: 'utf8' }
    );
  } catch (e) {
    warn(`git log failed: ${e.message}`);
    return [];
  }
  const seen = new Set();
  for (const raw of out.split('\n')) {
    const p = raw.trim();
    if (!p) continue;
    if (!inScope(p)) continue;
    if (!fs.existsSync(p)) continue;
    seen.add(p);
  }
  return Array.from(seen).slice(0, MAX_SCOPE_FILES);
}

function inScope(p) {
  if (p.startsWith('.github/workflows/') && (p.endsWith('.yml') || p.endsWith('.yaml'))) return true;
  if (p.startsWith('scripts/') && p.endsWith('.js')) return true;
  return false;
}

function readFileClipped(p) {
  const buf = fs.readFileSync(p, 'utf8');
  if (buf.length <= MAX_FILE_BYTES) return buf;
  return buf.slice(0, MAX_FILE_BYTES) + `\n\n/* ...truncated at ${MAX_FILE_BYTES} bytes... */\n`;
}

function loadPlaybookContext() {
  const candidate = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';
  if (fs.existsSync(candidate)) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      return raw.slice(0, 8_000);
    } catch {
      /* fall through */
    }
  }
  // Embedded fallback: 8-entry fix-pattern catalog summary.
  return [
    'Audit fix-pattern catalog (embedded fallback):',
    '1. Missing `allowError`/`continue-on-error` on non-critical steps that cause whole-workflow failure.',
    '2. Unguarded label races — two workflows mutating the same label without concurrency: groups.',
    '3. Token gaps — using default GITHUB_TOKEN where cross-repo/admin scope needed, or vice versa (leaking admin unnecessarily).',
    '4. Exit-code used as a proxy metric — treating `exit 1` as "nothing to do" causing false failures.',
    '5. Missing timeout-minutes on long-running or LLM-calling jobs.',
    '6. Unpinned actions (@main / floating tags) in security-sensitive jobs.',
    '7. Secrets referenced in `env:` at workflow level rather than step level (broadens exposure).',
    '8. Cron collisions or thundering-herd (many jobs at :00 of the same hour) causing runner starvation.'
  ].join('\n');
}

function buildPrompt(files, playbook) {
  const fileBlocks = files
    .map((f) => `----- FILE: ${f.path} -----\n${f.content}\n----- END FILE -----`)
    .join('\n\n');
  const system = [
    'You are a code-level bug diagnostician for a GitHub Actions fleet.',
    'You will be given the CURRENT content of recently-changed workflow YAML and Node scripts.',
    'Your job: identify AT MOST ONE concrete code-level bug (not a style nit, not a speculative concern) that you can ground in the file text.',
    '',
    'STRICT RULES:',
    '- If you cannot ground a specific bug in the file text at MEDIUM or HIGH confidence, respond with issueFound=false. Do NOT manufacture findings.',
    '- If you can identify a bug but cannot ground a fix, set proposedFix to "No clear fix — needs human investigation" rather than guessing.',
    '- Prefer patterns from the audit playbook catalog below.',
    '- Output STRICT JSON only, no prose, no markdown fences.',
    '',
    'PLAYBOOK CONTEXT:',
    playbook,
    '',
    'RESPONSE SCHEMA (JSON object, single finding, no arrays):',
    '{',
    '  "issueFound": boolean,',
    '  "confidence": "low" | "medium" | "high",',
    '  "filePath": string | null,',
    '  "lineHint": string | null,',
    '  "category": string | null,',
    '  "title": string | null,',
    '  "diagnosis": string | null,',
    '  "proposedFix": string | null,',
    '  "reasoning": string | null',
    '}'
  ].join('\n');

  const user = `Files in scope (changed on main in last ${WINDOW_HOURS}h):\n\n${fileBlocks}`;

  return { system, user };
}

async function callOpenRouter({ system, user }, model) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.1,
    max_tokens: 1500
  };
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/',
      'X-Title': 'daily-diagnostic-audit'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned empty content');
  return content;
}

function parseDiagnosis(raw) {
  if (!raw) return null;
  // Strip common code fences if the model ignored the instruction.
  let s = String(raw).trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  }
  // Extract first {...} object if there's surrounding prose.
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    warn(`could not parse LLM JSON: ${e.message}`);
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  const c = String(d.confidence || '').toLowerCase();
  if (c !== 'medium' && c !== 'high') return false;
  if (!d.filePath || typeof d.filePath !== 'string') return false;
  if (!d.title || !d.diagnosis) return false;
  return true;
}

async function hasExistingOpenDiagnosis(repo, filePath, token) {
  try {
    const q = encodeURIComponent(
      `repo:${repo} is:issue is:open label:auto-diagnosed "${filePath}" in:body`
    );
    const res = await fetch(`https://api.github.com/search/issues?q=${q}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    });
    if (!res.ok) {
      warn(`dupe-check search failed: ${res.status}`);
      return false;
    }
    const json = await res.json();
    return (json.total_count || 0) > 0;
  } catch (e) {
    warn(`dupe-check error (fail-open): ${e.message}`);
    return false;
  }
}

function renderWrBody(d) {
  const learnings = [
    '## Learnings — What & Why',
    '',
    `This WR was auto-filed by \`daily-diagnostic-audit.yml\` because a scan of files changed on \`main\` in the last ${WINDOW_HOURS}h flagged **${d.filePath}** with **${d.confidence}** confidence.`,
    '',
    'Method and fix-pattern catalog: `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`.',
    '',
    '**Implementer:** please *verify* the proposed fix against the current file rather than blindly applying it, and consider whether this represents a new catalog-worthy pattern worth adding to the playbook.'
  ].join('\n');

  const core = [
    `## Diagnosis`,
    '',
    d.diagnosis || '(none)',
    '',
    `**File:** \`${d.filePath}\`` + (d.lineHint ? ` (${d.lineHint})` : ''),
    d.category ? `**Category:** ${d.category}` : '',
    '',
    '## Proposed Fix',
    '',
    d.proposedFix || 'No clear fix — needs human investigation',
    '',
    '## Reasoning',
    '',
    d.reasoning || '(none)',
    ''
  ]
    .filter(Boolean)
    .join('\n');

  // If the live template exposes a placeholder, substitute; else append.
  const PLACEHOLDER = '<!-- LEARNINGS_PLACEHOLDER -->';
  const templatePath = '.github/ISSUE_TEMPLATE/wr.md';
  let body;
  if (fs.existsSync(templatePath)) {
    try {
      const tmpl = fs.readFileSync(templatePath, 'utf8');
      if (tmpl.includes(PLACEHOLDER)) {
        body = tmpl.replace(PLACEHOLDER, `${core}\n${learnings}`);
      } else {
        body = `${core}\n\n${learnings}`;
      }
    } catch {
      body = `${core}\n\n${learnings}`;
    }
  } else {
    body = `${core}\n\n${learnings}`;
  }
  return body;
}

function renderCoderComment(d) {
  return [
    '@coding-agent — this WR was auto-filed by the daily diagnostic audit.',
    '',
    `Please open **\`${d.filePath}\`**, verify the diagnosis (do not assume it is correct — the model can be wrong), and if confirmed, apply the proposed fix in a PR that closes this issue.`,
    '',
    `Confidence: **${d.confidence}**. If your verification lowers this to "low" or "none", close this issue with a comment explaining why rather than filing a speculative PR.`
  ].join('\n');
}

async function createWrIssue(repo, token, d) {
  const title = `[WR] ${d.title}`;
  const body = renderWrBody(d);
  const labels = ['WR', 'auto-diagnosed', 'daily-diagnostic-audit'];
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body, labels })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`create issue failed ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

async function commentOnIssue(repo, token, number, body) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/${number}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`comment failed ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo) {
    warn('GITHUB_REPOSITORY not set — cannot file WR. Exiting 0.');
    return;
  }
  if (!process.env.OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY missing — no LLM call possible. Exiting 0 (fail-open).');
    return;
  }

  const scope = selectScopeFiles();
  if (scope.length === 0) {
    log('quiet 48h window: no in-scope files changed. 0 API calls, 0 WRs.');
    return;
  }
  log(`scope: ${scope.length} file(s) — ${scope.join(', ')}`);

  const files = scope.map((p) => ({ path: p, content: readFileClipped(p) }));
  const playbook = loadPlaybookContext();
  const prompt = buildPrompt(files, playbook);

  let raw;
  try {
    raw = await callOpenRouter(prompt, PRIMARY_MODEL);
  } catch (e) {
    warn(`primary model failed: ${e.message} — trying fallback`);
    try {
      raw = await callOpenRouter(prompt, FALLBACK_MODEL);
    } catch (e2) {
      warn(`fallback model also failed: ${e2.message} — exiting 0 (fail-open)`);
      return;
    }
  }

  const diagnosis = parseDiagnosis(raw);
  if (!diagnosis) {
    warn('unparseable LLM response — exiting 0 (fail-open)');
    return;
  }
  if (!isActionableDiagnosis(diagnosis)) {
    log(
      `no actionable diagnosis (issueFound=${diagnosis.issueFound}, confidence=${diagnosis.confidence}). 0 WRs filed — this is expected/common.`
    );
    return;
  }

  if (!token) {
    warn('GITHUB_TOKEN missing — cannot file WR. Exiting 0.');
    return;
  }

  const dup = await hasExistingOpenDiagnosis(repo, diagnosis.filePath, token);
  if (dup) {
    log(`open auto-diagnosed WR already exists for ${diagnosis.filePath} — skipping.`);
    return;
  }

  let issue;
  try {
    issue = await createWrIssue(repo, token, diagnosis);
  } catch (e) {
    warn(`failed to create WR: ${e.message}`);
    return;
  }
  log(`filed WR #${issue.number}: ${issue.html_url}`);

  try {
    await commentOnIssue(repo, token, issue.number, renderCoderComment(diagnosis));
    log(`posted coder-facing comment on #${issue.number}`);
  } catch (e) {
    warn(`failed to post comment (WR was still filed): ${e.message}`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    warn(`unhandled error (fail-open): ${e.message}`);
    process.exit(0);
  });
}

module.exports = {
  selectScopeFiles,
  inScope,
  loadPlaybookContext,
  buildPrompt,
  parseDiagnosis,
  isActionableDiagnosis,
  renderWrBody,
  renderCoderComment
};

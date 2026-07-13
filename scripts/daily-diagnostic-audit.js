#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Scans recently-changed workflow YAML and scripts on `main` within a bounded
 * time window, asks an LLM (via OpenRouter) to diagnose ONE code-level bug
 * with a concrete proposed fix, and — only at medium+ confidence — files a
 * single [WR] issue plus a coder-facing comment.
 *
 * Guardrails:
 *  - Never auto-fixes, never opens a PR, never merges.
 *  - At most 1 WR per run (schema is a single object).
 *  - Fail-open: missing key / API error / parse error → warn + exit 0.
 *  - Skips filing if an open `auto-diagnosed` WR already references the file.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO = process.env.GITHUB_REPOSITORY || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const SCOPE_WINDOW_HOURS = parseInt(process.env.SCOPE_WINDOW_HOURS || '48', 10);
const MAX_SCOPE_FILES = parseInt(process.env.MAX_SCOPE_FILES || '8', 10);

const SCOPE_PATTERNS = [
  /^\.github\/workflows\/.+\.ya?ml$/,
  /^scripts\/.+\.js$/,
];

function log(msg) {
  console.log(`[daily-diagnostic-audit] ${msg}`);
}
function warn(msg) {
  console.warn(`[daily-diagnostic-audit] WARN: ${msg}`);
}

function inScope(file) {
  return SCOPE_PATTERNS.some((r) => r.test(file));
}

function getChangedFiles(hours) {
  try {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const out = execSync(
      `git log --since="${since}" --name-only --pretty=format: main 2>/dev/null || git log --since="${since}" --name-only --pretty=format:`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    const files = Array.from(new Set(
      out.split('\n').map((l) => l.trim()).filter(Boolean)
    ));
    return files.filter(inScope).filter((f) => fs.existsSync(f));
  } catch (e) {
    warn(`git log failed: ${e.message}`);
    return [];
  }
}

function readFileSafe(p, maxBytes = 20000) {
  try {
    const buf = fs.readFileSync(p, 'utf8');
    return buf.length > maxBytes ? buf.slice(0, maxBytes) + '\n... [truncated]' : buf;
  } catch (e) {
    return null;
  }
}

const EMBEDDED_PLAYBOOK_SUMMARY = `
Audit fix-pattern catalog (embedded fallback):
1. Missing \`continue-on-error\` / \`allowError\` on non-critical steps that shouldn't fail the workflow.
2. Unguarded label races (two workflows adding/removing the same label without coordination).
3. Token scope gaps (using default GITHUB_TOKEN where a PAT / ADMIN_GITHUB_TOKEN is required).
4. Exit-code used as a proxy metric (script exits 1 to signal 'nothing found' — causes false failures).
5. Missing timeout-minutes on long-running jobs.
6. Cron collisions (multiple heavy workflows on the same minute).
7. Unquoted variables / shell injection risks in \`run:\` blocks.
8. Unbounded scope (loops over full repo instead of a windowed slice).
`.trim();

function loadPlaybookContext() {
  const p = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';
  if (fs.existsSync(p)) {
    const content = readFileSafe(p, 8000);
    if (content) return content;
  }
  return EMBEDDED_PLAYBOOK_SUMMARY;
}

function buildPrompt(files, playbook) {
  const fileBlocks = files.map((f) => {
    const content = readFileSafe(f);
    return `--- FILE: ${f} ---\n${content}\n`;
  }).join('\n');

  const system = `You are a code auditor. Your job is to diagnose ONE code-level bug in the provided files.

Rules:
- Only report a real, grounded issue you can point to a specific line/pattern for.
- If you cannot ground a diagnosis, respond with {"issueFound": false} — do NOT manufacture findings.
- If you find something but cannot propose a concrete fix, set proposedFix to "No clear fix — needs human investigation".
- Confidence must be one of: high, medium, low. Use low if unsure — low findings will be dropped.
- Respond ONLY with valid JSON matching this schema:
  {
    "issueFound": boolean,
    "file": string,
    "lineHint": string,
    "bugSummary": string,
    "reasoning": string,
    "proposedFix": string,
    "confidence": "high" | "medium" | "low",
    "patternCategory": string
  }

Reference playbook:
${playbook}`;

  const user = `Audit the following ${files.length} recently-changed file(s) for a code-level bug. Report at most ONE issue.\n\n${fileBlocks}`;

  return { system, user };
}

function openRouterCall(system, user) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'HTTP-Referer': 'https://github.com/' + REPO,
        'X-Title': 'daily-diagnostic-audit',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.message?.content || '';
            resolve(content);
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`OpenRouter HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function parseDiagnosis(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Strip markdown code fences if present
  let s = raw.trim();
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  // Extract first JSON object
  const braceStart = s.indexOf('{');
  const braceEnd = s.lastIndexOf('}');
  if (braceStart === -1 || braceEnd === -1) return null;
  try {
    return JSON.parse(s.slice(braceStart, braceEnd + 1));
  } catch (e) {
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  if (!d.file || typeof d.file !== 'string') return false;
  if (!d.bugSummary || !d.reasoning) return false;
  const conf = String(d.confidence || '').toLowerCase();
  return conf === 'high' || conf === 'medium';
}

function renderWRBody(d) {
  const learnings = `## Learnings — What & Why

This WR was filed by \`daily-diagnostic-audit.yml\` because a scan of
recently-changed files (${SCOPE_WINDOW_HOURS}h window) flagged a
**${d.confidence}**-confidence issue matching pattern category
\`${d.patternCategory || 'uncategorized'}\`.

See \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\` for the audit method
and fix-pattern catalog this diagnosis was grounded in.

**Verify — do not blindly apply — the proposed fix.** If this represents a
new recurring pattern not already in the catalog, add it.`;

  const body = `## Diagnosis (auto-generated, review before acting)

**File:** \`${d.file}\`
**Line hint:** ${d.lineHint || 'n/a'}
**Confidence:** ${d.confidence}
**Pattern category:** \`${d.patternCategory || 'uncategorized'}\`

### Bug summary
${d.bugSummary}

### Reasoning
${d.reasoning}

### Proposed fix
${d.proposedFix || 'No clear fix — needs human investigation'}

${learnings}

---
<!-- learnings-placeholder -->
<sub>Filed by \`daily-diagnostic-audit.yml\`. Never auto-merges. Routes through the standard WR → coding-agent → review pipeline.</sub>
`;
  return body;
}

function ghRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'daily-diagnostic-audit',
        'Accept': 'application/vnd.github+json',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(out)); } catch { resolve(out); }
        } else {
          reject(new Error(`GH ${method} ${urlPath} → ${res.statusCode}: ${out.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function hasExistingOpenDiagnosis(file) {
  try {
    const q = encodeURIComponent(`repo:${REPO} is:issue is:open label:auto-diagnosed "${file}" in:body`);
    const res = await ghRequest('GET', `/search/issues?q=${q}&per_page=1`);
    return (res.total_count || 0) > 0;
  } catch (e) {
    warn(`duplicate-check failed (fail-open): ${e.message}`);
    return false;
  }
}

async function fileWR(d) {
  const title = `[WR] [auto-diagnosed] ${d.bugSummary.slice(0, 80)}`;
  const body = renderWRBody(d);
  const issue = await ghRequest('POST', `/repos/${REPO}/issues`, {
    title,
    body,
    labels: ['WR', 'auto-diagnosed', 'diagnostic-audit'],
  });
  log(`Filed WR #${issue.number}: ${title}`);

  const comment = `👋 Coding agent: this WR was filed by the daily diagnostic audit.

The diagnosis and proposed fix in the issue body are a **starting point, not a spec** — please verify the reasoning against the actual file before implementing. If the diagnosis is wrong, close the issue with a comment explaining why (that feedback improves future runs).

Confidence level: **${d.confidence}**. Pattern: \`${d.patternCategory || 'uncategorized'}\`.`;
  await ghRequest('POST', `/repos/${REPO}/issues/${issue.number}/comments`, { body: comment });
  return issue;
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY not set — exiting cleanly (fail-open).');
    return 0;
  }
  if (!GITHUB_TOKEN || !REPO) {
    warn('GITHUB_TOKEN or GITHUB_REPOSITORY missing — exiting cleanly.');
    return 0;
  }

  const files = getChangedFiles(SCOPE_WINDOW_HOURS).slice(0, MAX_SCOPE_FILES);
  if (files.length === 0) {
    log(`No in-scope files changed in last ${SCOPE_WINDOW_HOURS}h — no-op.`);
    return 0;
  }
  log(`Scope: ${files.length} file(s): ${files.join(', ')}`);

  const playbook = loadPlaybookContext();
  const { system, user } = buildPrompt(files, playbook);

  let raw;
  try {
    raw = await openRouterCall(system, user);
  } catch (e) {
    warn(`OpenRouter call failed (fail-open): ${e.message}`);
    return 0;
  }

  const diagnosis = parseDiagnosis(raw);
  if (!diagnosis) {
    warn('Could not parse LLM response as JSON — exiting cleanly.');
    return 0;
  }

  if (!isActionableDiagnosis(diagnosis)) {
    log(`No actionable diagnosis (issueFound=${diagnosis.issueFound}, confidence=${diagnosis.confidence || 'n/a'}). No WR filed.`);
    return 0;
  }

  const dupe = await hasExistingOpenDiagnosis(diagnosis.file);
  if (dupe) {
    log(`Open auto-diagnosed WR already exists for ${diagnosis.file} — skipping.`);
    return 0;
  }

  try {
    await fileWR(diagnosis);
  } catch (e) {
    warn(`Failed to file WR (fail-open): ${e.message}`);
    return 0;
  }

  return 0;
}

if (require.main === module) {
  main().then((code) => process.exit(code || 0)).catch((e) => {
    warn(`Unexpected error (fail-open): ${e.message}`);
    process.exit(0);
  });
}

module.exports = {
  inScope,
  parseDiagnosis,
  isActionableDiagnosis,
  renderWRBody,
  buildPrompt,
  loadPlaybookContext,
  EMBEDDED_PLAYBOOK_SUMMARY,
};

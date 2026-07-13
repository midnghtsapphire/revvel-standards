#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Bounded, code-level bug diagnosis. Reads static content of workflow YAML and
 * scripts changed on `main` in the last 48h. If (and only if) a medium+
 * confidence, grounded diagnosis is produced, files ONE `[WR]` issue with an
 * embedded proposed fix plus a coder-facing comment.
 *
 * Fail-open: missing key, network errors, unparseable LLM output, or duplicate
 * detection failures all log-and-exit-0 rather than crash.
 *
 * Never auto-fixes, never opens PRs, never merges. Only writes: create issue +
 * one comment on that issue.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const MAX_SCOPE_FILES = 8;
const MAX_FILE_BYTES = 40_000;
const WINDOW_HOURS = 48;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL = 'anthropic/claude-3-opus';
const FALLBACK_MODEL = 'deepseek/deepseek-r1';

function log(msg) {
  console.log(`[daily-diagnostic-audit] ${msg}`);
}

function warn(msg) {
  console.warn(`[daily-diagnostic-audit] WARN: ${msg}`);
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return '';
  }
}

function selectScopeFiles() {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
  const raw = sh(`git log --since="${since}" --name-only --pretty=format: main 2>/dev/null || git log --since="${since}" --name-only --pretty=format:`);
  if (!raw) return [];
  const set = new Set();
  for (const line of raw.split('\n')) {
    const p = line.trim();
    if (!p) continue;
    const isWorkflow = p.startsWith('.github/workflows/') && p.endsWith('.yml');
    const isScript = p.startsWith('scripts/') && p.endsWith('.js');
    if (!isWorkflow && !isScript) continue;
    if (!fs.existsSync(p)) continue;
    set.add(p);
    if (set.size >= MAX_SCOPE_FILES) break;
  }
  return Array.from(set);
}

function readFileBounded(p) {
  const buf = fs.readFileSync(p, 'utf8');
  if (buf.length <= MAX_FILE_BYTES) return buf;
  return buf.slice(0, MAX_FILE_BYTES) + '\n\n[...truncated...]';
}

function loadPlaybookContext() {
  const p = path.join('standards', 'AUDIT_AND_SELF_HEALING_PLAYBOOK.md');
  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      return raw.slice(0, 8000);
    } catch (_) {}
  }
  return `Fix-pattern catalog (embedded fallback):
1. Missing continue-on-error / allowError on non-critical steps.
2. Unguarded label races (multiple workflows racing to add/remove same label).
3. Missing token / permissions gap (using GITHUB_TOKEN where PAT is required).
4. Exit code used as proxy metric (grep exit 1 = "no matches" treated as failure).
5. Missing timeout-minutes on long-running jobs.
6. Unquoted YAML expressions with special chars.
7. Silent JSON.parse without try/catch on external input.
8. Fire-and-forget async without await, losing errors.`;
}

function buildPrompt(files, playbook) {
  const fileBlocks = files.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n');
  const system = `You are a careful code auditor. You examine a small set of recently-changed files for a SINGLE, concrete, code-level bug.

RULES:
- If nothing clearly buggy jumps out, respond with issueFound: false. DO NOT manufacture a finding.
- If you find something but cannot ground a concrete fix, set proposedFix to "No clear fix — needs human investigation".
- Prefer high-signal bugs matching known patterns from the playbook below.
- Only ONE finding per response (the highest-confidence one).
- confidence must be one of: high, medium, low. Low-confidence findings will be dropped.

Respond ONLY with valid JSON matching:
{
  "issueFound": boolean,
  "confidence": "high" | "medium" | "low",
  "file": "path/to/file",
  "lineHint": "approximate line range or symbol name",
  "bugTitle": "short imperative title",
  "bugDescription": "what is wrong and why it matters",
  "proposedFix": "concrete diff-shaped suggestion or 'No clear fix — needs human investigation'",
  "reasoning": "why this diagnosis is grounded in the file content",
  "patternMatched": "which catalog entry (or 'novel')"
}

PLAYBOOK CONTEXT:
${playbook}`;

  const user = `Audit these files. Find at most one grounded bug.\n\n${fileBlocks}`;
  return { system, user };
}

function callOpenRouter(model, prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });
    const req = https.request(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/',
        'X-Title': 'daily-diagnostic-audit',
      },
      timeout: 90_000,
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function parseLLMResponse(raw) {
  try {
    const outer = JSON.parse(raw);
    const content = outer?.choices?.[0]?.message?.content;
    if (!content) return null;
    // Extract JSON object from content
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (_) {
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  if (!['high', 'medium'].includes(String(d.confidence).toLowerCase())) return false;
  if (!d.file || !d.bugTitle || !d.bugDescription) return false;
  return true;
}

function renderIssueBody(d) {
  const learnings = `## Learnings — What & Why

This WR was filed by \`daily-diagnostic-audit.yml\` because a static scan of a
recently-changed file surfaced a grounded, medium+ confidence code-level bug
matching pattern: **${d.patternMatched || 'novel'}**.

**Verify — do not blindly apply — the proposed fix.** Confirm the diagnosis
against the actual file, then consider whether this is a new catalog-worthy
pattern for \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\`.
`;

  const body = `## Diagnosis

**File:** \`${d.file}\`
**Location hint:** ${d.lineHint || 'n/a'}
**Confidence:** ${d.confidence}
**Pattern:** ${d.patternMatched || 'novel'}

### What's wrong

${d.bugDescription}

### Proposed fix

${d.proposedFix}

### Reasoning

${d.reasoning || '(not provided)'}

<!-- LEARNINGS_PLACEHOLDER -->
${learnings}

---
_Filed by \`daily-diagnostic-audit.yml\` — bounded code-level audit. Never auto-fixes; requests the coding-agent pipeline to act._
`;
  return body;
}

function ghRequest(method, pathname, token, repo, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: pathname,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'daily-diagnostic-audit',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 30_000,
    }, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(d)); } catch { resolve({}); }
        } else {
          reject(new Error(`GH ${res.statusCode}: ${d.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('gh timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function hasExistingOpenDiagnosis(token, repo, file) {
  try {
    const q = encodeURIComponent(`repo:${repo} is:issue is:open label:auto-diagnosed "${file}" in:body`);
    const res = await ghRequest('GET', `/search/issues?q=${q}`, token, repo);
    return Array.isArray(res?.items) && res.items.length > 0;
  } catch (e) {
    warn(`dup check failed (fail-open): ${e.message}`);
    return false;
  }
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!apiKey) { warn('OPENROUTER_API_KEY missing — exiting fail-open'); return; }
  if (!token || !repo) { warn('GITHUB_TOKEN/REPO missing — exiting fail-open'); return; }

  const scope = selectScopeFiles();
  if (scope.length === 0) {
    log('quiet window: no in-scope files changed in last 48h. 0 API calls, 0 WRs.');
    return;
  }
  log(`scope: ${scope.length} file(s): ${scope.join(', ')}`);

  const files = scope.map(p => ({ path: p, content: readFileBounded(p) }));
  const playbook = loadPlaybookContext();
  const prompt = buildPrompt(files, playbook);

  let raw;
  try {
    raw = await callOpenRouter(PRIMARY_MODEL, prompt, apiKey);
  } catch (e) {
    warn(`primary model failed: ${e.message} — trying fallback`);
    try {
      raw = await callOpenRouter(FALLBACK_MODEL, prompt, apiKey);
    } catch (e2) {
      warn(`fallback also failed: ${e2.message} — exiting fail-open`);
      return;
    }
  }

  const diag = parseLLMResponse(raw);
  if (!diag) { warn('unparseable LLM response — exiting fail-open'); return; }

  if (!isActionableDiagnosis(diag)) {
    log(`no actionable diagnosis (issueFound=${diag.issueFound}, confidence=${diag.confidence}). 0 WRs.`);
    return;
  }

  const dup = await hasExistingOpenDiagnosis(token, repo, diag.file);
  if (dup) { log(`open auto-diagnosed WR already references ${diag.file} — skipping.`); return; }

  const title = `[WR] ${diag.bugTitle}`;
  const body = renderIssueBody(diag);
  const labels = ['WR', 'auto-diagnosed', 'daily-diagnostic-audit'];

  let created;
  try {
    created = await ghRequest('POST', `/repos/${repo}/issues`, token, repo, { title, body, labels });
  } catch (e) {
    warn(`issue create failed: ${e.message}`);
    return;
  }
  log(`filed WR #${created.number}: ${title}`);

  const coderComment = `@coding-agent — the WR body above contains a proposed fix from an automated static-scan diagnosis.

**Before implementing:**
1. Re-read \`${diag.file}\` and confirm the bug actually exists as described.
2. If confirmed, apply the proposed fix (or a better one) and open a PR that closes this issue.
3. If NOT confirmed, close this issue with a brief note explaining what the audit got wrong — that signal helps tune the audit.

_The audit is fail-open and error-tolerant; a wrong diagnosis is expected occasionally and is fine to close._`;
  try {
    await ghRequest('POST', `/repos/${repo}/issues/${created.number}/comments`, token, repo, { body: coderComment });
  } catch (e) {
    warn(`comment failed (non-fatal): ${e.message}`);
  }
}

if (require.main === module) {
  main().catch(e => { warn(`unexpected: ${e.message}`); process.exit(0); });
}

module.exports = {
  selectScopeFiles,
  buildPrompt,
  parseLLMResponse,
  isActionableDiagnosis,
  renderIssueBody,
  loadPlaybookContext,
};

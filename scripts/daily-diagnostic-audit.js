#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Runs once/day. Scans workflow YAML + scripts changed on `main` in the last
 * 48 hours for code-level bugs (missing allowError, unguarded label races,
 * token gaps, exit-code-as-metric, etc.) using one OpenRouter call via the
 * `review` profile. Files AT MOST ONE `[WR]` issue with an embedded proposed
 * fix, only when confidence is medium+.
 *
 * Guardrails:
 *   - Never auto-fixes, never opens PRs, never merges.
 *   - Fail-open on any error: log + exit 0.
 *   - 1 WR cap (schema is a single object, not a list).
 *   - Confidence gate: only high/medium diagnoses are filed.
 *   - Best-effort duplicate skip against open `auto-diagnosed` WRs.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const WINDOW_HOURS = 48;
const MAX_SCOPE_FILES = 8;
const MAX_FILE_BYTES = 24 * 1024;
const REPO = process.env.GITHUB_REPOSITORY || '';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const OR_KEY = process.env.OPENROUTER_API_KEY || '';

const PLAYBOOK_FALLBACK = `
Audit patterns to look for (bounded catalog):
1. Missing \`continue-on-error\` / allowError on non-critical steps that gate downstream steps.
2. Unguarded label races: multiple workflows racing on the same issue label without concurrency: guard.
3. Missing token: secrets.GITHUB_TOKEN passthrough on gh CLI / API calls.
4. Exit-code used as a proxy for a business metric (e.g. treating grep miss as "success").
5. Silent failure: piping to \`|| true\` on the ONE step whose failure actually matters.
6. Missing timeout-minutes on network-bound jobs (can hang for 6h default).
7. \`if: always()\` on a step that should be \`if: success()\` (leaks partial state).
8. Secrets referenced but never declared in secrets-map / not wired in env.
`.trim();

function log(...a) { console.log('[diagnostic-audit]', ...a); }
function warn(...a) { console.warn('[diagnostic-audit]', ...a); }

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function getChangedFiles() {
  try {
    const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
    // Files touched on main in window
    const raw = sh(`git log --since="${since}" --name-only --pretty=format: origin/main 2>/dev/null || git log --since="${since}" --name-only --pretty=format: main 2>/dev/null || git log --since="${since}" --name-only --pretty=format:`);
    const files = Array.from(new Set(raw.split('\n').map(s => s.trim()).filter(Boolean)));
    return files.filter(f =>
      (f.startsWith('.github/workflows/') && f.endsWith('.yml')) ||
      (f.startsWith('scripts/') && f.endsWith('.js'))
    ).filter(f => fs.existsSync(f)).slice(0, MAX_SCOPE_FILES);
  } catch (e) {
    warn('scope selection failed:', e.message);
    return [];
  }
}

function loadPlaybookContext() {
  const p = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').slice(0, 8000);
  } catch (_) {}
  return PLAYBOOK_FALLBACK;
}

function readFileBounded(f) {
  try {
    const buf = fs.readFileSync(f, 'utf8');
    if (buf.length > MAX_FILE_BYTES) return buf.slice(0, MAX_FILE_BYTES) + '\n... [truncated]';
    return buf;
  } catch (e) {
    return `<<unreadable: ${e.message}>>`;
  }
}

function buildPrompt(files, playbook) {
  const bundle = files.map(f => `\n===== FILE: ${f} =====\n${readFileBounded(f)}`).join('\n');
  const system = `You are a code-level bug auditor for GitHub Actions workflows and Node scripts.
You receive a SMALL bundle of files recently changed on main and a playbook of known bug patterns.

Your job:
1. Find AT MOST ONE concrete, code-level bug grounded in the file content.
2. If nothing clear is present, say so — DO NOT manufacture a finding.
3. If you find something but cannot ground a fix, set proposedFix to "No clear fix — needs human investigation".
4. Output STRICT JSON only, no prose, matching this schema:

{
  "issueFound": boolean,
  "confidence": "high" | "medium" | "low",
  "file": "relative/path",
  "lineHint": "approximate line or section",
  "pattern": "which playbook pattern (or 'other')",
  "title": "short imperative title",
  "summary": "1-3 sentences: what's wrong and why it matters",
  "proposedFix": "concrete diff-shaped suggestion or 'No clear fix — needs human investigation'",
  "reasoning": "grounded reasoning tying the finding to specific lines/behavior"
}

PLAYBOOK:
${playbook}`;
  const user = `Audit the following ${files.length} file(s) for one high-signal code-level bug:\n${bundle}`;
  return { system, user };
}

function httpsJson(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function callOpenRouter(prompt) {
  const payload = JSON.stringify({
    model: 'anthropic/claude-3.5-sonnet',
    models: ['deepseek/deepseek-r1', 'anthropic/claude-3-haiku'],
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ],
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: 'json_object' }
  });
  const res = await httpsJson({
    method: 'POST',
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'HTTP-Referer': 'https://github.com/' + REPO,
      'X-Title': 'daily-diagnostic-audit'
    }
  }, payload);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`OpenRouter HTTP ${res.status}: ${res.body.slice(0, 400)}`);
  }
  const parsed = JSON.parse(res.body);
  const content = parsed?.choices?.[0]?.message?.content || '';
  return content;
}

function parseDiagnosis(raw) {
  try {
    // Strip markdown fences if any
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
    const obj = JSON.parse(cleaned);
    if (typeof obj !== 'object' || obj === null) return null;
    return obj;
  } catch (e) {
    warn('parse failed:', e.message);
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d) return false;
  if (d.issueFound !== true) return false;
  if (!['high', 'medium'].includes(String(d.confidence).toLowerCase())) return false;
  if (!d.file || !d.title || !d.summary) return false;
  return true;
}

function ghApi(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      method,
      hostname: 'api.github.com',
      path: apiPath,
      headers: {
        'Authorization': `Bearer ${GH_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'daily-diagnostic-audit',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload), 'Content-Type': 'application/json' } : {})
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch (_) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function hasExistingOpenDiagnosis(file) {
  try {
    const q = encodeURIComponent(`repo:${REPO} is:issue is:open label:auto-diagnosed "${file}"`);
    const res = await ghApi('GET', `/search/issues?q=${q}`);
    if (res.status !== 200) return false;
    return (res.body?.total_count || 0) > 0;
  } catch (e) {
    warn('dupe check failed (fail-open):', e.message);
    return false;
  }
}

function renderWrBody(d, files) {
  const learnings = `## Learnings — What & Why

This WR was filed by \`daily-diagnostic-audit.yml\` because a bounded scan of files recently changed on \`main\` surfaced a **${d.confidence}-confidence** match against the audit playbook pattern: **${d.pattern || 'other'}**.

See \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\` for the full catalog.

**Implementing agent:** verify the proposed fix against the live file before applying — do not blindly apply. If this represents a NEW pattern not yet in the catalog, add it there as part of the fix.`;

  const body = `## Diagnosis (auto-generated, medium+ confidence)

**File:** \`${d.file}\`
**Line hint:** ${d.lineHint || 'n/a'}
**Pattern:** ${d.pattern || 'other'}
**Confidence:** ${d.confidence}

### Summary
${d.summary}

### Reasoning
${d.reasoning || '(no reasoning provided)'}

### Proposed fix
\`\`\`
${d.proposedFix || 'No clear fix — needs human investigation'}
\`\`\`

### Scope scanned this run
${files.map(f => `- \`${f}\``).join('\n')}

${learnings}

---
_Filed by daily-diagnostic-audit. This is a request into the standard WR → coding-agent → review/merge pipeline, not a bypass of it._
`;
  // If a Learnings placeholder exists in a template, prefer substitution (defensive; not required)
  return body;
}

async function fileWr(d, files) {
  const title = `[WR] ${d.title}`;
  const body = renderWrBody(d, files);
  const res = await ghApi('POST', `/repos/${REPO}/issues`, {
    title,
    body,
    labels: ['WR', 'auto-diagnosed', 'daily-diagnostic-audit']
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`create issue HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 400)}`);
  }
  const issue = res.body;
  log(`filed WR #${issue.number}: ${title}`);

  // Separate comment for the implementing coding agent
  const comment = `@coding-agent — this WR was auto-diagnosed. Please:

1. Read \`${d.file}\` at/near ${d.lineHint || 'the area described'} and confirm the finding.
2. If confirmed, apply a fix consistent with the proposed diff (or better, if you see a cleaner one).
3. If NOT confirmed, close this WR with a comment explaining why — that's a valid outcome.
4. Consider whether this is a new pattern for \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\`.
`;
  await ghApi('POST', `/repos/${REPO}/issues/${issue.number}/comments`, { body: comment });
  return issue;
}

async function main() {
  if (!REPO) { warn('no GITHUB_REPOSITORY, exiting fail-open'); return; }
  const files = getChangedFiles();
  log(`scope: ${files.length} file(s) in last ${WINDOW_HOURS}h`);
  if (files.length === 0) { log('quiet window — no scan needed'); return; }

  if (!OR_KEY) { warn('no OPENROUTER_API_KEY, exiting fail-open'); return; }

  const playbook = loadPlaybookContext();
  const prompt = buildPrompt(files, playbook);

  let raw;
  try { raw = await callOpenRouter(prompt); }
  catch (e) { warn('openrouter call failed (fail-open):', e.message); return; }

  const d = parseDiagnosis(raw);
  if (!isActionableDiagnosis(d)) {
    log('no actionable diagnosis this run (this is normal and expected)');
    return;
  }

  if (!GH_TOKEN) { warn('no GITHUB_TOKEN, cannot file WR, exiting fail-open'); return; }

  if (await hasExistingOpenDiagnosis(d.file)) {
    log(`skip: open auto-diagnosed WR already exists for ${d.file}`);
    return;
  }

  try { await fileWr(d, files); }
  catch (e) { warn('file WR failed (fail-open):', e.message); return; }
}

module.exports = {
  getChangedFiles,
  loadPlaybookContext,
  buildPrompt,
  parseDiagnosis,
  isActionableDiagnosis,
  renderWrBody,
};

if (require.main === module) {
  main().catch(e => { warn('unexpected error (fail-open):', e.message); process.exit(0); });
}

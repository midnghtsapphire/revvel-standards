#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Reads a bounded set of recently-changed workflow/script files, asks an LLM
 * to diagnose one code-level bug at medium+ confidence, and (only if grounded)
 * files a single [WR] issue with an embedded proposed fix and reasoning.
 *
 * Guardrails:
 *  - Never auto-fixes, never opens a PR.
 *  - Max one WR per run (schema returns a single object).
 *  - Confidence gate: drops low-confidence findings entirely.
 *  - Fail-open: missing key / API errors / parse errors log and exit 0.
 *  - Bounded scope: only .github/workflows/*.yml and scripts/*.js, 48h window.
 *
 * The pure helpers (parsing, prompt construction, rendering) are exported and
 * unit-tested in tests/daily-diagnostic-audit.test.js — keep them side-effect
 * free.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WINDOW_HOURS = 48;
const MAX_SCOPE_FILES = 8;
const MAX_FILE_BYTES = 20000;

// Bounded blast radius: the audit only ever looks at workflow YAML and the
// scripts that back them. Each entry is a { dir prefix, required extension }.
const SCOPE_GLOBS = [
  { dir: '.github/workflows/', ext: '.yml' },
  { dir: 'scripts/', ext: '.js' },
];

const LEARNINGS_PLACEHOLDER = '{LEARNINGS}';
const WR_LABELS = ['work-request', 'auto-diagnosed'];
const WR_ASSIGNEES = ['oaudrey'];

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_PRIMARY = 'anthropic/claude-opus-4.7';
const MODEL_FALLBACK = 'deepseek/deepseek-r1';

function log(...args) {
  console.log('[daily-diagnostic-audit]', ...args);
}

function warn(...args) {
  console.warn('[daily-diagnostic-audit][warn]', ...args);
}

// ── scope selection (pure) ───────────────────────────────────────────────────

/**
 * Parse `git log --name-only --pretty=format:` output into a deduped, ordered
 * list of file paths. Blank and whitespace-only lines are dropped.
 * @param {string|null|undefined} raw
 * @returns {string[]}
 */
function parseGitLogNameOnly(raw) {
  if (!raw) return [];
  const seen = new Set();
  const out = [];
  for (const line of String(raw).split('\n')) {
    const f = line.trim();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    out.push(f);
  }
  return out;
}

/**
 * Keep only files inside the audit's bounded scope (SCOPE_GLOBS). Order is
 * preserved.
 * @param {string[]} files
 * @returns {string[]}
 */
function filterInScope(files) {
  return (files || []).filter((f) =>
    SCOPE_GLOBS.some((g) => f.startsWith(g.dir) && f.endsWith(g.ext)),
  );
}

// ── playbook grounding (pure-ish: reads a repo file) ─────────────────────────

/**
 * Load the self-healing pattern catalog to ground the diagnostic prompt.
 * Returns the catalog section of the live playbook when present, else a small
 * embedded fallback. Always non-empty and always contains the catalog marker.
 * @returns {string}
 */
function loadPlaybookContext() {
  const p = path.join(__dirname, '..', 'standards', 'AUDIT_AND_SELF_HEALING_PLAYBOOK.md');
  try {
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p, 'utf8');
      const idx = buf.indexOf('Pattern Catalog');
      const start = idx >= 0 ? Math.max(buf.lastIndexOf('\n#', idx) + 1, 0) : 0;
      const slice = buf.slice(start, start + 8000);
      return slice.includes('Pattern Catalog')
        ? slice
        : `## Self-Healing Correction Pattern Catalog\n\n${slice}`;
    }
  } catch (err) {
    warn('playbook read failed:', err.message);
  }
  return `## Self-Healing Correction Pattern Catalog (embedded fallback)
1. Missing continue-on-error/allowError on non-critical steps.
2. Unguarded label races (concurrent issue re-labeling without a lock).
3. Token permission gaps (missing scopes for POST endpoints).
4. Exit-code used as a proxy metric (masking real failure).
5. Unquoted shell interpolation of untrusted input.
6. Missing timeout-minutes on long-running jobs.
7. Cron collisions with other high-traffic workflows.
8. Fail-closed on optional integrations (a missing OPENROUTER_API_KEY must not crash).`;
}

// ── model routing (reads agent-models.yml) ───────────────────────────────────

/**
 * Resolve the ordered model list for the review profile from
 * .github/agent-models.yml (primary first, fallback appended). Falls back to
 * the hard-coded defaults if the config is unreadable.
 * @returns {string[]}
 */
function loadDiagnosticModels() {
  try {
    const YAML = require('yaml');
    const configPath = path.join(__dirname, '..', '.github', 'agent-models.yml');
    const parsed = YAML.parse(fs.readFileSync(configPath, 'utf8'));
    const review = parsed && parsed.profiles && parsed.profiles.review;
    if (review && review.primary) {
      const models = [review.primary];
      if (review.fallback) models.push(review.fallback);
      return models;
    }
  } catch (err) {
    warn('agent-models.yml read failed:', err.message);
  }
  return [MODEL_PRIMARY, MODEL_FALLBACK];
}

// ── prompt construction (pure) ───────────────────────────────────────────────

/**
 * @param {string} playbookContext
 * @returns {string}
 */
function buildSystemPrompt(playbookContext) {
  return `You are a code auditor for this repository. Diagnose AT MOST ONE real,
code-level bug in the files supplied by the user message, grounded strictly in
the code shown.

Hard rules:
- Do not manufacture an issue. If nothing is clearly wrong, return {"issueFound": false}.
- Never invent a file, line, or behavior that is not present in the provided content.
- If you find a real problem but cannot propose a concrete change, set
  "proposedFix" to "No clear fix — needs human investigation".
- "confidence" must be one of "high", "medium", or "low". Use "low" when unsure.

Return JSON only (no prose, no markdown fence), matching this schema:
{
  "issueFound": boolean,
  "file": "path/to/file",
  "line": "line number or range",
  "patternCategory": "catalog pattern name or 'other'",
  "diagnosis": "what the bug is and why it matters",
  "proposedFix": "concrete fix, or 'No clear fix — needs human investigation'",
  "confidence": "high" | "medium" | "low",
  "reasoning": "why you believe this, grounded in the shown code"
}

Ground your reasoning in this catalog:
${playbookContext}`;
}

/**
 * @param {Array<{path: string, content: string}>} scopeFiles
 * @param {{sinceHours?: number, maxPromptChars?: number}} [opts]
 * @returns {string}
 */
function buildUserPrompt(scopeFiles, opts = {}) {
  const sinceHours = opts.sinceHours == null ? WINDOW_HOURS : opts.sinceHours;
  const maxPromptChars = opts.maxPromptChars == null ? 60000 : opts.maxPromptChars;

  const header = `These files changed in the last ${sinceHours} hours. Audit them and diagnose at most one real bug:\n\n`;
  let body = '';
  let omitted = 0;
  for (let i = 0; i < scopeFiles.length; i++) {
    const f = scopeFiles[i];
    const block = `--- FILE: ${f.path} ---\n${f.content}\n\n`;
    if (body.length > 0 && header.length + body.length + block.length > maxPromptChars) {
      omitted = scopeFiles.length - i;
      break;
    }
    body += block;
  }

  let out = header + body;
  if (omitted > 0) {
    out += `[... ${omitted} remaining files omitted to stay within the prompt budget ...]\n`;
  }
  return out;
}

// ── response parsing/validation (pure) ───────────────────────────────────────

/**
 * Parse and validate an LLM diagnostic response.
 * @param {string|null|undefined} text
 * @returns {{valid: boolean, diagnosis?: object, error?: string}}
 */
function parseDiagnosticResponse(text) {
  if (!text || !String(text).trim()) {
    return { valid: false, error: 'empty response' };
  }
  let cleaned = String(text).trim();
  const fence = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fence) cleaned = fence[1].trim();

  let obj = null;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]);
      } catch {
        obj = null;
      }
    }
  }

  if (!obj || typeof obj !== 'object') {
    return { valid: false, error: 'unparseable response — no JSON object found' };
  }
  if (typeof obj.issueFound !== 'boolean') {
    return { valid: false, error: 'missing required field: issueFound' };
  }

  const confidence = ['high', 'medium', 'low'].includes(obj.confidence) ? obj.confidence : 'low';
  return { valid: true, diagnosis: { ...obj, confidence } };
}

/**
 * Actionability gate: only issueFound + medium/high confidence + a real
 * diagnosis string may open a WR. A wrong fix is worse than none.
 * @param {object|null} d
 * @returns {boolean}
 */
function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  if (!['high', 'medium'].includes(d.confidence)) return false;
  if (!d.diagnosis || !String(d.diagnosis).trim()) return false;
  return true;
}

// ── WR rendering (pure) ──────────────────────────────────────────────────────

/**
 * @param {object} diagnosis
 * @returns {string}
 */
function renderWrTitle(diagnosis) {
  const summary = String(diagnosis.diagnosis || 'code-level issue')
    .split('\n')[0]
    .slice(0, 80)
    .trim();
  return `[WR] Daily Diagnostic Audit: ${summary} (${diagnosis.file})`;
}

function buildLearnings() {
  return `This WR is a **Machine-generated starting point** from the daily diagnostic
audit — not a verified fix.

- Ground the work in \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\` — the
  fix-pattern catalog this diagnosis was framed against.
- **Verify the proposed fix** against the current code before applying it; the
  model can be wrong or the code may have moved on.
- If this turns out to be a new recurring pattern, add it to the catalog.`;
}

/**
 * Render the WR issue body from a template, substituting {TOKEN} placeholders.
 * Leaves no raw {UPPER_CASE} token behind.
 * @param {{
 *   template: string,
 *   diagnosis: object,
 *   scopeFiles: string[],
 *   sinceHours: number,
 *   repoFull: string,
 *   repoUrl: string,
 *   today: string,
 *   runUrl: string,
 * }} params
 * @returns {string}
 */
function renderWrBody(params) {
  const { template, diagnosis, scopeFiles, sinceHours, repoFull, repoUrl, today, runUrl } = params;

  const title = renderWrTitle(diagnosis).replace(/^\[WR\]\s*/, '');
  const lineRef = diagnosis.line ? ` (line ${diagnosis.line})` : '';
  const issueContext = [
    `**File:** \`${diagnosis.file}\`${lineRef}`,
    `**Pattern:** ${diagnosis.patternCategory || 'other'}`,
    `**Confidence:** ${diagnosis.confidence}`,
    `**Scope scanned:** ${(scopeFiles || []).join(', ')} (changed in the last ${sinceHours}h)`,
    `**Audit run:** [${today}](${runUrl}) · [${repoFull}](${repoUrl})`,
    '',
    '## Diagnosis',
    '',
    diagnosis.diagnosis,
    '',
    '## Proposed Fix',
    '',
    diagnosis.proposedFix || 'No clear fix — needs human investigation',
    '',
    '## Reasoning',
    '',
    diagnosis.reasoning || '(no reasoning provided)',
  ].join('\n');

  const learnings = buildLearnings();

  let body = template;
  body = body.split('{TITLE}').join(title);
  body = body.split('{ISSUE_CONTEXT}').join(issueContext);

  if (body.includes(LEARNINGS_PLACEHOLDER)) {
    body = body.split(LEARNINGS_PLACEHOLDER).join(learnings);
  } else {
    body += `\n\n## Learnings — What & Why\n\n${learnings}`;
  }

  // Sweep any remaining {TOKEN} placeholders the template carried but this
  // caller doesn't populate, so no raw token ever reaches the issue.
  body = body.replace(/\{[A-Z_]+\}/g, '');
  return body;
}

/**
 * The coder-facing comment posted on the WR — sets expectations that the
 * proposed fix is a hypothesis, not a spec.
 * @returns {string}
 */
function renderCoderComment() {
  return `**For the implementing agent:** this WR was auto-opened by the daily
diagnostic audit. Treat the **Proposed Fix** as a hypothesis, not a spec —
**don't apply blindly**. Verify it against the current code first, then fill in
the **Learnings — What & Why** section with what you actually found before you
close this out.`;
}

// ── side-effecting runtime (not unit-tested) ─────────────────────────────────

function getChangedFiles() {
  try {
    const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
    const cmd =
      `git log --since="${since}" --name-only --pretty=format: --no-merges origin/main 2>/dev/null || ` +
      `git log --since="${since}" --name-only --pretty=format: --no-merges HEAD`;
    const out = execSync(cmd, { encoding: 'utf8' });
    return filterInScope(parseGitLogNameOnly(out))
      .filter((f) => fs.existsSync(f))
      .slice(0, MAX_SCOPE_FILES);
  } catch (err) {
    warn('git log failed:', err.message);
    return [];
  }
}

function readFileBounded(p) {
  try {
    const buf = fs.readFileSync(p, 'utf8');
    return buf.length > MAX_FILE_BYTES ? buf.slice(0, MAX_FILE_BYTES) + '\n... [truncated]' : buf;
  } catch {
    return null;
  }
}

async function callOpenRouter(system, user, model) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${model}: HTTP ${res.status}`);
  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message.content) || '';
}

async function hasExistingOpenDiagnosis(repo, token, file) {
  try {
    const url = `https://api.github.com/search/issues?q=repo:${repo}+is:issue+is:open+label:auto-diagnosed+${encodeURIComponent(file)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.total_count || 0) > 0;
  } catch {
    return false;
  }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY not set — fail-open exit 0');
    return;
  }
  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY;
  if (!token || !repoFull) {
    warn('GITHUB_TOKEN or GITHUB_REPOSITORY missing — fail-open exit 0');
    return;
  }
  const repoUrl = `https://github.com/${repoFull}`;
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${repoFull}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : repoUrl;
  const today = new Date().toISOString().slice(0, 10);

  const files = getChangedFiles();
  if (files.length === 0) {
    log(`no in-scope files changed in last ${WINDOW_HOURS}h — no-op`);
    return;
  }
  log(`scope: ${files.length} file(s):`, files.join(', '));

  const scopeFiles = files.map((p) => ({ path: p, content: readFileBounded(p) || '(unreadable)' }));
  const system = buildSystemPrompt(loadPlaybookContext());
  const user = buildUserPrompt(scopeFiles, { sinceHours: WINDOW_HOURS });

  const models = loadDiagnosticModels();
  let content = null;
  for (const model of models) {
    try {
      content = await callOpenRouter(system, user, model);
      break;
    } catch (err) {
      warn(`model ${model} failed:`, err.message);
    }
  }
  if (content == null) {
    warn('all models failed — exit 0');
    return;
  }

  const parsed = parseDiagnosticResponse(content);
  if (!parsed.valid) {
    warn(`invalid LLM response (${parsed.error}) — exit 0`);
    return;
  }
  const diagnosis = parsed.diagnosis;
  if (!isActionableDiagnosis(diagnosis)) {
    log(`no actionable diagnosis (issueFound=${diagnosis.issueFound}, confidence=${diagnosis.confidence}) — no-op`);
    return;
  }
  if (await hasExistingOpenDiagnosis(repoFull, token, diagnosis.file)) {
    log(`existing open auto-diagnosed WR for ${diagnosis.file} — skip`);
    return;
  }

  let template = '';
  try {
    template = fs.readFileSync(path.join(__dirname, '..', 'wr', 'WR_TEMPLATE_BASIC.md'), 'utf8');
  } catch {
    template = '# [WR] {TITLE}\n\n## Issue Context\n\n{ISSUE_CONTEXT}\n\n## Learnings — What & Why\n\n{LEARNINGS}\n';
  }

  const title = renderWrTitle(diagnosis);
  const body = renderWrBody({
    template,
    diagnosis,
    scopeFiles: files,
    sinceHours: WINDOW_HOURS,
    repoFull,
    repoUrl,
    today,
    runUrl,
  });

  const res = await fetch(`https://api.github.com/repos/${repoFull}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels: WR_LABELS, assignees: WR_ASSIGNEES }),
  });
  if (!res.ok) {
    warn('issue POST failed:', res.status, await res.text());
    return;
  }
  const created = await res.json();
  log('filed WR:', created.html_url);

  try {
    await fetch(`https://api.github.com/repos/${repoFull}/issues/${created.number}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: renderCoderComment() }),
    });
  } catch (err) {
    warn('comment POST failed:', err.message);
  }
}

if (require.main === module) {
  main().catch((err) => {
    warn('unhandled:', err.message);
    process.exit(0);
  });
}

module.exports = {
  parseGitLogNameOnly,
  filterInScope,
  buildSystemPrompt,
  buildUserPrompt,
  parseDiagnosticResponse,
  isActionableDiagnosis,
  renderWrTitle,
  renderWrBody,
  renderCoderComment,
  loadPlaybookContext,
  loadDiagnosticModels,
  LEARNINGS_PLACEHOLDER,
  SCOPE_GLOBS,
  WR_LABELS,
  WR_ASSIGNEES,
  // runtime helpers (not part of the tested surface)
  getChangedFiles,
};

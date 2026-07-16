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
 *  - Bounded scope: at most MAX_SCOPE_FILES files, 48h window.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml');

const MAX_SCOPE_FILES = 8;
const WINDOW_HOURS = 48;
const SCOPE_GLOBS = [
  { dir: '.github/workflows/', ext: '.yml' },
  { dir: 'scripts/', ext: '.js' },
];
const MAX_FILE_BYTES = 20000;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_PRIMARY = 'anthropic/claude-3.5-sonnet';
const MODEL_FALLBACK = 'deepseek/deepseek-r1';

const WR_LABELS = ['work-request', 'auto-diagnosed'];
const WR_ASSIGNEES = ['oaudrey'];

const LEARNINGS_PLACEHOLDER = `This was flagged by the daily-diagnostic-audit cron (file changed within the last {SINCE_HOURS}h).
See \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\` for the fix-pattern catalog.

**Verify the proposed fix before applying** — the model can be wrong. Also
consider whether this represents a new catalog-worthy pattern.`;

function log(...args) {
  console.log('[daily-diagnostic-audit]', ...args);
}

function warn(...args) {
  console.warn('[daily-diagnostic-audit][warn]', ...args);
}

function parseGitLogNameOnly(raw) {
  if (!raw) return [];
  const seen = new Set();
  const result = [];
  for (const line of String(raw).split('\n')) {
    const f = line.trim();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    result.push(f);
  }
  return result;
}

function filterInScope(files) {
  const result = [];
  for (const f of files) {
    for (const glob of SCOPE_GLOBS) {
      if (f.startsWith(glob.dir) && f.endsWith(glob.ext)) {
        result.push(f);
        break;
      }
    }
  }
  return result;
}

function getChangedFiles() {
  try {
    const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
    const out = execSync(
      `git log --since="${since}" --name-only --pretty=format: --no-merges origin/main 2>/dev/null || git log --since="${since}" --name-only --pretty=format: --no-merges HEAD`,
      { encoding: 'utf8' }
    );
    const files = new Set();
    for (const line of out.split('\n')) {
      const f = line.trim();
      if (!f) continue;
      if (!SCOPE_GLOBS.some((r) => r.test(f))) continue;
      if (!fs.existsSync(f)) continue;
      files.add(f);
      if (files.size >= MAX_SCOPE_FILES) break;
    }
    return Array.from(files);
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

function loadPlaybookContext() {
  const p = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p, 'utf8');
    return buf.length > 12000 ? buf.slice(0, 12000) : buf;
  }
  return `Pattern Catalog (embedded fallback):
1. Missing continue-on-error/allowError on non-critical steps.
2. Unguarded label races (concurrent issue re-labeling without lock).
3. Token permission gaps (missing scopes for POST endpoints).
4. Exit-code used as proxy metric (masking real failure).
5. Unquoted shell interpolation of untrusted input.
6. Missing timeout-minutes on long-running jobs.
7. Cron collisions with other high-traffic workflows.
8. Fail-closed on optional integrations (no OPENROUTER_API_KEY should not crash).`;
}

function loadDiagnosticModels() {
  const repoRoot = path.join(__dirname, '..');
  const modelConfigPath = path.join(repoRoot, '.github', 'agent-models.yml');
  try {
    const content = fs.readFileSync(modelConfigPath, 'utf8');
    const config = yaml.parse(content);
    const profile = config.profiles?.review || {};
    const models = [];
    if (profile.primary) models.push(profile.primary);
    if (profile.fallback) models.push(profile.fallback);
    return models.length > 0 ? models : [MODEL_PRIMARY, MODEL_FALLBACK];
  } catch {
    return [MODEL_PRIMARY, MODEL_FALLBACK];
  }
}

function buildSystemPrompt(playbookContext) {
  return `You are a code auditor. Diagnose AT MOST ONE real, code-level bug in the provided files.

RULES:
- If you cannot ground a diagnosis in the actual code shown, return {"issueFound": false}.
- Do NOT manufacture an issue and do not invent a file, line, or behavior. Do NOT guess.
- If you find something but can't propose a concrete fix, set proposedFix to "No clear fix — needs human investigation".
- Confidence must be one of: "high", "medium", "low". Use "low" if unsure.
- Return JSON only, matching this schema:
{
  "issueFound": boolean,
  "confidence": "high"|"medium"|"low",
  "file": "path/to/file",
  "line": "line number or range",
  "patternCategory": "one of the catalog patterns or 'other'",
  "diagnosis": "what the bug is and why it matters",
  "proposedFix": "concrete code-level fix, or 'No clear fix — needs human investigation'",
  "reasoning": "why you believe this, grounded in the file content"
}

FIX-PATTERN CATALOG:
${playbookContext}`;
}

function buildUserPrompt(scopeFiles, opts = {}) {
  const sinceHours = opts.sinceHours || WINDOW_HOURS;
  const maxPromptChars = opts.maxPromptChars || 50000;

  let promptText = `Audit these files (changed in the last ${sinceHours} hours):\n\n`;
  let charCount = promptText.length;

  for (let i = 0; i < scopeFiles.length; i++) {
    const file = scopeFiles[i];
    const content = file.content || readFileBounded(file.path || file);
    const path = file.path || file;
    const fileBlock = `--- FILE: ${path} ---\n${content || '(unreadable)'}\n\n`;

    if (charCount + fileBlock.length > maxPromptChars && i > 0) {
      const remaining = scopeFiles.length - i;
      promptText += `\n(${remaining} remaining files omitted due to prompt budget)`;
      break;
    }

    promptText += fileBlock;
    charCount += fileBlock.length;
  }

  return promptText;
}

function buildPrompt(files, playbook) {
  const fileBlocks = files
    .map((f) => `--- FILE: ${f} ---\n${readFileBounded(f) || '(unreadable)'}\n`)
    .join('\n');

  const system = buildSystemPrompt(playbook);
  const user = `Audit these files (changed in the last ${WINDOW_HOURS}h):\n\n${fileBlocks}`;

  return { system, user };
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
  return data.choices?.[0]?.message?.content || '';
}

function parseDiagnosis(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function parseDiagnosticResponse(text) {
  if (!text) return { valid: false, error: 'empty response' };

  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');

  let diagnosis;
  try {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return { valid: false, error: 'unparseable response (no JSON object found)' };
    diagnosis = JSON.parse(match[0]);
  } catch (err) {
    return { valid: false, error: `unparseable JSON: ${err.message}` };
  }

  if (!('issueFound' in diagnosis)) {
    return { valid: false, error: 'missing issueFound field' };
  }

  if (!['high', 'medium', 'low'].includes(diagnosis.confidence)) {
    diagnosis.confidence = 'low';
  }

  return { valid: true, diagnosis };
}

function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  if (!['high', 'medium'].includes(d.confidence)) return false;
  const diagnosis = (d.diagnosis || '').trim();
  if (!diagnosis) return false;
  return true;
}

async function hasExistingOpenDiagnosis(repo, token, file) {
  try {
    const url = `https://api.github.com/search/issues?q=repo:${repo}+is:issue+is:open+label:auto-diagnosed+${encodeURIComponent(file)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.total_count || 0) > 0;
  } catch {
    return false;
  }
}

function renderWrTitle(diagnosis) {
  return `[WR] Daily Diagnostic Audit: ${diagnosis.diagnosis || diagnosis.title || 'Code issue'} (${diagnosis.file})`;
}

function renderWrBody(opts) {
  const {
    template,
    diagnosis,
    scopeFiles,
    sinceHours,
    repoFull,
    repoUrl,
    today,
    runUrl,
  } = opts;

  let body = String(template || '');

  const issueContext = `**File:** \`${diagnosis.file}\` (line ${diagnosis.line || 'N/A'})

**Issue:** ${diagnosis.diagnosis || 'Unknown issue'}

**Pattern Category:** ${diagnosis.patternCategory || 'other'}

**Confidence:** ${diagnosis.confidence}`;

  const summary = `This issue was detected by the daily-diagnostic-audit cron scanning files changed in the last ${sinceHours} hours.

**Reasoning:** ${diagnosis.reasoning || 'See proposed fix details'}`;

  const objective = `Verify and implement the proposed fix for the detected issue.`;

  const requiredBundle = `1. Review the proposed fix in the Learnings section
2. Verify the fix against the current code in \`${diagnosis.file}\`
3. Test the fix locally before merging
4. Close this WR with a comment explaining whether the fix was applied`;

  const definitionOfDone = `- [ ] Proposed fix verified against current code
- [ ] Fix implemented (or rejected with reasoning)
- [ ] Tests pass if applicable
- [ ] This WR closed`;

  const validation = `1. Verify the issue exists in \`${diagnosis.file}\`
2. Check that the proposed fix resolves it
3. Run \`npm test\` to ensure no regressions`;

  const blockers = sinceHours > 0 ? `None—this is a best-effort detection. If the diagnosis is wrong, close this WR.` : `None.`;

  const proposedFix = `\`\`\`
${diagnosis.proposedFix || 'No clear fix — needs human investigation'}
\`\`\`

Machine-generated starting point—verify and adapt as needed.`;

  const learnings = LEARNINGS_PLACEHOLDER.replace('{SINCE_HOURS}', String(sinceHours));

  body = body.replace('{TITLE}', diagnosis.diagnosis || 'Code issue');
  body = body.replace('{ISSUE_CONTEXT}', issueContext);
  body = body.replace('{ISSUE_BODY}', issueContext);
  body = body.replace('{SUMMARY}', summary);
  body = body.replace('{OBJECTIVE}', objective);
  body = body.replace('{REQUIRED_BUNDLE}', requiredBundle);
  body = body.replace('{DEFINITION_OF_DONE}', definitionOfDone);
  body = body.replace('{VALIDATION}', validation);
  body = body.replace('{BLOCKERS}', blockers);
  body = body.replace('{PROPOSED_FIX}', proposedFix);
  body = body.replace('{LEARNINGS}', learnings);

  // If template lacks diagnostic sections, prepend them before Learnings
  if (!body.includes('## Proposed Fix')) {
    const sections = [
      '## Summary\n\n' + summary,
      '## Objective\n\n' + objective,
      '## Required Bundle\n\n' + requiredBundle,
      '## Definition of Done\n\n' + definitionOfDone,
      '## Validation\n\n' + validation,
      '## Blockers\n\n' + blockers,
      '## Proposed Fix\n\n' + proposedFix,
    ].join('\n\n');

    const learningsIdx = body.indexOf('## Learnings');
    if (learningsIdx >= 0) {
      body = body.slice(0, learningsIdx) + sections + '\n\n' + body.slice(learningsIdx);
    } else {
      body += '\n\n' + sections;
    }
  }

  if (!body.includes('## Learnings — What & Why')) {
    body += `\n\n## Learnings — What & Why\n\n${learnings}`;
  } else {
    body = body.replace(new RegExp(LEARNINGS_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), learnings);
  }

  return body;
}

function renderCoderComment() {
  return `For the implementing agent: please verify the proposed fix in the Proposed Fix section against the current code before implementing. **Don't apply blindly** — if this diagnosis is stale or incorrect, close this WR with a comment explaining why.

See the **Learnings — What & Why** section for context on why this was detected and how to verify it.`;
}

function renderBody(d) {
  const learnings = `## Learnings — What & Why

This was flagged by the daily-diagnostic-audit cron (file changed within the last ${WINDOW_HOURS}h).
See \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\` for the fix-pattern catalog.

**Verify the proposed fix before applying** — the model can be wrong. Also
consider whether this represents a new catalog-worthy pattern.`;

  return `## [WR] Auto-diagnosed: ${d.title}

**File:** \`${d.file}\`
**Category:** ${d.category || 'other'}
**Confidence:** ${d.confidence}

### Description
${d.description}

### Proposed Fix
${d.proposedFix || 'No clear fix — needs human investigation'}

### Reasoning
${d.reasoning || '(no reasoning provided)'}

${learnings}

---
🤖 Generated by daily-diagnostic-audit (see \`.github/workflows/daily-diagnostic-audit.yml\`).
`;
}

async function fileWR(repo, token, d) {
  const body = renderBody(d);
  const title = `[WR] ${d.title} (${d.file})`;
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      labels: ['WR', 'auto-diagnosed', 'needs-review'],
    }),
  });
  if (!res.ok) {
    warn('issue POST failed:', res.status, await res.text());
    return null;
  }
  const created = await res.json();
  log('filed WR:', created.html_url);

  // Coder-facing comment
  try {
    await fetch(`https://api.github.com/repos/${repo}/issues/${created.number}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: `@coding-agent: please verify the proposed fix in the issue body against the current file (\`${d.file}\`) before implementing. If the diagnosis is stale or wrong, close with a comment explaining why rather than "fixing" a non-issue.`,
      }),
    });
  } catch (err) {
    warn('comment POST failed:', err.message);
  }

  return created;
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY not set — fail-open exit 0');
    return;
  }
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    warn('GITHUB_TOKEN or GITHUB_REPOSITORY missing — fail-open exit 0');
    return;
  }

  const files = getChangedFiles();
  if (files.length === 0) {
    log(`no in-scope files changed in last ${WINDOW_HOURS}h — no-op`);
    return;
  }
  log(`scope: ${files.length} file(s):`, files.join(', '));

  const playbook = loadPlaybookContext();
  const { system, user } = buildPrompt(files, playbook);

  let content;
  try {
    content = await callOpenRouter(system, user, MODEL_PRIMARY);
  } catch (err) {
    warn('primary model failed:', err.message, '- trying fallback');
    try {
      content = await callOpenRouter(system, user, MODEL_FALLBACK);
    } catch (err2) {
      warn('fallback model failed:', err2.message, '- exit 0');
      return;
    }
  }

  const diagnosis = parseDiagnosis(content);
  if (!diagnosis) {
    warn('unparseable LLM response — exit 0');
    return;
  }
  if (!isActionableDiagnosis(diagnosis)) {
    log('no actionable diagnosis (issueFound=' + diagnosis.issueFound + ', confidence=' + diagnosis.confidence + ') — no-op');
    return;
  }

  if (await hasExistingOpenDiagnosis(repo, token, diagnosis.file)) {
    log(`existing open auto-diagnosed WR for ${diagnosis.file} — skip`);
    return;
  }

  await fileWR(repo, token, diagnosis);
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
};

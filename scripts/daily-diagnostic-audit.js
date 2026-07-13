#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Scans workflow YAML and scripts changed on `main` in the last N hours for
 * code-level bugs using an LLM grounded in AUDIT_AND_SELF_HEALING_PLAYBOOK.md.
 *
 * Guardrails:
 *   - Never auto-fixes, never opens a PR.
 *   - At most 1 WR issue filed per run.
 *   - Fail-open on any error (missing key, LLM error, parse error, etc.).
 *   - Confidence gate: only files WR for high/medium confidence, issueFound === true.
 *   - Best-effort dedupe: skips if an open `auto-diagnosed` WR references the same file.
 *
 * Companion to (not overlapping with) self-healing.yml, which looks at run
 * history / stuck labels rather than static file content.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = process.env.GITHUB_REPOSITORY || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const WINDOW_HOURS = parseInt(process.env.WINDOW_HOURS || '48', 10);
const MAX_SCOPE_FILES = parseInt(process.env.MAX_SCOPE_FILES || '8', 10);
const MAX_FILE_BYTES = 20000;

const PLAYBOOK_PATH = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';

const EMBEDDED_PLAYBOOK_SUMMARY = `
# Audit and Self-Healing Playbook (embedded fallback summary)

When diagnosing workflow YAML and Node.js scripts in this fleet, look for
these recurring bug patterns:

1. **Missing \`continue-on-error\` / \`allowError\`** on non-critical steps
   that shouldn't fail the whole workflow (label ops, comment posts,
   metric emissions).
2. **Unguarded label race conditions** — writing labels concurrently across
   overlapping workflows without a concurrency group.
3. **Token scope gaps** — using \`GITHUB_TOKEN\` where a PAT is required
   (e.g., to trigger downstream workflow_dispatch), or vice versa.
4. **Exit code used as a proxy for a business metric** — treating a
   non-zero exit as "nothing to do" rather than "failed", masking real
   errors as no-ops.
5. **Unbounded loops / missing pagination limits** on GitHub API calls.
6. **Missing timeouts** on \`jobs.<id>.timeout-minutes\` or on fetch calls.
7. **Silent \`|| true\` swallowing** hiding real failures instead of
   downgrading only expected non-fatal cases.
8. **Secrets referenced but not documented** in SECRETS_MAP.md, or
   consumed without a fallback / fail-open path.
`;

function log(msg) {
  console.log(`[daily-diagnostic-audit] ${msg}`);
}

function warn(msg) {
  console.warn(`[daily-diagnostic-audit] WARN: ${msg}`);
}

function getChangedFilesInWindow(hours) {
  try {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const out = execSync(
      `git log --since="${since}" --name-only --pretty=format: origin/main`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const files = Array.from(
      new Set(
        out
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      )
    );
    return files;
  } catch (err) {
    warn(`git log failed: ${err.message}`);
    return [];
  }
}

function filterInScope(files) {
  return files.filter((f) => {
    if (f.startsWith('.github/workflows/') && f.endsWith('.yml')) return true;
    if (f.startsWith('scripts/') && f.endsWith('.js')) return true;
    return false;
  });
}

function selectScope(hours = WINDOW_HOURS, max = MAX_SCOPE_FILES) {
  const all = getChangedFilesInWindow(hours);
  const inScope = filterInScope(all).filter((f) => {
    try {
      return fs.existsSync(f);
    } catch {
      return false;
    }
  });
  return inScope.slice(0, max);
}

function readFileTruncated(p, maxBytes = MAX_FILE_BYTES) {
  try {
    const buf = fs.readFileSync(p);
    if (buf.length <= maxBytes) return buf.toString('utf8');
    return buf.slice(0, maxBytes).toString('utf8') + '\n\n[TRUNCATED]';
  } catch (err) {
    warn(`Cannot read ${p}: ${err.message}`);
    return '';
  }
}

function loadPlaybookContext() {
  try {
    if (fs.existsSync(PLAYBOOK_PATH)) {
      const c = fs.readFileSync(PLAYBOOK_PATH, 'utf8');
      if (c.length > 8000) return c.slice(0, 8000) + '\n\n[TRUNCATED]';
      return c;
    }
  } catch (err) {
    warn(`Cannot read playbook: ${err.message}`);
  }
  return EMBEDDED_PLAYBOOK_SUMMARY;
}

function buildSystemPrompt(playbook) {
  return [
    'You are a senior code auditor for a GitHub Actions fleet.',
    'You are given a small set of recently-changed workflow YAML and Node.js',
    'script files. Your job is to identify AT MOST ONE concrete, code-level',
    'bug — not a style nit, not a hypothetical, not a "consider refactoring".',
    '',
    'CRITICAL RULES:',
    '- If nothing is clearly wrong, return `issueFound: false`. Do NOT invent findings.',
    '- If you cannot ground a specific fix, set `proposedFix` to',
    '  "No clear fix — needs human investigation" rather than guessing.',
    '- Be specific: cite file path and line/section, quote the offending snippet.',
    '- Confidence must be one of: "high", "medium", "low".',
    '- Only "high" or "medium" findings will be filed; "low" will be dropped.',
    '',
    'Use this playbook as your primary lens:',
    '',
    playbook,
    '',
    'Respond with ONLY a JSON object matching this schema:',
    '{',
    '  "issueFound": boolean,',
    '  "confidence": "high" | "medium" | "low",',
    '  "file": "path/to/file",',
    '  "title": "short imperative title",',
    '  "bugDescription": "what is wrong and why",',
    '  "offendingSnippet": "exact code excerpt",',
    '  "proposedFix": "concrete diff-like fix, or \\"No clear fix — needs human investigation\\"",',
    '  "reasoning": "why this fix, tied to the playbook pattern number if applicable"',
    '}',
  ].join('\n');
}

function buildUserPrompt(scopeFiles) {
  const parts = [
    `Analyze these ${scopeFiles.length} file(s) changed on main in the last ${WINDOW_HOURS}h:`,
    '',
  ];
  for (const f of scopeFiles) {
    parts.push(`--- FILE: ${f} ---`);
    parts.push(readFileTruncated(f));
    parts.push('');
  }
  parts.push(
    'Return your JSON verdict. Remember: it is fine — and expected — to return',
    '`issueFound: false` if nothing is clearly broken.'
  );
  return parts.join('\n');
}

async function callOpenRouter(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY not set — skipping (fail-open).');
    return null;
  }
  const body = {
    model: 'anthropic/claude-3.5-sonnet',
    models: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-r1'],
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  };
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `https://github.com/${REPO}`,
        'X-Title': 'daily-diagnostic-audit',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      warn(`OpenRouter returned ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      warn('OpenRouter response had no content.');
      return null;
    }
    return content;
  } catch (err) {
    warn(`OpenRouter call failed: ${err.message}`);
    return null;
  }
}

function parseVerdict(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) return null;
  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch (err) {
    warn(`Cannot parse verdict JSON: ${err.message}`);
    return null;
  }
}

function isActionableDiagnosis(verdict) {
  if (!verdict || typeof verdict !== 'object') return false;
  if (verdict.issueFound !== true) return false;
  const conf = String(verdict.confidence || '').toLowerCase();
  if (conf !== 'high' && conf !== 'medium') return false;
  if (!verdict.file || !verdict.title || !verdict.bugDescription) return false;
  return true;
}

function renderWRBody(verdict) {
  const learnings = [
    '## Learnings — What & Why',
    '',
    `This WR was auto-filed by \`daily-diagnostic-audit.yml\` after scanning`,
    `files changed on \`main\` in the last ${WINDOW_HOURS}h. The diagnosis is`,
    `grounded in \`${PLAYBOOK_PATH}\`'s recurring-bug catalog.`,
    '',
    '**Verify — do not blindly apply — the proposed fix.** If this represents a',
    'new recurring pattern not yet in the playbook, consider adding it.',
    '',
    `Confidence: **${verdict.confidence}**`,
  ].join('\n');

  const core = [
    `**File:** \`${verdict.file}\``,
    '',
    '### Bug',
    '',
    verdict.bugDescription,
    '',
    '### Offending snippet',
    '',
    '```',
    verdict.offendingSnippet || '(not provided)',
    '```',
    '',
    '### Proposed fix',
    '',
    verdict.proposedFix || 'No clear fix — needs human investigation',
    '',
    '### Reasoning',
    '',
    verdict.reasoning || '(none provided)',
    '',
  ].join('\n');

  const template = `[WR] ${verdict.title}\n\n${core}\n<!-- LEARNINGS_PLACEHOLDER -->\n`;
  if (template.includes('<!-- LEARNINGS_PLACEHOLDER -->')) {
    return template.replace('<!-- LEARNINGS_PLACEHOLDER -->', learnings);
  }
  return `${template}\n${learnings}\n`;
}

async function githubRequest(method, endpoint, body) {
  if (!GITHUB_TOKEN) {
    warn('No GITHUB_TOKEN — cannot call GitHub API.');
    return null;
  }
  const url = `https://api.github.com${endpoint}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      warn(`GitHub ${method} ${endpoint} → ${res.status}: ${await res.text()}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    warn(`GitHub request failed: ${err.message}`);
    return null;
  }
}

async function hasExistingOpenDiagnosis(file) {
  try {
    const q = encodeURIComponent(
      `repo:${REPO} is:issue is:open label:auto-diagnosed "${file}" in:body`
    );
    const data = await githubRequest('GET', `/search/issues?q=${q}`);
    if (!data) return false;
    return (data.total_count || 0) > 0;
  } catch (err) {
    warn(`Duplicate check failed (proceeding): ${err.message}`);
    return false;
  }
}

async function fileWR(verdict) {
  const title = `[WR] ${verdict.title}`;
  const body = renderWRBody(verdict);
  const issue = await githubRequest('POST', `/repos/${REPO}/issues`, {
    title,
    body,
    labels: ['WR', 'auto-diagnosed', 'daily-diagnostic-audit'],
  });
  if (!issue || !issue.number) {
    warn('Failed to create WR issue.');
    return null;
  }
  const coderComment = [
    '@coding-agent — implementing agent notes:',
    '',
    '- The **Proposed fix** section above is a hypothesis, not a directive.',
    '  Re-derive the fix from first principles against the file as it exists',
    '  on \`main\` at pickup time.',
    '- If the fix as proposed is wrong or already resolved, close this WR',
    '  with a comment explaining why rather than forcing a fit.',
    `- Refer to \`${PLAYBOOK_PATH}\` before implementing.`,
    '- One-file scope; do not expand beyond the diagnosed file without',
    '  explicit human approval.',
  ].join('\n');
  await githubRequest('POST', `/repos/${REPO}/issues/${issue.number}/comments`, {
    body: coderComment,
  });
  return issue.number;
}

async function main() {
  log(`Starting run (window=${WINDOW_HOURS}h, max=${MAX_SCOPE_FILES}).`);
  const scope = selectScope();
  if (scope.length === 0) {
    log('No in-scope files changed in window. Nothing to do — exiting cleanly.');
    return;
  }
  log(`Scope: ${scope.length} file(s): ${scope.join(', ')}`);

  const playbook = loadPlaybookContext();
  const systemPrompt = buildSystemPrompt(playbook);
  const userPrompt = buildUserPrompt(scope);

  const raw = await callOpenRouter(systemPrompt, userPrompt);
  if (!raw) {
    log('No LLM response (fail-open). Exiting.');
    return;
  }

  const verdict = parseVerdict(raw);
  if (!verdict) {
    log('Could not parse verdict. Exiting.');
    return;
  }

  if (!isActionableDiagnosis(verdict)) {
    log(
      `Verdict not actionable (issueFound=${verdict.issueFound}, ` +
        `confidence=${verdict.confidence}). No WR filed.`
    );
    return;
  }

  if (await hasExistingOpenDiagnosis(verdict.file)) {
    log(`Open auto-diagnosed WR already exists for ${verdict.file}. Skipping.`);
    return;
  }

  const num = await fileWR(verdict);
  if (num) log(`Filed WR #${num} for ${verdict.file}.`);
}

if (require.main === module) {
  main().catch((err) => {
    warn(`Unhandled error (fail-open): ${err.message}`);
    process.exit(0);
  });
}

module.exports = {
  selectScope,
  filterInScope,
  buildSystemPrompt,
  buildUserPrompt,
  parseVerdict,
  isActionableDiagnosis,
  renderWRBody,
  loadPlaybookContext,
};

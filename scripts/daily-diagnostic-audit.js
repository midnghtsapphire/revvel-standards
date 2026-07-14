#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Runs once/day. Diagnoses a real code-level bug in a bounded scope
 * (workflow YAML + scripts changed on main in the last N hours).
 * When it can ground a medium+ confidence diagnosis, files ONE WR issue
 * with a concrete proposed fix and reasoning embedded, plus a comment
 * addressed to the implementing coding agent.
 *
 * Fail-open everywhere: missing key, network errors, unparseable LLM
 * responses, or failed dedupe checks all log a warning and exit 0.
 *
 * NEVER auto-fixes, opens PRs, or auto-merges. Only writes:
 *   - POST /issues        (create WR)
 *   - POST /issues/{n}/comments  (agent-facing comment)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCOPE_WINDOW_HOURS = parseInt(process.env.SCOPE_WINDOW_HOURS || '48', 10);
const MAX_SCOPE_FILES = parseInt(process.env.MAX_SCOPE_FILES || '8', 10);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const PLAYBOOK_PATH = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';

const EMBEDDED_PLAYBOOK_SUMMARY = `
# Audit & Self-Healing Playbook (embedded fallback summary)

Common code-level bug patterns to look for in workflow YAML and Node scripts:

1. **Missing \`continue-on-error\` / \`allowError\`** on non-critical steps
   that block downstream reporting.
2. **Unguarded label races** — two workflows adding/removing the same label
   without a mutex or check-then-act guard.
3. **Token gaps** — a step calls the GitHub API without an explicit
   \`GITHUB_TOKEN\` env or with a token that lacks the needed scope.
4. **Exit-code-as-metric** — using \`exit 1\` to signal a domain condition
   ("no items found") that should be a normal 0-exit + log.
5. **Unbounded scope** — a script iterates the whole repo or issue list
   with no cap, risking runaway cost/time.
6. **Fail-closed on missing optional secret** — script crashes when an
   optional API key is absent instead of skipping cleanly.
7. **Silent JSON.parse of untrusted LLM output** — no try/catch around
   parsing model responses; one malformed reply crashes the run.
8. **Cron collision** — two schedules on the same minute contending for
   the same resource or issue label.
`.trim();

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
      `git log --since="${since}" --name-only --pretty=format: origin/main 2>/dev/null || git log --since="${since}" --name-only --pretty=format: HEAD`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const files = new Set();
    for (const line of out.split('\n')) {
      const f = line.trim();
      if (!f) continue;
      if (!/^(\.github\/workflows\/.*\.ya?ml|scripts\/.*\.js)$/.test(f)) continue;
      if (!fs.existsSync(f)) continue;
      files.add(f);
    }
    return Array.from(files).slice(0, MAX_SCOPE_FILES);
  } catch (e) {
    warn(`git log failed: ${e.message}`);
    return [];
  }
}

function loadPlaybookContext() {
  try {
    if (fs.existsSync(PLAYBOOK_PATH)) {
      const content = fs.readFileSync(PLAYBOOK_PATH, 'utf8');
      // Truncate to reasonable size to keep prompt bounded.
      return content.slice(0, 8000);
    }
  } catch (e) {
    warn(`could not read playbook: ${e.message}`);
  }
  return EMBEDDED_PLAYBOOK_SUMMARY;
}

function readFilesForPrompt(files) {
  const out = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      // cap per-file to keep total prompt bounded
      out.push({ path: f, content: content.slice(0, 12000) });
    } catch (e) {
      warn(`could not read ${f}: ${e.message}`);
    }
  }
  return out;
}

function buildSystemPrompt(playbookContext) {
  return `You are a code auditor for a GitHub Actions automation fleet.

You will be given the current content of a small, bounded set of files
(workflow YAML and Node scripts) that were changed on main in the last
${SCOPE_WINDOW_HOURS} hours. Diagnose at most ONE concrete, code-level bug
grounded in the actual file content.

Use this playbook as your reference for common bug patterns:

${playbookContext}

RULES:
- If you cannot ground a diagnosis in the actual file content, respond
  with issueFound: false. Do NOT manufacture a finding.
- If you find something but cannot propose a concrete fix, set proposedFix
  to "No clear fix — needs human investigation" rather than guessing.
- Confidence must be one of: "high", "medium", "low". Use "low" when you
  are uncertain — a low-confidence finding will be dropped, not filed.
- Report at most ONE issue (the highest-signal one).

Respond with ONLY a single JSON object matching this schema, no prose:
{
  "issueFound": boolean,
  "confidence": "high" | "medium" | "low",
  "file": "path/to/file" | null,
  "lineHint": "approximate line or region" | null,
  "pattern": "short pattern name from the playbook or a new one" | null,
  "title": "short imperative title for the WR" | null,
  "reasoning": "why this is a real bug, grounded in the file content" | null,
  "proposedFix": "concrete fix or 'No clear fix — needs human investigation'" | null
}`;
}

function buildUserPrompt(files) {
  const parts = [`Files changed on main in the last ${SCOPE_WINDOW_HOURS}h (${files.length} file(s)):`, ''];
  for (const f of files) {
    parts.push(`--- FILE: ${f.path} ---`);
    parts.push(f.content);
    parts.push('');
  }
  parts.push('Diagnose at most ONE code-level bug per the rules above.');
  return parts.join('\n');
}

async function callOpenRouter(systemPrompt, userPrompt) {
  const body = {
    model: 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1500
  };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://github.com/${GITHUB_REPOSITORY}`,
      'X-Title': 'daily-diagnostic-audit'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned no content');
  return content;
}

function parseDiagnosis(raw) {
  try {
    // Strip common markdown fences.
    let s = raw.trim();
    if (s.startsWith('```')) {
      s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
    // Grab first JSON object.
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(s.slice(start, end + 1));
  } catch (e) {
    warn(`could not parse LLM response: ${e.message}`);
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  if (!['high', 'medium'].includes(d.confidence)) return false;
  if (!d.title || !d.reasoning || !d.file) return false;
  return true;
}

async function ghRequest(method, urlPath, body) {
  const url = `https://api.github.com${urlPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'daily-diagnostic-audit'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub ${method} ${urlPath} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function hasExistingOpenDiagnosis(file) {
  try {
    const q = `repo:${GITHUB_REPOSITORY} is:issue is:open label:auto-diagnosed "${file}" in:body`;
    const res = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(q)}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'daily-diagnostic-audit'
        }
      }
    );
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.items) && json.items.length > 0;
  } catch (e) {
    warn(`dedupe check failed (proceeding fail-open): ${e.message}`);
    return false;
  }
}

function renderWRBody(d) {
  const learnings = [
    '## Learnings — What & Why',
    '',
    `This WR was filed by the daily diagnostic audit because a bounded scan of files changed on \`main\` in the last ${SCOPE_WINDOW_HOURS}h surfaced a **${d.confidence}-confidence** code-level issue grounded in \`${d.file}\`.`,
    '',
    `Pattern: **${d.pattern || 'uncategorized'}**. See \`${PLAYBOOK_PATH}\` for the fix-pattern catalog.`,
    '',
    '**Instructions to the implementing agent:** verify the diagnosis against the current file (do NOT blindly apply the proposed fix — the file may have moved on since diagnosis). If the diagnosis is a new pattern not yet in the playbook, consider whether it is catalog-worthy.'
  ].join('\n');

  const template = [
    `# [WR] ${d.title}`,
    '',
    '## Scope',
    `- **File:** \`${d.file}\``,
    `- **Line hint:** ${d.lineHint || 'n/a'}`,
    `- **Pattern:** ${d.pattern || 'uncategorized'}`,
    `- **Confidence:** ${d.confidence}`,
    '',
    '## Reasoning (grounded in file content)',
    '',
    d.reasoning,
    '',
    '## Proposed Fix',
    '',
    d.proposedFix || 'No clear fix — needs human investigation',
    '',
    '<!-- LEARNINGS_PLACEHOLDER -->',
    '',
    '---',
    '_Filed by `daily-diagnostic-audit.yml`. Never auto-fixes, never opens PRs, never auto-merges._'
  ].join('\n');

  // Defensive: if a Learnings placeholder is present, substitute; else append.
  if (template.includes('<!-- LEARNINGS_PLACEHOLDER -->')) {
    return template.replace('<!-- LEARNINGS_PLACEHOLDER -->', learnings);
  }
  return `${template}\n\n${learnings}`;
}

function renderAgentComment(d) {
  return [
    '@coding-agent — please handle this WR.',
    '',
    '**Verification steps before applying:**',
    `1. Re-read \`${d.file}\` at HEAD; the diagnosis was made against a possibly-older revision.`,
    '2. Confirm the reasoning still applies to the current content.',
    '3. If confirmed, apply the proposed fix (or a better one). If not, close this WR with a short note.',
    '4. Do NOT bypass review. This WR expects the normal `wr-pr-creation.yml` → review/merge pipeline.',
    '',
    `_Diagnosis confidence: **${d.confidence}**. A low-confidence finding would have been dropped, not filed._`
  ].join('\n');
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY not set — exiting fail-open with no action.');
    return;
  }
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    warn('GITHUB_TOKEN or GITHUB_REPOSITORY not set — exiting fail-open.');
    return;
  }

  const scopeFiles = getChangedFilesInWindow(SCOPE_WINDOW_HOURS);
  log(`scope: ${scopeFiles.length} file(s) in last ${SCOPE_WINDOW_HOURS}h`);
  if (scopeFiles.length === 0) {
    log('quiet-scope day: nothing to audit. 0 API calls, 0 WRs.');
    return;
  }

  const files = readFilesForPrompt(scopeFiles);
  if (files.length === 0) {
    log('no readable files in scope — exiting.');
    return;
  }

  const playbook = loadPlaybookContext();
  const systemPrompt = buildSystemPrompt(playbook);
  const userPrompt = buildUserPrompt(files);

  let raw;
  try {
    raw = await callOpenRouter(systemPrompt, userPrompt);
  } catch (e) {
    warn(`OpenRouter call failed (fail-open): ${e.message}`);
    return;
  }

  const diagnosis = parseDiagnosis(raw);
  if (!diagnosis) {
    warn('no parseable diagnosis returned — exiting.');
    return;
  }

  if (!isActionableDiagnosis(diagnosis)) {
    log(`no actionable finding (issueFound=${diagnosis.issueFound}, confidence=${diagnosis.confidence}) — 0 WRs filed.`);
    return;
  }

  const dupe = await hasExistingOpenDiagnosis(diagnosis.file);
  if (dupe) {
    log(`open auto-diagnosed WR already references ${diagnosis.file} — skipping.`);
    return;
  }

  const body = renderWRBody(diagnosis);
  const title = `[WR] ${diagnosis.title}`.slice(0, 240);

  try {
    const created = await ghRequest(
      'POST',
      `/repos/${GITHUB_REPOSITORY}/issues`,
      {
        title,
        body,
        labels: ['WR', 'auto-diagnosed', 'daily-diagnostic-audit']
      }
    );
    log(`filed WR #${created.number}`);

    try {
      await ghRequest(
        'POST',
        `/repos/${GITHUB_REPOSITORY}/issues/${created.number}/comments`,
        { body: renderAgentComment(diagnosis) }
      );
      log(`posted agent-facing comment on #${created.number}`);
    } catch (e) {
      warn(`could not post comment (WR still filed): ${e.message}`);
    }
  } catch (e) {
    warn(`could not file WR (fail-open): ${e.message}`);
  }
}

if (require.main === module) {
  main().catch(e => {
    warn(`unexpected error (fail-open): ${e.message}`);
    process.exit(0);
  });
}

module.exports = {
  getChangedFilesInWindow,
  loadPlaybookContext,
  buildSystemPrompt,
  buildUserPrompt,
  parseDiagnosis,
  isActionableDiagnosis,
  renderWRBody,
  renderAgentComment,
  EMBEDDED_PLAYBOOK_SUMMARY,
};

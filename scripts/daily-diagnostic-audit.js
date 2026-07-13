#!/usr/bin/env node
/**
 * Daily Diagnostic Audit
 *
 * Runs once per day. Diagnoses a real code-level bug in a bounded scope
 * (workflows + scripts changed on main in the last N hours). Files ONE
 * WR issue with a concrete proposed fix only when a diagnosis is grounded
 * at medium+ confidence.
 *
 * Fail-open everywhere: missing secrets, LLM errors, parse errors, or
 * duplicate-check failures all log and exit 0.
 *
 * See standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const MAX_SCOPE_FILES = parseInt(process.env.MAX_SCOPE_FILES || '8', 10);
const SCOPE_WINDOW_HOURS = parseInt(process.env.SCOPE_WINDOW_HOURS || '48', 10);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

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

function getChangedFiles(windowHours) {
  try {
    const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    const out = execSync(
      `git log --since="${since}" --name-only --pretty=format: origin/main 2>/dev/null || git log --since="${since}" --name-only --pretty=format:`,
      { encoding: 'utf8' }
    );
    const files = new Set();
    for (const line of out.split('\n')) {
      const f = line.trim();
      if (!f) continue;
      if (SCOPE_PATTERNS.some((r) => r.test(f))) files.add(f);
    }
    return Array.from(files).filter((f) => {
      try {
        return fs.existsSync(f);
      } catch {
        return false;
      }
    });
  } catch (e) {
    warn(`git log failed: ${e.message}`);
    return [];
  }
}

function loadPlaybookContext() {
  const p = 'standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md';
  try {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      // truncate to keep prompt bounded
      return content.slice(0, 8000);
    }
  } catch (e) {
    warn(`playbook read failed: ${e.message}`);
  }
  // Embedded fallback: summary of the 8-pattern catalog
  return `# Audit & Self-Healing Playbook (embedded fallback)

Common code-level bug patterns to look for:
1. Missing \`continue-on-error\` / \`allowError\` where a step is non-critical but currently fails the whole job.
2. Unguarded label race conditions (two workflows racing to add/remove the same label).
3. Missing or wrong \`GITHUB_TOKEN\` / secret reference (e.g. using default token where ADMIN token is required for cross-repo or org-level actions).
4. Exit-code-as-proxy-metric (using process exit code to signal a business condition instead of structured output).
5. Unbounded loops or unpaginated API calls that will fail silently past page 1.
6. Missing timeout-minutes on long-running jobs.
7. Shell-injection via untrusted \${{ github.event.* }} interpolation into run: blocks.
8. Fail-closed on optional dependencies (crashing when an optional secret/service is missing instead of skipping gracefully).
`;
}

function buildPrompt(files, playbook) {
  const fileBlocks = files.map((f) => {
    let content = '';
    try {
      content = fs.readFileSync(f, 'utf8').slice(0, 12000);
    } catch (e) {
      content = `<read error: ${e.message}>`;
    }
    return `--- FILE: ${f} ---\n${content}\n`;
  }).join('\n');

  const system = `You are a code-level bug diagnostician for a GitHub Actions fleet.

You look ONLY at file content (workflow YAML and Node scripts). You do NOT
look at run history, issue state, or agent health. Your job is to find at
most ONE grounded, code-level bug in the provided files and propose a
concrete fix.

Rules:
- If you cannot ground a diagnosis in the code, respond with issueFound=false.
  DO NOT manufacture findings.
- If you can identify a real issue but cannot propose a concrete fix, set
  proposedFix to "No clear fix — needs human investigation" rather than guess.
- Confidence must be one of: "high", "medium", "low". Use "low" if you are
  unsure; a low-confidence finding will be dropped.
- Cap: ONE finding per response. Pick the highest-signal one.

Respond with a single JSON object matching this schema:
{
  "issueFound": boolean,
  "confidence": "high" | "medium" | "low",
  "file": string,          // relative repo path
  "lineHint": string,      // e.g. "lines 42-48" or "step: 'Run tests'"
  "patternCategory": string, // e.g. one of the playbook's 8 patterns
  "title": string,         // short imperative title, no prefix
  "description": string,   // 2-5 sentences: what is wrong and why
  "proposedFix": string,   // concrete fix, or "No clear fix — needs human investigation"
  "reasoning": string      // 2-4 sentences: how the code grounds this
}

Reference playbook:
${playbook}`;

  const user = `Review the following ${files.length} recently-changed file(s) and find at most ONE grounded code-level bug.

${fileBlocks}`;

  return { system, user };
}

function callOpenRouter({ system, user }) {
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

    const req = https.request(
      {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Length': Buffer.byteLength(body),
          'HTTP-Referer': 'https://github.com/' + (GITHUB_REPOSITORY || ''),
          'X-Title': 'daily-diagnostic-audit',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.message?.content || '';
              resolve(content);
            } catch (e) {
              reject(new Error(`bad response JSON: ${e.message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 400)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error('openrouter timeout'));
    });
    req.write(body);
    req.end();
  });
}

function parseDiagnosis(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // strip code fences if present
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // find first { ... } block
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch (e) {
    warn(`parseDiagnosis failed: ${e.message}`);
    return null;
  }
}

function isActionableDiagnosis(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.issueFound !== true) return false;
  const c = String(d.confidence || '').toLowerCase();
  if (c !== 'high' && c !== 'medium') return false;
  if (!d.file || !d.title || !d.description) return false;
  return true;
}

function githubRequest(method, pathname, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : '';
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: pathname,
        method,
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'daily-diagnostic-audit',
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`GH ${res.statusCode}: ${data.slice(0, 300)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('github timeout')));
    if (body) req.write(body);
    req.end();
  });
}

async function hasExistingOpenDiagnosis(file) {
  try {
    const q = encodeURIComponent(
      `repo:${GITHUB_REPOSITORY} is:issue is:open label:auto-diagnosed "${file}" in:body`
    );
    const res = await githubRequest('GET', `/search/issues?q=${q}`);
    return (res?.total_count || 0) > 0;
  } catch (e) {
    warn(`dedupe check failed: ${e.message}`);
    return false; // fail-open: proceed rather than block
  }
}

function renderWrBody(d) {
  const learnings = `## Learnings — What & Why

This WR was filed by the **daily diagnostic audit** because the file
\`${d.file}\` was changed in the last ${SCOPE_WINDOW_HOURS}h and a
medium+ confidence code-level issue was grounded in its content. See
\`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\` for the audit method
and the fix-pattern catalog this diagnosis draws from.

**Instructions to the implementing agent:** verify the proposed fix
against the actual file before applying — do NOT blindly apply it. If
you discover a pattern not already in the playbook catalog, consider
filing a follow-up to extend it.`;

  const body = `## Diagnosis

**File:** \`${d.file}\`
**Location:** ${d.lineHint || 'n/a'}
**Pattern:** ${d.patternCategory || 'unclassified'}
**Confidence:** ${d.confidence}

${d.description}

## Proposed Fix

${d.proposedFix || 'No clear fix — needs human investigation'}

## Reasoning

${d.reasoning || '(none provided)'}

<!-- Learnings placeholder -->
${learnings}

---
_Filed by \`.github/workflows/daily-diagnostic-audit.yml\`. Guardrails:
no auto-fix, no auto-PR, no auto-merge. This is a request for the
normal WR → coding-agent → review pipeline to act on._`;

  return body;
}

function renderCoderComment(d) {
  return `Hi coding agent 👋

This WR was auto-diagnosed. Before implementing:

1. **Verify** the diagnosis in \`${d.file}\` at \`${d.lineHint || 'n/a'}\` — the proposed fix is a hypothesis, not ground truth.
2. If the diagnosis is wrong, close this WR with a comment explaining why (that's a valuable signal).
3. If correct, apply the fix, then check whether the pattern (\`${d.patternCategory || 'unclassified'}\`) is already in \`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md\`. If not, mention it in your PR.

Confidence: **${d.confidence}**. Medium-confidence diagnoses are more likely to need adjustment.`;
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    warn('OPENROUTER_API_KEY missing — exiting cleanly (fail-open)');
    return;
  }
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    warn('GITHUB_TOKEN or GITHUB_REPOSITORY missing — exiting cleanly');
    return;
  }

  const files = getChangedFiles(SCOPE_WINDOW_HOURS).slice(0, MAX_SCOPE_FILES);
  if (files.length === 0) {
    log(`quiet-scope day: no in-scope files changed in last ${SCOPE_WINDOW_HOURS}h — no-op`);
    return;
  }
  log(`scope: ${files.length} file(s): ${files.join(', ')}`);

  const playbook = loadPlaybookContext();
  const prompt = buildPrompt(files, playbook);

  let raw;
  try {
    raw = await callOpenRouter(prompt);
  } catch (e) {
    warn(`OpenRouter call failed: ${e.message} — exiting cleanly`);
    return;
  }

  const diagnosis = parseDiagnosis(raw);
  if (!diagnosis) {
    warn('could not parse LLM response as JSON — exiting cleanly');
    return;
  }

  if (!isActionableDiagnosis(diagnosis)) {
    log(
      `no actionable finding (issueFound=${diagnosis.issueFound}, confidence=${diagnosis.confidence}) — no WR filed`
    );
    return;
  }

  if (await hasExistingOpenDiagnosis(diagnosis.file)) {
    log(`open auto-diagnosed WR already references ${diagnosis.file} — skipping`);
    return;
  }

  const title = `[WR] ${diagnosis.title}`;
  const body = renderWrBody(diagnosis);
  const labels = ['wr', 'auto-diagnosed', 'daily-diagnostic-audit'];

  let issue;
  try {
    issue = await githubRequest('POST', `/repos/${GITHUB_REPOSITORY}/issues`, {
      title,
      body,
      labels,
    });
    log(`filed WR #${issue.number}: ${title}`);
  } catch (e) {
    warn(`failed to create WR: ${e.message} — exiting cleanly`);
    return;
  }

  try {
    await githubRequest(
      'POST',
      `/repos/${GITHUB_REPOSITORY}/issues/${issue.number}/comments`,
      { body: renderCoderComment(diagnosis) }
    );
    log(`added coder-facing comment to #${issue.number}`);
  } catch (e) {
    warn(`failed to add comment (WR still filed): ${e.message}`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    warn(`unhandled: ${e.message} — exiting cleanly`);
    process.exit(0);
  });
}

module.exports = {
  getChangedFiles,
  loadPlaybookContext,
  buildPrompt,
  parseDiagnosis,
  isActionableDiagnosis,
  renderWrBody,
  renderCoderComment,
  SCOPE_PATTERNS,
};

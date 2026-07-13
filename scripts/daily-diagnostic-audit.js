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
"use strict";

/**
 * Daily Diagnostic Audit — bounded, code-level bug diagnosis with an
 * embedded proposed fix, filed as a WR issue for the existing fleet
 * pipeline to pick up.
 *
 * WHAT THIS IS NOT (read before touching this file):
 * `.github/workflows/self-healing.yml` already scans recent workflow RUNS,
 * stuck issues, and agent health every 4 hours and files [SELF-HEAL]/
 * [AGENT-FAILURE] issues for OPERATIONAL failures ("a workflow crashed",
 * "an issue is stuck"). This script is a DIFFERENT lens: static CODE-LEVEL
 * bug diagnosis — the kind of thing found in a manual audit pass (missing
 * `allowError`, unguarded label races, token/permission gaps, exit-code-as-
 * proxy-metric bugs — see standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md).
 * It never inspects workflow run history or issue state. If you find
 * yourself adding run-history/issue-state checks here, that belongs in
 * self-healing.yml instead — keep the two lenses non-overlapping.
 *
 * BOUNDED SCOPE (never a full repo sweep):
 * Each run only examines files touched on `main` in the last
 * SCOPE_WINDOW_HOURS hours (default 48), restricted to `.github/workflows/
 * *.yml` and `scripts/*.js` — this fleet's actual blast radius, and the
 * same file classes the playbook's pattern catalog was built from. This is
 * naturally non-repetitive: a file that was flagged but never fixed simply
 * ages out of the 24-48h window on the next run rather than being
 * re-diagnosed forever, and a run with a quiet last 48h finds nothing and
 * files nothing — that is expected and fine (mirrors
 * scripts/octopus-review-fallback.js's "best-effort, never force it"
 * philosophy: never manufacture an issue just to have output).
 *
 * OUTPUT CAP: at most one WR issue per run (a single LLM call is asked for
 * a single diagnosis, not a list) plus one follow-up comment addressed to
 * whichever coding agent picks up the WR. This script NEVER opens a PR,
 * NEVER pushes a commit, and NEVER applies the fix it proposes — filing a
 * WR is a request for the existing openrouter-assignee.yml -> wr-pr-
 * creation.yml -> coding-agent -> review/merge pipeline to act on, not a
 * bypass of human/AI review (see WR #15833).
 *
 * Wiring: .github/workflows/daily-diagnostic-audit.yml
 * Methodology + pattern catalog: standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { callOpenRouter } = require("./openrouter-routing.js");

const REPO_ROOT = path.join(__dirname, "..");
const GITHUB_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards";

const SCOPE_WINDOW_HOURS = parseInt(process.env.SCOPE_WINDOW_HOURS || "48", 10);
const MAX_SCOPE_FILES = parseInt(process.env.MAX_SCOPE_FILES || "8", 10);
const MAX_FILE_CHARS = parseInt(process.env.MAX_FILE_CHARS || "9000", 10);
const MAX_PROMPT_CHARS = parseInt(process.env.MAX_PROMPT_CHARS || "45000", 10);
const MAX_PLAYBOOK_CHARS = parseInt(process.env.MAX_PLAYBOOK_CHARS || "12000", 10);

// Only these file classes are in scope — this is the fleet's actual blast
// radius (workflow YAML + the Node scripts that drive it), and matches the
// file classes the playbook's pattern catalog (below) was derived from.
// Markdown/docs/config churn is deliberately excluded: it is not where the
// established fix-pattern catalog applies, and including it would dilute a
// single bounded LLM call across unrelated file classes.
const SCOPE_GLOBS = [
  { dir: ".github/workflows/", ext: ".yml" },
  { dir: "scripts/", ext: ".js" },
];

const WR_LABELS = ["work-request", "auto-diagnosed"];
const WR_ASSIGNEES = ["oaudrey"];

const PLAYBOOK_PATH = path.join(REPO_ROOT, "standards", "AUDIT_AND_SELF_HEALING_PLAYBOOK.md");

// Fallback summary of the pattern catalog, used only if
// standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md is unavailable at runtime
// (e.g. this workflow runs on a commit before that doc merged). Keep this
// in sync with the "Self-Healing Correction Pattern Catalog" section of the
// real doc; the real doc is always preferred when present (loadPlaybookContext).
const EMBEDDED_CATALOG_SUMMARY = `## Self-Healing Correction Pattern Catalog (embedded fallback summary)

1. Unguarded \`removeLabel\`/API race — no try/catch around a removal call that
   can 404 when a concurrent workflow already removed the same label/item.
2. Missing \`allowError: true\` (or equivalent try/catch) on internal API
   helpers — a self-healing/sweep script hard-crashes on one transient error
   instead of logging a warning and finishing the rest of the sweep.
3. Default \`GITHUB_TOKEN\` used for agent-created PRs/labels — GitHub blocks
   the default token from triggering other workflows, so agent-authored PRs
   silently never cascade into downstream review/CI. Needs the repo's
   \`ADMIN_GITHUB_TOKEN\`-with-fallback pattern.
4. Secrets passed via argv instead of stdin — a plaintext secret readable via
   \`/proc/<pid>/cmdline\` or \`ps aux\` for the life of the process.
5. Bash bare-array-variable bug — \`"$ARRAY_VAR"\` without \`[@]\`/\`[*]\` only
   ever expands to the array's first element, so a membership check silently
   only matches that one element.
6. Exit code as a proxy metric instead of true resolution state — a script
   exits 0 based on a counter that can read zero for the WRONG reason (a
   different, unhandled failure path never increments it), not on an
   explicit "was this actually fully resolved?" check.
7. \`nosemgrep\` suppression comment adjacency — the suppression directive
   only applies when it is the LAST comment line immediately above the
   flagged code; an explanatory comment inserted between them silently
   breaks the suppression.
8. Broken third-party GitHub Action — the same named check fails identically
   across many unrelated PRs because a pinned third-party Action tag itself
   is broken (e.g. missing \`dist/index.js\`), not anything in this repo's diff.

Also watch for the CLAUDE.md "Recurring gotchas" #1-#4: missing \`GH_REPO\` on
checkout-less \`gh\` jobs, missing \`GH_TOKEN\`/\`GITHUB_TOKEN\`, permissions
narrower than what the job does, and untrusted \`\${{ ... }}\` interpolated
directly into a \`run:\` shell instead of passed through \`env:\`.`;

/**
 * Loads the playbook's methodology + pattern catalog for grounding the
 * diagnostic system prompt. Prefers the live file (kept current as new
 * patterns are added); falls back to the embedded summary above if the
 * file is unavailable (e.g. running from a commit before it merged) —
 * never hard-fails just because a reference doc is missing.
 */
function loadPlaybookContext() {
  try {
    if (fs.existsSync(PLAYBOOK_PATH)) {
      const raw = fs.readFileSync(PLAYBOOK_PATH, "utf8");
      return raw.slice(0, MAX_PLAYBOOK_CHARS);
    }
  } catch (err) {
    console.warn(`Could not read ${PLAYBOOK_PATH}, using embedded catalog summary: ${err.message}`);
  }
  return EMBEDDED_CATALOG_SUMMARY;
}

/**
 * Parses raw `git log --name-only --pretty=format:` output into a deduped,
 * order-preserving list of non-empty file paths. Pure function — no I/O —
 * so it is unit-testable without a real git repo.
 */
function parseGitLogNameOnly(rawOutput) {
  if (!rawOutput) return [];
  const seen = new Set();
  const files = [];
  for (const line of String(rawOutput).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    files.push(trimmed);
  }
  return files;
}

/**
 * Filters a file list down to the in-scope glob set (SCOPE_GLOBS), in a
 * pure/testable way (no filesystem access — existence is checked
 * separately by the caller since that needs a real checkout).
 */
function filterInScope(files) {
  return files.filter((file) =>
    SCOPE_GLOBS.some((glob) => file.startsWith(glob.dir) && file.endsWith(glob.ext)),
  );
}

/**
 * Runs `git log --since=<N>.hours.ago --name-only` against the given repo
 * root and returns the bounded, in-scope, still-existing file list. This is
 * the only I/O-performing scope function; parseGitLogNameOnly/filterInScope
 * above carry the testable logic.
 */
function selectScopeFiles({ repoRoot = REPO_ROOT, sinceHours = SCOPE_WINDOW_HOURS, maxFiles = MAX_SCOPE_FILES } = {}) {
  let raw;
  try {
    raw = execFileSync(
      "git",
      ["log", `--since=${sinceHours}.hours.ago`, "--name-only", "--pretty=format:", "--", ".github/workflows", "scripts"],
      { cwd: repoRoot, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    );
  } catch (err) {
    console.warn(`git log scope scan failed, treating as empty scope: ${err.message}`);
    return [];
  }

  const files = filterInScope(parseGitLogNameOnly(raw))
    .filter((file) => fs.existsSync(path.join(repoRoot, file))) // skip deleted files
    .sort();

  return files.slice(0, maxFiles);
}

/**
 * Reads scope file contents, capping each file and the overall prompt so a
 * single anomalously large file can't blow the token budget.
 */
function readScopeFileContents(files, { repoRoot = REPO_ROOT, maxFileChars = MAX_FILE_CHARS } = {}) {
  const out = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
      out.push({ path: file, content: content.slice(0, maxFileChars) });
    } catch (err) {
      console.warn(`Could not read scope file ${file}, skipping: ${err.message}`);
    }
  }
  return out;
}

/**
 * Builds the diagnostic system prompt: explains the task, grounds it in the
 * playbook's method + pattern catalog, and demands a structured JSON
 * response. Explicitly instructs the model to say it found nothing / has no
 * grounded fix rather than guess — a wrong "embedded fix" is worse than no
 * fix (see standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md step 2: "demand
 * file:line citations and real code quotes, not summaries").
 */
function buildSystemPrompt(playbookContext) {
  return [
    "You are the fleet's daily diagnostic auditor for the revvel-standards repo.",
    "You run once a day against a SMALL, bounded set of recently-changed files",
    "(GitHub Actions workflow YAML and Node scripts) and look for a genuine,",
    "grounded, code-level bug — not an operational failure (a workflow run",
    "crashing or an issue getting stuck is a DIFFERENT system's job, not yours).",
    "",
    "Ground your diagnosis in this repo's established audit methodology and",
    "fix-pattern catalog (read it before responding):",
    "",
    playbookContext,
    "",
    "RULES:",
    "1. Only report an issue you can point to with a specific file and",
    "   line/location from the content you were actually given below — never",
    "   invent a file, line, or behavior you were not shown.",
    "2. Only propose a fix you are genuinely confident about, grounded in the",
    '   given content. If you found a real issue but cannot ground a concrete',
    '   fix, set proposedFix to "No clear fix — needs human investigation" and',
    "   lower confidence accordingly. A wrong proposed fix is worse than none.",
    "3. If you find nothing worth a human/agent's time in the given files, say",
    '   so plainly (issueFound: false) — do not manufacture an issue.',
    "4. Reply with ONLY a single JSON object, no prose before or after it, no",
    "   markdown code fence, matching exactly this shape:",
    "{",
    '  "issueFound": boolean,',
    '  "file": string | null,',
    '  "line": string | null,',
    '  "patternCategory": string,',
    '  "diagnosis": string,',
    '  "proposedFix": string,',
    '  "confidence": "high" | "medium" | "low",',
    '  "reasoning": string',
    "}",
    "`patternCategory` should name the matching catalog category (or",
    '"other" if it does not fit one). `reasoning` should explain WHY this',
    "matters (impact, blast radius) so a reviewer can triage quickly.",
  ].join("\n");
}

/**
 * Builds the user message: the actual file contents in scope, capped to
 * MAX_PROMPT_CHARS overall so the request stays bounded regardless of how
 * many/large the in-scope files are.
 */
function buildUserPrompt(scopeFiles, { sinceHours = SCOPE_WINDOW_HOURS, maxPromptChars = MAX_PROMPT_CHARS } = {}) {
  const header =
    `Files changed on main in the last ${sinceHours} hours (in-scope glob: ` +
    `.github/workflows/*.yml, scripts/*.js), ${scopeFiles.length} file(s):\n` +
    scopeFiles.map((f) => `- ${f.path}`).join("\n") +
    "\n\nFull content of each file follows.\n\n";

  let body = header;
  for (const file of scopeFiles) {
    const chunk = `--- FILE: ${file.path} ---\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    if (body.length + chunk.length > maxPromptChars) {
      body += `(remaining files omitted — prompt budget reached)\n`;
      break;
    }
    body += chunk;
  }
  return body;
}

/**
 * Parses and validates the LLM's structured diagnostic response. Tolerant
 * of a wrapping ```json fence (models do this even when told not to).
 * Returns { valid: true, diagnosis } or { valid: false, error }.
 */
function parseDiagnosticResponse(text) {
  if (!text || !String(text).trim()) {
    return { valid: false, error: "empty response" };
  }
  let jsonText = String(text).trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) jsonText = fenceMatch[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return { valid: false, error: `unparseable JSON: ${err.message}` };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { valid: false, error: "response is not a JSON object" };
  }
  if (typeof parsed.issueFound !== "boolean") {
    return { valid: false, error: "missing/invalid issueFound boolean" };
  }

  const confidence = String(parsed.confidence || "low").toLowerCase();
  const diagnosis = {
    issueFound: parsed.issueFound,
    file: parsed.file || null,
    line: parsed.line != null ? String(parsed.line) : null,
    patternCategory: parsed.patternCategory || "other",
    diagnosis: parsed.diagnosis || "",
    proposedFix: parsed.proposedFix || "",
    confidence: ["high", "medium", "low"].includes(confidence) ? confidence : "low",
    reasoning: parsed.reasoning || "",
  };

  return { valid: true, diagnosis };
}

/**
 * Gate: is this diagnosis worth filing a WR for? Requires issueFound=true,
 * at least "medium" confidence, and a non-empty diagnosis string. A "low"
 * confidence finding is deliberately dropped — see RULES #2/#3 in the
 * system prompt and constraint #5 in the originating WR: a wrong embedded
 * fix is worse than no fix, and a low-confidence issue report is not much
 * better.
 */
function isActionableDiagnosis(diagnosis) {
  if (!diagnosis || !diagnosis.issueFound) return false;
  if (!["high", "medium"].includes(diagnosis.confidence)) return false;
  return Boolean(diagnosis.diagnosis && diagnosis.diagnosis.trim());
}

// Same placeholder text WR_TEMPLATE_BASIC.md/FULL.md ship with (see
// .github/workflows/followup-checkbox-router.yml LEARNINGS_PLACEHOLDER) —
// used to swap in real "Learnings — What & Why" content the same way that
// workflow already does, for consistency between the two WR-generating
// automations.
const LEARNINGS_PLACEHOLDER =
  "_Why this WR exists, and what the assigned agent should know before starting. " +
  "Populated automatically for follow-up-generated WRs; agents completing other WR " +
  "types should fill this in themselves once done, summarizing what they did and why, " +
  "for future audits._";

/**
 * Renders the WR issue title from a diagnosis.
 */
function renderWrTitle(diagnosis) {
  const short = (diagnosis.diagnosis || "code issue").split(/\r?\n/)[0].slice(0, 80);
  const location = diagnosis.file ? ` (${diagnosis.file})` : "";
  return `[WR] Daily Diagnostic Audit: ${short}${location}`.slice(0, 250);
}

/**
 * Renders the full WR issue body from wr/WR_TEMPLATE_BASIC.md: a bug/chore
 * diagnosis has no product/market research surface, so BASIC is always the
 * right template here (mirrors followup-checkbox-router.yml's
 * classifyTemplate default for short, single-topic follow-ups).
 *
 * Two additions beyond the standard token substitution:
 *  - A "## Proposed Fix" section is inserted (BASIC has no token for this,
 *    so it is spliced in structurally rather than by editing the shared
 *    template file — avoids fighting other in-flight template edits).
 *  - "## Learnings — What & Why" is populated via LEARNINGS_PLACEHOLDER
 *    substitution when present; if the checked-out template predates that
 *    section (it landed in a sibling PR the same day), the section is
 *    appended instead so the instruction is never silently dropped.
 */
function renderWrBody({ template, diagnosis, scopeFiles, sinceHours, repoFull, repoUrl, today, runUrl }) {
  const issueContext = [
    "Auto-generated by the daily diagnostic audit cron " +
      "(`.github/workflows/daily-diagnostic-audit.yml` -> `scripts/daily-diagnostic-audit.js`).",
    "",
    `**Scope this run:** files changed on \`main\` in the last ${sinceHours} hours, ` +
      "restricted to `.github/workflows/*.yml` and `scripts/*.js`:",
    ...scopeFiles.map((f) => `- \`${f}\``),
    "",
    `**Pattern category:** ${diagnosis.patternCategory}`,
    `**Confidence:** ${diagnosis.confidence}`,
    diagnosis.file ? `**File:** \`${diagnosis.file}\`${diagnosis.line ? ` (line ${diagnosis.line})` : ""}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const proposedFixSection = [
    "> **Machine-generated starting point — verify before applying, do not apply blindly.**",
    "> This is the daily diagnostic cron's proposed fix, produced from the file content",
    "> given to it in this run. It has not been tested and may be wrong or incomplete.",
    "",
    "**Diagnosis:**",
    "",
    diagnosis.diagnosis,
    "",
    "**Proposed fix:**",
    "",
    diagnosis.proposedFix || "No clear fix — needs human investigation.",
    "",
    "**Why this matters:**",
    "",
    diagnosis.reasoning || "(not provided)",
  ].join("\n");

  const learningsContent = [
    `**Why this WR exists:** flagged by the daily diagnostic audit cron ` +
      `(pattern category: ${diagnosis.patternCategory}, confidence: ${diagnosis.confidence}). ` +
      `See run: ${runUrl}`,
    "",
    "**Methodology + pattern catalog:** `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` " +
      "— read it before starting; it documents the audit method this WR was produced by " +
      "and a fast-lookup catalog of fix patterns already found more than once in this repo.",
    "",
    "**Instructions for the implementing agent:**",
    "1. Verify the proposed fix above against the *current* code before applying it — " +
      "line numbers and context can drift between when this WR was filed and when you pick it up.",
    "2. Do not apply it blindly. If it is wrong, adapt it or take a different approach, and " +
      "say so (and why) in your PR description.",
    "3. Once resolved, consider whether this reveals a new recurring pattern worth adding to " +
      "`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`'s catalog (or whether it matches an " +
      "existing one, in which case cite it).",
  ].join("\n");

  let body = template;
  body = body.split("{TITLE}").join(renderWrTitle(diagnosis).replace(/^\[WR\]\s*/, ""));
  body = body.split("{ISSUE_REF}").join("N/A — no source issue, auto-diagnosed");
  body = body.split("{DATE}").join(today);
  body = body.split("{REPO}").join(repoFull);
  body = body.split("{STATUS}").join("🟡 In Progress");
  body = body.split("{ISSUE_BODY}").join(issueContext);
  body = body.split("{SUMMARY}").join(
    `The daily diagnostic audit cron flagged a likely code-level bug in ` +
      `\`${diagnosis.file || "(file not specified)"}\`: ${diagnosis.diagnosis}`,
  );
  body = body.split("{OBJECTIVE}").join(
    "Verify the diagnosis below and, if correct, apply the proposed fix (or an adapted " +
      "approach) to resolve it. If the diagnosis turns out to be wrong or not reproducible, " +
      "comment explaining why and close as invalid rather than force-applying the proposed fix.",
  );
  body = body.split("{REQUIRED_BUNDLE}").join(
    `Fix ${diagnosis.file ? `\`${diagnosis.file}\`` : "the affected file(s)"} per the Proposed ` +
      "Fix section below (or an adapted approach); add/adjust a regression test where practical; " +
      "keep `npm test` green.",
  );
  body = body.split("{DEFINITION_OF_DONE}").join(
    `The diagnosed issue is resolved (via the proposed fix or an adapted approach), ` +
      "`npm ci && npm test` stays green, and the Learnings section below is updated with " +
      "what was actually done.",
  );
  body = body.split("{VALIDATION}").join(
    "Reproduce/confirm the diagnosed behavior before and after the fix where practical " +
      "(standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md step 5: reproduce end-to-end, don't just " +
      "trust a static read). Run `npm ci && npm test` and confirm green.",
  );
  body = body.split("{BLOCKERS}").join(
    "None known at creation time. This is a machine-generated diagnosis from a single bounded " +
      "LLM call — if it is ungrounded or wrong, that is expected-possible outcome, not a blocker; " +
      "close as invalid with a short comment explaining why.",
  );

  // Splice in "## Proposed Fix" ahead of "## Definition of Done" (BASIC has
  // no token for this section, so this is structural rather than a
  // template-token substitution — keeps the shared template file untouched).
  const definitionHeading = "\n## Definition of Done\n";
  if (body.includes(definitionHeading)) {
    body = body.replace(definitionHeading, `\n## Proposed Fix\n\n${proposedFixSection}\n${definitionHeading}`);
  } else {
    body += `\n\n## Proposed Fix\n\n${proposedFixSection}\n`;
  }

  // Learnings — What & Why: substitute the known placeholder if present
  // (template already has the section, added in a sibling PR the same
  // day); otherwise append the section so the instruction is never lost
  // regardless of merge order between the two same-day PRs.
  if (body.includes(LEARNINGS_PLACEHOLDER)) {
    body = body.split(LEARNINGS_PLACEHOLDER).join(learningsContent);
  } else if (!body.includes("## Learnings")) {
    body += `\n\n## Learnings — What & Why\n\n${learningsContent}\n`;
  }

  return body;
}

/**
 * Renders the separate, coder-addressed comment posted on the new WR.
 */
function renderCoderComment() {
  return [
    "🔧 **For the implementing agent**",
    "",
    "This WR was auto-diagnosed by the daily diagnostic audit cron " +
      "(`.github/workflows/daily-diagnostic-audit.yml`), not filed by a human.",
    "",
    "I'm including a proposed fix and the reasoning behind it above (see the " +
      "**Proposed Fix** and **Learnings — What & Why** sections) — here's why: a bare " +
      '"here\'s a bug, go figure it out" report wastes the time you\'d spend re-deriving ' +
      "context an automated pass already had in front of it. Please:",
    "- Verify the proposed fix against the current code before applying it — don't apply blindly.",
    "- Adapt it or take a different approach if it's wrong, and note that (and why) in your PR.",
    "- Once resolved, check whether this is a new pattern worth adding to " +
      "`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`, or matches one already there.",
  ].join("\n");
}

function splitRepository() {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${GITHUB_REPOSITORY}`);
  }
  return { owner, repo };
}

async function githubRequest(pathName, { method = "GET", payload } = {}) {
  const res = await fetch(`https://api.github.com${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "revvel-daily-diagnostic-audit",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub HTTP ${res.status} for ${pathName}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

/**
 * Best-effort duplicate guard: skip filing a new WR if an open
 * `auto-diagnosed` issue already mentions the same file — avoids piling up
 * repeat WRs for a diagnosis that has not been fixed yet but keeps getting
 * re-touched within the scope window. Never blocks filing on a failed
 * search (fail open — a missed dedupe is far cheaper than silently never
 * filing anything again).
 */
async function hasExistingOpenDiagnosis(file) {
  if (!file) return false;
  const { owner, repo } = splitRepository();
  const q = encodeURIComponent(`repo:${owner}/${repo} is:issue is:open label:auto-diagnosed "${file}"`);
  try {
    const result = await githubRequest(`/search/issues?q=${q}`);
    return (result.total_count || 0) > 0;
  } catch (err) {
    console.warn(`Duplicate check failed (proceeding anyway): ${err.message}`);
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
async function createWrIssue({ title, body }) {
  const { owner, repo } = splitRepository();
  return githubRequest(`/repos/${owner}/${repo}/issues`, {
    method: "POST",
    payload: { title, body, labels: WR_LABELS, assignees: WR_ASSIGNEES },
  });
}

async function createComment(issueNumber, body) {
  const { owner, repo } = splitRepository();
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    payload: { body },
  });
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error("GH_TOKEN/GITHUB_TOKEN is required — skipping run.");
    return;
  }
  if (!process.env.OPENROUTER_API_KEY) {
    // Never hard-fail: a missing/unfunded key is an ops problem, not a bug.
    // Mirrors scripts/octopus-review-fallback.js's fail-open behavior.
    console.error(
      "OPENROUTER_API_KEY is not set — daily diagnostic audit skipped. " +
        "Check the key AND balance at https://openrouter.ai/credits.",
    );
    return;
  }

  const scopePaths = selectScopeFiles();
  if (scopePaths.length === 0) {
    console.log(
      `No .github/workflows/*.yml or scripts/*.js changes on main in the last ${SCOPE_WINDOW_HOURS}h — ` +
        "nothing to diagnose this run. This is expected and fine.",
    );
    return;
  }
  console.log(`In-scope files (${scopePaths.length}): ${scopePaths.join(", ")}`);

  const scopeFiles = readScopeFileContents(scopePaths);
  if (scopeFiles.length === 0) {
    console.log("Could not read any in-scope files — nothing to diagnose this run.");
    return;
  }

  const playbookContext = loadPlaybookContext();
  const systemPrompt = buildSystemPrompt(playbookContext);
  const userPrompt = buildUserPrompt(scopeFiles);

  let result;
  try {
    result = await callOpenRouter({
      // Reuses the fleet's `review` profile from .github/agent-models.yml
      // (same lane scripts/octopus-review-fallback.js uses) — diagnosis is
      // close kin to code review, and this avoids adding a new profile.
      models: loadDiagnosticModels(),
      max_tokens: 3000,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (err) {
    // Best-effort by design: an LLM-lane outage must not fail the workflow.
    console.error(`OpenRouter call failed: ${err.message}`);
    return;
  }

  const parsedResult = parseDiagnosticResponse(result.text);
  if (!parsedResult.valid) {
    console.log(`Model response was not usable (${parsedResult.error}) — filing nothing this run.`);
    return;
  }

  const diagnosis = parsedResult.diagnosis;
  if (!isActionableDiagnosis(diagnosis)) {
    console.log(
      `No actionable issue this run (issueFound=${diagnosis.issueFound}, confidence=${diagnosis.confidence}) — ` +
        "filing nothing. This is expected and fine.",
    );
    return;
  }

  if (await hasExistingOpenDiagnosis(verdict.file)) {
    log(`Open auto-diagnosed WR already exists for ${verdict.file}. Skipping.`);
    return;
  }

  const num = await fileWR(verdict);
  if (num) log(`Filed WR #${num} for ${verdict.file}.`);
  if (await hasExistingOpenDiagnosis(diagnosis.file)) {
    console.log(`An open auto-diagnosed WR already references ${diagnosis.file} — skipping duplicate.`);
    return;
  }

  const template = fs.readFileSync(path.join(REPO_ROOT, "wr", "WR_TEMPLATE_BASIC.md"), "utf8");
  const { owner, repo } = splitRepository();
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "(local run, no CI URL)";

  const title = renderWrTitle(diagnosis);
  const body = renderWrBody({
    template,
    diagnosis,
    scopeFiles: scopePaths,
    sinceHours: SCOPE_WINDOW_HOURS,
    repoFull: `${owner}/${repo}`,
    repoUrl: `https://github.com/${owner}/${repo}`,
    today: new Date().toISOString().slice(0, 10),
    runUrl,
  });

  const issue = await createWrIssue({ title, body });
  console.log(`Created WR issue #${issue.number}: ${issue.html_url}`);

  await createComment(issue.number, renderCoderComment());
  console.log(`Posted coder-facing comment on #${issue.number}.`);
}

/**
 * Mirrors scripts/octopus-review-fallback.js's loadReviewProfile: reads the
 * `review` profile (primary + fallback models) from .github/agent-models.yml
 * so this script follows fleet model policy instead of hardcoding models.
 * Kept as a local copy (rather than importing octopus-review-fallback.js)
 * so this script has no dependency on an unrelated fallback-review lane.
 */
function loadDiagnosticModels() {
  const configPath = path.join(REPO_ROOT, ".github", "agent-models.yml");
  const YAML = require("yaml");
  const config = YAML.parse(fs.readFileSync(configPath, "utf8"));
  const review = config?.profiles?.review;
  if (!review || !review.primary) {
    throw new Error("No `review` profile with a primary model in agent-models.yml");
  }
  return [review.primary, review.fallback].filter(Boolean);
}

if (require.main === module) {
  main().catch((err) => {
    warn(`Unhandled error (fail-open): ${err.message}`);
    process.exit(0);
    // Final safety net: this cron must never fail the workflow over a bug
    // in its own diagnosis lane. Log loudly and exit 0.
    console.error(`daily-diagnostic-audit failed: ${err.message}`);
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
  parseGitLogNameOnly,
  filterInScope,
  selectScopeFiles,
  readScopeFileContents,
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

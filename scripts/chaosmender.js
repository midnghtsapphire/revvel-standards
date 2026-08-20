#!/usr/bin/env node
/**
 * ChaosMender — Error Pattern Sentinel
 *
 * Inspired by Netflix Chaos Monkey, but instead of randomly killing services
 * to test resilience, ChaosMender proactively hunts for KNOWN failure patterns
 * from config/error-ledger.json BEFORE they cause incidents. When a pattern is
 * detected it reports the exact location plus the ledger's known fix, and can
 * optionally file a [SELF-HEAL] GitHub issue so the existing self-healing loop
 * auto-remediates without human intervention.
 *
 * Usage:
 *   node scripts/chaosmender.js                   # scan and report
 *   node scripts/chaosmender.js --file-issues     # scan + file GitHub issues
 *   node scripts/chaosmender.js --dry-run         # show what would be filed
 *   node scripts/chaosmender.js --ledger <path>   # custom ledger file
 *   node scripts/chaosmender.js --scope <glob>    # override scan scope
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_LEDGER = path.join(REPO_ROOT, 'config', 'error-ledger.json');

// Map of chaosmender_check id → scanner function.
// Each scanner receives (repoRoot) and returns an array of findings:
//   { file, line, excerpt, errorId, title, fix, fix_code_snippet }
const CHECKS = {
  'bare-remove-label': scanBareRemoveLabel,
  'workflow-run-missing-workflows-list': scanWorkflowRunMissingWorkflowsList,
  'github-script-column-0-body': scanGithubScriptColumn0,
};

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

/**
 * LABEL-RACE-001
 *
 * Find `github.rest.issues.removeLabel` calls that are not guarded against a
 * 404 — and only a 404.
 *
 * The rule's own `fix` field says what matters: "swallow ONLY 404. A 401/403
 * must still surface." The scanner used to check for a literal `.catch` within
 * five lines instead, which got both directions wrong (#17787):
 *
 *   - `try { ... } catch (e) { if (e.status !== 404) throw e; }` was reported
 *     as unguarded, so the check was red on code that did exactly what the
 *     ledger prescribes. A check that fails correct code is one people learn
 *     to ignore.
 *   - `.catch(() => {})` passed, and that is the defect the rule exists to
 *     prevent: on a restricted token the label stays on the issue, the job
 *     reports success, and the block is still in place.
 *   - The five-line window was narrower than the house call style. A
 *     `removeLabel({ owner, repo, issue_number, name })` written one property
 *     per line spans six lines before any guard can appear.
 *
 * A guard now counts only if it re-throws everything that is not a 404, and it
 * is found by walking the actual call expression rather than a line window.
 */

/** Index of the character matching the opener at `open`, or -1. */
function matchingIndex(src, open) {
  const pairs = { '(': ')', '{': '}' };
  const close = pairs[src[open]];
  if (!close) return -1;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === src[open]) depth++;
    else if (src[i] === close && --depth === 0) return i;
  }
  return -1;
}

/**
 * True when a catch/`.catch` handler body re-throws anything that is not a 404.
 *
 * Deliberately strict: a widened condition such as
 * `!== 404 && !== 403` reads as narrow while restoring the defect for the
 * status that actually matters — a token without `issues: write`.
 */
function rethrowsNon404(handler) {
  return /\b(\w+)\.status\s*!==\s*404\s*\)\s*throw\s+\1\b/.test(handler);
}

/**
 * Classify one call site: 'guarded' | 'swallows' | 'bare'.
 * `swallows` and `bare` are both findings; they differ only in the hint.
 */
function classifyRemoveLabelCall(src, callIndex) {
  const openParen = src.indexOf('(', callIndex);
  if (openParen === -1) return 'bare';
  const closeParen = matchingIndex(src, openParen);
  if (closeParen === -1) return 'bare';

  // 1. A `.catch(...)` chained directly onto the call.
  const after = src.slice(closeParen + 1);
  const chained = /^\s*\.catch\s*\(/.exec(after);
  if (chained) {
    const handlerOpen = closeParen + 1 + chained[0].length - 1;
    const handlerClose = matchingIndex(src, handlerOpen);
    if (handlerClose !== -1) {
      return rethrowsNon404(src.slice(handlerOpen, handlerClose + 1)) ? 'guarded' : 'swallows';
    }
  }

  // 2. An enclosing `try { ... } catch (e) { ... }`. Walk back to the nearest
  //    `try {` whose block still contains the call.
  const before = src.slice(0, callIndex);
  for (const m of [...before.matchAll(/\btry\s*\{/g)].reverse()) {
    const blockOpen = before.indexOf('{', m.index);
    const blockClose = matchingIndex(src, blockOpen);
    if (blockClose === -1 || blockClose < callIndex) continue; // does not enclose
    const catchMatch = /^\s*catch\s*\(\s*\w+\s*\)\s*\{/.exec(src.slice(blockClose + 1));
    if (!catchMatch) return 'bare';
    const handlerOpen = blockClose + 1 + catchMatch[0].length - 1;
    const handlerClose = matchingIndex(src, handlerOpen);
    if (handlerClose === -1) return 'bare';
    return rethrowsNon404(src.slice(handlerOpen, handlerClose + 1)) ? 'guarded' : 'swallows';
  }

  return 'bare';
}

function scanBareRemoveLabel(repoRoot) {
  const findings = [];
  const workflowDir = path.join(repoRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) return findings;

  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    const filepath = path.join(workflowDir, file);
    const src = fs.readFileSync(filepath, 'utf8');

    // A `removeLabelSafe` wrapper is an accepted alternative — but only for
    // calls INSIDE it. Exempting the whole file let a bare call elsewhere in
    // the same file pass (#17787).
    const safeWrapper = /function\s+removeLabelSafe\b/.exec(src);
    let safeRange = null;
    if (safeWrapper) {
      const bodyOpen = src.indexOf('{', safeWrapper.index);
      const bodyClose = matchingIndex(src, bodyOpen);
      if (bodyClose !== -1) safeRange = [bodyOpen, bodyClose];
    }

    for (const call of src.matchAll(/github\.rest\.issues\.removeLabel/g)) {
      if (safeRange && call.index > safeRange[0] && call.index < safeRange[1]) continue;

      const verdict = classifyRemoveLabelCall(src, call.index);
      if (verdict === 'guarded') continue;

      findings.push({
        file: path.relative(repoRoot, filepath),
        line: src.slice(0, call.index).split('\n').length,
        excerpt: src.slice(0, call.index).split('\n').pop().trim() +
          'github.rest.issues.removeLabel(...)',
        errorId: 'LABEL-RACE-001',
        detail: verdict === 'swallows'
          ? 'the handler swallows every error, including 401/403 — swallow ONLY 404'
          : 'no 404 guard on this call',
      });
    }
  }

  return findings;
}

/**
 * WORKFLOW-RUN-001
 * Find workflow files that declare a workflow_run event but lack a
 * `workflows:` key under it.
 * Note: scripts/check-workflow-yaml.js already catches this in CI.
 * ChaosMender re-checks here so the pattern is cross-referenced with the
 * error ledger and the self-heal filing path is consistent.
 */
function scanWorkflowRunMissingWorkflowsList(repoRoot) {
  const findings = [];
  const workflowDir = path.join(repoRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) return findings;

  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    const filepath = path.join(workflowDir, file);
    const content = fs.readFileSync(filepath, 'utf8');

    // Quick pre-filter: does this file even mention workflow_run?
    if (!/workflow_run/.test(content)) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // Matches `workflow_run:` as an on: event key (indented or not)
      if (!/^\s+workflow_run\s*:/.test(lines[i])) continue;

      // Scan the whole workflow_run block for a `workflows:` key. The block is
      // every following line that is blank, a comment, or indented deeper than
      // the workflow_run key itself. A fixed lookahead window undercounts
      // heavily-commented triggers (false positive on pr-lifecycle.yml, whose
      // workflows: list sits ~35 comment lines below the trigger).
      const indent = lines[i].match(/^(\s*)/)[1].length;
      let foundWorkflows = false;
      for (let j = i + 1; j < lines.length; j++) {
        const ahead = lines[j];
        if (ahead.trim() === '' || ahead.trim().startsWith('#')) continue;
        if (ahead.match(/^(\s*)/)[1].length <= indent) break; // left the block
        if (/^\s+workflows\s*:/.test(ahead)) { foundWorkflows = true; break; }
      }

      if (!foundWorkflows) {
        findings.push({
          file: path.relative(repoRoot, filepath),
          line: i + 1,
          excerpt: lines[i].trim(),
          errorId: 'WORKFLOW-RUN-001',
        });
      }
    }
  }

  return findings;
}

/**
 * GITHUB-SCRIPT-INLINE-001
 * Find github-script blocks where the script: | body has lines at column 0
 * (which terminates the YAML block scalar).
 * This is a best-effort heuristic; definitive detection is scripts/check-workflow-yaml.js.
 */
function scanGithubScriptColumn0(repoRoot) {
  const findings = [];
  const workflowDir = path.join(repoRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) return findings;

  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    const filepath = path.join(workflowDir, file);
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    let inScriptBlock = false;
    let scriptIndent = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect start of a `script: |` block inside a uses: actions/github-script step
      if (/^\s+script\s*:\s*\|/.test(line)) {
        inScriptBlock = true;
        // The script body should be indented MORE than this key
        scriptIndent = line.search(/\S/);
        continue;
      }

      if (!inScriptBlock) continue;

      // An empty line doesn't end the block
      if (line.trim() === '') continue;

      const indent = line.search(/\S/);

      // A line at column 0 while we think we're still inside a script block
      // is the defect: it terminates the YAML block scalar prematurely. Flag
      // it BEFORE the "left the block" guard so we record the finding rather
      // than silently resetting state.
      if (indent === 0) {
        findings.push({
          file: path.relative(repoRoot, filepath),
          line: i + 1,
          excerpt: line.trim().slice(0, 80),
          errorId: 'GITHUB-SCRIPT-INLINE-001',
        });
        inScriptBlock = false;
        scriptIndent = -1;
        continue;
      }

      // If indent is at or less than the script: key, we've left the block
      if (indent <= scriptIndent) {
        inScriptBlock = false;
        scriptIndent = -1;
        continue;
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

function loadLedger(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) {
    throw new Error(`Error ledger not found: ${ledgerPath}`);
  }
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
}

/**
 * Run all auto-detectable checks from the ledger that have a registered
 * scanner. Returns an array of enriched findings.
 */
function runChecks(repoRoot, ledger) {
  const allFindings = [];

  for (const entry of ledger.errors) {
    if (!entry.auto_detectable) continue;
    const checkId = entry.chaosmender_check;
    if (!checkId) continue;
    const scanner = CHECKS[checkId];
    if (!scanner) continue;

    const raw = scanner(repoRoot);
    for (const f of raw) {
      allFindings.push({
        ...f,
        title: entry.title,
        category: entry.category,
        severity: entry.severity,
        fix: entry.fix,
        fix_code_snippet: entry.fix_code_snippet,
        self_heal_label: entry.self_heal_label || 'auto-error',
        references: entry.references || [],
      });
    }
  }

  return allFindings;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const SEVERITY_ICON = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };

function printReport(findings) {
  if (findings.length === 0) {
    console.log('✅ ChaosMender: no known error patterns detected.');
    return;
  }

  console.log(`⚡ ChaosMender: ${findings.length} known error pattern(s) detected.\n`);

  for (const f of findings) {
    const icon = SEVERITY_ICON[f.severity] || '⚪';
    console.log(`${icon} [${f.errorId}] ${f.title}`);
    console.log(`   File  : ${f.file}:${f.line}`);
    console.log(`   Found : ${f.excerpt}`);
    console.log(`   Fix   : ${f.fix}`);
    if (f.fix_code_snippet) {
      console.log(`   Snippet:\n${f.fix_code_snippet.split('\n').map(l => `     ${l}`).join('\n')}`);
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// GitHub Issue Filing
// ---------------------------------------------------------------------------

/**
 * Build the issue body for a batch of findings.
 */
function buildIssueBody(findings) {
  const lines = [
    '## ChaosMender detected known error patterns',
    '',
    'The following unguarded call sites match patterns in `config/error-ledger.json`.',
    'Apply the listed fix to each location.',
    '',
  ];

  // Group by errorId
  const byId = {};
  for (const f of findings) {
    (byId[f.errorId] = byId[f.errorId] || []).push(f);
  }

  for (const [id, group] of Object.entries(byId)) {
    const first = group[0];
    lines.push(`### ${id} — ${first.title}`);
    lines.push('');
    lines.push(`**Category:** ${first.category}  `);
    lines.push(`**Severity:** ${first.severity}  `);
    lines.push(`**Fix:** ${first.fix}`);
    lines.push('');
    if (first.fix_code_snippet) {
      lines.push('```javascript');
      lines.push(first.fix_code_snippet);
      lines.push('```');
      lines.push('');
    }
    lines.push('**Affected locations:**');
    lines.push('');
    for (const f of group) {
      lines.push(`- \`${f.file}\` line ${f.line}: \`${f.excerpt}\``);
    }
    lines.push('');
    if (first.references && first.references.length) {
      lines.push(`**References:** ${first.references.join(', ')}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('*Auto-filed by ChaosMender · config/error-ledger.json*');
  return lines.join('\n');
}

async function fileIssue(findings, dryRun) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('⚠️  No GH_TOKEN / GITHUB_TOKEN — skipping issue filing.');
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY || process.env.GH_REPO || 'midnghtsapphire/revvel-standards';
  const [owner, repoName] = repo.split('/');

  const title = `[SELF-HEAL] ChaosMender: ${findings.length} known error pattern(s) detected`;
  const body = buildIssueBody(findings);

  // Deduplicate: check if an open [SELF-HEAL] ChaosMender issue already exists
  const searchUrl = `https://api.github.com/repos/${owner}/${repoName}/issues?state=open&labels=auto-error&per_page=50`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (searchRes.ok) {
    const open = await searchRes.json();
    const existing = open.find(i => i.title.startsWith('[SELF-HEAL] ChaosMender'));
    if (existing) {
      console.log(`ℹ️  Existing ChaosMender issue #${existing.number} already open — updating in place.`);
      if (!dryRun) {
        await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${existing.number}`, {
          method: 'PATCH',
          headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body }),
        });
        console.log(`✅ Updated issue #${existing.number}`);
      } else {
        console.log('[dry-run] Would PATCH issue #' + existing.number);
      }
      return;
    }
  }

  if (dryRun) {
    console.log('[dry-run] Would create issue:');
    console.log(`  title: ${title}`);
    console.log(`  labels: auto-error, chaosmender`);
    return;
  }

  // Determine which labels exist before trying to add them
  const labelCandidates = ['auto-error', 'chaosmender'];
  const labelsUrl = `https://api.github.com/repos/${owner}/${repoName}/labels?per_page=100`;
  let validLabels = [];
  const labelsRes = await fetch(labelsUrl, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (labelsRes.ok) {
    const all = await labelsRes.json();
    const names = new Set(all.map(l => l.name));
    validLabels = labelCandidates.filter(l => names.has(l));
  }

  const createRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues`, {
    method: 'POST',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, labels: validLabels }),
  });

  if (createRes.ok) {
    const issue = await createRes.json();
    console.log(`✅ Filed issue #${issue.number}: ${issue.html_url}`);
  } else {
    const err = await createRes.text();
    console.error(`❌ Failed to create issue: ${createRes.status} — ${err}`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    fileIssues: false,
    dryRun: false,
    ledger: DEFAULT_LEDGER,
    scope: null,
    changedOnly: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--file-issues') opts.fileIssues = true;
    else if (a === '--dry-run') { opts.dryRun = true; opts.fileIssues = true; }
    else if (a === '--ledger' && next) { opts.ledger = next; i++; }
    else if (a === '--scope' && next) { opts.scope = next; i++; }
    else if (a === '--changed-only') opts.changedOnly = true;
  }
  return opts;
}

/**
 * The set of repo-relative files changed in the current PR, read from the
 * CHAOSMENDER_CHANGED_FILES env var (newline- or comma-separated). Used by
 * --changed-only so a PR's scan gates only what the PR actually touched, not
 * the whole-repo baseline (the daily scheduled run still scans everything and
 * files issues for the self-healing loop).
 */
function loadChangedFiles() {
  const raw = process.env.CHAOSMENDER_CHANGED_FILES || '';
  return new Set(raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean));
}

async function main() {
  const opts = parseArgs(process.argv);

  let ledger;
  try {
    ledger = loadLedger(opts.ledger);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  let findings = runChecks(REPO_ROOT, ledger);
  if (opts.changedOnly) {
    const changed = loadChangedFiles();

    // An empty scope is a broken scan, not a clean PR.
    //
    // The PR trigger for this scan is path-filtered to `.github/workflows/**`,
    // `scripts/**` and `config/error-ledger.json`, so a pull_request run always
    // has at least one file in scope. Reaching here with none means the file
    // list never arrived — the compute step was skipped, its $GITHUB_OUTPUT
    // heredoc broke, the base SHA was unreachable, or the env var was renamed.
    //
    // Without this, `changed.size === 0` filters every finding away and the
    // scan prints "no known error patterns detected" and exits 0. That is a
    // pass the scan never established, and it looks exactly like success, so
    // nothing would ever report it (CLAUDE.md gotcha 6). The same silence
    // follows if a scanner's `file` format ever stops matching
    // `git diff --name-only` output, because then no key can ever match.
    if (changed.size === 0) {
      console.error(
        '❌ ChaosMender --changed-only: no files in scope.\n' +
          '   CHAOSMENDER_CHANGED_FILES is empty or unset, but this mode only runs on\n' +
          '   pull requests that touched .github/workflows/**, scripts/** or\n' +
          '   config/error-ledger.json — so an empty scope means the changed-file list\n' +
          '   was never computed, not that the diff is clean.\n' +
          '   Refusing to report "no patterns detected" for a scan that inspected nothing.',
      );
      process.exit(1);
    }

    findings = findings.filter((f) => changed.has(f.file));
    console.log(
      `ℹ️  ChaosMender --changed-only: ${changed.size} changed file(s) in scope, ` +
        `${findings.length} finding(s) attributable to this diff. ` +
        `(Whole-repo baseline is scanned by the daily scheduled run.)`,
    );
  }
  printReport(findings);

  if (opts.fileIssues && findings.length > 0) {
    await fileIssue(findings, opts.dryRun);
  }

  // Write findings to GITHUB_OUTPUT for workflow consumption
  if (process.env.GITHUB_OUTPUT) {
    const summary = findings.length > 0
      ? findings.map(f => `${f.errorId}:${f.file}:${f.line}`).join(',')
      : '';
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `findings_count=${findings.length}\nfindings=${summary}\n`);
  }

  // Exit 1 only for critical/high findings (don't block CI on medium/low)
  const blocking = findings.filter(f => f.severity === 'critical' || f.severity === 'high');
  process.exit(blocking.length > 0 ? 1 : 0);
}

// Export for tests
module.exports = {
  loadLedger,
  runChecks,
  scanBareRemoveLabel,
  scanWorkflowRunMissingWorkflowsList,
  scanGithubScriptColumn0,
  buildIssueBody,
  CHECKS,
};

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}

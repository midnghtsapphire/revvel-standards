#!/usr/bin/env node
// ============================================================
// PR REVIEW SCANNER
// ============================================================
// Statically scans the added lines of a pull-request diff for
// violations of the Code-Quality items on the Ready-for-Review
// checklist (.github/workflows/ready-for-review.yml).
//
// Exports a pure `scanDiff(files)` function so it can be unit
// tested and called from the GitHub Actions workflow via
// actions/github-script.
//
//   const { scanDiff } = require('./scripts/pr-review-scan.js');
//   const result = scanDiff(await octokit.pulls.listFiles(...));
//
// Input:  Array of objects with { filename, patch } — the shape
//         returned by the GitHub "List PR files" REST endpoint.
// Output: {
//           checks: {
//             secrets:  { pass: bool, findings: [{file,line,match}] },
//             consoleLog:{ pass, findings },
//             dangerousEval:{ pass, findings },
//             rawSql:   { pass, findings },
//           }
//         }
// ============================================================

'use strict';

// ─── Rule definitions ─────────────────────────────────────────
// Each rule has:
//   id       — stable key used in the result object
//   pattern  — RegExp tested against a single added line
//   extensions — optional Set of file extensions the rule applies to
//                (omit to apply to every text file)

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.java', '.kt', '.cs',
  '.php', '.rs', '.swift', '.sh', '.bash',
]);

// Broad secret heuristics. Mirrors common patterns caught by
// secret-scanners (AWS, GitHub PATs, Slack, private keys, and
// literal assignments to password/secret/token/api_key).
const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,                                    // AWS access key
  /gh[pousr]_[A-Za-z0-9]{36,}/,                          // GitHub fine-grained / classic tokens
  /xox[abpr]-[A-Za-z0-9-]{10,}/,                         // Slack tokens
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  // password = "literal", api_key: 'literal', secret="literal"
  /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["'][^"'\s$]{8,}["']/i,
];

// `eval(...)`, `new Function(...)`, dynamic `require(variable)`,
// JS/TS `Function(...)` (as expression).
const DANGEROUS_EVAL_PATTERNS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  // require() whose argument is NOT a string literal.
  // The \s* before the lookahead tolerates formatting like
  // `require(  'fs')` so it is not misreported as dynamic.
  /\brequire\s*\(\s*(?!\s*["'`])/,
];

// console.log that references an identifier whose name suggests
// sensitive content. Extremely conservative — only flags when an
// obvious keyword appears inside the log call.
const CONSOLE_LOG_SENSITIVE = /\bconsole\.(?:log|debug|info|warn|error)\s*\([^)]*\b(?:password|passwd|pwd|secret|api[_-]?key|token|authorization|auth[_-]?token|credential|private[_-]?key|session|cookie)\b/i;

// Raw SQL with a template-literal interpolation, e.g.
//   `SELECT * FROM users WHERE id = ${userId}`
// The interpolation is what makes it "user-supplied". Parameterised
// queries (`$1`, `?`) don't match.
const RAW_SQL_INTERP = /(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|DROP\s+TABLE)\b[^`'"\n]*\$\{[^}]+\}/i;

// ─── Diff parsing ─────────────────────────────────────────────
/**
 * Parse a unified-diff patch into an array of added lines with
 * their file line numbers.
 * @param {string} patch
 * @returns {Array<{line:number, text:string}>}
 */
function parseAddedLines(patch) {
  if (!patch || typeof patch !== 'string') return [];

  const added = [];
  let newLine = 0;

  for (const rawLine of patch.split('\n')) {
    const hunk = rawLine.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) {
      newLine = parseInt(hunk[1], 10);
      continue;
    }
    if (rawLine.startsWith('+++') || rawLine.startsWith('---')) continue;
    if (rawLine.startsWith('+')) {
      added.push({ line: newLine, text: rawLine.slice(1) });
      newLine++;
    } else if (rawLine.startsWith('-')) {
      // removed line — new-file line counter does not advance
    } else {
      // context line
      newLine++;
    }
  }
  return added;
}

function extensionOf(filename) {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

// ─── Rule runner ──────────────────────────────────────────────
function runRule(files, { patterns, onlyCode = true }) {
  const findings = [];
  for (const f of files) {
    if (!f || !f.filename || !f.patch) continue;
    if (onlyCode && !CODE_EXTENSIONS.has(extensionOf(f.filename))) continue;

    for (const { line, text } of parseAddedLines(f.patch)) {
      for (const re of patterns) {
        const m = text.match(re);
        if (m) {
          findings.push({
            file: f.filename,
            line,
            match: m[0].trim().slice(0, 120),
          });
          break; // one finding per added line is enough
        }
      }
    }
  }
  return { pass: findings.length === 0, findings };
}

/**
 * Scan an array of PR file objects for Code-Quality violations.
 * @param {Array<{filename:string, patch?:string}>} files
 */
function scanDiff(files) {
  const list = Array.isArray(files) ? files : [];
  return {
    checks: {
      secrets:       runRule(list, { patterns: SECRET_PATTERNS,       onlyCode: false }),
      dangerousEval: runRule(list, { patterns: DANGEROUS_EVAL_PATTERNS }),
      consoleLog:    runRule(list, { patterns: [CONSOLE_LOG_SENSITIVE] }),
      rawSql:        runRule(list, { patterns: [RAW_SQL_INTERP] }),
    },
  };
}

/**
 * Render a single Markdown checkbox line based on a rule result.
 * Human-readable finding list is appended (capped) when the rule
 * failed so the reviewer can jump straight to the offending code.
 */
function renderCheckboxLine(label, result, { maxFindings = 5 } = {}) {
  if (!result) return `- [ ] ${label}`;
  if (result.pass) return `- [x] ${label}`;
  const head = `- [ ] ⚠️ ${label}`;
  const shown = result.findings.slice(0, maxFindings)
    .map(f => `  - \`${f.file}:${f.line}\` — ${f.match}`);
  const extra = result.findings.length > maxFindings
    ? [`  - …and ${result.findings.length - maxFindings} more`]
    : [];
  return [head, ...shown, ...extra].join('\n');
}

module.exports = {
  scanDiff,
  parseAddedLines,
  renderCheckboxLine,
  // exported for tests
  _patterns: {
    SECRET_PATTERNS,
    DANGEROUS_EVAL_PATTERNS,
    CONSOLE_LOG_SENSITIVE,
    RAW_SQL_INTERP,
  },
};

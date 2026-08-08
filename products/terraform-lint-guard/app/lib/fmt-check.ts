/**
 * Client-safe Terraform formatting heuristics that mirror the most common
 * failures reported by `terraform fmt -check`.
 *
 * This is NOT a full HCL parser. It catches the issues teams hit daily so the
 * product UI can give instant feedback without shipping a Terraform binary to
 * the browser. CI still runs the real `terraform fmt` via the GitHub Action.
 */

export type LintSeverity = 'error' | 'warning';

export interface LintFinding {
  line: number;
  column: number;
  severity: LintSeverity;
  rule: string;
  message: string;
  snippet: string;
}

export interface LintResult {
  ok: boolean;
  findings: LintFinding[];
  summary: {
    errors: number;
    warnings: number;
    lines: number;
  };
  formattedHint: string | null;
}

const TAB_RE = /\t/;
const TRAILING_WS_RE = /[ \t]+$/;
const CR_RE = /\r/;
// Assignment lines: identifier = value (not ==, !=, <=, >=)
const ASSIGN_RE = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*)(=)(\s*)(.*)$/;

function stripLineComment(line: string): string {
  // Rough HCL comment strip: # and // outside quotes are ignored for structure checks.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    if (!inSingle && !inDouble) {
      if (ch === '#') return line.slice(0, i);
      if (ch === '/' && line[i + 1] === '/') return line.slice(0, i);
    }
  }
  return line;
}

/**
 * Align `=` signs on contiguous bare assignment blocks the way terraform fmt does.
 * Only adjusts spacing around `=`; does not reflow braces or heredocs.
 */
export function alignAssignments(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out = [...lines];
  let i = 0;
  while (i < lines.length) {
    const block: { idx: number; indent: string; key: string; value: string }[] = [];
    while (i < lines.length) {
      const raw = lines[i];
      const code = stripLineComment(raw);
      if (!code.trim()) break;
      const m = code.match(ASSIGN_RE);
      if (!m) break;
      // Skip nested object-looking lines that terraform fmt treats differently
      // when the value opens a block on the same line with `{` only after `=`.
      block.push({
        idx: i,
        indent: m[1],
        key: m[2],
        value: m[6].trimStart(),
      });
      i += 1;
    }
    if (block.length >= 1) {
      const maxKey = Math.max(...block.map((b) => b.key.length));
      for (const b of block) {
        const pad = ' '.repeat(maxKey - b.key.length);
        out[b.idx] = `${b.indent}${b.key}${pad} = ${b.value}`;
      }
    }
    if (block.length === 0) i += 1;
  }
  return out.join('\n');
}

export function lintTerraformSource(source: string): LintResult {
  const normalized = source.replace(/\r\n/g, '\n');
  const lines = normalized.length === 0 ? [] : normalized.split('\n');
  const findings: LintFinding[] = [];

  if (source.length === 0) {
    return {
      ok: false,
      findings: [
        {
          line: 1,
          column: 1,
          severity: 'error',
          rule: 'empty-input',
          message: 'No Terraform source provided.',
          snippet: '',
        },
      ],
      summary: { errors: 1, warnings: 0, lines: 0 },
      formattedHint: null,
    };
  }

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (CR_RE.test(line)) {
      findings.push({
        line: lineNo,
        column: line.indexOf('\r') + 1,
        severity: 'error',
        rule: 'no-carriage-return',
        message: 'Use LF line endings (terraform fmt normalizes CRLF).',
        snippet: line.replace(/\r/g, '␍'),
      });
    }

    if (TAB_RE.test(line)) {
      findings.push({
        line: lineNo,
        column: line.indexOf('\t') + 1,
        severity: 'error',
        rule: 'no-tabs',
        message: 'Replace tabs with spaces (terraform fmt uses spaces).',
        snippet: line,
      });
    }

    if (TRAILING_WS_RE.test(line)) {
      findings.push({
        line: lineNo,
        column: line.search(TRAILING_WS_RE) + 1,
        severity: 'error',
        rule: 'no-trailing-whitespace',
        message: 'Trailing whitespace is removed by terraform fmt.',
        snippet: line,
      });
    }

    const code = stripLineComment(line);
    const assign = code.match(ASSIGN_RE);
    if (assign) {
      const beforeEq = assign[3];
      const afterEq = assign[5];
      // terraform fmt allows padding spaces before `=` for column alignment,
      // but always wants at least one space before and exactly one after.
      const beforeOk = beforeEq.length >= 1 && /^\s+$/.test(beforeEq);
      const afterOk = afterEq === ' ';
      if (!beforeOk || !afterOk) {
        findings.push({
          line: lineNo,
          column: (assign[1] + assign[2]).length + 1,
          severity: 'error',
          rule: 'equals-spacing',
          message:
            'Put at least one space before `=` and exactly one space after (terraform fmt style).',
          snippet: line,
        });
      }
    }

    // Detect spaces used for indentation that are not multiples of 2
    const indentMatch = line.match(/^( +)\S/);
    if (indentMatch && indentMatch[1].length % 2 !== 0) {
      findings.push({
        line: lineNo,
        column: 1,
        severity: 'warning',
        rule: 'indent-even',
        message: 'Indentation is usually a multiple of 2 spaces in formatted Terraform.',
        snippet: line,
      });
    }
  });

  // Block-level alignment: if contiguous assignments have misaligned `=`, flag them.
  let i = 0;
  while (i < lines.length) {
    const blockIdx: number[] = [];
    const eqCols: number[] = [];
    while (i < lines.length) {
      const code = stripLineComment(lines[i]);
      if (!code.trim()) break;
      const m = code.match(ASSIGN_RE);
      if (!m) break;
      blockIdx.push(i);
      eqCols.push(m[1].length + m[2].length + m[3].length);
      i += 1;
    }
    if (blockIdx.length >= 2) {
      const target = Math.max(...eqCols);
      blockIdx.forEach((idx, j) => {
        if (eqCols[j] !== target) {
          findings.push({
            line: idx + 1,
            column: eqCols[j] + 1,
            severity: 'error',
            rule: 'align-equals',
            message: `Align \`=\` with neighboring assignments (column ${target + 1}).`,
            snippet: lines[idx],
          });
        }
      });
    }
    if (blockIdx.length === 0) i += 1;
  }

  // Deduplicate by line+rule
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = `${f.line}:${f.rule}:${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const errors = unique.filter((f) => f.severity === 'error').length;
  const warnings = unique.filter((f) => f.severity === 'warning').length;
  const formattedHint = errors > 0 ? alignAssignments(
    normalized
      .split('\n')
      .map((l) => l.replace(/\t/g, '  ').replace(/[ \t]+$/g, ''))
      .join('\n')
  ) : null;

  return {
    ok: errors === 0,
    findings: unique,
    summary: {
      errors,
      warnings,
      lines: lines.length,
    },
    formattedHint,
  };
}

export function buildLintMarkdown(
  result: LintResult,
  meta: { filename?: string; checkedAt?: string } = {}
): string {
  const filename = meta.filename || 'stdin.tf';
  const checkedAt = meta.checkedAt || new Date().toISOString();
  const status = result.ok ? 'PASS' : 'FAIL';
  const lines = [
    `# Terraform Lint Report`,
    ``,
    `- **File:** \`${filename}\``,
    `- **Checked at:** ${checkedAt}`,
    `- **Status:** ${status}`,
    `- **Errors:** ${result.summary.errors}`,
    `- **Warnings:** ${result.summary.warnings}`,
    `- **Lines scanned:** ${result.summary.lines}`,
    ``,
  ];
  if (result.findings.length === 0) {
    lines.push(`No formatting issues detected by the heuristic checker.`);
    lines.push(``);
    lines.push(`CI still runs the authoritative \`terraform fmt -check -recursive\` via`);
    lines.push(`\`ShubhamTatvamasi/terraform-lint-action@v1\`.`);
  } else {
    lines.push(`## Findings`);
    lines.push(``);
    for (const f of result.findings) {
      lines.push(
        `- L${f.line}:C${f.column} **${f.severity}** \`${f.rule}\` — ${f.message}`
      );
    }
    lines.push(``);
  }
  if (result.formattedHint) {
    lines.push(`## Suggested formatting`);
    lines.push(``);
    lines.push('```hcl');
    lines.push(result.formattedHint);
    lines.push('```');
    lines.push(``);
  }
  lines.push(`## Local fix`);
  lines.push(``);
  lines.push('```bash');
  lines.push('terraform fmt -recursive');
  lines.push('```');
  lines.push(``);
  return lines.join('\n');
}

export function buildLintCsv(result: LintResult): string {
  const header = 'line,column,severity,rule,message';
  const rows = result.findings.map((f) =>
    [
      f.line,
      f.column,
      f.severity,
      f.rule,
      `"${f.message.replace(/"/g, '""')}"`,
    ].join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

/** Canonical CI snippet shipped with this product (matches repo workflow). */
export const CI_WORKFLOW_SNIPPET = `name: Terraform Lint

on:
  pull_request:
    paths: ["**/*.tf", "**/*.tfvars", "**/*.hcl"]
  push:
    branches: [main]
    paths: ["**/*.tf", "**/*.tfvars", "**/*.hcl"]

permissions:
  contents: read

jobs:
  terraform-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.8"
          terraform_wrapper: false
      - name: Terraform Lint Action
        uses: ShubhamTatvamasi/terraform-lint-action@v1
`;

export const SAMPLE_GOOD_TF = `variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "staging"
}

locals {
  name_prefix = "revvel-\${var.environment}"
}
`;

export const SAMPLE_BAD_TF = `variable "environment"{
type= string
  description="Deployment environment"
 default="staging"
}
`;

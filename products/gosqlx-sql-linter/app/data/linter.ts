/**
 * GoSQLX-aligned multi-dialect SQL linter (client + API).
 *
 * This is a TypeScript implementation of the public lint surface (L001–L010)
 * and lightweight structural validation so the SaaS playground works without
 * shipping the Go binary. Authoritative CI parsing still uses the real
 * GoSQLX GitHub Action (ajitpratap0/GoSQLX@v1.14.0).
 */

export type Dialect =
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'sqlserver'
  | 'oracle'
  | 'sqlite'
  | 'snowflake'
  | 'clickhouse'
  | 'auto';

export type Severity = 'error' | 'warning' | 'info';

export interface LintViolation {
  rule: string;
  name: string;
  severity: Severity;
  line: number;
  column: number;
  message: string;
  suggestion?: string;
}

export interface LintResult {
  ok: boolean;
  dialect: Dialect;
  statementCount: number;
  tables: string[];
  violations: LintViolation[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
  formatted: string;
  elapsedMs: number;
}

export const DIALECTS: { id: Dialect; label: string }[] = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'mariadb', label: 'MariaDB' },
  { id: 'sqlserver', label: 'SQL Server' },
  { id: 'oracle', label: 'Oracle' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'snowflake', label: 'Snowflake' },
  { id: 'clickhouse', label: 'ClickHouse' },
];

export const RULE_CATALOG: {
  id: string;
  name: string;
  severity: Severity;
  description: string;
}[] = [
  {
    id: 'L001',
    name: 'Trailing Whitespace',
    severity: 'warning',
    description: 'No trailing spaces or tabs at end of line.',
  },
  {
    id: 'L002',
    name: 'Mixed Indentation',
    severity: 'error',
    description: 'Do not mix tabs and spaces for indentation.',
  },
  {
    id: 'L003',
    name: 'Consecutive Blank Lines',
    severity: 'warning',
    description: 'At most one consecutive blank line.',
  },
  {
    id: 'L004',
    name: 'Indentation Depth',
    severity: 'warning',
    description: 'Indentation depth should stay reasonable (≤ 6 levels).',
  },
  {
    id: 'L005',
    name: 'Long Lines',
    severity: 'info',
    description: 'Lines should be ≤ 120 characters.',
  },
  {
    id: 'L006',
    name: 'SELECT *',
    severity: 'warning',
    description: 'Prefer explicit column lists over SELECT *.',
  },
  {
    id: 'L007',
    name: 'Keyword Case Consistency',
    severity: 'warning',
    description: 'SQL keywords should be uppercase.',
  },
  {
    id: 'L008',
    name: 'Comma Placement',
    severity: 'info',
    description: 'Prefer trailing commas on multi-line SELECT lists.',
  },
  {
    id: 'L009',
    name: 'Aliasing Consistency',
    severity: 'warning',
    description: 'Joined tables should use aliases.',
  },
  {
    id: 'L010',
    name: 'Redundant Whitespace',
    severity: 'info',
    description: 'Avoid double spaces outside string literals.',
  },
  {
    id: 'E1001',
    name: 'Empty Input',
    severity: 'error',
    description: 'SQL input must not be empty.',
  },
  {
    id: 'E1002',
    name: 'Unbalanced Delimiters',
    severity: 'error',
    description: 'Parentheses / brackets must balance.',
  },
  {
    id: 'E1003',
    name: 'Missing Statement Keyword',
    severity: 'error',
    description: 'Statement must start with a known SQL verb.',
  },
];

const KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'OUTER',
  'ON',
  'AS',
  'GROUP',
  'BY',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION',
  'ALL',
  'EXCEPT',
  'INTERSECT',
  'WITH',
  'RECURSIVE',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'NULL',
  'TRUE',
  'FALSE',
  'IS',
  'IN',
  'EXISTS',
  'BETWEEN',
  'LIKE',
  'ILIKE',
  'DISTINCT',
  'CREATE',
  'TABLE',
  'VIEW',
  'INDEX',
  'DROP',
  'ALTER',
  'PRIMARY',
  'KEY',
  'FOREIGN',
  'REFERENCES',
  'CONSTRAINT',
  'DEFAULT',
  'CHECK',
  'UNIQUE',
  'CASCADE',
  'RESTRICT',
  'RETURNING',
  'OVER',
  'PARTITION',
  'ROWS',
  'RANGE',
  'UNBOUNDED',
  'PRECEDING',
  'FOLLOWING',
  'CURRENT',
  'ROW',
  'MERGE',
  'USING',
  'MATCHED',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COALESCE',
  'CAST',
  'CROSS',
  'NATURAL',
  'FETCH',
  'FIRST',
  'NEXT',
  'ONLY',
  'TOP',
  'OFFSET',
  'IF',
  'ELSIF',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'TRUNCATE',
  'EXPLAIN',
  'ANALYZE',
];

const STATEMENT_START =
  /^(WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|MERGE|TRUNCATE|EXPLAIN|BEGIN|COMMIT|ROLLBACK)\b/i;

const DIALECT_HINTS: { dialect: Dialect; pattern: RegExp }[] = [
  { dialect: 'postgresql', pattern: /\b(ILIKE|DATE_TRUNC|JSONB|PL\/PGSQL|RETURNING)\b/i },
  { dialect: 'mysql', pattern: /\b(AUTO_INCREMENT|STRAIGHT_JOIN|`[^`]+`)\b/i },
  { dialect: 'sqlserver', pattern: /\b(NVARCHAR|TOP\s+\d+|\[dbo\])\b/i },
  { dialect: 'oracle', pattern: /\b(NVL\(|ROWNUM|CONNECT\s+BY)\b/i },
  { dialect: 'sqlite', pattern: /\b(AUTOINCREMENT|IFNULL\(|SQLITE_)\b/i },
  { dialect: 'snowflake', pattern: /\b(QUALIFY|FLATTEN\(|VARIANT)\b/i },
  { dialect: 'clickhouse', pattern: /\b(FINAL|PREWHERE|ENGINE\s*=)\b/i },
];

function lineCol(sql: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < sql.length; i++) {
    if (sql[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function stripStringsAndComments(sql: string): string {
  // Replace string/comment contents with spaces so keyword scans ignore them.
  return sql
    .replace(/--[^\n]*/g, (m) => ' '.repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/'(?:''|[^'])*'/g, (m) => `'${' '.repeat(Math.max(0, m.length - 2))}'`)
    .replace(/"(?:""|[^"])*"/g, (m) => `"${' '.repeat(Math.max(0, m.length - 2))}"`);
}

export function detectDialect(sql: string): Dialect {
  for (const hint of DIALECT_HINTS) {
    if (hint.pattern.test(sql)) return hint.dialect;
  }
  return 'postgresql';
}

export function extractTables(sql: string): string[] {
  const cleaned = stripStringsAndComments(sql);
  const tables = new Set<string>();
  const re =
    /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([a-zA-Z_][\w.]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const name = m[1];
    if (!KEYWORDS.includes(name.toUpperCase())) {
      tables.add(name);
    }
  }
  return Array.from(tables).sort((a, b) => a.localeCompare(b));
}

export function countStatements(sql: string): number {
  const cleaned = stripStringsAndComments(sql).trim();
  if (!cleaned) return 0;
  const parts = cleaned
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length || 0;
}

function push(
  out: LintViolation[],
  rule: string,
  name: string,
  severity: Severity,
  line: number,
  column: number,
  message: string,
  suggestion?: string
) {
  out.push({ rule, name, severity, line, column, message, suggestion });
}

export function formatSql(sql: string): string {
  // Lightweight formatter: normalize newlines, trim trailing space, collapse
  // multi-blank lines, uppercase known keywords outside strings/comments.
  const lines = sql.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let blankRun = 0;
  for (const raw of lines) {
    let line = raw.replace(/[ \t]+$/g, '');
    if (line.trim() === '') {
      blankRun += 1;
      if (blankRun <= 1) out.push('');
      continue;
    }
    blankRun = 0;
    // Skip comment-only lines
    if (/^\s*--/.test(line) || /^\s*\/\*/.test(line)) {
      out.push(line);
      continue;
    }
    line = line.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (tok, _w, offset, whole) => {
      // crude string guard: odd number of quotes before token → inside string
      const before = whole.slice(0, offset);
      const single = (before.match(/'/g) || []).length;
      const dbl = (before.match(/"/g) || []).length;
      if (single % 2 === 1 || dbl % 2 === 1) return tok;
      const up = tok.toUpperCase();
      return KEYWORDS.includes(up) ? up : tok;
    });
    // collapse internal double spaces (not indent)
    const indent = line.match(/^\s*/)?.[0] ?? '';
    const body = line
      .slice(indent.length)
      .replace(/ {2,}/g, ' ');
    out.push(indent + body);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n') + (out.length ? '\n' : '');
}

export function lintSql(
  sql: string,
  options: { dialect?: Dialect; maxLineLength?: number } = {}
): LintResult {
  const started = Date.now();
  const violations: LintViolation[] = [];
  const maxLine = options.maxLineLength ?? 120;
  const dialect =
    !options.dialect || options.dialect === 'auto'
      ? detectDialect(sql)
      : options.dialect;

  const trimmed = sql.replace(/^\uFEFF/, '');
  if (!trimmed.trim()) {
    push(
      violations,
      'E1001',
      'Empty Input',
      'error',
      1,
      1,
      'SQL input is empty',
      'Paste a SQL statement to lint'
    );
  } else {
    // Structural: balanced parens
    const cleaned = stripStringsAndComments(trimmed);
    let depth = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '(') depth += 1;
      if (ch === ')') {
        depth -= 1;
        if (depth < 0) {
          const { line, column } = lineCol(trimmed, i);
          push(
            violations,
            'E1002',
            'Unbalanced Delimiters',
            'error',
            line,
            column,
            'Unexpected closing parenthesis',
            'Remove the extra ) or add a matching ('
          );
          depth = 0;
        }
      }
    }
    if (depth > 0) {
      push(
        violations,
        'E1002',
        'Unbalanced Delimiters',
        'error',
        trimmed.split('\n').length,
        1,
        `Unclosed parenthesis (depth ${depth})`,
        'Add missing )'
      );
    }

    // Statement start check per non-empty segment
    const segments = cleaned
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const seg of segments) {
      if (!STATEMENT_START.test(seg)) {
        const idx = trimmed.indexOf(seg.slice(0, 24));
        const { line, column } = lineCol(trimmed, Math.max(0, idx));
        push(
          violations,
          'E1003',
          'Missing Statement Keyword',
          'error',
          line,
          column,
          'Statement does not start with a recognized SQL verb',
          'Start with SELECT, INSERT, UPDATE, DELETE, WITH, CREATE, …'
        );
      }
    }

    // Per-line style rules
    const lines = trimmed.replace(/\r\n/g, '\n').split('\n');
    let blankRun = 0;
    let sawSpaceIndent = false;
    let sawTabIndent = false;

    lines.forEach((line, i) => {
      const lineNo = i + 1;

      // L001 trailing whitespace
      if (/[ \t]+$/.test(line)) {
        push(
          violations,
          'L001',
          'Trailing Whitespace',
          'warning',
          lineNo,
          line.length,
          'Line has trailing whitespace',
          'Trim trailing spaces/tabs'
        );
      }

      // Indent tracking for L002
      const indent = line.match(/^[\t ]*/)?.[0] ?? '';
      if (indent.includes(' ') && indent.includes('\t')) {
        push(
          violations,
          'L002',
          'Mixed Indentation',
          'error',
          lineNo,
          1,
          'Line mixes tabs and spaces in indentation',
          'Use spaces only (4-space indent)'
        );
      }
      if (indent.includes(' ')) sawSpaceIndent = true;
      if (indent.includes('\t')) sawTabIndent = true;

      // L003 consecutive blanks
      if (line.trim() === '') {
        blankRun += 1;
        if (blankRun > 1) {
          push(
            violations,
            'L003',
            'Consecutive Blank Lines',
            'warning',
            lineNo,
            1,
            'More than one consecutive blank line',
            'Collapse to a single blank line'
          );
        }
      } else {
        blankRun = 0;
      }

      // L004 indentation depth (4-space levels)
      const spaceIndent = indent.replace(/\t/g, '    ').length;
      const levels = Math.floor(spaceIndent / 4);
      if (levels > 6) {
        push(
          violations,
          'L004',
          'Indentation Depth',
          'warning',
          lineNo,
          1,
          `Indentation depth ${levels} exceeds 6 levels`,
          'Refactor nested subqueries or break into CTEs'
        );
      }

      // L005 long lines
      if (line.length > maxLine) {
        push(
          violations,
          'L005',
          'Long Lines',
          'info',
          lineNo,
          maxLine + 1,
          `Line length ${line.length} exceeds ${maxLine}`,
          `Wrap before column ${maxLine}`
        );
      }
    });

    if (sawSpaceIndent && sawTabIndent) {
      // file-level mixed indent (in addition to per-line)
      push(
        violations,
        'L002',
        'Mixed Indentation',
        'error',
        1,
        1,
        'File uses both tab-indented and space-indented lines',
        'Normalize indentation to spaces'
      );
    }

    // L006 SELECT *  (* is non-word — do not use \b after it)
    {
      const re = /\bSELECT\s+\*/gi;
      let m: RegExpExecArray | null;
      const c = stripStringsAndComments(trimmed);
      while ((m = re.exec(c)) !== null) {
        const { line, column } = lineCol(trimmed, m.index);
        push(
          violations,
          'L006',
          'SELECT *',
          'warning',
          line,
          column,
          'SELECT * expands all columns and is brittle',
          'List columns explicitly'
        );
      }
    }

    // L007 keyword case — flag lowercase forms of known keywords
    {
      const c = stripStringsAndComments(trimmed);
      const re = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(c)) !== null) {
        const tok = m[1];
        const up = tok.toUpperCase();
        if (KEYWORDS.includes(up) && tok !== up) {
          const { line, column } = lineCol(trimmed, m.index);
          push(
            violations,
            'L007',
            'Keyword Case Consistency',
            'warning',
            line,
            column,
            `Keyword '${tok}' should be uppercase: '${up}'`,
            `Change '${tok}' to '${up}'`
          );
        }
      }
    }

    // L009: JOIN without alias (simple heuristic)
    {
      const c = stripStringsAndComments(trimmed);
      const re =
        /\b(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+|CROSS\s+)?JOIN\s+([a-zA-Z_][\w.]*)(\s|$)/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(c)) !== null) {
        const after = c.slice(m.index + m[0].length, m.index + m[0].length + 24);
        // If next token is ON/USING/WHERE/JOIN/ORDER/GROUP or end → no alias
        if (/^\s*(ON|USING|WHERE|JOIN|INNER|LEFT|RIGHT|FULL|CROSS|ORDER|GROUP|LIMIT|;|$)/i.test(
          m[2] + after
        )) {
          // allow schema.table followed by alias on same pattern — if group 2 is whitespace and next is keyword
          const { line, column } = lineCol(trimmed, m.index);
          push(
            violations,
            'L009',
            'Aliasing Consistency',
            'warning',
            line,
            column,
            `Joined table '${m[1]}' should use an alias`,
            `JOIN ${m[1]} AS <alias>`
          );
        }
      }
    }

    // L010 redundant whitespace (double spaces in body)
    {
      const lines = trimmed.replace(/\r\n/g, '\n').split('\n');
      lines.forEach((line, i) => {
        if (/^\s*--/.test(line)) return;
        const bodyStart = (line.match(/^\s*/)?.[0].length ?? 0);
        const body = line.slice(bodyStart);
        const idx = body.search(/ {2,}/);
        if (idx >= 0) {
          push(
            violations,
            'L010',
            'Redundant Whitespace',
            'info',
            i + 1,
            bodyStart + idx + 1,
            'Multiple consecutive spaces',
            'Collapse to a single space'
          );
        }
      });
    }
  }

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warning').length;
  const infos = violations.filter((v) => v.severity === 'info').length;

  return {
    ok: errors === 0,
    dialect,
    statementCount: countStatements(trimmed),
    tables: extractTables(trimmed),
    violations,
    summary: { errors, warnings, infos },
    formatted: formatSql(trimmed),
    elapsedMs: Date.now() - started,
  };
}

export function buildReportMarkdown(result: LintResult, sourceLabel = 'query'): string {
  const lines: string[] = [
    `# SQL Lint Report — ${sourceLabel}`,
    '',
    `- **Dialect:** ${result.dialect}`,
    `- **OK (no errors):** ${result.ok ? 'yes' : 'no'}`,
    `- **Statements:** ${result.statementCount}`,
    `- **Tables:** ${result.tables.length ? result.tables.join(', ') : '—'}`,
    `- **Errors / Warnings / Info:** ${result.summary.errors} / ${result.summary.warnings} / ${result.summary.infos}`,
    `- **Elapsed:** ${result.elapsedMs} ms`,
    '',
    '## Violations',
    '',
  ];
  if (!result.violations.length) {
    lines.push('_No violations._', '');
  } else {
    for (const v of result.violations) {
      lines.push(
        `- **[${v.rule}] ${v.name}** (${v.severity}) @ ${v.line}:${v.column} — ${v.message}` +
          (v.suggestion ? ` _Suggestion: ${v.suggestion}_` : '')
      );
    }
    lines.push('');
  }
  lines.push('## Formatted SQL', '', '```sql', result.formatted.trimEnd(), '```', '');
  return lines.join('\n');
}

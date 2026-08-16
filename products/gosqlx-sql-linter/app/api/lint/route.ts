import { NextResponse } from 'next/server';
import {
  DIALECTS,
  RULE_CATALOG,
  buildReportMarkdown,
  lintSql,
  type Dialect,
} from '../../data/linter';

export const runtime = 'nodejs';

const DIALECT_IDS = new Set(DIALECTS.map((d) => d.id));

/**
 * GET /api/lint — schema: dialects + rule catalog (for integrations).
 */
export async function GET() {
  return NextResponse.json({
    name: 'gosqlx-sql-linter',
    version: '1.0.0',
    dialects: DIALECTS,
    rules: RULE_CATALOG,
    ci: {
      action: 'ajitpratap0/GoSQLX@v1.14.0',
      workflow: '.github/workflows/gosqlx-lint.yml',
      standards: 'standards/SQL_CODE_STANDARDS.md',
    },
  });
}

/**
 * POST /api/lint — lint a SQL string.
 * Body: { sql: string, dialect?: Dialect, maxLineLength?: number, format?: 'json' | 'markdown' }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Body must be a JSON object' },
      { status: 400 }
    );
  }

  const { sql, dialect, maxLineLength, format } = body as {
    sql?: unknown;
    dialect?: unknown;
    maxLineLength?: unknown;
    format?: unknown;
  };

  if (typeof sql !== 'string') {
    return NextResponse.json(
      { error: 'Field "sql" (string) is required' },
      { status: 400 }
    );
  }

  if (sql.length > 200_000) {
    return NextResponse.json(
      { error: 'SQL payload exceeds 200KB limit' },
      { status: 413 }
    );
  }

  let resolvedDialect: Dialect | undefined;
  if (dialect !== undefined) {
    if (typeof dialect !== 'string' || !DIALECT_IDS.has(dialect as Dialect)) {
      return NextResponse.json(
        {
          error: `Invalid dialect. Expected one of: ${Array.from(DIALECT_IDS).join(', ')}`,
        },
        { status: 400 }
      );
    }
    resolvedDialect = dialect as Dialect;
  }

  let maxLen: number | undefined;
  if (maxLineLength !== undefined) {
    if (typeof maxLineLength !== 'number' || maxLineLength < 40 || maxLineLength > 500) {
      return NextResponse.json(
        { error: 'maxLineLength must be a number between 40 and 500' },
        { status: 400 }
      );
    }
    maxLen = maxLineLength;
  }

  const result = lintSql(sql, {
    dialect: resolvedDialect,
    maxLineLength: maxLen,
  });

  if (format === 'markdown') {
    const md = buildReportMarkdown(result);
    return new NextResponse(md, {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  return NextResponse.json(result, {
    status: result.ok ? 200 : 422,
  });
}

import { NextResponse } from 'next/server';
import {
  buildLintCsv,
  buildLintMarkdown,
  lintTerraformSource,
  type LintResult,
} from '../../lib/fmt-check';

export const runtime = 'nodejs';

interface LintRequestBody {
  source?: string;
  filename?: string;
  format?: 'json' | 'markdown' | 'csv';
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  return NextResponse.json({
    name: 'terraform-lint-guard',
    description:
      'POST Terraform HCL source to receive fmt-style findings. CI authority remains terraform fmt via ShubhamTatvamasi/terraform-lint-action@v1.',
    endpoints: {
      'POST /api/lint': {
        body: {
          source: 'string (required) — Terraform HCL text',
          filename: 'string (optional)',
          format: 'json | markdown | csv (default json)',
        },
      },
    },
    rules: [
      'no-tabs',
      'no-trailing-whitespace',
      'no-carriage-return',
      'equals-spacing',
      'align-equals',
      'indent-even',
    ],
  });
}

export async function POST(request: Request) {
  let body: LintRequestBody;
  try {
    body = (await request.json()) as LintRequestBody;
  } catch {
    return badRequest('Request body must be JSON.');
  }

  if (typeof body.source !== 'string') {
    return badRequest('Field "source" (string) is required.');
  }

  if (body.source.length > 200_000) {
    return badRequest('Source exceeds 200KB limit.', 413);
  }

  const result: LintResult = lintTerraformSource(body.source);
  const filename = typeof body.filename === 'string' ? body.filename : 'stdin.tf';
  const format = body.format || 'json';

  if (format === 'markdown') {
    const md = buildLintMarkdown(result, { filename });
    return new NextResponse(md, {
      status: result.ok ? 200 : 422,
      headers: { 'content-type': 'text/markdown; charset=utf-8' },
    });
  }

  if (format === 'csv') {
    const csv = buildLintCsv(result);
    return new NextResponse(csv, {
      status: result.ok ? 200 : 422,
      headers: { 'content-type': 'text/csv; charset=utf-8' },
    });
  }

  return NextResponse.json(
    {
      filename,
      ...result,
      markdown: buildLintMarkdown(result, { filename }),
      csv: buildLintCsv(result),
    },
    { status: result.ok ? 200 : 422 }
  );
}

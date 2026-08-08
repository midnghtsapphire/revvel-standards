import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../../lib/neon-core.js');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return respond({
    projectIdVar: sp.get('projectIdVar') || 'NEON_PROJECT_ID',
    apiKeySecret: sp.get('apiKeySecret') || 'NEON_API_KEY',
    expiryDays: Number(sp.get('expiryDays') || 14),
    headRef: sp.get('headRef') || 'feat/example',
    prNumber: sp.get('prNumber') || '1',
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  return respond({
    projectIdVar: String(body.projectIdVar || 'NEON_PROJECT_ID'),
    apiKeySecret: String(body.apiKeySecret || 'NEON_API_KEY'),
    expiryDays: Number(body.expiryDays ?? 14),
    headRef: String(body.headRef || 'feat/example'),
    prNumber: String(body.prNumber || body.pr || '1'),
  });
}

function respond(input: {
  projectIdVar: string;
  apiKeySecret: string;
  expiryDays: number;
  headRef: string;
  prNumber: string;
}) {
  const yaml = core.buildPreviewWorkflowYaml({
    projectIdVar: input.projectIdVar,
    apiKeySecret: input.apiKeySecret,
    expiryDays: input.expiryDays,
  });
  const previewBranch = core.slugifyPreviewBranch(input.headRef, input.prNumber);
  return NextResponse.json({
    yaml,
    previewBranch,
    secretsRequired: [input.apiKeySecret],
    varsRequired: [input.projectIdVar],
    notes: [
      'Pin third-party actions to full commit SHAs (already done in the template).',
      'Fork and Dependabot PRs are skipped — they do not receive repository secrets.',
      'Store the API key as a GitHub Actions secret; never commit the value.',
    ],
  });
}

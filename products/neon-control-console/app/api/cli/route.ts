import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../../lib/neon-core.js');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS = [
  'install',
  'auth-set-key',
  'list-projects',
  'list-branches',
  'create-branch',
  'delete-branch',
  'connection-string',
] as const;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return respond({
    action: sp.get('action') || '',
    projectId: sp.get('projectId') || sp.get('project_id') || '',
    branchName: sp.get('branchName') || sp.get('branch') || '',
    parent: sp.get('parent') || 'main',
    pooled: sp.get('pooled') !== 'false',
    headRef: sp.get('headRef') || '',
    prNumber: sp.get('prNumber') || '',
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
    action: String(body.action || ''),
    projectId: String(body.projectId || body.project_id || ''),
    branchName: String(body.branchName || body.branch || ''),
    parent: String(body.parent || 'main'),
    pooled: body.pooled !== false,
    headRef: String(body.headRef || ''),
    prNumber: String(body.prNumber || body.pr || ''),
  });
}

function respond(input: {
  action: string;
  projectId: string;
  branchName: string;
  parent: string;
  pooled: boolean;
  headRef: string;
  prNumber: string;
}) {
  let branchName = input.branchName;
  let previewName: string | null = null;
  if (input.headRef && input.prNumber) {
    previewName = core.slugifyPreviewBranch(input.headRef, input.prNumber);
    if (!branchName && previewName) branchName = previewName;
  }

  if (!input.action) {
    return NextResponse.json({
      actions: ACTIONS,
      hint: 'Pass action=list-projects (or POST { action }) to generate a neonctl command.',
      previewName,
    });
  }

  try {
    const result = core.buildNeonctlCommand({
      action: input.action,
      projectId: input.projectId,
      branchName,
      parent: input.parent,
      pooled: input.pooled,
    });
    return NextResponse.json({
      ...result,
      action: input.action,
      previewName,
      inputs: {
        projectId: input.projectId || null,
        branchName: branchName || null,
        parent: input.parent,
        pooled: input.pooled,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build command';
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code || '')
        : '';
    return NextResponse.json(
      { error: message, code, actions: ACTIONS },
      { status: code === 'BAD_ACTION' ? 400 : 500 }
    );
  }
}

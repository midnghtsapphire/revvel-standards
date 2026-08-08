import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../../lib/neon-core.js');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const config = core.resolveNeonConfig(process.env);
  const projectId =
    req.nextUrl.searchParams.get('projectId') ||
    req.nextUrl.searchParams.get('project_id') ||
    config.projectId ||
    '';

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId query param (or NEON_PROJECT_ID) is required' },
      { status: 400 }
    );
  }

  try {
    const client =
      config.mode === 'live'
        ? core.createNeonClient({ apiKey: config.apiKey, apiHost: config.apiHost })
        : null;
    const result = await core.listBranchesOrDemo(client, config, projectId);
    return NextResponse.json({
      mode: result.mode,
      projectId: result.projectId,
      branches: result.branches.map((b: Record<string, unknown>) => ({
        id: b.id,
        name: b.name,
        project_id: b.project_id,
        current_state: b.current_state,
        default: Boolean(b.default),
        parent_id: b.parent_id,
        created_at: b.created_at,
        expires_at: b.expires_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list branches';
    return NextResponse.json({ error: message, mode: config.mode }, { status: 502 });
  }
}

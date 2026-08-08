import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../../lib/neon-core.js');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = core.resolveNeonConfig(process.env);
  try {
    const client =
      config.mode === 'live'
        ? core.createNeonClient({ apiKey: config.apiKey, apiHost: config.apiHost })
        : null;
    const result = await core.listProjectsOrDemo(client, config);
    return NextResponse.json({
      mode: result.mode,
      projects: result.projects.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        region_id: p.region_id,
        pg_version: p.pg_version,
        created_at: p.created_at,
        proxy_host: p.proxy_host,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list projects';
    return NextResponse.json({ error: message, mode: config.mode }, { status: 502 });
  }
}

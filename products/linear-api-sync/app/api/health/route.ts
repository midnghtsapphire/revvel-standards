import { NextResponse } from 'next/server';
import { getPublicConfig } from '../../../lib/sync.js';

export const runtime = 'nodejs';

export async function GET() {
  const config = getPublicConfig(process.env);
  return NextResponse.json({
    ok: true,
    service: 'linear-api-sync',
    version: '1.0.0',
    config,
    endpoints: {
      health: 'GET /api/health',
      playgroundSync: 'POST /api/sync',
      githubWebhook: 'POST /api/github-commit-receiver',
    },
  });
}

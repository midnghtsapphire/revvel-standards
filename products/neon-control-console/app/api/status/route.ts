import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../../lib/neon-core.js');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = core.resolveNeonConfig(process.env);
  return NextResponse.json({
    ok: true,
    mode: config.mode,
    hasApiKey: Boolean(config.apiKey),
    defaultProjectId: config.projectId || null,
    apiHost: config.apiHost,
    secrets: {
      NEON_API_KEY: Boolean(config.apiKey) ? 'configured' : 'missing',
      NEON_PROJECT_ID: config.projectId ? 'configured' : 'optional-missing',
    },
    features: [
      'list-projects',
      'list-branches',
      'neonctl-generator',
      'github-actions-workflow-generator',
      'ops-markdown-export',
      'demo-mode',
    ],
  });
}

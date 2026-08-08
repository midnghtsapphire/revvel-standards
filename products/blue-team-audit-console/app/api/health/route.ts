import { NextResponse } from 'next/server';
import { DEMO_TRACES } from '../../data/demo-traces';
import { listActivity } from '../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness + readiness probe for deploy/monitoring.
 * GET /api/health
 */
export async function GET() {
  const started = Date.now();
  const body = {
    ok: true,
    service: 'blue-team-audit-console',
    version: '1.0.0',
    ts: new Date().toISOString(),
    uptime_probe_ms: 0,
    checks: {
      traces_loaded: DEMO_TRACES.length > 0,
      trace_count: DEMO_TRACES.length,
      activity_buffer: listActivity(1).length >= 0,
    },
    greenfield_compat: {
      schema_version: 2,
      source_model: 'Zanger67/greenfield-ui-public',
      export_artifacts: [
        'AI_AUDIT.md',
        'manifest.json',
        'items/commits.jsonl',
        'groups/user_groups.jsonl',
        'status/coverage.json',
      ],
    },
  };
  body.uptime_probe_ms = Date.now() - started;
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

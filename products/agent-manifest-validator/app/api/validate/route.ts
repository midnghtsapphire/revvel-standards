import { NextResponse } from 'next/server';
import {
  formatValidationAlert,
  validateAgentManifest,
} from '../../data/validator';

export const runtime = 'nodejs';

/**
 * POST /api/validate
 * Body: raw agent manifest JSON object (or { manifest: {...}, simulate_alert?: boolean })
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        valid: false,
        errors: [{ path: '', message: 'Request body must be valid JSON' }],
        summary: 'Request body must be valid JSON',
      },
      { status: 400 },
    );
  }

  const wrapper =
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'manifest' in (body as Record<string, unknown>)
      ? (body as { manifest: unknown; simulate_alert?: boolean })
      : null;

  const manifest = wrapper ? wrapper.manifest : body;
  const result = validateAgentManifest(manifest);

  const payload: Record<string, unknown> = { ...result };

  // Circuit-breaker cargo is only meaningful on failure. simulate_alert on a
  // valid manifest returns a distinct OK notice so downstream routers never
  // treat success as CRITICAL.
  if (!result.valid) {
    payload.alert_payload = formatValidationAlert({
      workflowName: 'Agent Manifest Validator API',
      executionId: `api-${result.checked_at}`,
      errorName: 'SchemaViolationException',
      errorMessage: result.summary,
      executionUrl:
        'https://revvel-standards.vercel.app/docs/agent-manifest-validator/',
    });
  } else if (wrapper?.simulate_alert) {
    payload.alert_payload =
      `✅ **Revvel Standards: Manifest Validation Passed**\n\n` +
      `• **Summary:** ${result.summary}\n` +
      `• **Skills remaining:** ${result.skill_budget_remaining ?? 'n/a'}\n` +
      `• **Checked at:** ${result.checked_at}`;
  }

  return NextResponse.json(payload, { status: result.valid ? 200 : 422 });
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/validate',
    accepts: 'Agent manifest object, or { manifest, simulate_alert? }',
    schema: 'GET /api/schema',
  });
}

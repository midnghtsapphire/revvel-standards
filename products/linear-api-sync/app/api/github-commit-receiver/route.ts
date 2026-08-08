import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicConfig,
  syncGithubPayloadToLinear,
  verifyWebhookSecret,
} from '../../../lib/sync.js';

export const runtime = 'nodejs';

function extractProvidedSecret(req: NextRequest): string {
  const headerSecret = req.headers.get('x-linear-sync-secret') || '';
  if (headerSecret) return headerSecret;
  const auth = req.headers.get('authorization') || '';
  if (!auth) return '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return (m ? m[1] : auth).trim();
}

export async function POST(req: NextRequest) {
  const auth = verifyWebhookSecret({
    configuredSecret: process.env.GITHUB_WEBHOOK_SECRET,
    providedSecret: extractProvidedSecret(req),
  });
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized', reason: auth.reason },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }

  const url = new URL(req.url);
  const liveFlag =
    url.searchParams.get('live') === '1' ||
    url.searchParams.get('live') === 'true' ||
    (body as { live?: unknown }).live === true;

  const dryRun = !liveFlag;
  const doneStateId = process.env.LINEAR_DONE_STATE_ID || null;

  try {
    const result = await syncGithubPayloadToLinear(body, {
      dryRun,
      apiKey: process.env.LINEAR_API_KEY,
      doneStateId,
    });

    const failed = result.results.filter((r) => r.status === 'error').length;
    return NextResponse.json(
      {
        ok: failed === 0,
        receiver: 'github-commit-receiver',
        live: !dryRun,
        ...result,
        config: getPublicConfig(process.env),
      },
      { status: failed ? 207 : 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        config: getPublicConfig(process.env),
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    receiver: 'github-commit-receiver',
    hint: 'POST a GitHub push webhook JSON body. Add ?live=1 to execute Linear mutations when LINEAR_API_KEY is configured.',
    config: getPublicConfig(process.env),
  });
}

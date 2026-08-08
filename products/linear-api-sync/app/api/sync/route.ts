import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicConfig,
  planLinearUpdates,
  syncGithubPayloadToLinear,
} from '../../../lib/sync.js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload =
    body && typeof body === 'object' && body.payload && typeof body.payload === 'object'
      ? body.payload
      : body;

  const dryRun = body?.dryRun !== false;
  const doneStateId =
    (typeof body?.doneStateId === 'string' && body.doneStateId) ||
    process.env.LINEAR_DONE_STATE_ID ||
    null;

  if (dryRun) {
    const plans = planLinearUpdates(payload, { doneStateId });
    return NextResponse.json({
      ok: true,
      dryRun: true,
      config: getPublicConfig(process.env),
      planned: plans.length,
      plans: plans.map((p) => ({
        issueId: p.issueId,
        mode: p.mutation.mode,
        commentText: p.commentText,
        variables: p.mutation.variables,
        commitMessage: p.commitMessage,
        author: p.author,
        url: p.url,
        sha: p.sha,
      })),
    });
  }

  try {
    const result = await syncGithubPayloadToLinear(payload, {
      dryRun: false,
      apiKey: process.env.LINEAR_API_KEY,
      doneStateId,
    });
    const failed = result.results.filter((r) => r.status === 'error').length;
    return NextResponse.json(
      {
        ok: failed === 0,
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
    usage:
      'POST JSON { message, author?, url?, sha?, dryRun?: true } or a GitHub push payload. dryRun defaults to true.',
    config: getPublicConfig(process.env),
  });
}

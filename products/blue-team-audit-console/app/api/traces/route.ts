import { NextRequest, NextResponse } from 'next/server';
import { listTraceSummaries } from '../../data/demo-traces';
import {
  COOKIE_NAME,
  parseCookieHeader,
  verifySessionToken,
} from '../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function userFrom(req: NextRequest) {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ||
    parseCookieHeader(req.headers.get('cookie'), COOKIE_NAME);
  return verifySessionToken(token);
}

/** GET /api/traces — list available processed traces. */
export async function GET(req: NextRequest) {
  const user = userFrom(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    traces: listTraceSummaries(),
  });
}

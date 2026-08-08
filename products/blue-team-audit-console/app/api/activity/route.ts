import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_NAME,
  parseCookieHeader,
  verifySessionToken,
} from '../../lib/auth';
import { listActivity } from '../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/activity — recent auditor activity (monitoring / ops). */
export async function GET(req: NextRequest) {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ||
    parseCookieHeader(req.headers.get('cookie'), COOKIE_NAME);
  const user = verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role === 'viewer') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const limit = Math.min(
    500,
    Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 100) || 100)
  );
  return NextResponse.json({
    ok: true,
    events: listActivity(limit),
  });
}

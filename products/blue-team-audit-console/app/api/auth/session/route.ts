import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_NAME,
  parseCookieHeader,
  verifySessionToken,
} from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ||
    parseCookieHeader(req.headers.get('cookie'), COOKIE_NAME);
  const user = verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user });
}

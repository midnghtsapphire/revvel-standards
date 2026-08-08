import { NextResponse } from 'next/server';
import { COOKIE_NAME, sessionCookieOptions } from '../../../lib/auth';
import { log, newRequestId } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const requestId = newRequestId();
  const cookie = sessionCookieOptions(0);
  const res = NextResponse.json(
    { ok: true },
    { headers: { 'X-Request-Id': requestId } }
  );
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: 0,
  });
  log.info('logout', { requestId });
  return res;
}

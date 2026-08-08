import { NextRequest, NextResponse } from 'next/server';
import {
  authenticate,
  createSessionToken,
  sessionCookieOptions,
  COOKIE_NAME,
} from '../../../lib/auth';
import { log, newRequestId } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  let body: { email?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400, headers: { 'X-Request-Id': requestId } }
    );
  }

  const result = authenticate(body.email, body.password);
  if (!result.ok) {
    log.warn('login_failed', { requestId, meta: { reason: result.error } });
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 401, headers: { 'X-Request-Id': requestId } }
    );
  }

  const token = createSessionToken(result.user);
  const cookie = sessionCookieOptions();
  const res = NextResponse.json(
    {
      ok: true,
      user: result.user,
    },
    { headers: { 'X-Request-Id': requestId } }
  );
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  log.info('login_ok', { requestId, userId: result.user.id });
  return res;
}

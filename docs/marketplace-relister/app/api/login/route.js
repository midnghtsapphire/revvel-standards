import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const password = process.env.FAMILY_APP_PASSWORD;

    if (!password) {
      // No password configured — allow through for first deploy testing
      const res = NextResponse.json({ ok: true, open: true });
      res.cookies.set('family_ok', '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    if (String(body.password || '') !== password) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('family_ok', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

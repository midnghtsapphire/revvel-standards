import { NextResponse } from 'next/server';

/** Protect API routes when FAMILY_APP_PASSWORD is set. */
export function middleware(request) {
  const password = process.env.FAMILY_APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/session') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const cookie = request.cookies.get('family_ok')?.value;
    if (cookie !== '1') {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

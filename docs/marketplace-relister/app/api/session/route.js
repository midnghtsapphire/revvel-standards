import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const password = process.env.FAMILY_APP_PASSWORD;
  if (!password) {
    return NextResponse.json({ ok: true, open: true });
  }
  const jar = await cookies();
  const ok = jar.get('family_ok')?.value === '1';
  return NextResponse.json({ ok, open: false });
}

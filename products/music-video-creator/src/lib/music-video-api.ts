import { NextResponse, type NextRequest } from 'next/server';

export { OPENROUTER_API_URL, OR_MODELS } from './openrouter-config';

/**
 * Check the inbound x-api-key header against MUSIC_VIDEO_API_KEY.
 * If the env var is unset the endpoint runs in dev mode (no auth required).
 * Returns a 401 NextResponse on failure, or null if auth passes.
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const requiredKey = process.env.MUSIC_VIDEO_API_KEY;
  if (!requiredKey) return null; // dev/unprotected mode
  const provided = request.headers.get('x-api-key');
  if (provided !== requiredKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

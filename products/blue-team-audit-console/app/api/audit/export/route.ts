import { NextRequest, NextResponse } from 'next/server';
import { getTrace } from '../../../data/demo-traces';
import {
  COOKIE_NAME,
  parseCookieHeader,
  verifySessionToken,
} from '../../../lib/auth';
import { buildAuditModel, serializeAuditFiles } from '../../../lib/audit';
import { getOverlay, logActivity } from '../../../lib/store';
import { validateTraceName } from '../../../lib/validation';
import { log, newRequestId } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function userFrom(req: NextRequest) {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ||
    parseCookieHeader(req.headers.get('cookie'), COOKIE_NAME);
  return verifySessionToken(token);
}

/**
 * POST /api/audit/export
 * body: { trace: string, format?: 'json' | 'markdown' | 'bundle' }
 *
 * Returns greenfield-compatible audit artifacts.
 */
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const user = userFrom(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { trace?: string; format?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const nameCheck = validateTraceName(body.trace);
  if (!nameCheck.ok) {
    return NextResponse.json({ ok: false, error: nameCheck.error }, { status: 400 });
  }

  const traceName = String(body.trace);
  const trace = getTrace(traceName);
  if (!trace) {
    return NextResponse.json({ ok: false, error: 'Trace not found' }, { status: 404 });
  }

  const overlay = getOverlay(user.id, traceName);
  const model = buildAuditModel(trace, overlay, user.email);
  const files = serializeAuditFiles(model);
  const format = (body.format || 'bundle').toLowerCase();

  logActivity({
    type: 'export',
    userId: user.id,
    trace: traceName,
    format,
    requestId,
  });
  log.info('audit_export', {
    requestId,
    userId: user.id,
    trace: traceName,
    meta: { format, flags: model.session.flag_count },
  });

  if (format === 'markdown') {
    return new NextResponse(files['AI_AUDIT.md'], {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="AI_AUDIT.md"`,
        'X-Request-Id': requestId,
      },
    });
  }

  if (format === 'json') {
    return NextResponse.json(
      { ok: true, model, files },
      { headers: { 'X-Request-Id': requestId } }
    );
  }

  // Default bundle
  return NextResponse.json(
    {
      ok: true,
      format: 'bundle',
      model,
      files,
    },
    { headers: { 'X-Request-Id': requestId } }
  );
}

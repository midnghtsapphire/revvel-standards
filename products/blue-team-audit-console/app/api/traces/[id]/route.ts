import { NextRequest, NextResponse } from 'next/server';
import { getTrace } from '../../../data/demo-traces';
import {
  COOKIE_NAME,
  canWrite,
  parseCookieHeader,
  verifySessionToken,
} from '../../../lib/auth';
import {
  addNote,
  createGroup,
  markVisited,
  tagEvent,
  toggleFlag,
  buildAuditModel,
  coverageOf,
  countFlags,
  countNotes,
} from '../../../lib/audit';
import { getOverlay, setOverlay, logActivity } from '../../../lib/store';
import {
  validateId,
  validateNoteText,
  validateGroupName,
  validateTraceName,
} from '../../../lib/validation';
import { log, newRequestId } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function userFrom(req: NextRequest) {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ||
    parseCookieHeader(req.headers.get('cookie'), COOKIE_NAME);
  return verifySessionToken(token);
}

/** GET /api/traces/:id — full trace + current overlay summary. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const user = userFrom(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId);
  const nameCheck = validateTraceName(id);
  if (!nameCheck.ok) {
    return NextResponse.json({ ok: false, error: nameCheck.error }, { status: 400 });
  }
  const trace = getTrace(id);
  if (!trace) {
    return NextResponse.json({ ok: false, error: 'Trace not found' }, { status: 404 });
  }
  const overlay = getOverlay(user.id, id);
  return NextResponse.json({
    ok: true,
    trace,
    overlay,
    stats: {
      ...coverageOf(trace, overlay),
      flags: countFlags(overlay),
      notes: countNotes(overlay),
      groups: Object.keys(overlay.groups).length,
    },
  });
}

type MutationBody =
  | { action: 'flag'; eventId: string }
  | { action: 'note'; eventId: string; text: string }
  | { action: 'visit'; eventId: string }
  | { action: 'dismiss'; eventId: string }
  | { action: 'create_group'; name: string; color?: string }
  | { action: 'tag'; eventId: string; groupId: string }
  | { action: 'replace_overlay'; overlay: unknown };

/**
 * POST /api/traces/:id — mutate auditor overlay (flag / note / visit / group).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  const user = userFrom(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!canWrite(user)) {
    return NextResponse.json(
      { ok: false, error: 'Viewer role cannot mutate audits' },
      { status: 403 }
    );
  }

  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId);
  const nameCheck = validateTraceName(id);
  if (!nameCheck.ok) {
    return NextResponse.json({ ok: false, error: nameCheck.error }, { status: 400 });
  }
  const trace = getTrace(id);
  if (!trace) {
    return NextResponse.json({ ok: false, error: 'Trace not found' }, { status: 404 });
  }

  let body: MutationBody;
  try {
    body = (await req.json()) as MutationBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  let overlay = getOverlay(user.id, id);

  switch (body.action) {
    case 'flag': {
      const idCheck = validateId(body.eventId, 'eventId');
      if (!idCheck.ok) {
        return NextResponse.json({ ok: false, error: idCheck.error }, { status: 400 });
      }
      overlay = toggleFlag(overlay, body.eventId);
      logActivity({ type: 'flag', userId: user.id, trace: id, eventId: body.eventId, requestId });
      break;
    }
    case 'note': {
      const idCheck = validateId(body.eventId, 'eventId');
      const textCheck = validateNoteText(body.text);
      if (!idCheck.ok) {
        return NextResponse.json({ ok: false, error: idCheck.error }, { status: 400 });
      }
      if (!textCheck.ok) {
        return NextResponse.json({ ok: false, error: textCheck.error }, { status: 400 });
      }
      overlay = addNote(overlay, body.eventId, body.text, user.email);
      logActivity({ type: 'note-add', userId: user.id, trace: id, eventId: body.eventId, requestId });
      break;
    }
    case 'visit': {
      const idCheck = validateId(body.eventId, 'eventId');
      if (!idCheck.ok) {
        return NextResponse.json({ ok: false, error: idCheck.error }, { status: 400 });
      }
      overlay = markVisited(overlay, body.eventId);
      break;
    }
    case 'dismiss': {
      const idCheck = validateId(body.eventId, 'eventId');
      if (!idCheck.ok) {
        return NextResponse.json({ ok: false, error: idCheck.error }, { status: 400 });
      }
      overlay = {
        ...overlay,
        dismissed: { ...overlay.dismissed, [body.eventId]: !overlay.dismissed[body.eventId] },
      };
      logActivity({ type: 'dismiss', userId: user.id, trace: id, eventId: body.eventId, requestId });
      break;
    }
    case 'create_group': {
      const nameCheck2 = validateGroupName(body.name);
      if (!nameCheck2.ok) {
        return NextResponse.json({ ok: false, error: nameCheck2.error }, { status: 400 });
      }
      const created = createGroup(overlay, body.name, body.color);
      overlay = created.overlay;
      setOverlay(user.id, id, overlay);
      logActivity({ type: 'group-create', userId: user.id, trace: id, groupId: created.groupId, requestId });
      return NextResponse.json({
        ok: true,
        overlay,
        groupId: created.groupId,
        model: buildAuditModel(trace, overlay, user.email),
      });
    }
    case 'tag': {
      const eCheck = validateId(body.eventId, 'eventId');
      const gCheck = validateId(body.groupId, 'groupId');
      if (!eCheck.ok) {
        return NextResponse.json({ ok: false, error: eCheck.error }, { status: 400 });
      }
      if (!gCheck.ok) {
        return NextResponse.json({ ok: false, error: gCheck.error }, { status: 400 });
      }
      overlay = tagEvent(overlay, body.eventId, body.groupId);
      logActivity({
        type: 'tag',
        userId: user.id,
        trace: id,
        eventId: body.eventId,
        groupId: body.groupId,
        requestId,
      });
      break;
    }
    default:
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  setOverlay(user.id, id, overlay);
  log.info('trace_mutated', {
    requestId,
    userId: user.id,
    trace: id,
    meta: { action: (body as { action: string }).action },
  });

  return NextResponse.json({
    ok: true,
    overlay,
    stats: {
      ...coverageOf(trace, overlay),
      flags: countFlags(overlay),
      notes: countNotes(overlay),
      groups: Object.keys(overlay.groups).length,
    },
  });
}

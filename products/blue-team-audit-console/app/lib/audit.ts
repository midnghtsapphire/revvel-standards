/**
 * Blue-team audit model builder + exporters.
 * Compatible with greenfield-ui-public schema_version 2 artifacts
 * (AI_AUDIT.md, items/*.jsonl, manifest.json).
 */

import {
  SCHEMA_VERSION,
  AUDIT_SOURCE,
  type AuditModel,
  type AuditOverlay,
  type TracePackage,
  type Note,
  emptyOverlay,
} from './types';
import { escapeMarkdown, sanitizeText } from './validation';

function mapNotes(notes: Note[] | undefined) {
  return (notes || []).map((n) => ({
    id: n.id,
    text: sanitizeText(n.text),
    created_at: n.createdAt,
    author: n.author,
  }));
}

function sha7(s: string | null | undefined): string {
  return s ? s.slice(0, 7) : '—';
}

export function countFlags(overlay: AuditOverlay): number {
  return Object.values(overlay.flagged).filter(Boolean).length;
}

export function countNotes(overlay: AuditOverlay): number {
  return Object.values(overlay.notes).reduce((n, arr) => n + (arr?.length || 0), 0);
}

export function coverageOf(trace: TracePackage, overlay: AuditOverlay): {
  visited: number;
  total: number;
} {
  const total = trace.events.length;
  let visited = 0;
  for (const ev of trace.events) {
    if (overlay.visited[ev.id] || ev.visited) visited += 1;
  }
  return { visited, total };
}

/**
 * Build a greenfield-compatible audit model from a trace + overlay.
 */
export function buildAuditModel(
  trace: TracePackage,
  overlay: AuditOverlay = emptyOverlay(),
  auditor?: string
): AuditModel {
  const byId = new Map(trace.events.map((e) => [e.id, e]));

  const taggedKeys = new Set(
    Object.keys(overlay.tags).filter((k) => (overlay.tags[k] || []).length > 0)
  );

  const groupIdsFor = (key: string) => (overlay.tags[key] || []).slice();
  const groupNamesFor = (key: string) =>
    (overlay.tags[key] || [])
      .map((id) => overlay.groups[id]?.name)
      .filter((n): n is string => !!n);

  const commits = trace.events
    .filter(
      (c) =>
        overlay.flagged[c.id] ||
        (overlay.notes[c.id] || []).length > 0 ||
        taggedKeys.has(c.id)
    )
    .map((c) => ({
      target_kind: 'commit' as const,
      target_key: `commit:${c.id}`,
      event_id: c.id,
      inner_commit_sha: c.sha || null,
      kind: c.kind,
      file: c.file || null,
      flagged: !!overlay.flagged[c.id],
      tagged_group_ids: groupIdsFor(c.id),
      tagged_group_names: groupNamesFor(c.id),
      notes: mapNotes(overlay.notes[c.id]),
    }));

  const threads = trace.threads
    .filter(
      (t) =>
        overlay.flagged[`thread:${t.id}`] ||
        (overlay.notes[`thread:${t.id}`] || []).length > 0 ||
        taggedKeys.has(`thread:${t.id}`)
    )
    .map((t) => {
      const key = `thread:${t.id}`;
      return {
        target_kind: 'thread',
        target_key: key,
        thread_id: t.id,
        title: t.title,
        theme: t.theme || null,
        category: t.category || null,
        commit_shas: t.eventIds
          .map((id) => byId.get(id)?.sha)
          .filter((s): s is string => !!s),
        flagged: !!overlay.flagged[key],
        tagged_group_ids: groupIdsFor(key),
        tagged_group_names: groupNamesFor(key),
        notes: mapNotes(overlay.notes[key]),
      };
    });

  const areas = trace.areas
    .filter(
      (a) =>
        overlay.flagged[`area:${a.id}`] ||
        (overlay.notes[`area:${a.id}`] || []).length > 0 ||
        taggedKeys.has(`area:${a.id}`)
    )
    .map((a) => {
      const key = `area:${a.id}`;
      return {
        target_kind: 'area',
        target_key: key,
        area_id: a.id,
        title: a.title,
        category: a.category || null,
        anchor_sha: a.anchorSha || null,
        commit_shas: a.eventIds
          .map((id) => byId.get(id)?.sha)
          .filter((s): s is string => !!s),
        flagged: !!overlay.flagged[key],
        tagged_group_ids: groupIdsFor(key),
        tagged_group_names: groupNamesFor(key),
        notes: mapNotes(overlay.notes[key]),
      };
    });

  const reverseMembers: Record<string, string[]> = {};
  for (const [key, gids] of Object.entries(overlay.tags)) {
    for (const gid of gids || []) {
      if (!reverseMembers[gid]) reverseMembers[gid] = [];
      reverseMembers[gid].push(key);
    }
  }

  const userGroups = Object.values(overlay.groups)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((g) => {
      const members = {
        commits: [] as string[],
        threads: [] as string[],
        areas: [] as string[],
        files: [] as string[],
        plots: [] as string[],
        sidecar_groups: [] as string[],
      };
      for (const key of reverseMembers[g.id] || g.memberKeys || []) {
        if (key.startsWith('thread:')) members.threads.push(key);
        else if (key.startsWith('area:')) members.areas.push(key);
        else if (key.startsWith('doc:')) members.files.push(key);
        else if (key.startsWith('plot:')) members.plots.push(key);
        else if (key.startsWith('group:')) members.sidecar_groups.push(key);
        else members.commits.push(`commit:${key.replace(/^commit:/, '')}`);
      }
      const member_count = Object.values(members).reduce((n, a) => n + a.length, 0);
      return {
        group_id: g.id,
        name: g.name,
        color: g.color || null,
        created_at: g.createdAt,
        flagged: !!overlay.flagged[`usergroup:${g.id}`],
        notes: mapNotes(overlay.notes[`usergroup:${g.id}`]),
        members,
        member_count,
      };
    });

  const dismissals = Object.keys(overlay.dismissed)
    .filter((k) => overlay.dismissed[k])
    .map((key) => {
      const colon = key.indexOf(':');
      if (colon > 0) {
        const prefix = key.slice(0, colon);
        const rest = key.slice(colon + 1);
        return {
          target_kind: prefix,
          target_key: key,
          id: rest,
          inner_commit_sha: null as string | null,
        };
      }
      return {
        target_kind: 'commit',
        target_key: `commit:${key}`,
        event_id: key,
        inner_commit_sha: byId.get(key)?.sha || null,
      };
    })
    .sort((a, b) => a.target_key.localeCompare(b.target_key));

  const cov = coverageOf(trace, overlay);
  const flag_count = countFlags(overlay);

  return {
    schema_version: SCHEMA_VERSION,
    source: AUDIT_SOURCE,
    trace: trace.meta.name,
    session: {
      experiment: trace.meta.experiment || null,
      commit_count: trace.events.length,
      flag_count,
      note_count: countNotes(overlay),
      auditor,
    },
    coverage: cov,
    commits,
    threads,
    areas,
    userGroups,
    dismissals,
  };
}

export function renderAuditMarkdown(model: AuditModel, exportedAt?: string): string {
  const L: string[] = [];
  L.push(`# Audit notes — ${model.trace || 'trace'}`);
  L.push('');
  L.push('> Auditor-authored hints, mirrored from the blue-team audit UI. Not ground truth —');
  L.push('> confirm against the logs and the diffs in `reconstructed_codebase/`.');
  L.push('');
  L.push(`- Coverage: ${model.coverage.visited}/${model.coverage.total} commits visited`);
  L.push(`- Flagged: ${model.session.flag_count}`);
  L.push(`- Notes: ${model.session.note_count}`);
  if (model.session.auditor) L.push(`- Auditor: ${escapeMarkdown(model.session.auditor)}`);
  if (exportedAt) L.push(`- Last synced: ${exportedAt}`);
  L.push(`- Schema: v${model.schema_version} (${model.source})`);
  L.push('');

  const flaggedCommits = model.commits.filter((c) => c.flagged);
  if (flaggedCommits.length) {
    L.push('## Flagged');
    L.push('');
    L.push('| kind | ref | what | groups |');
    L.push('| --- | --- | --- | --- |');
    for (const c of flaggedCommits) {
      L.push(
        `| commit | \`${sha7(c.inner_commit_sha)}\` | ${escapeMarkdown(c.file || c.kind)} | ${escapeMarkdown(c.tagged_group_names.join(', '))} |`
      );
    }
    L.push('');
  }

  const withNotes = model.commits.filter((x) => (x.notes || []).length > 0);
  if (withNotes.length) {
    L.push('## Notes');
    L.push('');
    for (const item of withNotes) {
      const ref = item.inner_commit_sha ? `\`${sha7(item.inner_commit_sha)}\`` : item.event_id;
      const label = item.file || item.kind;
      L.push(`### commit ${ref} — ${escapeMarkdown(label)}`);
      for (const n of item.notes) L.push(`- ${escapeMarkdown(n.text)}`);
      L.push('');
    }
  }

  if (model.userGroups.length) {
    L.push('## User groups');
    L.push('');
    for (const g of model.userGroups) {
      const name = String((g as { name?: string }).name || '');
      const count = Number((g as { member_count?: number }).member_count || 0);
      L.push(`- **${escapeMarkdown(name)}** (${count} members)`);
    }
    L.push('');
  }

  if (!flaggedCommits.length && !withNotes.length) {
    L.push('_No flags or notes yet._');
    L.push('');
  }

  return L.join('\n');
}

function jsonl(records: unknown[]): string {
  return records.length ? records.map((r) => JSON.stringify(r)).join('\n') + '\n' : '';
}

/**
 * Serialize audit model into greenfield-compatible on-disk file map.
 */
export function serializeAuditFiles(model: AuditModel): Record<string, string> {
  const exportedAt = new Date().toISOString();
  const stamp = (obj: Record<string, unknown>) => ({
    schema_version: SCHEMA_VERSION,
    source: AUDIT_SOURCE,
    trace: model.trace,
    ...obj,
  });

  const manifest = stamp({
    generated_at: exportedAt,
    key_scheme: {
      format: '<kind>:<id>',
      kinds: {
        commit: 'event_id',
        thread: 'thread_id',
        area: 'area_id',
        doc: 'doc_id',
        plot: 'plot_file',
        group: 'sidecar group_id',
      },
    },
    files: {
      items: [
        'items/commits.jsonl',
        'items/threads.jsonl',
        'items/areas.jsonl',
      ],
      groups: ['groups/user_groups.jsonl'],
      status: ['status/dismissals.jsonl', 'status/coverage.json'],
      digest: 'AI_AUDIT.md',
    },
    counts: {
      commits: model.commits.length,
      threads: model.threads.length,
      areas: model.areas.length,
      user_groups: model.userGroups.length,
      dismissals: model.dismissals.length,
    },
    session: model.session,
  });

  const coverage = stamp({
    exported_at: exportedAt,
    session: model.session,
    coverage: model.coverage,
  });

  return {
    'manifest.json': JSON.stringify(manifest, null, 2) + '\n',
    'items/commits.jsonl': jsonl(model.commits.map((c) => stamp({ ...c }))),
    'items/threads.jsonl': jsonl(model.threads.map((t) => stamp({ ...t }))),
    'items/areas.jsonl': jsonl(model.areas.map((a) => stamp({ ...a }))),
    'groups/user_groups.jsonl': jsonl(model.userGroups.map((g) => stamp({ ...g }))),
    'status/dismissals.jsonl': jsonl(model.dismissals.map((d) => stamp({ ...d }))),
    'status/coverage.json': JSON.stringify(coverage, null, 2) + '\n',
    'AI_AUDIT.md': renderAuditMarkdown(model, exportedAt),
  };
}

export function filterEvents(
  trace: TracePackage,
  opts: {
    query?: string;
    kind?: string;
    flaggedOnly?: boolean;
    suspectsOnly?: boolean;
    overlay?: AuditOverlay;
  }
) {
  const q = (opts.query || '').trim().toLowerCase();
  const overlay = opts.overlay || emptyOverlay();
  return trace.events.filter((ev) => {
    if (opts.kind && opts.kind !== 'all' && ev.kind !== opts.kind) return false;
    if (opts.flaggedOnly && !overlay.flagged[ev.id]) return false;
    if (opts.suspectsOnly && !(ev.suspicion && ev.suspicion >= 0.5) && !(ev.deterministicFlags?.length)) {
      return false;
    }
    if (!q) return true;
    const hay = [
      ev.id,
      ev.sha,
      ev.summary,
      ev.file || '',
      ev.command || '',
      ev.annotation || '',
      ...(ev.deterministicFlags || []),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function suspicionLabel(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return 'none';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.25) return 'low';
  return 'clear';
}

export function toggleFlag(overlay: AuditOverlay, key: string): AuditOverlay {
  return {
    ...overlay,
    flagged: { ...overlay.flagged, [key]: !overlay.flagged[key] },
  };
}

export function addNote(
  overlay: AuditOverlay,
  key: string,
  text: string,
  author?: string
): AuditOverlay {
  const note: Note = {
    id: `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    text: sanitizeText(text),
    createdAt: new Date().toISOString(),
    author,
  };
  const prev = overlay.notes[key] || [];
  return {
    ...overlay,
    notes: { ...overlay.notes, [key]: [...prev, note] },
  };
}

export function markVisited(overlay: AuditOverlay, eventId: string): AuditOverlay {
  if (overlay.visited[eventId]) return overlay;
  return {
    ...overlay,
    visited: { ...overlay.visited, [eventId]: true },
  };
}

export function createGroup(
  overlay: AuditOverlay,
  name: string,
  color?: string
): { overlay: AuditOverlay; groupId: string } {
  const groupId = `ug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const group = {
    id: groupId,
    name: sanitizeText(name),
    color: color || '#3b82f6',
    createdAt: new Date().toISOString(),
    memberKeys: [] as string[],
  };
  return {
    groupId,
    overlay: {
      ...overlay,
      groups: { ...overlay.groups, [groupId]: group },
    },
  };
}

export function tagEvent(
  overlay: AuditOverlay,
  eventKey: string,
  groupId: string
): AuditOverlay {
  if (!overlay.groups[groupId]) return overlay;
  const existing = new Set(overlay.tags[eventKey] || []);
  existing.add(groupId);
  const group = overlay.groups[groupId];
  const memberKeys = Array.from(new Set([...(group.memberKeys || []), eventKey]));
  return {
    ...overlay,
    tags: { ...overlay.tags, [eventKey]: Array.from(existing) },
    groups: {
      ...overlay.groups,
      [groupId]: { ...group, memberKeys },
    },
  };
}

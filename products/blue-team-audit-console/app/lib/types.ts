/**
 * Greenfield / Redlogs-compatible blue-team audit types.
 *
 * Schema mirrors the public greenfield-ui-public (Zanger67) audit overlay:
 * schema_version 2 target_key = `<kind>:<id>` with commit/thread/area/doc/plot/group.
 * Defensive only — no red-team / offensive tooling.
 */

export const SCHEMA_VERSION = 2 as const;
export const AUDIT_SOURCE = 'auditor' as const;

export type EventKind =
  | 'bash'
  | 'file_edit'
  | 'file_create'
  | 'file_delete'
  | 'tool'
  | 'read'
  | 'other';

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface TraceEvent {
  id: string;
  sha: string;
  kind: EventKind;
  timestamp: string;
  summary: string;
  file?: string | null;
  command?: string | null;
  annotation?: string | null;
  /** Deterministic pre-flags from commit_builder_metadata/flags.jsonl */
  deterministicFlags?: string[];
  /** LLM suspicion score 0–1 from suspicions.jsonl (display only) */
  suspicion?: number | null;
  threadId?: string | null;
  groupId?: string | null;
  visited?: boolean;
}

export interface SemanticThread {
  id: string;
  title: string;
  theme?: string | null;
  category?: string | null;
  eventIds: string[];
  anchorSha?: string | null;
}

export interface SemanticArea {
  id: string;
  title: string;
  category?: string | null;
  eventIds: string[];
  anchorSha?: string | null;
}

export interface TraceMeta {
  name: string;
  experiment: string;
  uiName?: string;
  description?: string;
  createdAt: string;
  provenance?: string;
}

export interface TracePackage {
  meta: TraceMeta;
  events: TraceEvent[];
  threads: SemanticThread[];
  areas: SemanticArea[];
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  author?: string;
}

export interface UserGroup {
  id: string;
  name: string;
  color?: string | null;
  createdAt: string;
  /** Overlay keys (bare event id for commits, or kind:id) */
  memberKeys: string[];
}

/** Auditor overlay state — flags/notes/dismissals/groups/tags */
export interface AuditOverlay {
  flagged: Record<string, boolean>;
  notes: Record<string, Note[]>;
  dismissed: Record<string, boolean>;
  /** key → group ids */
  tags: Record<string, string[]>;
  groups: Record<string, UserGroup>;
  visited: Record<string, boolean>;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'auditor' | 'lead' | 'viewer';
}

export interface AuditCommitItem {
  target_kind: 'commit';
  target_key: string;
  event_id: string;
  inner_commit_sha: string | null;
  kind: EventKind;
  file: string | null;
  flagged: boolean;
  tagged_group_ids: string[];
  tagged_group_names: string[];
  notes: Array<{ id: string; text: string; created_at: string }>;
}

export interface AuditModel {
  schema_version: typeof SCHEMA_VERSION;
  source: typeof AUDIT_SOURCE;
  trace: string;
  session: {
    experiment: string | null;
    commit_count: number;
    flag_count: number;
    note_count: number;
    auditor?: string;
  };
  coverage: { visited: number; total: number };
  commits: AuditCommitItem[];
  threads: Array<Record<string, unknown>>;
  areas: Array<Record<string, unknown>>;
  userGroups: Array<Record<string, unknown>>;
  dismissals: Array<Record<string, unknown>>;
}

export type ScreenId = 'timeline' | 'threads' | 'overview' | 'export';

export function emptyOverlay(): AuditOverlay {
  return {
    flagged: {},
    notes: {},
    dismissed: {},
    tags: {},
    groups: {},
    visited: {},
  };
}

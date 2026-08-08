/**
 * In-memory overlay store keyed by `${userId}::${traceName}`.
 * Survives within a single server process / warm lambda; sufficient for
 * demo SaaS and tests. Swap for Redis/Postgres without changing the UI.
 */

import type { AuditOverlay } from './types';
import { emptyOverlay } from './types';

const globalStore = globalThis as unknown as {
  __btOverlayStore?: Map<string, AuditOverlay>;
  __btActivityLog?: Array<Record<string, unknown>>;
};

function overlays(): Map<string, AuditOverlay> {
  if (!globalStore.__btOverlayStore) {
    globalStore.__btOverlayStore = new Map();
  }
  return globalStore.__btOverlayStore;
}

function activity(): Array<Record<string, unknown>> {
  if (!globalStore.__btActivityLog) {
    globalStore.__btActivityLog = [];
  }
  return globalStore.__btActivityLog;
}

function key(userId: string, trace: string): string {
  return `${userId}::${trace}`;
}

export function getOverlay(userId: string, trace: string): AuditOverlay {
  const k = key(userId, trace);
  const existing = overlays().get(k);
  if (existing) return existing;
  const fresh = emptyOverlay();
  overlays().set(k, fresh);
  return fresh;
}

export function setOverlay(userId: string, trace: string, overlay: AuditOverlay): void {
  overlays().set(key(userId, trace), overlay);
}

export function logActivity(event: Record<string, unknown>): void {
  const row = { t: new Date().toISOString(), ...event };
  const buf = activity();
  buf.push(row);
  // Cap memory — keep last 2000 events.
  if (buf.length > 2000) buf.splice(0, buf.length - 2000);
}

export function listActivity(limit = 100): Array<Record<string, unknown>> {
  const buf = activity();
  return buf.slice(Math.max(0, buf.length - limit));
}

/** Test helper — wipe process store. */
export function resetStoreForTests(): void {
  overlays().clear();
  activity().length = 0;
}

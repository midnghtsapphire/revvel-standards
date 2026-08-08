/**
 * Input validation for auth, notes, flags, and audit payloads.
 * Fail closed — reject empty / oversized / malformed values early.
 */

import type { EventKind, Severity } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_ID_RE = /^[a-zA-Z0-9_.:-]{1,128}$/;
const MAX_NOTE = 4000;
const MAX_GROUP_NAME = 80;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== 'string' || !email.trim()) {
    return { ok: false, error: 'Email is required' };
  }
  const v = email.trim().toLowerCase();
  if (v.length > 254 || !EMAIL_RE.test(v)) {
    return { ok: false, error: 'Invalid email format' };
  }
  return { ok: true };
}

export function validatePassword(password: unknown): ValidationResult {
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { ok: false, error: 'Password too long' };
  }
  return { ok: true };
}

export function validateId(id: unknown, label = 'id'): ValidationResult {
  if (typeof id !== 'string' || !SAFE_ID_RE.test(id)) {
    return { ok: false, error: `Invalid ${label}` };
  }
  return { ok: true };
}

export function validateNoteText(text: unknown): ValidationResult {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'Note text is required' };
  }
  if (text.length > MAX_NOTE) {
    return { ok: false, error: `Note exceeds ${MAX_NOTE} characters` };
  }
  return { ok: true };
}

export function validateGroupName(name: unknown): ValidationResult {
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'Group name is required' };
  }
  if (name.trim().length > MAX_GROUP_NAME) {
    return { ok: false, error: `Group name exceeds ${MAX_GROUP_NAME} characters` };
  }
  return { ok: true };
}

export function validateTraceName(name: unknown): ValidationResult {
  if (typeof name !== 'string' || !/^[a-zA-Z0-9_./-]{1,200}$/.test(name)) {
    return { ok: false, error: 'Invalid trace name' };
  }
  return { ok: true };
}

const EVENT_KINDS: EventKind[] = [
  'bash',
  'file_edit',
  'file_create',
  'file_delete',
  'tool',
  'read',
  'other',
];

export function isEventKind(v: unknown): v is EventKind {
  return typeof v === 'string' && (EVENT_KINDS as string[]).includes(v);
}

const SEVERITIES: Severity[] = ['info', 'low', 'medium', 'high', 'critical'];

export function isSeverity(v: unknown): v is Severity {
  return typeof v === 'string' && (SEVERITIES as string[]).includes(v);
}

/** Strip control chars and collapse whitespace for safe display / export. */
export function sanitizeText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape markdown table / heading content. */
export function escapeMarkdown(s: string): string {
  return s.replace(/[|`*_#[\]]/g, (c) => `\\${c}`).replace(/\n/g, ' ');
}

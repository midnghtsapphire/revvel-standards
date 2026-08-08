/**
 * Simple session auth for the SaaS blue-team console.
 *
 * Demo mode ships with seeded auditor accounts. Sessions are HMAC-signed
 * cookies (no external IdP required). Replace DEMO_USERS / SESSION_SECRET
 * via env for production.
 */

import { createHmac, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto';
import type { SessionUser } from './types';
import { validateEmail, validatePassword } from './validation';

const COOKIE_NAME = 'bt_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function sessionSecret(): string {
  return (
    process.env.BT_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    'dev-only-blue-team-session-secret-change-me'
  );
}

interface DemoAccount {
  id: string;
  email: string;
  name: string;
  role: SessionUser['role'];
  /** scrypt hash of password */
  passwordHash: string;
  salt: string;
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString('hex');
}

function makeAccount(
  id: string,
  email: string,
  name: string,
  role: SessionUser['role'],
  password: string
): DemoAccount {
  const salt = 'bt-demo-salt-v1';
  return {
    id,
    email,
    name,
    role,
    salt,
    passwordHash: hashPassword(password, salt),
  };
}

/** Seeded demo accounts — documented in README. Not for production reuse. */
export const DEMO_USERS: DemoAccount[] = [
  makeAccount('usr_auditor', 'auditor@revvel.local', 'Blue Team Auditor', 'auditor', 'auditor-demo-1'),
  makeAccount('usr_lead', 'lead@revvel.local', 'Audit Lead', 'lead', 'lead-demo-12'),
  makeAccount('usr_viewer', 'viewer@revvel.local', 'Read-only Viewer', 'viewer', 'viewer-demo1'),
];

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: SessionUser['role'];
  exp: number;
  iat: number;
  jti: string;
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64url');
}

function sign(body: string): string {
  return createHmac('sha256', sessionSecret()).update(body).digest('base64url');
}

export function createSessionToken(user: SessionUser): string {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + SESSION_TTL_MS,
    jti: randomBytes(12).toString('hex'),
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function authenticate(email: unknown, password: unknown):
  | { ok: true; user: SessionUser }
  | { ok: false; error: string } {
  const e = validateEmail(email);
  if (!e.ok) return { ok: false, error: e.error || 'Invalid email' };
  const p = validatePassword(password);
  if (!p.ok) return { ok: false, error: p.error || 'Invalid password' };

  const normalized = String(email).trim().toLowerCase();
  const account = DEMO_USERS.find((u) => u.email === normalized);
  if (!account) return { ok: false, error: 'Invalid credentials' };

  const candidate = hashPassword(String(password), account.salt);
  try {
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(account.passwordHash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: 'Invalid credentials' };
    }
  } catch {
    return { ok: false, error: 'Invalid credentials' };
  }

  return {
    ok: true,
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
    },
  };
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  const secure = process.env.NODE_ENV === 'production';
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export { COOKIE_NAME, SESSION_TTL_MS };

export function canWrite(user: SessionUser | null): boolean {
  return !!user && (user.role === 'auditor' || user.role === 'lead');
}

export function parseCookieHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

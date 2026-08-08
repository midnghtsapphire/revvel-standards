/**
 * Structured application logger.
 * Never logs secrets/passwords. Safe for serverless + local.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  msg: string;
  ts: string;
  requestId?: string;
  userId?: string;
  trace?: string;
  meta?: Record<string, unknown>;
}

const SENSITIVE_KEYS = /pass(word)?|token|secret|authorization|cookie|api[_-]?key/i;

function scrub(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = '[redacted]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = scrub(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function emit(level: LogLevel, msg: string, extra?: Partial<LogEvent>): void {
  const event: LogEvent = {
    level,
    msg,
    ts: new Date().toISOString(),
    requestId: extra?.requestId,
    userId: extra?.userId,
    trace: extra?.trace,
    meta: scrub(extra?.meta),
  };
  const line = JSON.stringify(event);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, extra?: Partial<LogEvent>) => emit('debug', msg, extra),
  info: (msg: string, extra?: Partial<LogEvent>) => emit('info', msg, extra),
  warn: (msg: string, extra?: Partial<LogEvent>) => emit('warn', msg, extra),
  error: (msg: string, extra?: Partial<LogEvent>) => emit('error', msg, extra),
};

export function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

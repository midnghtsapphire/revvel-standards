import type { LogEntry, MonitorSnapshot } from "./types";

const startedAt = Date.now();
const ring: LogEntry[] = [];
const MAX_LOGS = 200;

const counters = {
  totalRequests: 0,
  liveRequests: 0,
  mockRequests: 0,
  errorCount: 0,
  rateLimitedCount: 0,
  latencySum: 0,
  latencyN: 0,
  lastError: undefined as string | undefined,
  skillHits: {} as Record<string, number>,
};

export function log(
  level: LogEntry["level"],
  event: string,
  meta?: Record<string, unknown>,
  extra?: Pick<LogEntry, "requestId" | "durationMs">
): LogEntry {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    event,
    requestId: extra?.requestId,
    durationMs: extra?.durationMs,
    meta,
  };
  ring.push(entry);
  if (ring.length > MAX_LOGS) ring.shift();

  // Structured console line — greppable in Vercel / Actions logs.
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  return entry;
}

export function recordRequest(opts: {
  mode: "live" | "mock";
  durationMs: number;
  error?: string;
  rateLimited?: boolean;
  skills?: string[];
}): void {
  counters.totalRequests += 1;
  if (opts.mode === "live") counters.liveRequests += 1;
  else counters.mockRequests += 1;
  if (opts.error) {
    counters.errorCount += 1;
    counters.lastError = opts.error;
  }
  if (opts.rateLimited) counters.rateLimitedCount += 1;
  counters.latencySum += opts.durationMs;
  counters.latencyN += 1;
  for (const skill of opts.skills ?? []) {
    counters.skillHits[skill] = (counters.skillHits[skill] ?? 0) + 1;
  }
}

export function getRecentLogs(limit = 50): LogEntry[] {
  return ring.slice(-limit);
}

export function getMonitorSnapshot(): MonitorSnapshot {
  return {
    uptimeMs: Date.now() - startedAt,
    totalRequests: counters.totalRequests,
    liveRequests: counters.liveRequests,
    mockRequests: counters.mockRequests,
    errorCount: counters.errorCount,
    rateLimitedCount: counters.rateLimitedCount,
    avgLatencyMs:
      counters.latencyN === 0
        ? 0
        : Math.round(counters.latencySum / counters.latencyN),
    lastError: counters.lastError,
    skillHits: { ...counters.skillHits },
  };
}

/** Test helper — reset in-memory counters between unit tests. */
export function __resetMonitorForTests(): void {
  counters.totalRequests = 0;
  counters.liveRequests = 0;
  counters.mockRequests = 0;
  counters.errorCount = 0;
  counters.rateLimitedCount = 0;
  counters.latencySum = 0;
  counters.latencyN = 0;
  counters.lastError = undefined;
  counters.skillHits = {};
  ring.length = 0;
}

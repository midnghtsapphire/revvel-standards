# Error Reporting Standard

**Version:** 1.0.0
**Date:** April 2026
**Status:** Mandatory Policy
**Scope:** All Revvel/MIDNGHTSAPPHIRE server applications

---

## 1. Overview

Every significant server job must implement the three-tier error reporting system described in this standard. Ad-hoc `console.error` calls without escalation are insufficient for production systems. Errors must be observable, traceable, and actionable.

---

## 2. Three-Tier Error Reporting System

```text
Tier 1 — Console (always)
    ↓ (if severity ≥ medium OR repeated)
Tier 2 — Email (via Resend or configured transport)
    ↓ (if severity = high OR critical, subject to cooldown)
Tier 3 — GitHub Issue (auto-created, labeled, assigned)
```

| Tier | Trigger | Output |
|---|---|---|
| **Console** | Every error | `console.error` with structured log object |
| **Email** | severity ≥ `medium` | Email to configured admin address via Resend |
| **GitHub Issue** | severity ≥ `high` | Issue auto-created in app repo with full context |

---

## 3. Severity Levels

| Level | Code | When to Use |
|---|---|---|
| `low` | 1 | Expected user errors, input validation failures, 404s |
| `medium` | 2 | Unexpected but recoverable server errors, third-party timeouts |
| `high` | 3 | Data integrity failures, auth system errors, payment failures |
| `critical` | 4 | System down, database unreachable, security incidents |

**Rules:**
- Default severity for an unknown error is `medium`.
- When in doubt, escalate up (use a higher severity).
- `critical` errors bypass the cooldown and always fire immediately.

---

## 4. The `monitored()` Wrapper Pattern

Every significant server job must be wrapped with `monitored()`. "Significant" means: any scheduled job, background worker, webhook handler, data ingestion pipeline, or payment processing function.

### TypeScript Interface

```typescript
interface MonitoredOptions {
  jobName: string;          // Unique name for this job — used in emails + GitHub issues
  severity?: 'low' | 'medium' | 'high' | 'critical';  // Default: 'medium'
  cooldownMinutes?: number; // Minimum minutes between repeated GitHub issues. Default: 60
  tags?: string[];          // Optional extra labels for the GitHub issue
}

interface ErrorReportPayload {
  jobName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  error: Error;
  context?: Record<string, unknown>;
  occurredAt: Date;
  appName: string;
  environment: 'production' | 'staging' | 'development';
}

/**
 * Wraps an async function with three-tier error reporting.
 * If the wrapped function throws, the error is:
 *   1. Logged to console (always)
 *   2. Emailed to admin (if severity >= medium)
 *   3. Filed as a GitHub Issue (if severity >= high, subject to cooldown)
 * The original error is re-thrown after reporting.
 */
async function monitored<T>(
  fn: () => Promise<T>,
  options: MonitoredOptions
): Promise<T>
```

### Usage Example

```typescript
// Example: wrapping a data ingestion job
await monitored(
  async () => {
    const records = await fetchExternalData();
    await saveToDatabase(records);
  },
  {
    jobName: 'daily-data-ingestion',
    severity: 'high',
    cooldownMinutes: 120,
    tags: ['data-pipeline'],
  }
);
```

### Implementation Sketch

```typescript
async function monitored<T>(fn: () => Promise<T>, options: MonitoredOptions): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const payload: ErrorReportPayload = {
      jobName: options.jobName,
      severity: options.severity ?? 'medium',
      error: error instanceof Error ? error : new Error(String(error)),
      occurredAt: new Date(),
      appName: process.env.APP_NAME ?? 'unknown',
      environment: (process.env.NODE_ENV as ErrorReportPayload['environment']) ?? 'production',
    };

    // Tier 1: Console — always
    console.error('[ERROR_REPORT]', JSON.stringify({
      ...payload,
      error: { message: payload.error.message, stack: payload.error.stack },
    }));

    // Tier 2: Email — severity >= medium
    if (['medium', 'high', 'critical'].includes(payload.severity)) {
      await sendErrorEmail(payload).catch(e => console.error('Email send failed:', e));
    }

    // Tier 3: GitHub Issue — severity >= high, with cooldown
    if (['high', 'critical'].includes(payload.severity)) {
      const canFire = payload.severity === 'critical' || (await checkCooldown(payload.jobName, options.cooldownMinutes ?? 60));
      if (canFire) {
        await createGitHubIssue(payload, options.tags).catch(e => console.error('GitHub issue creation failed:', e));
        await updateCooldownTimestamp(payload.jobName);
      }
    }

    throw error;
  }
}
```

---

## 5. Cooldown Rules

Cooldowns prevent GitHub issue spam when a job is repeatedly failing.

| Rule | Behavior |
|---|---|
| Default cooldown | 60 minutes between issues for the same `jobName` |
| `critical` severity | **No cooldown** — always creates a new issue immediately |
| Cooldown storage | Store last-fired timestamp in the `error_reports` database table |
| Cooldown check | Query `SELECT MAX(created_at) FROM error_reports WHERE job_name = ? AND github_issue_created = true` |

---

## 6. GitHub Label Convention

All auto-created GitHub issues must be labeled with:

```text
{app-name}/error
```

**Examples:**
- `growlingeyes/error`
- `neurooz/error`
- `revvel-music-studio/error`

**Additional labels by severity:**
- `high` → also add `priority:high`
- `critical` → also add `priority:critical`

The `{app-name}/error` label must be pre-created in the repository before deploying the monitoring system. Include it in the bootstrap script.

---

## 7. Database Schema — `error_reports` Table

Every application using this standard must have this table in its database:

```sql
CREATE TABLE error_reports (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  app_name      VARCHAR(100)    NOT NULL,
  job_name      VARCHAR(255)    NOT NULL,
  severity      ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  error_message TEXT            NOT NULL,
  error_stack   TEXT,
  context_json  JSON,
  environment   ENUM('production', 'staging', 'development') NOT NULL DEFAULT 'production',
  email_sent    TINYINT(1)      NOT NULL DEFAULT 0,
  github_issue_created TINYINT(1) NOT NULL DEFAULT 0,
  github_issue_url     VARCHAR(500),
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_job_name_created (job_name, created_at),
  INDEX idx_severity (severity),
  INDEX idx_environment (environment)
);
```

**Drizzle ORM schema:**

```typescript
import { mysqlTable, bigint, varchar, text, json, tinyint, datetime, mysqlEnum, index } from 'drizzle-orm/mysql-core';

export const errorReports = mysqlTable('error_reports', {
  id:                 bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
  appName:            varchar('app_name', { length: 100 }).notNull(),
  jobName:            varchar('job_name', { length: 255 }).notNull(),
  severity:           mysqlEnum('severity', ['low', 'medium', 'high', 'critical']).notNull().default('medium'),
  errorMessage:       text('error_message').notNull(),
  errorStack:         text('error_stack'),
  contextJson:        json('context_json'),
  environment:        mysqlEnum('environment', ['production', 'staging', 'development']).notNull().default('production'),
  emailSent:          tinyint('email_sent').notNull().default(0),
  githubIssueCreated: tinyint('github_issue_created').notNull().default(0),
  githubIssueUrl:     varchar('github_issue_url', { length: 500 }),
  createdAt:          datetime('created_at').notNull().default(new Date()),
}, (table) => ({
  jobNameCreatedIdx: index('idx_job_name_created').on(table.jobName, table.createdAt),
  severityIdx:       index('idx_severity').on(table.severity),
  environmentIdx:    index('idx_environment').on(table.environment),
}));
```

---

## 8. Rule: Every Significant Server Job Must Be Wrapped

"Significant server job" is defined as any of the following:

- [ ] Scheduled/cron jobs
- [ ] Background workers and queues
- [ ] Webhook handlers (incoming from external services)
- [ ] Data ingestion pipelines
- [ ] Payment processing functions (Stripe events)
- [ ] Email sending functions
- [ ] External API calls that mutate data
- [ ] Database migrations

**What does NOT need to be wrapped:**
- Simple CRUD route handlers (these are covered by the global error middleware)
- Read-only API endpoints
- Client-side code

**Enforcement:** Code review must check for `monitored()` usage on all new server jobs. PRs adding a new cron job, worker, or webhook handler without `monitored()` wrapping must be rejected.

---

## 9. References

- `templates/cicd/auto-fix.yml` — GitHub Actions workflow that auto-creates fix PRs when CI fails
- `templates/cicd/security.yml` — Security scanning workflow
- `SECURITY_STANDARD.md` — Security requirements including secret management

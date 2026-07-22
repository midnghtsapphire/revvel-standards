# SYSTEM_STATE Standard

**Version:** 1.0.0
**Date:** April 2026
**Status:** Mandatory Policy
**Scope:** All Revvel/MIDNGHTSAPPHIRE application repositories

---

## 1. What Is SYSTEM_STATE.md

`SYSTEM_STATE.md` is the single source of truth for what is **actually working in production** at any given moment. It is not a wishlist, not a backlog, and not a spec. It reflects reality.

Every agent session begins by reading SYSTEM_STATE.md. Every agent session ends by updating SYSTEM_STATE.md.

**Location:** Repository root — `SYSTEM_STATE.md`

---

## 2. Why It Exists

Agent sessions are stateless. Without a persistent source of truth, every new session starts blind — the agent doesn't know what's deployed, what's broken, or what was done last session.

SYSTEM_STATE.md solves this by being the "brain handoff" document between sessions.

---

## 3. Required Sections

Every SYSTEM_STATE.md must contain exactly these sections, in this order:

### 3.1. Infrastructure

| Component | Status | Details |
|---|---|---|
| Production server | ✅ / ⚠️ / ❌ | [IP address, PM2 process name, uptime] |
| Database | ✅ / ⚠️ / ❌ | [Host, database name, migration version] |
| CI/CD | ✅ / ⚠️ / ❌ | [Last deploy date, last successful run] |
| DNS | ✅ / ⚠️ / ❌ | [Domain, registrar, pointing to] |
| SSL | ✅ / ⚠️ / ❌ | [Cert expiry date, provider] |

**Status icons:**
- ✅ = Working in production as expected
- ⚠️ = Working but with a known issue or degraded state
- ❌ = Not working / not deployed

### 3.2. Domain Pages

| Page / Route | Status | Last Verified | Notes |
|---|---|---|---|
| `/` | ✅ | [date] | Home page loads, no console errors |
| `/login` | ✅ | [date] | Auth flow complete |
| `/dashboard` | ⚠️ | [date] | Loads but sidebar missing |
| `/api/health` | ✅ | [date] | Returns 200 |

### 3.3. Known Bugs

| ID | Description | Severity | Status | Reported |
|---|---|---|---|---|
| BUG-001 | [description] | high | open | [date] |
| BUG-002 | [description] | low | in-progress | [date] |

**Rules:**
- Never delete a bug row — set status to `resolved` with the date resolved.
- Bug IDs are sequential and permanent.

### 3.4. Database Schema Status

| Table | Exists | Last Migration | Notes |
|---|---|---|---|
| `users` | ✅ | migration_001 | |
| `sessions` | ✅ | migration_002 | |
| `error_reports` | ✅ | migration_003 | |
| `[new_table]` | ❌ | — | Planned in next MVI |

### 3.5. Environment Variables

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ set | ✅ set | |
| `JWT_SECRET` | ✅ set | ✅ set | Min 32 chars |
| `STRIPE_SECRET_KEY` | ✅ set | ❌ not set | Staging uses test mode |
| `RESEND_API_KEY` | ✅ set | ✅ set | |

**Rules:**
- Never put actual values in this table — only ✅/❌ status.
- Keep this table in sync with `.env.example`.

### 3.6. Test Suite Status

| Suite | Last Run | Status | Coverage |
|---|---|---|---|
| Unit tests | [date] | ✅ passing | [X]% |
| Integration tests | [date] | ✅ passing | [X]% |
| E2E tests | [date] | ⚠️ 2 failing | — |

### 3.7. Last Updated

```text
Last updated: [YYYY-MM-DD HH:MM UTC]
Updated by: [Agent name/ID or "Human: [name]"]
Session summary: [one sentence about what changed this session]
```

---

## 4. Rules

### 4.1. Read First

At the start of every agent session, the first action must be to read SYSTEM_STATE.md in full. Do not assume you know the current state — read it.

### 4.2. Update Last

The last action of every agent session must be to update SYSTEM_STATE.md with:
- Any status changes (components that were fixed or broke)
- Any new bugs discovered
- Any new pages or features deployed
- Any schema changes made
- The "Last Updated" timestamp

### 4.3. Never Delete Rows

Old entries must never be deleted. Update the `Status` column instead. This preserves history and allows agents to understand the evolution of the system.

### 4.4. Be Accurate, Not Optimistic

Only mark something ✅ if you have personally verified it works in production during this session. If you don't know, use ⚠️ with a note.

---

## 5. Using SYSTEM_STATE.md Across Agent Sessions

**Starting a new session:**
1. Read SYSTEM_STATE.md completely
2. Note the "Last Updated" section to understand recency
3. Note any ❌ or ⚠️ items that may affect your current MVI
4. Reference SYSTEM_STATE.md in Section 1 of your MVI Contract

**Ending a session:**
1. Update all affected rows in every table
2. Add any new bugs to Section 3.3
3. Update the "Last Updated" section with timestamp and session summary
4. Commit SYSTEM_STATE.md as part of your session commit

---

## 6. Template Location

The blank SYSTEM_STATE.md template is at `templates/standards/01_SYSTEM_STATE.md`. Copy it to the root of every new app repository and fill in all `[PLACEHOLDER]` values before the first coding session.

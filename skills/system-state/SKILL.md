# System State Skill

Maintain SYSTEM_STATE.md as the single source of truth for production status, reading it at session start and updating it at session end.

## What Is SYSTEM_STATE.md

The "brain handoff" document between sessions. Reflects **what is actually working in production** — not wishlist, not backlog, not spec. Agents are stateless; this file provides continuity.

**Location**: Repository root — `SYSTEM_STATE.md`

## Session Protocol

**Start of every session**: Read SYSTEM_STATE.md in full. Do not assume state — read it.

**End of every session**: Update SYSTEM_STATE.md with all changes, then commit it.

## 7 Required Sections

### 1. Infrastructure

| Component | Status | Details |
|---|---|---|
| Production server | ✅/⚠️/❌ | IP, PM2 process name, uptime |
| Database | ✅/⚠️/❌ | Host, DB name, migration version |
| CI/CD | ✅/⚠️/❌ | Last deploy date, last successful run |
| DNS | ✅/⚠️/❌ | Domain, registrar, pointing to |
| SSL | ✅/⚠️/❌ | Cert expiry, provider |

Status: ✅ = working as expected | ⚠️ = working with known issue | ❌ = not working / not deployed

### 2. Domain Pages

| Page / Route | Status | Last Verified | Notes |
|---|---|---|---|
| `/` | ✅ | [date] | Home page loads, no console errors |

### 3. Known Bugs

| ID | Description | Severity | Status | Reported |
|---|---|---|---|---|
| BUG-001 | [desc] | high | open | [date] |

**Never delete bug rows — set status to `resolved` with date.**

### 4. Database Schema Status

| Table | Exists | Last Migration | Notes |

### 5. Environment Variables

| Variable | Production | Staging | Notes |
|---|---|---|---|

**Never put actual values — only ✅/❌ status. Keep in sync with `.env.example`.**

### 6. Test Suite Status

| Suite | Last Run | Status | Coverage |

### 7. Last Updated

```text
Last updated: [YYYY-MM-DD HH:MM UTC]
Updated by: [Agent name/ID or "Human: [name]"]
Session summary: [one sentence about what changed]
```

## Rules

1. **Read first** — always read before coding
2. **Update last** — always update after every session
3. **Never delete rows** — update Status column instead
4. **Be accurate, not optimistic** — only ✅ if personally verified in production this session; unknown = ⚠️

## Template

`templates/standards/01_SYSTEM_STATE.md` — copy to root of every new app repo.

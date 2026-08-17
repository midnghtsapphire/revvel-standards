# SYSTEM STATE — [PROJECT_NAME]

> **Read this first at the start of every agent session.**
> **Update this last at the end of every agent session.**
> See `standards/SYSTEM_STATE_STANDARD.md` in revvel-standards for full rules.

---

## Infrastructure

| Component | Status | Details |
|---|---|---|
| Production server | [PLACEHOLDER] | [IP address] — PM2 process: `[PLACEHOLDER]` |
| Database | [PLACEHOLDER] | Host: `[PLACEHOLDER]` — DB: `[PLACEHOLDER]` — Last migration: `[PLACEHOLDER]` |
| CI/CD | [PLACEHOLDER] | Last deploy: `[PLACEHOLDER]` — Workflow: `.github/workflows/deploy.yml` |
| DNS | [PLACEHOLDER] | Domain: `[PLACEHOLDER]` — Registrar: Namecheap — Pointing to: `[PLACEHOLDER]` |
| SSL | [PLACEHOLDER] | Cert expiry: `[PLACEHOLDER]` — Provider: Let's Encrypt |

**Status key:** ✅ Working | ⚠️ Degraded | ❌ Down/Not deployed

---

## Domain Pages

| Page / Route | Status | Last Verified | Notes |
|---|---|---|---|
| `/` | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| `/login` | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| `/dashboard` | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| `/api/health` | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |

**Status key:** ✅ Working | ⚠️ Works with issues | ❌ Broken | 🚧 Not yet built

---

## Known Bugs

| ID | Description | Severity | Status | Reported |
|---|---|---|---|---|
| BUG-001 | [PLACEHOLDER] | [low/medium/high/critical] | [open/in-progress/resolved] | [PLACEHOLDER] |

> **Rule:** Never delete bug rows. Set status to `resolved` with date. IDs are permanent.

---

## Database Schema Status

| Table | Exists | Last Migration | Notes |
|---|---|---|---|
| `[PLACEHOLDER]` | [✅/❌] | [PLACEHOLDER] | [PLACEHOLDER] |

---

## Environment Variables

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `DATABASE_URL` | [✅ set / ❌ not set] | [✅ set / ❌ not set] | |
| `JWT_SECRET` | [✅ set / ❌ not set] | [✅ set / ❌ not set] | Min 32 chars |
| `[PLACEHOLDER]` | [✅ set / ❌ not set] | [✅ set / ❌ not set] | |

> **Rule:** Never put actual values here — only ✅/❌ status. Keep in sync with `.env.example`.

---

## Test Suite Status

| Suite | Last Run | Status | Coverage |
|---|---|---|---|
| Unit tests | [PLACEHOLDER] | [✅ passing / ❌ failing] | [X]% |
| Integration tests | [PLACEHOLDER] | [✅ passing / ❌ failing] | [X]% |
| E2E tests | [PLACEHOLDER] | [✅ passing / ⚠️ N failing] | — |

---

## Last Updated

```text
Last updated: [YYYY-MM-DD HH:MM UTC]
Updated by: [Agent name/ID or "Human: name"]
Session summary: [One sentence — what changed this session]
```

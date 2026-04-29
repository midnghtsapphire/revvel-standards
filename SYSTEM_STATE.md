# SYSTEM STATE — revvel-standards

> **Read this first at the start of every agent session.**
> **Update this last at the end of every agent session.**
> See `standards/SYSTEM_STATE_STANDARD.md` for full rules.

---

## Infrastructure

| Component | Status | Details |
|---|---|---|
| Production server | ⚠️ | N/A (standards repo) |
| Database | ⚠️ | N/A |
| CI/CD | ✅ | GitHub Actions workflows in `.github/workflows/` |
| DNS | ⚠️ | N/A |
| SSL | ⚠️ | N/A |

**Status key:** ✅ Working | ⚠️ Degraded/Unknown | ❌ Down/Not deployed

---

## Domain Pages

| Page / Route | Status | Last Verified | Notes |
|---|---|---|---|
| `/` | ⚠️ | 2026-04-29 | Static site files exist; not verified deployed |

---

## Known Bugs

| ID | Description | Severity | Status | Reported |
|---|---|---|---|---|
| BUG-001 | `npm test` fails if dependencies are not installed (`npm ci` required) | low | resolved | 2026-04-29 |

---

## Database Schema Status

| Table | Exists | Last Migration | Notes |
|---|---|---|---|
| N/A | ❌ | N/A | Standards repo (no DB) |

---

## Environment Variables

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ⚠️ | ⚠️ | Used by OpenRouter-routed workflows |

---

## Test Suite Status

| Suite | Last Run | Status | Coverage |
|---|---|---|---|
| `npm test` | 2026-04-29 | ✅ passing | — |

---

## Last Updated

```
Last updated: 2026-04-29 01:28 UTC
Updated by: codex[agent]
Session summary: Added SYSTEM_STATE.md and verified npm test passes after npm ci.
```

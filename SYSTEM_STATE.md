# SYSTEM STATE — revvel-standards

> **Read this first at the start of every agent session.**
> **Update this last at the end of every agent session.**
> See `standards/SYSTEM_STATE_STANDARD.md` for full rules.

---

## Infrastructure

| Component | Status | Details |
|---|---|---|
| CI/CD | ✅ | GitHub Actions workflows in `.github/workflows/` |
| oAudrey App Platform app | ⏳ | **Pending human action:** Set `DIGITALOCEAN_API_TOKEN` GitHub secret → trigger `deploy-oaudrey.yml` |
| oAudrey DNS (`oaudrey.com`) | ⏳ | **Pending human action:** Log into Namecheap (`uprisinghope`) → oaudrey.com → Nameservers → Custom DNS → `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com` |
| oAudrey DNS (`fieldwork.oaudrey.com`) | ⏳ | **Pending human action:** Same NS change as above + add CNAME in DigitalOcean Networking → Domains |
| Database | ❌ | Not applicable (standards repo — no DB) |
| SSL | ⏳ | Auto-provisioned by DigitalOcean Let's Encrypt once DNS resolves and app is deployed |

**Status key:** ✅ Working | ⚠️ Working but degraded | ❌ Not applicable / not needed | ⏳ Pending human action (infrastructure blocker — see `docs/AGENTS.md` Infrastructure Blocker Protocol)

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
| BUG-002 | YAML parsing errors in credential-label-router.yml and weekly-research.yml causing workflow validation failures | medium | resolved | 2026-05-02 |

---

## Database Schema Status

| Table | Exists | Last Migration | Notes |
|---|---|---|---|
| N/A | ❌ | N/A | Standards repo (no DB) |

---

## Environment Variables

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ❌ not set | ❌ not set | Used by OpenRouter-routed workflows |

---

## Test Suite Status

| Suite | Last Run | Status | Coverage |
|---|---|---|---|
| `npm test` | 2026-04-29 | ✅ passing | — |

---

## Last Updated

```
Last updated: 2026-05-02 01:00 UTC
Updated by: openhands[agent]
Session summary: Fixed YAML parsing errors in credential-label-router.yml and weekly-research.yml. All 334 tests now passing.
```

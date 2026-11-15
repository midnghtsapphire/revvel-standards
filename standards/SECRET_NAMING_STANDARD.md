# Secret Naming Standard

**Version:** 1.0.0
**Date:** 2026-11-15
**Status:** Active
**Owner:** MIDNGHTSAPPHIRE / Freedom Angel Corp

---

## The rule

Every secret, environment variable, and credential follows exactly one of two shapes:

| Credential type | Name shape | Example |
|---|---|---|
| API key | `<APP>_API_KEY` | `NAMECHEAP_API_KEY`, `OPENROUTER_API_KEY` |
| Token (access token, PAT, service token, bearer token) | `<APP>_TOKEN` | `DIGITALOCEAN_TOKEN`, `DOPPLER_TOKEN` |

- `<APP>` is the full provider name, uppercase, no abbreviations (`DIGITALOCEAN`, not `DO`).
- Classify by what the provider calls it: DigitalOcean issues "Personal Access Tokens" (`dop_v1_...`) → `DIGITALOCEAN_TOKEN`. Namecheap issues an "API key" → `NAMECHEAP_API_KEY`.
- Hybrid names like `<APP>_API_TOKEN` are **banned** — that shape is how `DIGITALOCEAN_API_TOKEN` ended up referenced by workflows while the real secret lived under other names, silently skipping every oAudrey deploy for six months.
- A qualifier may precede the suffix when one app has several credentials of the same type: `ADMIN_GITHUB_TOKEN`, `STRIPE_LIVE_SECRET_KEY`. The suffix itself stays canonical.

## Canonical names (current)

| Provider | Canonical secret | Deprecated aliases (do not reference) |
|---|---|---|
| DigitalOcean | `DIGITALOCEAN_TOKEN` | `DIGITALOCEAN_API_TOKEN`, `DO_API_TOKEN`, `DIGITALOCEAN_API_KEY` |
| Doppler | `DOPPLER_TOKEN` | — |
| Namecheap | `NAMECHEAP_API_KEY` | — |
| GoDaddy | `GODADDY_API_KEY` / `GODADDY_API_SECRET` | — |
| Porkbun | `PORKBUN_API_KEY` / `PORKBUN_SECRET_API_KEY` | — |

Doppler is the source of truth for values (`revvel-standards/prd/<NAME>`); the GitHub Actions secret carries the identical name. One name end to end — Doppler → GitHub secret → workflow `env:` — so a `grep` for the canonical name finds every consumer.

## Rules for agents

1. **New secrets** must conform before they are provisioned. A WR that introduces a credential names it in this standard's shape or gets `needs-human`.
2. **Never introduce a second name for an existing credential.** Check the canonical table (and `gh secret list`) first.
3. **Workflows must fail loudly, not skip, when a required secret is absent** — a skipped deploy that exits green is a marker nobody checks (RVS-VERIFY-001, `standards/VERIFY_THE_POSTCONDITION.md`).
4. **Historical records are not rewritten.** Retro logs, closed WR issues, and audit docs keep the names they observed at the time. Only operational files (workflows, scripts, configs, READMEs, standards) use canonical names.

## Migration log

- **2026-11-15** — `DIGITALOCEAN_API_TOKEN` → `DIGITALOCEAN_TOKEN` across all workflows, configs, and operational docs (11 files, 39 references). Root cause of the oAudrey deploy never running: workflows referenced a secret name that was never provisioned, while the value existed under `DIGITALOCEAN_TOKEN`. Remaining manual step: delete the orphaned `DIGITALOCEAN_API_KEY` and `DO_API_TOKEN` GitHub secrets after confirming nothing external reads them.

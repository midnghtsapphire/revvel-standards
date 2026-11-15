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
- A qualifier may precede the suffix when one app has several **genuinely different** credentials of the same type: `ADMIN_GITHUB_TOKEN`, `STRIPE_LIVE_SECRET_KEY`. The suffix itself stays canonical. A qualifier is never an excuse for a second copy of the same credential.

## One credential, one name, everywhere

The same credential carries the **identical name at every layer**: Doppler entry, GitHub Actions secret, workflow `env:` key, shell/script variable, config placeholder, and any doc or prompt that mentions it. No local aliases — a workflow step that does `DO_TOKEN: ${{ secrets.DIGITALOCEAN_TOKEN }}` has just invented a second name, and the next agent greps for `DO_TOKEN`, finds nothing in the secret store, and asks the owner for a "missing" key that already exists. That is how the owner ends up provisioning the same DigitalOcean token under four names.

Corollaries:

- Never provision a credential under a new name because a doc, example, or error message used a variant. Resolve to the canonical table below first.
- Docs and comments count: a README listing `CLAUDE_API_KEY` as a required credential will cause an agent to create `CLAUDE_API_KEY`. Operational docs use canonical names only.
- When you find a variant in use, the fix is **rename the caller to canonical**, never add the variant as a new secret.

## Canonical names (current)

| Provider | Canonical secret | Deprecated aliases (do not reference) |
|---|---|---|
| DigitalOcean | `DIGITALOCEAN_TOKEN` | `DIGITALOCEAN_API_TOKEN`, `DO_API_TOKEN`, `DO_TOKEN`, `DIGITALOCEAN_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` | `CLAUDE_API_KEY`, `CLAUDE_API_AGENT` |
| OpenAI | `OPENAI_API_KEY` | `DALLE_API_AGENT`, `OPENAI_TEST_DALLE_AGENT` |
| xAI | `XAI_API_KEY` | `XAI_GROK_API_KEY` |
| Jules | `JULES_API_KEY` | `JULES_TOKEN` |
| Doppler | `DOPPLER_TOKEN` | `DOPPLER_API_KEY`, `DOPPLER_AGENT_API` |
| Stripe (server) | `STRIPE_SECRET_KEY` (test) / `STRIPE_LIVE_SECRET_KEY` (live) | `STRIPE_API_KEY` |
| ElevenLabs | `ELEVENLABS_API_KEY` | `ELEVENLABS_AGENT` |
| Namecheap | `NAMECHEAP_API_KEY` | — |
| GoDaddy | `GODADDY_API_KEY` / `GODADDY_API_SECRET` | — |
| Porkbun | `PORKBUN_API_KEY` / `PORKBUN_SECRET_API_KEY` | — |
| GitHub (admin PAT) | `ADMIN_GITHUB_TOKEN` | — |
| GitHub (agent PR PAT) | `AGENT_PR_TOKEN` | — |
| GitHub (Bito integration) | `GIT_ACCESS_TOKEN` — rename candidate; verify Bito's external config before migrating to a `GITHUB_`-prefixed name | — |

### Orphaned GitHub secrets to consolidate (human action)

The repo's secret store still holds the deprecated aliases above as real secrets. **Before deleting an alias, confirm the canonical secret holds a working value** — the alias may be the live copy (e.g. `DIGITALOCEAN_API_KEY` was updated 2026-11-14 by an external sync while `DIGITALOCEAN_TOKEN` dates from June). If the alias is the fresh one, copy its value into the canonical name (via Doppler, so both stores agree), then delete the alias. Also repoint whatever external integration is syncing to the alias name.

Doppler is the source of truth for values (`revvel-standards/prd/<NAME>`); the GitHub Actions secret carries the identical name. One name end to end — Doppler → GitHub secret → workflow `env:` — so a `grep` for the canonical name finds every consumer.

## Rules for agents

1. **New secrets** must conform before they are provisioned. A WR that introduces a credential names it in this standard's shape or gets `needs-human`.
2. **Never introduce a second name for an existing credential.** Check the canonical table (and `gh secret list`) first.
3. **Workflows must fail loudly, not skip, when a required secret is absent** — a skipped deploy that exits green is a marker nobody checks (RVS-VERIFY-001, `standards/VERIFY_THE_POSTCONDITION.md`).
4. **Historical records are not rewritten.** Retro logs, closed WR issues, and audit docs keep the names they observed at the time. Only operational files (workflows, scripts, configs, READMEs, standards) use canonical names.

## Migration log

- **2026-11-15** — `DIGITALOCEAN_API_TOKEN` → `DIGITALOCEAN_TOKEN` across all workflows, configs, and operational docs (11 files, 39 references). Root cause of the oAudrey deploy never running: workflows referenced a secret name that was never provisioned, while the value existed under `DIGITALOCEAN_TOKEN`.
- **2026-11-15** — repo-wide caller audit: removed the `DO_TOKEN` local alias in `deploy-oaudrey.yml` (env key now matches the secret name); normalized `CLAUDE_API_KEY` → `ANTHROPIC_API_KEY` in `scripts/install-open-hands-agent.sh` and `JULES_TOKEN` → `JULES_API_KEY` in `agent-dispatcher.yml`. Verified every other workflow/script already calls the canonical name for its family. Remaining human step: consolidate the orphaned alias secrets per the table above.

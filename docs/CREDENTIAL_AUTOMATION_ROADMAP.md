# Credential Automation Roadmap

**Goal (Manus-style):** the pipeline can **mint a new API token from a
provider**, **store it as a GitHub secret**, and use it — with **no manual UI
clicks**. When a tool needs a key the system asks for one and gets one.

This file is the honest map: what's wired today, what's still manual, and what
order to fill in the gaps.

> Per the standards convention: nothing is dropped, only commented; every
> decision logged in `docs/UPGRADE_LOG.md`; all numbers from
> `docs/TOOL_COST_INDEX.md`; cost gates per `docs/API_LIMIT_AUTO_UPGRADE.md`.

---

## What's already wired (the easy half — restore + persist)

| Layer | What it does | File |
| --- | --- | --- |
| **Sentinel** | Audits 5 critical secrets daily, files one tracked issue when something's missing (dedup by title — fix in #13948). | `secrets-sentinel.yml` |
| **Secret Persistence Guard** | Hourly; alerts when secrets *disappear* from the repo. | `secret-persistence-guard.yml` |
| **Credential Backup Harness** | Restores secrets from any of 8 sources (Doppler, JSON, SOPS, pass, Bitwarden, 1Password, Infisical, Vault). | `scripts/credential-backup-harness.js` |
| **Gatekeeper Sync** | Pulls from a source and `gh secret set`s back into the repo. | `scripts/gatekeeper-sync.sh` |

**Net:** once a secret exists *somewhere we own* (Doppler, JSON, 1Password,
etc.), the pipeline can keep it in GitHub secrets indefinitely. That's the
"backup → persistence → auto-restore" half.

---

## What's still manual (the hard half — auto-generate from a provider)

| Step | Today | What Manus-style would do |
| --- | --- | --- |
| 1. Provider account exists | Manual | Same — accounts are still human-created |
| 2. Generate a new API key | **Manual** (UI click on the provider's site) | Pipeline calls the provider's *admin/OAuth* endpoint to mint a new key |
| 3. Store key in a backup source | Manual | Pipeline writes to Doppler / `CREDENTIAL_BACKUP_JSON` |
| 4. Sync to GitHub secret | ✅ auto (gatekeeper-sync) | Same |
| 5. Rotate on expiry | Manual reminder | Pipeline detects expiry → repeats steps 2–4 |

**The blocker:** step 2 needs the provider's admin API to mint keys, and
authenticating to *that* needs a higher-tier credential (an OAuth admin token).
Chicken-and-egg until the first admin token is set up.

---

## Phased plan

### Phase 1 — Make manual key insertion 1-step (DOABLE NOW)
Today when you generate a key from a provider, you:
1. Copy it.
2. Open repo settings → secrets → new secret → name + paste → save.

Build `scripts/secret-set.sh` that wraps `gh secret set` + writes to
`CREDENTIAL_BACKUP_JSON` simultaneously so future restores work too:

```bash
./scripts/secret-set.sh JULES_API_KEY <pasted-key>
# → writes to GitHub secrets AND to the backup JSON in one call
```

Tiny effort, big QoL win, no new permissions needed.

### Phase 2 — Per-provider mint adapters (one provider at a time)
For each SaaS where we want auto-mint, add a small adapter that calls that
provider's "create API key" endpoint and stores the result. Start with the
providers where this is documented and we already have admin auth:

- **DigitalOcean** — `POST /v2/account/keys` ([docs](https://docs.digitalocean.com/reference/api/api-reference/#operation/sshKeys_create)) — needs an existing admin token.
- **Vercel** — `POST /v9/access-tokens` — needs admin auth.
- **GitHub** itself — `POST /user/keys`, fine-grained PAT minting via REST.
- **Doppler** — has a Service-Account token model that's a one-time setup, then unattended.

For each: `scripts/providers/<name>/mint-key.sh` + a Provider Adapter contract
documented in `engines/CONTRACT.md`.

**Skip** providers that don't expose a key-minting API
(Jules, OpenRouter, Keploy, Mabl — these are manual-only at the provider end).

### Phase 3 — Watchdog ties it all together
A scheduled workflow that:
1. Reads `docs/TOOL_COST_INDEX.md` to know which providers we use.
2. For each, checks if the secret is present + valid (calling the provider's
   "whoami" endpoint).
3. If missing or expired → if a mint adapter exists, **calls it**; otherwise
   files a Work Request labeled `needs-human-credential` with the exact
   provider URL + step-by-step instructions (per the standards: don't leave
   the human guessing).
4. All decisions logged to `docs/UPGRADE_LOG.md`.

---

## Hard rules (carried from the standards)

1. **Never auto-spend** to provision a credential above the cost gates in
   `docs/API_LIMIT_AUTO_UPGRADE.md`. Auto-mint of a free-tier key = fine.
   Auto-creating a paid plan = forbidden without owner approval.
2. **Always log** every mint/rotation/store action to `docs/UPGRADE_LOG.md`.
3. **Never delete** old keys (revoke at the provider, mark commented in our
   own records) — keeps audit trail intact.
4. **One source of truth for what we need** — the lists in
   `secrets-health-check.yml` and `secret-persistence-guard.yml` are
   authoritative. Don't sprinkle copies elsewhere.

---

## What this serves (the enterprise pitch angle)

Same as `docs/API_LIMIT_AUTO_UPGRADE.md`: a buyer asks *"how do you manage
credentials at scale?"* and you point at:
- This roadmap (the phased plan + hard rules)
- `docs/UPGRADE_LOG.md` (the audit trail)
- `docs/TOOL_COST_INDEX.md` (the inventory)
- `scripts/credential-backup-harness.js` (the multi-source restore)

That story is more credible than most startups have.

---

## Next concrete action

Phase 1 — `scripts/secret-set.sh`. ~30 lines of bash, no new permissions
needed. Want me to build it now or queue it?

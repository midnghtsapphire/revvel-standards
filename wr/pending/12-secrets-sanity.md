# [WR] Secrets sanity — stop the Doppler churn and map where every key lives

## Output Type

internal-script-automation

## Objective

Owner pain: "the doppler gate is a nightmare deleting my secrets every
day; I cannot remember where I put my API tokens in its UI." Suspects in
this repo: `secret-rotation-schedule.yml`, `doppler-secrets-sync.yml`,
`secrets-sentinel.yml`, `sync-secrets-to-repos.yml` — likely one of our own
automations is rotating/overwriting daily.

1. **Diagnose the daily deletion**: audit the four secrets workflows' run
   history and Doppler activity log; identify exactly which job removes or
   clobbers secrets and why; fix or disable that behavior.
2. **SECRETS_MAP.md (names/locations ONLY — never values)**: generated doc
   listing every secret name, where it lives (Doppler project/config,
   GitHub repo/org secret, Vercel env), which workflows consume it, and its
   fallback chain (e.g. ADMIN_GITHUB_TOKEN → GITHUB_TOKEN). Generated like
   connections-registry so it cannot drift.
3. **One write path**: decide the single source (Doppler OR GitHub
   secrets) and make every other store a synced replica; document in
   docs/SECRETS_MANAGEMENT.md.
4. **Missing-secret preflights**: standardize the preflight pattern
   (wr-auto-classify already probes) so a missing key degrades gracefully
   and files one labeled issue instead of failing silently for days.

## Findings so far (2026-07-08 session)

- The old `secrets-backup-daily.yml` was unsafe AND broken: it wrote secret
  VALUES to `secret-backups/*.json` on main (repo root deploys publicly via
  Pages + Vercel — a successful run would have published live tokens, which
  secret scanning auto-revokes), but only `GH_TOKEN` was mapped into env, so
  it actually backed up empty strings; zero commits ever landed. Its verify
  step also printed the first 8 chars of each key into CI logs. REPLACED by
  the Secrets Presence Ledger (same file): names + peppered fingerprints
  only, `docs/secrets-ledger.json` timeline, one `[SECRET-MISSING]` issue
  per disappearance.
- All in-repo sync workflows are `workflow_dispatch`-only — nothing HERE
  deletes daily. Prime suspect for the daily deletion: **Doppler's GitHub
  sync integration**, which mirrors desired state and REMOVES repo secrets
  that are not in the Doppler config. Any key added directly in GitHub's UI
  gets wiped on Doppler's next sync. Check Doppler dashboard → the project
  synced to this repo → integration settings/activity log. Fix = either add
  every key to Doppler (Doppler stays the single write path) or disconnect
  the sync (GitHub becomes the single write path). Pick ONE.

## Owner decision 2026-07-08: Doppler is on the way out

"It is just me, not a whole enterprise" — Doppler + weekly auto-rotation is
enterprise churn for a solo operator. Second killer confirmed:
`secret-rotation-schedule.yml` auto-rotated any secret older than 60 days
through Doppler weekly (and its token line tries SIX different Doppler
token names — the confusion made manifest). Rotation mints a new value in
Doppler while GitHub/local copies keep the dead one.

Actions taken on the PR branch: rotation cron PAUSED (manual dispatch
kept). Recommended end state for this WR: disconnect the Doppler GitHub
sync, make GitHub Actions secrets the single store, archive
doppler-secrets-sync / sync-secrets-to-repos, collapse the six Doppler
token names to zero, and let the presence ledger stand guard.

## Desktop credential agent (owner request)

Owner wants an agent with desktop access that can "go get any API key and
track what we have" — key inventory is a full-time job. Practical shape:
Claude Code (desktop app) running locally with a `credential-clerk` skill
that (1) reads key inventories via password-manager CLIs (1Password `op`,
Bitwarden `bw`) — never scraping browser sessions; (2) reconciles against
`docs/secrets-ledger.json` and the SECRETS_MAP; (3) walks the owner through
provider dashboards for keys that must be minted by hand, then files the
name/location into the map. Values stay in the password manager; the repo
only ever sees names, locations, and fingerprints.

## Definition of Done

- Daily secret deletion root-caused and stopped (7 quiet days)
- SECRETS_MAP.md generated and committed; regeneration wired to workflow
- Preflight pattern applied to the workflows that consume paid API keys

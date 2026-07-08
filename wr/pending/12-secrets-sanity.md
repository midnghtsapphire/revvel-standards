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

## Definition of Done

- Daily secret deletion root-caused and stopped (7 quiet days)
- SECRETS_MAP.md generated and committed; regeneration wired to workflow
- Preflight pattern applied to the workflows that consume paid API keys

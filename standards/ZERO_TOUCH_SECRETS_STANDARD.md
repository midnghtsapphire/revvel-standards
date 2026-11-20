# Zero-Touch Secrets Standard (Free Tier)

Closes WR #18273 (implement zero-touch secrets — broker, acquirer, leak response)
and #18270 (follow-up for #18266 — beyond design draft).

## Principles

1. **Secrets live in exactly one place per scope:** GitHub Actions/Repo Secrets for CI,
   `.env` (gitignored) for local, Cloudflare/DO console for hosted. Never two.
2. **No secret in chat, issues, or WR bodies.** If one lands there, it is rotated
   the same day (see Leak Response). WR #18289's webhook secret is the canonical example.
3. **Free tier only:** GitHub Secrets API, `age` encryption, `gh` CLI. No Vault, no Doppler,
   no paid tiers.

## The Three Agents

### BROKER — provisions secrets into repos
`scripts/zero_touch_secrets.py broker --repo <name> --key NAME --from-env VAR`
Reads the value from the local environment or the encrypted vault
(`secrets.age` at repo root, gitignored, encrypted to the owner's age key)
and writes it to GitHub repo secrets via the API (libsodium sealed box).
Never prints the value.

### ACQUIRER — one-time capture from provider consoles
`scripts/zero_touch_secrets.py acquire --checklist`
Prints the ordered checklist of consoles (OpenRouter, DigitalOcean, Cloudflare,
Supabase, ElevenLabs) with the exact click-path to each key, prompts for each
value on a hidden prompt, and stores them into `secrets.age`. Run once per machine.

### LEAK RESPONSE — same-day rotation
`scripts/zero_touch_secrets.py leak --service <name>`
1. Prints the rotation click-path for that service.
2. After the owner pastes the NEW value (hidden prompt), updates every repo
   secret that references the service (reads `config/secret-map.json`).
3. Appends an entry to `docs/security/LEAK_LOG.md` (date, service, where leaked —
   never the value).
4. If the leak was in a GitHub issue/WR body, prints the issue-edit command to
   redact the body (history scrub optional once rotated).

## Storage

- `secrets.age` — age-encrypted, local only, in global .gitignore.
- `config/secret-map.json` — maps service → list of repos whose Actions secrets
  must be updated on rotation. No values, just names.

## Validation

- `broker --verify --repo <name>` lists secret NAMES (never values) and compares
  against secret-map.json; exit 1 on drift.

## Doppler source of truth (2026-11-19, Secret, issue #18486)

Audrey Evans approved the free Doppler Developer plan plus this script.
Principle 3's "no Doppler" line stays above as history. Doppler project
`revvel-standards`, config `prd`, is now the source. `DOPPLER_TOKEN` is the
service token. The script reads and writes Doppler, fans names out to CircleCI,
and can seal a copy into GitHub Actions. It does not print values.

A sync refuses to overwrite a destination whose timestamp or recorded version
is newer. That is the guard for the Apr–Aug 2026 stale overwrite. Dry-run is
the default for `sync` and `rotate`. The schedule is CircleCI job
`secrets-sync` in workflow `secrets-maintenance`, not a GitHub-hosted Actions
run.

`config/secret-map.json` still has the legacy service lists. The `secrets`
object adds the CircleCI context and project targets. Names only.

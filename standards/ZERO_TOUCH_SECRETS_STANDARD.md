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

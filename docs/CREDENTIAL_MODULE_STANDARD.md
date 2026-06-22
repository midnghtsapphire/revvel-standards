# Credential Module Standard

The credential subsystem is split into **three independently flippable
modules**:

| ID | What it does | Default |
|----|--------------|---------|
| `credential-gate` | Blocks deletion of critical secrets; logs audit issues. | `enabled: true` |
| `doppler-recover` | Pulls missing secrets from Doppler. **Off until Doppler is reconciled.** | `enabled: false` |
| `credential-backup-harness` | Non-Doppler fallback: `CREDENTIAL_BACKUP_JSON` / SOPS / pass / Bitwarden / 1Password / Infisical / Vault. | `enabled: true` |

## Where the flag lives

- **File source of truth**: [`config/credential-modules.yml`](../config/credential-modules.yml)
- **Database source of truth** (optional): [`schemas/credential_modules.sql`](../schemas/credential_modules.sql)
- **System prompt** for LLMs editing this surface: [`docs/prompts/LLM/credentialgate/SYSTEM_PROMPT.md`](prompts/LLM/credentialgate/SYSTEM_PROMPT.md)

If you keep both: pick one as source of truth, and sync the other from
it. The workflows read the YAML (no DB needed in CI).

## How a workflow gates itself on a module

Every workflow path that does credential work must call the gate as its
first active step:

```yaml
- name: Skip if <module-id> is disabled
  id: gate
  run: |
    if ! bash scripts/credential-module-check.sh <module-id>; then
      echo "::notice::<module-id> module is disabled; skipping."
      exit 0
    fi
```

`scripts/credential-module-check.sh` returns:

| Exit | Meaning |
|------|---------|
| `0` | Module enabled — proceed. |
| `78` | Module disabled — skip cleanly. |
| `2` | Usage error (bad arg). |

If `config/credential-modules.yml` is missing the helper **fails open**
(treats the module as enabled) so a corrupted config never silently
disables protection.

## Flipping a module

1. Edit the `enabled:` flag in `config/credential-modules.yml`.
2. Update `last_changed`, `change_reason`, and `rollback_steps` for that
   module in the same commit.
3. If you have the DB backend in use, append an
   `INSERT INTO credential_modules_audit (...)` row reflecting the flip.
4. Open a PR. The `agent-fingerprint-gate` workflow (landed in PR #14684)
   runs on changed files. The `auditor-controller` workflow (proposed in
   PR #14679) will also gate this surface once that PR merges.

## Re-enabling `doppler-recover` (special case)

The reason it's off: stale Doppler values used to overwrite freshly-set
GitHub secrets via the auto-recover loop. Re-enable only after:

1. Verify each secret listed under the module in Doppler matches the
   current GitHub Secret value.
2. Document the reconciliation in the PR body
   (e.g. "verified OPENROUTER_API_KEY, ADMIN_GITHUB_TOKEN, DOPPLER_TOKEN
   match in Doppler vs GitHub as of `<timestamp>`").
3. Flip `enabled: true`, push, and run `secret-persistence-guard.yml`
   manually with `dry_run: true` once to confirm no overwrite would
   happen.

## Adding a new credential module

1. Add a new entry to `config/credential-modules.yml` with a clear
   `description`, starting `enabled: false`, and the workflows /
   scripts it governs.
2. Add a matching `INSERT INTO credential_modules` row to
   `schemas/credential_modules.sql`.
3. Add a row to the table in this doc.
4. Have every workflow path it governs call
   `scripts/credential-module-check.sh <new-id>` first.

## Auditor coverage

`scripts/auditor-controller.js` (proposed in PR #14679; not yet on `main`)
will check:

- `doppler-disabled` — kill switches present in
  `secret-persistence-guard.yml` and `secrets-sentinel.yml`.
- `doppler-spread` — no new Doppler call sites outside the allowlist.

Once that lands, a follow-up assertion can read this YAML and verify
that every workflow listed under a module's `governs_workflows` actually
calls `credential-module-check.sh` with the right id.

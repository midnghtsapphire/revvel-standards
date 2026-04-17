# Secrets Management — "Did something delete my secrets?"

**Short answer: no.** No workflow, script, or skill in `revvel-standards`
modifies, rotates, or deletes GitHub Actions secrets. This document exists to
explain the invariant, document how to verify it, and give you a one-command
recovery path when a secret appears to be "missing everywhere".

---

## The invariant

> **Nothing in `revvel-standards` ever calls `gh secret delete` or issues
> `DELETE /repos/{owner}/{repo}/actions/secrets/...`.**

Every workflow, script, and skill in this repo treats Actions secrets as
**read-only inputs**. Specifically:

- `.github/workflows/ralph-loop.yml` manipulates only labels, comments, and
  assignees — it never references `secrets.*` for anything except passing
  `GITHUB_TOKEN` to `actions/github-script`.
- `.github/workflows/run-human-testing-api.yml` and
  `.github/workflows/research-module.yml` **read**
  `OPENROUTER_API_KEY`, `APP_ID`, `APP_PRIVATE_KEY` into environment
  variables; they do not mutate them.
- `.github/workflows/mabl.yml`, `panda-ops.yml`, `recurse-ml.yml`,
  `saml-sso-registration.yml` all read secrets for their respective APIs;
  none modify GitHub Actions secrets.
- `scripts/bootstrap-repo.sh` **prints** a suggested `gh secret set` command
  for the caller to run manually — it never deletes.
- The `vault-agent` skill (`skills/vault-agent/SKILL.md`) documents
  provisioning and rotation against **HashiCorp Vault**, not GitHub Actions
  secrets. Rotation in Vault does not propagate to GitHub Actions secrets
  automatically.

You can re-verify this at any time with:

```bash
# From the repo root — should return no matches.
grep -RIn --exclude-dir=.git \
  -E 'gh secret (delete|remove)|DELETE[[:space:]]+/repos/.*actions/secrets|deleteRepoSecret' .
```

### Why the workflows cannot delete secrets even if they wanted to

The default `GITHUB_TOKEN` available to workflows does **not** include the
admin permission required to manage Actions secrets. Deleting a repo secret
requires either:

1. A personal access token (classic) with the `repo` scope, owned by a user
   with admin rights on the repo, or
2. A GitHub App with `Secrets: Read & write` repository permission.

No workflow in this repo is configured with either. So even a compromised
workflow run could not delete a secret through the provided token.

---

## If secrets "disappear" from every repo at once

The most common cause is **new-workflow-meets-unprovisioned-repo**:

- A workflow that reads a secret (e.g. `OPENROUTER_API_KEY`) is added to the
  org's `revvel-standards` template and propagated (via copy, clone, or
  `sync-labels.yml`-style distribution) into downstream repos.
- Actions secrets are scoped **per-repository / per-environment** and do not
  travel with the workflow file. The first time the new workflow runs in a
  repo that was never provisioned, it surfaces a warning — which, appearing
  simultaneously across every downstream repo, reads like "all the secrets
  were just deleted".

Nothing was deleted. The secret was never provisioned in those repos. Use
the helper below to fix it in one command.

### Other causes worth checking before blaming automation

- **An org admin ran `gh secret delete`** (or clicked Remove in Settings →
  Secrets and variables → Actions). GitHub logs this in the org / repo
  [audit log](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization)
  — filter by `action:repo.actions_secret_delete` or
  `action:org.actions_secret_delete`.
- **The secret was scoped to an environment that was deleted.** Environment
  secrets vanish with the environment.
- **The repo was transferred** to a new owner. GitHub does not migrate
  secrets across ownership changes.
- **The secret's name changed** (e.g. `OPENROUTER_KEY` → `OPENROUTER_API_KEY`)
  in a workflow without a corresponding rename in repo settings.

---

## Re-provisioning secrets across many repos

Use [`scripts/provision-repo-secrets.sh`](../scripts/provision-repo-secrets.sh):

```bash
# Provision OPENROUTER_API_KEY from Vault to a list of repos:
OPENROUTER_API_KEY="$(vault kv get -field=api_key revvel/shared/llm/openrouter)" \
  scripts/provision-repo-secrets.sh \
    midnghtsapphire/oaudrey \
    midnghtsapphire/revvel-standards \
    midnghtsapphire/penny-sovereign-yield-scout

# Dry-run first to see what would change:
DRY_RUN=1 OPENROUTER_API_KEY="$(vault kv get -field=api_key revvel/shared/llm/openrouter)" \
  scripts/provision-repo-secrets.sh midnghtsapphire/oaudrey

# Multiple secrets in one pass — just export each variable:
OPENROUTER_API_KEY=... OPENAI_API_KEY=... ANTHROPIC_API_KEY=... \
  scripts/provision-repo-secrets.sh --secrets OPENROUTER_API_KEY,OPENAI_API_KEY,ANTHROPIC_API_KEY \
    midnghtsapphire/oaudrey midnghtsapphire/revvel-standards
```

The script uses `gh secret set` exclusively — it **adds or overwrites**
secrets, it never deletes them. See `scripts/provision-repo-secrets.sh --help`
for the full contract.

---

## See also

- [`.env.example`](../.env.example) — canonical list of secret names and
  their Vault paths.
- [`skills/vault-agent/SKILL.md`](../skills/vault-agent/SKILL.md) — how
  secrets are provisioned from / rotated in HashiCorp Vault.
- [`docs/Master_Inventory/VAULT_AGENT_STANDARD.md`](Master_Inventory/VAULT_AGENT_STANDARD.md)
  — the full standard for the vault-agent.

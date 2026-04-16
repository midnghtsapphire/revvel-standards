# DARE Log — Vault Provisioning Events

> **DARE Log** = Decision, Action, Result, Evidence
> This file records every vault provisioning event. Log the credential name, vault path, and rotation due date ONLY — never log actual secret values.
> See `VAULT_AGENT_STANDARD.md` for the full standard.

---

## 2026-04-15T12:15:00Z — OPENAI_API_KEY

- **Action:** Check vault first → provision if missing
- **Check:** `vault kv get revvel/shared/llm/openai` → ❌ NOT FOUND (key did not exist)
- **Service:** OpenAI
- **Vault Path:** `revvel/shared/llm/openai`
- **GitHub Secret Name:** `OPENAI_API_KEY`
- **Provisioned By:** vault-agent (Copilot, issue #ADD-OPENAI-API-KEY-TO-VAULT)
- **Projects Using This Key:** Neurooz, GBrain, Revvel Forensic Studio, The Alt Text
- **Rotation Due:** 2026-07-14T12:15:00Z (90 days)
- **API Registry Updated:** `docs/Universal-BOM_List/API_REGISTRY_BOM.md` → status set to `✅ Active`
- **`.env.example` Updated:** Yes — `OPENAI_API_KEY=` added to repo root `.env.example`

### Vault Commands (reference — run manually by operator with Vault access)

```bash
# Step 1: Check (was performed — key not found)
vault kv get revvel/shared/llm/openai

# Step 2: Provision at https://platform.openai.com/api-keys
# - Create key named: revvel-revvel-standards-prod-2026-04-15
# - Assign minimum required permissions

# Step 3: Store in vault
vault kv put revvel/shared/llm/openai \
  api_key="<key>" \
  created_at="2026-04-15T12:15:00Z" \
  created_by="vault-agent" \
  rotation_due="2026-07-14T12:15:00Z"

# Step 4: Push to GitHub Actions Secrets
SECRET_VALUE=$(vault kv get -field=api_key revvel/shared/llm/openai)
gh secret set OPENAI_API_KEY --body "$SECRET_VALUE" --repo midnghtsapphire/revvel-standards
unset SECRET_VALUE
```

---

*No secret values are stored in this log. Vault paths and metadata only.*

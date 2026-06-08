# BITO Secret Backup Method

**Status:** Active  
**Problem:** Doppler keeps deleting BITO secrets  
**Solution:** Manual backup and PR notification system  

---

## The Problem

Doppler has been **deleting BITO secrets** (`BITO_ACCESS_KEY`, `GIT_ACCESS_TOKEN`) without warning. This causes the `bito-ai.yml` workflow to silently skip all code reviews.

## Why This Happens

1. **Doppler rotation policies** - Doppler may rotate or delete secrets based on configured policies
2. **Missing references** - If no workflow references a secret for a period, Doppler may clean it up
3. **Sync failures** - The Doppler-to-GitHub sync can fail silently

## The Backup Solution

### Primary Method: GitHub Secrets (Manual)

When Doppler drops secrets, you must manually restore them in GitHub:

1. **Go to:** `https://github.com/midnghtsapphire/revvel-standards/settings/secrets/actions`
2. **Add BITO_ACCESS_KEY:**
   - Name: `BITO_ACCESS_KEY`
   - Value: Get from [bito.ai → Settings → Access Keys](https://bito.ai)
3. **Add GIT_ACCESS_TOKEN:**
   - Name: `GIT_ACCESS_TOKEN`
   - Value: GitHub Classic PAT with `repo` scope

### Backup Method: PR Notification

The `bito-ai.yml` workflow now:
1. Checks if secrets exist before running
2. If missing, posts a comment on the PR explaining what's needed
3. Skips gracefully (doesn't fail the PR)

### Scripted Backup (Recommended)

Create a backup script to restore secrets from a local file:

```bash
#!/bin/bash
# backup-bito-secrets.sh
# Run this when Doppler drops BITO secrets

# 1. Get BITO_ACCESS_KEY from bito.ai dashboard
echo "Enter BITO_ACCESS_KEY:"
read -s BITO_KEY

# 2. Get GIT_ACCESS_TOKEN from GitHub
echo "Enter GIT_ACCESS_TOKEN (GitHub PAT):"
read -s GIT_TOKEN

# 3. Set in GitHub Actions
gh secret set BITO_ACCESS_KEY --body "$BITO_KEY"
gh secret set GIT_ACCESS_TOKEN --body "$GIT_TOKEN"

echo "✅ BITO secrets restored!"
```

---

## Preventing Future Drops

### Option 1: Disable Doppler Rotation for BITO

In Doppler dashboard:
1. Find the `revvel-standards/prd` config
2. Locate `BITO_ACCESS_KEY` and `GIT_ACCESS_TOKEN`
3. Set rotation to **manual** or **disabled**

### Option 2: Gatekeeper Backup Script

Add `scripts/backup-bito-secrets.sh` to the gatekeeper rotation cron:

```bash
# In gatekeeper-rotate.sh, add:
# Check BITO secrets exist, restore from backup if missing
```

### Option 3: Use a Secret Reference File

Store secrets in a encrypted local file:

```bash
# .secrets/bito.backup (gitignored, encrypted with GPG)
BITO_ACCESS_KEY=<your-key>
GIT_ACCESS_TOKEN=<your-token>
```

---

## Secret Status Check

To check if BITO secrets are currently configured:

```bash
gh secret list | grep BITO
```

Expected output:
```
BITO_ACCESS_KEY    Updated <date>
GIT_ACCESS_TOKEN   Updated <date>
```

If missing:
```
# Not listed = missing
```

---

## Related Documentation

- [`standards/BITO_AI_INTEGRATION_STANDARD.md`](../standards/BITO_AI_INTEGRATION_STANDARD.md)
- [`.github/workflows/bito-ai.yml`](../.github/workflows/bito-ai.yml)
- [`scripts/gatekeeper-sync.sh`](../scripts/gatekeeper-sync.sh)

---

**Last Updated:** 2026-06-08  
**Review Frequency:** Monthly
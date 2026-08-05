# Repository Privacy & Migration Standard

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Mandatory Policy
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

This standard defines the mandatory process for:

1. Making all MIDNGHTSAPPHIRE repositories private to protect proprietary code.
2. Migrating application repositories from `midnghtsapphire` (personal account) to `Freedom Angel Corps` (enterprise org).
3. Auditing git history for unauthorized contributors or leaked credentials.
4. Running ongoing code-provenance scanning to prevent future exposure.

**Why this exists:** Personal GitHub accounts are visible by default. Proprietary application code must not be publicly accessible. The discovery of unknown contributors (e.g., commits attributed to external identifiers such as `WangRongsheng <fujingshusheng@gmail.com>`) in multiple repositories — confirmed via GitGuardian — is a P0 security event that requires immediate remediation.

---

## 2. Immediate Action: Make Repositories Private

### 2.1. Manual Steps (GitHub UI)

For each repository under `midnghtsapphire`:

1. Go to `https://github.com/midnghtsapphire/<repo-name>/settings`
2. Scroll to the **Danger Zone** section at the bottom.
3. Click **Change repository visibility**.
4. Select **Make private**.
5. Type the repository name to confirm.
6. Click **I understand, change repository visibility**.

**Priority order (do these first):**

| Repository | Reason |
|---|---|
| `revvel-standards` | Contains all proprietary standards, agent prompts, and infrastructure maps |
| All MCP-* repositories | Contains application module code |
| `OpenClaw_DigitalOcean` | Contains production deployment configuration |
| `SSRN-AUTOMATION` | Contains automation logic |
| All active application repos | Protect business logic and API integrations |

### 2.2. Automated Audit (GitHub CLI)

Use the following commands to list all public repositories and make them private in bulk:

```bash
# List all public repos in the midnghtsapphire account
gh repo list midnghtsapphire --visibility public --json name,url --limit 200

# Make a single repo private
gh repo edit midnghtsapphire/<repo-name> --visibility private

# Make ALL public repos private (run after reviewing the list above)
gh repo list midnghtsapphire --visibility public --json name --limit 200 \
  | jq -r '.[].name' \
  | while read repo; do
      echo "Making $repo private..."
      gh repo edit "midnghtsapphire/$repo" --visibility private
    done
```

> **Note:** Forked repositories (e.g., `ClickHouse`, `DeepSeek-V2`) may have upstream visibility constraints. Making a fork private does not affect the upstream public repository. It is safe to make all forks private.

---

## 3. Code Provenance Audit

### 3.1. What Is a Code Provenance Audit

A code provenance audit inspects the full git history of every repository to identify:

- Commits attributed to unknown or external email addresses.
- Commits with content that was not authored by the repository owner.
- Secrets, credentials, or tokens accidentally committed to history.

### 3.2. Audit for Unknown Contributors

Run TruffleHog and git log analysis on each repository:

```bash
# List all unique commit authors in a repo
git log --format='%ae %an' | sort -u

# Search for commits not authored by known team members
# Replace known@email.com with your own address(es)
git log --format='%H %ae %an %s' \
  | grep -v "known@email.com\|second-known@email.com" \
  | head -50

# Check if a specific email appears in history
git log --all --format='%ae' | grep "fujingshusheng@gmail.com"
git log --all --format='%ae' | grep "WangRongsheng"
```

If unknown contributors are found:

1. **Do not panic.** Git author fields can be set to any value and do not prove the person had repository access.
2. Check whether the commit was a merge of a public template, tutorial code, or dependency that included example commits in its history.
3. If the commit introduced functional code you did not write, treat it as a **P0 security event** (see §3.4).

### 3.3. Secret History Scan (TruffleHog)

TruffleHog scans the full git history for verified leaked secrets:

```bash
# Install TruffleHog v3 (Go binary — recommended)
# Linux/macOS via install script
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh \
  | sh -s -- -b /usr/local/bin

# macOS via Homebrew
brew install trufflesecurity/trufflehog/trufflehog

# Docker (no install required)
docker pull trufflesecurity/trufflehog:latest

# Scan a local repo (full history)
trufflehog git file://. --only-verified

# Scan via Docker
docker run --rm -v "$PWD:/repo" trufflesecurity/trufflehog:latest \
  git file:///repo --only-verified

# Scan a GitHub repo remotely
trufflehog github --repo https://github.com/midnghtsapphire/<repo-name> \
  --only-verified
```

If TruffleHog reports verified secrets:

1. **Immediately rotate the exposed credential** — do not wait.
2. Follow §3.4 to rewrite history (remove the secret from all commits).
3. Notify any affected service (Stripe, OpenAI, Clerk, etc.) of the rotation.

### 3.4. Removing Sensitive Data from Git History

If a secret or unauthorized commit must be removed from history:

```bash
# Install git-filter-repo (preferred over BFG)
pip install git-filter-repo

# Remove a file from all history
git filter-repo --path <sensitive-file> --invert-paths

# Replace a secret string across all history
git filter-repo --replace-text <(echo "OLD_SECRET_VALUE==>REDACTED")

# Force-push the rewritten history (all collaborators must re-clone)
git push origin --force --all
git push origin --force --tags
```

> **Warning:** Rewriting history changes all commit SHAs. Any open pull requests will be invalidated. Coordinate with all contributors before running this.

---

## 4. Migration: midnghtsapphire → Freedom Angel Corps

### 4.1. Why Migrate

| Concern | Personal Account | Freedom Angel Corps (FAC) |
|---|---|---|
| Code ownership | Tied to personal account | Owned by the legal entity |
| Repository privacy | Private (requires paid plan for orgs) | Private by default on GitHub Team/Enterprise |
| Team access | Manual collaborator invites | Role-based org membership |
| CI/CD secrets | Per-repo only | Org-level secrets available |
| Audit trail | Personal audit log only | Org-level audit log |
| Business continuity | Account deletion = repo loss | Org persists independently |
| Compliance | Personal account policies | Org policies, SAML SSO (on Enterprise) |

**Recommendation:** Migrate all production application repositories to Freedom Angel Corps. Keep `midnghtsapphire` personal account for personal experiments and forks.

### 4.2. Migration Process (Per Repository)

#### Step 1: Create the destination org repo

```bash
# Create private repo under Freedom Angel Corps org
gh repo create freedom-angel-corps/<repo-name> \
  --private \
  --description "<description>"
```

#### Step 2: Transfer repository via GitHub UI

1. Go to `https://github.com/midnghtsapphire/<repo-name>/settings`
2. Scroll to **Danger Zone** → **Transfer ownership**
3. Enter the destination: `freedom-angel-corps`
4. Confirm the transfer.

> GitHub automatically creates a redirect from the old URL for 1 year. Update all references (CI/CD configs, deployment scripts, environment variables) before the redirect expires.

#### Step 3: Update remote references

```bash
# After transfer, update your local clone
git remote set-url origin https://github.com/freedom-angel-corps/<repo-name>.git

# Verify
git remote -v
```

#### Step 4: Update CI/CD and secrets

- Move GitHub Actions secrets from the personal repo to the FAC org or the new repo.
- Update any DigitalOcean deployment configurations that reference the old repo URL.
- Update any webhook URLs that were registered against the old repo.

#### Step 5: Verify

```bash
# Confirm the new origin is working
git fetch origin
git status
```

### 4.3. Priority Migration Order

| Phase | Repositories | Rationale |
|---|---|---|
| **Phase 1 (Immediate)** | `revvel-standards`, all MCP-* repos | Core standards and active platform modules |
| **Phase 2 (This Week)** | `OpenClaw_DigitalOcean`, `SSRN-AUTOMATION` | Production infrastructure |
| **Phase 3 (This Month)** | All active application repos | Business logic protection |
| **Phase 4 (When Ready)** | Forks and experimental repos | Lower priority |

---

## 5. Ongoing Protection: Automated Scanning

### 5.1. GitGuardian (Secret Detection)

GitGuardian is already monitoring commits. Ensure it is configured for all repositories:

1. Install the GitGuardian GitHub App on the Freedom Angel Corps org.
2. Enable scanning for all new repositories added to the org.
3. Route all alerts to the designated security email.
4. **Treat every GitGuardian alert as a P0 event** — rotate the credential the same day.

### 5.2. TruffleHog GitHub Action (CI Gate)

Add TruffleHog scanning to every repository's CI pipeline by copying `templates/cicd/security.yml`:

```yaml
# .github/workflows/security.yml (excerpt)
- name: TruffleHog Secret Scan
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified
```

### 5.3. Git Author Allowlist

For every Revvel repository, add a `CODEOWNERS` file and a contributor allowlist check:

```bash
# .github/CODEOWNERS
# All files require review from the repository owner
* @midnghtsapphire
```

To enforce that no unauthorized authors appear in new commits, add this check to CI:

```yaml
- name: Check commit authors
  run: |
    ALLOWED_EMAILS="your@email.com|second@email.com"
    UNKNOWN=$(git log origin/${{ github.base_ref }}..HEAD \
      --format='%ae' | grep -vE "$ALLOWED_EMAILS" || true)
    if [ -n "$UNKNOWN" ]; then
      echo "ERROR: Unknown commit author(s) detected:"
      echo "$UNKNOWN"
      exit 1
    fi
```

---

## 6. Test Environment Isolation (Privacy by Environment)

All test environments must be isolated from public access:

| Environment | Visibility | Auth Required | Notes |
|---|---|---|---|
| `dev` (local) | Developer machine only | No | Local development, no external access |
| `staging` (midnghtsapphire) | Private GitHub Pages or password-protected | Yes | GitHub Actions deploy, HTTPS only |
| `live-test` (oaudrey subdomain) | Password-protected subdomain | Yes | Live URL for acceptance testing only |
| `production` (Freedom Angel Corps / DigitalOcean) | Public (app users) or Private (internal tools) | App-level auth | DigitalOcean App Platform or Droplet |

---

## 7. Checklist: Repository Privacy Audit

Run this checklist for every repository:

- [ ] Repository visibility set to **Private**
- [ ] `.gitignore` includes `.env`, `*.pem`, `*.key`, `id_rsa*`, `secrets.*`
- [ ] `.env.example` is committed with no real values
- [ ] `CODEOWNERS` file exists and routes to the correct owner
- [ ] TruffleHog secret scan passes with zero verified findings
- [ ] Git log shows no unknown author emails
- [ ] All deploy keys and access tokens have been audited
- [ ] Webhooks point only to trusted endpoints
- [ ] Branch protection rules are enabled on `main`

---

## 8. Related Standards

- `SECURITY_STANDARD.md` — General security policy (secrets, headers, rate limiting)
- `DEPLOYMENT_STANDARD.md` — Deploy agent model and production deployment workflow
- `GITHUB_APP_INTEGRATION_STANDARD.md` — GitHub App setup for cross-account automation
- `docs/GITHUB_ENTERPRISE_RESEARCH.md` — Research on GitHub Enterprise vs. personal account options
- `TEST_ENVIRONMENTS_STANDARD.md` — Dev → staging → live-test → production pipeline

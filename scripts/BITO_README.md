# BITO AI Integration — Quick Start

This directory contains helper scripts for managing BITO AI integration in the Revvel ecosystem.

## 🚀 Quick Start

### 1. Interactive Setup

```bash
./scripts/bito-api-helper.sh setup
```

This wizard will guide you through:
- Checking prerequisites (Vault CLI, GitHub CLI)
- Storing your BITO API key securely
- Wiring the key to GitHub Actions
- Testing the integration

### 2. Individual Commands

#### Retrieve API key from Vault

```bash
./scripts/bito-api-helper.sh retrieve
```

#### Store API key in Vault

```bash
export BITO_API_KEY="your-key-from-bito.ai"
./scripts/bito-api-helper.sh store
```

#### Wire API key to GitHub Actions

```bash
./scripts/bito-api-helper.sh wire
```

#### Test the integration

```bash
./scripts/bito-api-helper.sh test
```

#### Check configuration status

```bash
./scripts/bito-api-helper.sh status
```

## 📋 Prerequisites

### Required
- **BITO API Key** — Get it from [bito.ai](https://bito.ai) → Settings → API Keys

### Optional (for full automation)
- **HashiCorp Vault CLI** — For secure secret storage
  - macOS: `brew install vault`
  - Linux: [vaultproject.io/downloads](https://www.vaultproject.io/downloads)
  
- **GitHub CLI** — For wiring secrets to Actions
  - macOS: `brew install gh`
  - Linux: [cli.github.com](https://cli.github.com/manual/installation)

## 🔐 Manual Setup (without scripts)

### 1. Get your BITO API key

1. Go to [bito.ai](https://bito.ai)
2. Sign up or log in
3. Navigate to Settings → API Keys
4. Generate a new API key

### 2. Add to GitHub Actions

1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions → New repository secret
3. Name: `BITO_API_KEY`
4. Value: (paste your key)
5. Click "Add secret"

### 3. (Optional) Store in Vault

```bash
vault kv put revvel/shared/code-review/bito api_key="your-key-here"
```

### 4. Test the workflow

1. Open a test PR
2. Check Actions tab for "BITO AI — Code Review" workflow
3. Verify BITO posts a review comment
4. Confirm labels are applied (`bito-ai`, `bito-ai:review`, `awaiting-approval`)

## 📚 Documentation

- **Integration Guide:** [`docs/BITO_AI_INTEGRATION.md`](../docs/BITO_AI_INTEGRATION.md)
- **Standard:** [`standards/BITO_AI_INTEGRATION_STANDARD.md`](../standards/BITO_AI_INTEGRATION_STANDARD.md)
- **Skill:** [`skills/bito-ai/SKILL.md`](../skills/bito-ai/SKILL.md)
- **Workflow:** [`.github/workflows/bito-ai.yml`](../.github/workflows/bito-ai.yml)

## 🧪 Testing

### Run all integration tests

```bash
export BITO_API_KEY="your-key-here"
./scripts/test-bito-api.sh
```

### Test in CI

The `bito-ai.yml` workflow automatically runs on every PR. To trigger manually:

1. Go to Actions tab
2. Select "BITO AI — Code Review" workflow
3. Click "Run workflow"
4. Enter PR number (optional)

## 🔧 Troubleshooting

### "BITO_API_KEY is not set" error

**Problem:** The workflow skips with a warning about missing API key.

**Solution:**
1. Verify the secret exists: Settings → Secrets and variables → Actions
2. Check the secret name is exactly `BITO_API_KEY` (case-sensitive)
3. Re-run the workflow

### "HTTP 401" from BITO API

**Problem:** API key is invalid or expired.

**Solution:**
1. Generate a new key at [bito.ai](https://bito.ai) → Settings → API Keys
2. Update the GitHub secret
3. If using Vault, update there too: `./scripts/bito-api-helper.sh store`

### BITO doesn't post review comments

**Problem:** Workflow runs but no comment appears.

**Possible causes:**
1. **Permissions:** Workflow needs `pull-requests: write` permission
   - Check `.github/workflows/bito-ai.yml` has correct permissions
2. **API issue:** Check the workflow logs for errors
3. **Draft PR:** BITO skips draft PRs by default

### Labels not applied

**Problem:** BITO reviews the PR but labels aren't added.

**Solution:**
1. Ensure labels exist: Run "Sync Standard Labels" workflow
2. Check workflow has `issues: write` permission
3. Verify labels are defined in `.github/labels.yml`

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────┐
│  Developer Workstation                          │
│                                                  │
│  scripts/bito-api-helper.sh                     │
│       │                                          │
│       ├──► Vault (secret storage)               │
│       └──► GitHub Actions (secret wiring)       │
└─────────────────────────────────────────────────┘
                     │
                     │ git push
                     ▼
┌─────────────────────────────────────────────────┐
│  GitHub                                          │
│                                                  │
│  PR opened/sync ──► .github/workflows/           │
│                     bito-ai.yml                  │
│                          │                       │
│                          ├──► Verify secret      │
│                          ├──► Run BITO review    │
│                          └──► Update labels      │
└─────────────────────────────────────────────────┘
```

## 📝 Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `bito-api-helper.sh` | All-in-one API management tool | `./bito-api-helper.sh [command]` |
| `test-bito-api.sh` | Integration testing | `BITO_API_KEY=xxx ./test-bito-api.sh` |

## 🤝 Integration with Other Tools

BITO AI complements existing automation:

- **OpenRouter Assignee** — Both run in parallel; BITO adds memory-based review
- **AI PR Review (OpenRouter)** — Stateless quick review; BITO provides depth
- **PR Review Status** — Human review tracking; BITO provides automated signal
- **Auto-merge** — Can block on `bito-ai:changes-needed` label

## 📞 Support

For issues or questions:
1. Check [BITO AI documentation](https://bito.ai/docs)
2. Review workflow logs in GitHub Actions
3. Open an issue in this repository with the `bito-ai` label

---

*Part of the Revvel Standards tooling layer. See [`AGENTS.md`](../docs/AGENTS.md) for agent-specific instructions.*

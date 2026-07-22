# BITO AI Integration Standard

**Version:** 1.0.0
**Date:** 2026-04-30
**Status:** Active
**Owner:** MIDNGHTSAPPHIRE
**Scope:** All projects in the Revvel ecosystem

---

## 1. Overview

[BITO AI](https://bito.ai) is an agentic code-review and developer-productivity platform with **persistent repository memory**. Unlike stateless diff-analysis tools, BITO indexes the entire codebase once and maintains an up-to-date knowledge base across every review. This standard defines how BITO AI is provisioned, triggered, and governed across every Revvel project.

---

## 2. Architecture

```text
GitHub PR opened / synchronized
         │
         ▼
.github/workflows/bito-ai.yml
         │
         ├──► bito-core/bito-github-action
         │       (BITO_API_KEY via GitHub Secret)
         │       │
         │       ▼
         │    BITO AI Review Engine
         │       ├── Repo Memory Index   ← full codebase knowledge
         │       ├── Diff Analyzer       ← PR changes
         │       ├── Rule Engine         ← project-specific standards
         │       └── Comment Generator   ← structured PR review
         │
         └──► GitHub Labels updated
                 ├── bito-ai:review  (always)
                 ├── awaiting-approval (no blockers)
                 └── bito-ai:changes-needed + changes-requested (blockers found)
```

---

## 3. Required Configuration

### 3.1 Secrets (Settings → Secrets and variables → Actions → Secrets)

| Name | Purpose | Where to obtain |
|---|---|---|
| `BITO_API_KEY` | Authenticates all BITO API calls from CI. Server-only — never expose in client bundles. | [bito.ai](https://bito.ai) → Settings → API Keys |

### 3.2 Vault Path

```text
revvel/shared/code-review/bito
```

Store and retrieve:

```bash
# Store
vault kv put revvel/shared/code-review/bito api_key=<your-bito-api-key>

# Retrieve
vault kv get -field=api_key revvel/shared/code-review/bito
```

### 3.3 Desktop Authentication

The BITO CLI uses browser-based OAuth — no local `.env` entry is required.

```bash
bito auth login   # opens browser; authorize with GitHub or email
bito auth status  # verify authentication
```

---

## 4. Workflow Trigger Points

The `bito-ai.yml` workflow fires on:

| Trigger | Action |
|---|---|
| `pull_request` — `opened`, `synchronize`, `reopened` (non-draft) | Full BITO AI code review |
| `workflow_dispatch` | On-demand review of any PR |

Drafts are skipped; PRs with `[skip-bito]` in the title are skipped.

---

## 5. Label Protocol

BITO AI uses the following labels (defined in `.github/labels.yml`):

| Label | Set when | Removed when |
|---|---|---|
| `bito-ai` | BITO reviews a PR for the first time | Never removed automatically |
| `bito-ai:review` | A BITO review is complete | On the next BITO review cycle |
| `bito-ai:changes-needed` | BITO finds blocking issues | When BITO re-reviews and finds no blockers, or PR author pushes a fix |

These labels compose with the existing PR review status labels:

- `awaiting-approval` — added when `bito-ai:changes-needed` is NOT set.
- `changes-requested` — added (alongside `bito-ai:changes-needed`) when BITO finds blocking issues.

---

## 6. Desktop Integration — CLI Usage

### Installation

```bash
# macOS / Linux
curl -s https://alpha.bito.ai/downloads/cli/install.sh | bash

# Homebrew (macOS)
brew install bito-cli
```

### Common Commands

```bash
# Review a specific file
bito review src/utils/api.ts

# Review all staged changes before committing
bito review --staged

# Review a specific PR (by number)
bito review --pr 42

# Ask BITO a question about the repo
bito ask "How does the openrouter-assignee workflow route issues?"

# Retrieve a secret (wraps local Vault client)
bito secret get revvel/shared/llm/openai api_key

# Index / re-index the repository
bito index .
```

### Desktop API Procurement Workflow

BITO's desktop agent assists developers in acquiring and wiring API keys without manual copy-paste:

1. **Discovery**: `bito ask "What API keys does this project need?"`
   - BITO reads `.env.example`, workflow files, and skill files to enumerate required secrets.
2. **Retrieval**: `bito secret get <vault-path> <field>`
   - Reads from the local HashiCorp Vault client (requires `vault login`).
3. **Wiring**: `bito secret set <github-repo> <secret-name> <value>`
   - Uses `gh secret set` under the hood; authenticates via the existing GitHub CLI session.

---

## 7. VS Code Extension

1. Install **BITO** from the VS Code Marketplace: `ext install bito.bito`
2. Sign in: `Ctrl+Shift+P` → `BITO: Sign In`
3. BITO indexes the workspace automatically (first run: 1–5 minutes depending on repo size).
4. Inline suggestions appear as you code; `Ctrl+Shift+B` opens the BITO chat panel.
5. Right-click any selection → **BITO: Explain** / **BITO: Review** / **BITO: Improve**.

---

## 8. Onboarding a New Revvel Repo

1. Add `BITO_API_KEY` to the repo's GitHub Actions secrets.
2. Copy `.github/workflows/bito-ai.yml` into the new repo.
3. Ensure `bito-ai`, `bito-ai:review`, `bito-ai:changes-needed` labels exist (copy from `.github/labels.yml` and run `sync-labels.yml`).
4. Open a test PR and verify BITO posts a review comment and applies the `bito-ai:review` label.
5. Store the API key in Vault at `revvel/shared/code-review/bito`.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Workflow skipped with "BITO_API_KEY is not set" | Secret not provisioned | Settings → Secrets → New secret: `BITO_API_KEY` |
| HTTP 401 from BITO | Invalid API key | Re-generate at bito.ai → Settings → API Keys |
| No review comment posted | `pull-requests: write` permission missing | Ensure the workflow `permissions:` block includes `pull-requests: write` |
| BITO index out of date | Large refactor without re-indexing | Run `bito index .` locally or trigger re-index from the BITO dashboard |
| `bito secret get` fails | Local Vault client not authenticated | Run `vault login` before using `bito secret get` |

---

*Part of the Revvel Standards ecosystem. See `skills/bito-ai/SKILL.md` for agent-ready instructions and `docs/BITO_AI_INTEGRATION.md` for the full integration design.*

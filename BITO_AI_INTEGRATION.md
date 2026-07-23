# BITO AI Integration — Agentic Code Review & Desktop API Assistant

**Version:** 1.0.0
**Date:** April 30, 2026
**Status:** Requirements / Recommendation — additive to the existing harness
**Author:** MIDNGHTSAPPHIRE
**Scope:** `midnghtsapphire/revvel-standards` — the docs/standards/skills/templates repo; pattern applies to every repo listed in `docs/REPO_CATALOG.md`
**Related:**
[`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) ·
[`docs/ANTIGRAVITY_INTEGRATION.md`](./ANTIGRAVITY_INTEGRATION.md) ·
[`docs/GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md) ·
[`skills/bito-ai/SKILL.md`](../skills/bito-ai/SKILL.md) ·
[`standards/BITO_AI_INTEGRATION_STANDARD.md`](../standards/BITO_AI_INTEGRATION_STANDARD.md) ·
[`.github/labels.yml`](../.github/labels.yml)

---

## 1. Problem statement

The originating issue asks for BITO AI to be added to the revvel-standards ecosystem for three specific capabilities:

1. **Desktop API procurement assistance** — BITO's desktop agent/CLI can acquire API keys and secrets from the local environment, bridging the gap between cloud CI and developer workstations.
2. **Agentic PR reviewer** — BITO reviews pull requests with persistent memory of the entire repository, catching style regressions, security issues, and pattern breaks that stateless reviewers miss.
3. **Review labels** — BITO's review results should be surfaced through the canonical `.github/labels.yml` signal set so Launchpad, project boards, and OpenRouter downstream routing stay consistent.

Today, `revvel-standards` has automated PR review via `ai-pr-review-openrouter.yml` (stateless diff analysis) but **no persistent-memory code reviewer** that:

- Learns the repo conventions over time and enforces them without re-prompting.
- Ties review outcomes back into the existing label routing (`in-review`, `awaiting-approval`, `changes-requested`, `approved`).
- Assists a human developer at the desktop level — IDE plugin, CLI — when acquiring credentials or calling external APIs.

**BITO AI** ([bito.ai](https://bito.ai)) addresses all three.

---

## 2. What is BITO AI

BITO AI is an **agentic code review and developer productivity platform** purpose-built for engineering teams. It is distinct from generic LLM chat tools because it:

1. **Persistent repository memory** — BITO indexes the entire codebase on first run and maintains a continuously updated knowledge base. Every review draws on the full repository context, not just the changed diff.
2. **Agentic workflow** — BITO orchestrates multi-step review pipelines: read the PR diff → consult repo memory → apply project-specific rules → post structured comments → update labels.
3. **Desktop-first CLI and IDE plugins** — The `bito` CLI runs locally (macOS, Linux, Windows). A VS Code extension and JetBrains plugin surface inline suggestions. The desktop agent can retrieve secrets from the local keychain / Vault client, eliminating the need to hard-code credentials when prototyping API integrations.
4. **GitHub Actions integration** — `bito-core/bito-github-action` wires BITO into any CI pipeline with a single step.
5. **Review label automation** — BITO can add, remove, and set GitHub labels based on review outcomes, composing directly with the ARSC label system already in use.

| Capability | Covered today | What BITO adds |
|---|---|---|
| Stateless PR diff review | `ai-pr-review-openrouter.yml` (Claude Sonnet 4) | **Persistent-memory** review that learns repo conventions and enforces them consistently. |
| Review labels | `pr-review-status.yml` (human review events only) | **Automated** label updates on AI review outcomes — `awaiting-approval`, `changes-requested`, `approved`. |
| Desktop API/secret procurement | Manual (browser, 1Password, Vault CLI) | **BITO CLI desktop agent** assists in retrieving and wiring secrets from the local Vault client or keychain. |
| Repository knowledge base | None (each agent session starts cold) | **Indexed repo memory** — agents inherit full context instantly. |
| Multi-model agentic review | OpenRouter (server-side) | **BITO's own model router** selects the best model for each review sub-task client-side. |

---

## 3. Where BITO AI fits

BITO AI is **not** a replacement for any existing lane. It is a **persistent-memory code-review agent** that complements the current automation surface.

```text
                          ┌──────────────────────────────────────────┐
                          │  Contributor workstation                 │
                          │                                          │
                          │  ┌──────────────────────────────────┐    │
                          │  │  BITO Desktop Agent / CLI        │    │
                          │  │  • bito review <file>            │    │
                          │  │  • bito secret get <name>        │    │
                          │  │  • VS Code inline suggestions    │    │
                          │  │  • JetBrains plugin              │    │
                          │  └──────────┬───────────────────────┘    │
                          │             │                             │
                          └─────────────┼───────────────────────────-┘
                                        │ git push
                                        ▼
                          ┌──────────────────────────────────────────┐
                          │  GitHub                                  │
                          │                                          │
                          │  PR opened / synchronize                 │
                          │       │                                  │
                          │       ├──► openrouter-assignee.yml       │
                          │       │      (label: openrouter,         │
                          │       │       role:orchestrator)         │
                          │       │                                  │
                          │       ├──► ai-pr-review-openrouter.yml   │
                          │       │      (stateless diff review)     │
                          │       │                                  │
                          │       └──► bito-ai.yml  ◄── NEW          │
                          │              • BITO reviews diff +       │
                          │                repo memory               │
                          │              • Posts structured          │
                          │                review comment            │
                          │              • Updates labels:           │
                          │                bito-ai:review,           │
                          │                awaiting-approval /       │
                          │                changes-requested /       │
                          │                approved                  │
                          └──────────────────────────────────────────┘
```

### The "where" in one line

> **BITO AI is the persistent-memory code reviewer and desktop API-procurement assistant.** It runs in CI (via GitHub Actions) and locally (via CLI / IDE plugins), always consulting the full repository knowledge base.

---

## 4. How it integrates

### 4.1. GitHub Actions (CI — server-side review)

The `bito-ai.yml` workflow fires on every non-draft PR open/sync/reopen event:

1. Verifies `BITO_API_KEY` is set; soft-skips with a warning if not.
2. Runs `bito-core/bito-github-action` against the PR diff.
3. BITO posts a structured review comment on the PR.
4. Based on the review outcome, the workflow:
   - Adds `bito-ai:review` to mark that BITO has reviewed the PR.
   - Adds `awaiting-approval` if no blocking findings (complementing the human review flow).
   - Adds `changes-requested` (and removes `awaiting-approval`) if BITO finds blocking issues.

### 4.2. Desktop / local (developer-side)

Install the BITO CLI:

```bash
# macOS / Linux
curl -s https://alpha.bito.ai/downloads/cli/install.sh | bash

# or via Homebrew
brew install bito-cli
```

Authenticate once:

```bash
bito auth login
# Opens browser → authorize with GitHub or email
```

Use BITO locally:

```bash
# Review a file
bito review src/utils/api.ts

# Review staged changes before committing
bito review --staged

# Retrieve a secret from the local Vault client (wraps vault kv get)
bito secret get revvel/shared/llm/openai api_key

# Ask BITO about the repo in natural language
bito ask "How does the OpenRouter assignee workflow route issues?"
```

### 4.3. VS Code extension

1. Install **BITO** from the VS Code marketplace.
2. Sign in with your BITO account.
3. BITO indexes the workspace automatically (first run takes a few minutes).
4. Inline suggestions appear as you type; `Ctrl+Shift+B` opens the BITO chat panel.

### 4.4. Label routing

BITO AI introduces three new labels (added to `.github/labels.yml`):

| Label | Color | Meaning |
|---|---|---|
| `bito-ai` | `#0B6FFF` | PR or issue touched by BITO AI review |
| `bito-ai:review` | `#4D94FF` | BITO AI review complete — see review comment |
| `bito-ai:changes-needed` | `#D93F0B` | BITO found blocking issues — address before merge |

These compose with the existing review status labels (`awaiting-approval`, `changes-requested`, `approved`) so GitKraken Launchpad, project boards, and OpenRouter downstream routing see the same unified signal.

---

## 5. Secrets and configuration

### 5.1. GitHub Actions secret

| Name | Purpose | Where to obtain |
|---|---|---|
| `BITO_API_KEY` | Authenticates all BITO API calls from CI | [bito.ai](https://bito.ai) → Settings → API Keys |

Add the secret at: **Settings → Secrets and variables → Actions → New repository secret → `BITO_API_KEY`**

Vault path:

```text
revvel/shared/code-review/bito
```

### 5.2. Desktop / local auth

The CLI uses OAuth (browser-based) or an API key stored in the OS keychain. It does **not** require a separate local `.env` entry — `bito auth login` handles it.

For teams using HashiCorp Vault:

```bash
# Store the BITO API key in Vault
vault kv put revvel/shared/code-review/bito api_key=<your-key>

# Retrieve it for scripting
BITO_API_KEY=$(vault kv get -field=api_key revvel/shared/code-review/bito)
```

---

## 6. Interaction with existing automation lanes

| Concern | Existing lane | BITO AI composition |
|---|---|---|
| Stateless diff review | `ai-pr-review-openrouter.yml` | Runs in parallel; BITO adds persistent-memory depth; OpenRouter review adds stateless speed. Both post to the same PR. |
| Review labels | `pr-review-status.yml` | Complementary — `pr-review-status.yml` tracks human reviewer events; `bito-ai.yml` tracks BITO review outcomes. Both use the same label set. |
| First-line-of-sight routing | `openrouter-assignee.yml` | Unchanged — BITO review is additive. The `openrouter` + `role:orchestrator` labels still fire on PR open. |
| Merge control | `auto-merge.yml` | The `bito-ai:changes-needed` label can be added to the "block auto-merge" list alongside `won't-merge`. |
| Desktop workstation | Antigravity IDE | Complementary — Antigravity is the interactive IDE surface; BITO is the always-on code reviewer and API-procurement assistant within any editor. |

---

## 7. BOM

| Item | Tier | Cost |
|---|---|---|
| BITO AI Team plan | SaaS | Starts at $15/user/month; free tier available for public repos |
| `bito-core/bito-github-action` | Open-source (GitHub Actions) | Free |
| BITO CLI | Open-source | Free |
| VS Code / JetBrains extension | Free | Free |
| `BITO_API_KEY` GitHub secret | Zero cost | Free |

---

## 8. Roll-out checklist

- [ ] Provision `BITO_API_KEY` in GitHub Actions secrets (Settings → Secrets → New repository secret).
- [ ] Store the key in Vault at `revvel/shared/code-review/bito`.
- [ ] Confirm `bito-ai.yml` workflow is present and enabled.
- [ ] Confirm `bito-ai`, `bito-ai:review`, `bito-ai:changes-needed` labels exist (run `sync-labels.yml`).
- [ ] Install BITO CLI locally (`curl -s https://alpha.bito.ai/downloads/cli/install.sh | bash`).
- [ ] Run `bito auth login` to authorize desktop access.
- [ ] Open a test PR and verify BITO posts a review comment and applies the `bito-ai:review` label.

### Helper Scripts

For automated setup and testing:

- **Interactive setup:** `./scripts/bito-api-helper.sh setup`
- **Test integration:** `./scripts/test-bito-api.sh`
- **Check status:** `./scripts/bito-api-helper.sh status`
- **Full documentation:** [`scripts/BITO_README.md`](../scripts/BITO_README.md)

---

*Part of the Revvel Standards tooling layer. See [`skills/bito-ai/SKILL.md`](../skills/bito-ai/SKILL.md) and [`standards/BITO_AI_INTEGRATION_STANDARD.md`](../standards/BITO_AI_INTEGRATION_STANDARD.md) for agent-ready instructions.*

# Skill: BITO AI — Agentic Code Review & Desktop API Assistant

**Version:** 1.0.0
**Date:** 2026-04-30
**Status:** Active
**Platform:** [BITO AI](https://bito.ai) — Agentic Code Review with Persistent Memory
**Standard:** `standards/BITO_AI_INTEGRATION_STANDARD.md`
**Workflow:** `.github/workflows/bito-ai.yml`

---

## What is BITO AI

BITO AI is an **agentic code-review and developer-productivity platform** with persistent repository memory. It indexes the entire codebase once and maintains an up-to-date knowledge base, enabling:

- **Persistent-memory PR reviews** — every review draws on full repo context, not just the diff.
- **Desktop API procurement** — the BITO CLI/IDE plugin helps developers retrieve and wire secrets from the local Vault client or OS keychain.
- **Agentic workflow** — multi-step review pipelines: analyze diff → consult repo memory → apply project rules → post structured comments → update labels.
- **Review label automation** — applies `bito-ai:review`, `awaiting-approval`, `changes-requested`, `bito-ai:changes-needed` based on review outcomes.

---

## When to Load This Skill

Load this skill when the task involves:

- Setting up or modifying BITO AI code review
- Configuring the `bito-ai.yml` GitHub Actions workflow
- Adding or updating BITO AI review labels
- Using the BITO CLI for local code review (`bito review`)
- Using BITO to retrieve secrets or API keys from the local environment
- Onboarding a new repo onto BITO AI review
- Any issue labelled `bito-ai`, `bito-ai:review`, or `bito-ai:changes-needed`

**Trigger keywords:** `bito`, `bito ai`, `bito review`, `persistent memory review`, `bito cli`, `bito secret`, `bito index`, `agentic code review`, `desktop api procurement`

---

## How BITO AI Is Wired into Revvel

BITO AI is triggered at two surfaces:

### 1. GitHub Actions (CI — server-side)

`.github/workflows/bito-ai.yml` fires on every non-draft PR open/sync/reopen:

1. Verifies `BITO_API_KEY` is set; soft-skips if not.
2. Runs `bito-core/bito-github-action` against the PR.
3. BITO posts a structured review comment.
4. Workflow updates labels based on review outcome:
   - Always adds `bito-ai` and `bito-ai:review`.
   - If no blocking findings: adds `awaiting-approval`.
   - If blocking findings: adds `bito-ai:changes-needed` and `changes-requested`; removes `awaiting-approval`.

### 2. Desktop / local (developer-side)

```bash
# Install
curl -s https://alpha.bito.ai/downloads/cli/install.sh | bash
# or: brew install bito-cli

# Authenticate
bito auth login

# Review staged changes
bito review --staged

# Ask about the repo
bito ask "What is the openrouter routing flow?"

# Retrieve a secret from local Vault
bito secret get revvel/shared/llm/openai api_key
```

---

## Labels

| Label | Color | Meaning |
|---|---|---|
| `bito-ai` | `#0B6FFF` | PR or issue touched by BITO AI |
| `bito-ai:review` | `#4D94FF` | BITO AI review complete |
| `bito-ai:changes-needed` | `#D93F0B` | BITO found blocking issues |

---

## Secrets

| Secret | Purpose | Where to get it |
|---|---|---|
| `BITO_API_KEY` | Authenticates BITO API calls from CI | [bito.ai](https://bito.ai) → Settings → API Keys |

Vault path: `revvel/shared/code-review/bito`

---

## Agent Rules When Using This Skill

1. **Always apply `bito-ai` label** to issues and PRs routed to BITO — this ensures visibility in GitKraken Launchpad and project boards.
2. **Never include real API keys** in prompts or issue bodies — BITO reads only the text context provided.
3. **Run `bito index .`** after large refactors to keep the repository knowledge base current.
4. **Verify `BITO_API_KEY` is set** in every new repository onboarded onto Revvel.
5. **Desktop use requires `vault login`** before running `bito secret get`.
6. **Compose with existing review lanes** — do not disable `ai-pr-review-openrouter.yml`; BITO and OpenRouter reviews are complementary.

---

## See Also

- **Integration guide:** `docs/BITO_AI_INTEGRATION.md`
- **Standard:** `standards/BITO_AI_INTEGRATION_STANDARD.md`
- **Workflow:** `.github/workflows/bito-ai.yml`
- **OpenRouter Swarms Skill:** `skills/openrouter-swarms/SKILL.md`
- **Code Review Skill:** `skills/code-review/SKILL.md`
- **Vault Agent Skill:** `skills/vault-agent/SKILL.md`

---

*Part of the Revvel Standards skills vault. See `skills/REGISTRY.md` for the full catalog.*

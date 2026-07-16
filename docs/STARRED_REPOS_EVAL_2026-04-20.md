# Starred-Repo Evaluation — April 20, 2026

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluation (awaiting adoption decision)
**Scope:** Two GitHub-starred repositories flagged for possible implementation
across the Revvel ecosystem.
**Related:** [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) · [`_MASTER_BOM.md`](./_MASTER_BOM.md) · [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md)

---

## Summary

| # | Repository | Tagline (as starred) | Fit | Recommendation |
|---|---|---|---|---|
| 1 | [`Infisical/Infisical`](https://github.com/Infisical/Infisical) | Application secrets and configuration management for developers. | ⭐⭐⭐ Directly overlaps with current HashiCorp Vault + manual `.env` usage | **Pilot as a Vault-complement** on one repo, then decide |
| 2 | [`gabrielkoo/vscode-copilot-chat-bedrock`](https://github.com/gabrielkoo/vscode-copilot-chat-bedrock) | A VSCode extension to use AWS Bedrock models in Copilot Chat | ⭐⭐ Only useful if we already have (or plan) AWS Bedrock access | **Defer** — no active Bedrock spend; revisit if/when we adopt AWS Bedrock |

Both tools are tracked in [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) as 🟡 Research Topic. This document captures the reasoning behind each status.

---

## 1. Infisical — Application secrets and configuration management

**Repo:** <https://github.com/Infisical/Infisical>
**License:** MIT (core) + commercial (cloud / enterprise tiers)
**Hosting:** Self-hosted (Docker/K8s) **or** Infisical Cloud
**Pricing:** Free self-host · $0 Starter (cloud) · $6/user/mo Pro · custom Enterprise

### What it does

- Centralized secrets manager for application secrets, API keys, and config per
  environment (dev / staging / prod).
- Client SDKs (Node, Python, Go, Java, .NET, Ruby, CLI) that replace manual
  `.env` file management.
- Built-in secret scanning (`infisical scan`), secret rotation, PR scanning
  GitHub App, and Kubernetes / Terraform operators.
- Native GitHub Actions integration (`Infisical/secrets-action`) — injects
  secrets as masked env vars at workflow runtime.

### Why it showed up in the starred list

The tagline matches the exact gap called out in
[`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §1.10 and
[`_MASTER_BOM.md`](./_MASTER_BOM.md) "Security & Secrets Management": we still
manage most per-project secrets through hand-edited `.env` files plus
[`scripts/bootstrap-repo.sh`](../scripts/bootstrap-repo.sh) `gh secret set`
prompts. Infisical is the leading open-source candidate to replace that
workflow.

### Fit with Revvel stack

| Dimension | Assessment |
|---|---|
| Replaces | Manual `.env` editing; ad-hoc `gh secret set` per repo |
| Complements | HashiCorp Vault (Vault stays for infra + long-lived prod secrets; Infisical for developer-facing app secrets) |
| Conflicts with | Nothing — Vault + Infisical is a documented pattern (see Infisical docs) |
| Agent compatibility | Works with the Copilot Coding Agent: secrets still flow to workflows via `secrets.*`; no change to the ["secrets are read-only inputs"](./SECRETS_MANAGEMENT.md) invariant |
| Cost | $0 if self-hosted on an existing DigitalOcean droplet; $6/user/mo only if we adopt cloud |

### Risks / Unknowns

- **Self-host ops burden.** Adds one more service to keep patched on the DO
  droplet that already hosts Vault. Mitigation: run on the same droplet as
  Vault, behind the same backup/restore runbook.
- **Second source of truth.** Without discipline, secrets could diverge between
  Vault and Infisical. Mitigation: scope split — Infisical = app/dev secrets,
  Vault = infra/prod secrets, to be documented in
  [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) as part of the pilot.
- **GitHub Actions secret-deletion invariant** in
  [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) must remain true — the
  `Infisical/secrets-action` GitHub App only **reads** from Infisical and
  injects at runtime; it does not delete GitHub Actions secrets.

### Recommendation

**Pilot (P1).** Pick one active repo with many `.env` variables (candidate:
`penny-sovereign-yield-scout` or `growlingeyes`) and run a 2-week pilot with
self-hosted Infisical on the existing DO droplet.

**Decision gate:** Adopt ecosystem-wide if, after 2 weeks, (a) developer
onboarding time drops vs. manual `.env`, and (b) no secret drift is detected
between Vault and Infisical.

### Next steps (only once a pilot repo is approved)

1. Add `infisical` to `scripts/bootstrap-repo.sh` as an **optional** bootstrap
   flow (do not replace the existing `gh secret set` path).
2. Document the Vault vs. Infisical split in
   [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md).
3. Update [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §1.10 status from
   🟡 → 🧪 Trial Active when the pilot starts.

---

## 2. vscode-copilot-chat-bedrock — AWS Bedrock models in Copilot Chat

**Repo:** <https://github.com/gabrielkoo/vscode-copilot-chat-bedrock>
**License:** Not yet verified — confirm before adoption
**Hosting:** VS Code extension (client-side); calls AWS Bedrock directly with
the developer's AWS credentials.
**Pricing:** Extension is free; cost = AWS Bedrock per-token pricing on the
developer's own AWS account.

### What it does

- Registers AWS Bedrock models (Anthropic Claude, Meta Llama, Amazon Titan,
  Mistral, Cohere, etc.) as **Language Model Providers** inside VS Code's
  Copilot Chat, so `@model` pickers in Copilot Chat can select a Bedrock model
  instead of (or alongside) GitHub-hosted models.
- Relies on standard AWS credentials (`~/.aws/credentials`, SSO, or env vars)
  and the `bedrock-runtime` API.
- Useful primarily for teams that want to use Anthropic Claude via AWS (for
  compliance / billing consolidation) while keeping the Copilot Chat UX.

### Fit with Revvel stack

| Dimension | Assessment |
|---|---|
| Overlaps with | OpenRouter (already listed P0 in [`_MASTER_BOM.md`](./_MASTER_BOM.md) §🧠 AI & LLM) — OpenRouter already routes to Claude, Llama, Mistral, etc. without AWS billing |
| Requires | Active AWS account with Bedrock enabled (currently **not** in our stack) |
| Agent compatibility | Extension runs in a human developer's VS Code — it does not affect the Copilot **Coding Agent** (this agent) which runs headless in Actions |
| Cost | $0 extension + AWS Bedrock per-token (Claude 3.5 Sonnet ≈ $3/M in, $15/M out on Bedrock) |

### Risks / Unknowns

- **Duplicate capability.** OpenRouter already gives us Claude/Llama/Mistral
  access without requiring AWS Bedrock onboarding, IAM setup, or VPC
  considerations. Adopting Bedrock just for Copilot Chat would create a parallel
  billing & credential path for near-identical models.
- **Third-party extension trust.** This is a community extension, not
  AWS-official. Before adoption, review (a) how it stores/refreshes AWS creds,
  (b) whether prompt/response traffic stays client-side, and (c) license /
  security posture.
- **No active AWS relationship.** We currently have no Bedrock spend, no
  Bedrock IAM role, and no outstanding need that OpenRouter does not already
  cover.

### Recommendation

**Defer (P3).** Keep on the watch list but do **not** adopt now.

**Revisit when:**

- We open an AWS account with Bedrock enabled for another reason (e.g., an
  enterprise client that requires AWS-native billing), **or**
- OpenRouter pricing/availability materially degrades, **or**
- A specific Revvel project requires a Bedrock-only model unavailable through
  OpenRouter.

### Next steps (only if deferred decision is revisited)

1. Independent security review of the extension (source + permissions).
2. Provision a least-privilege `bedrock:InvokeModel` IAM role.
3. Benchmark cost vs. OpenRouter for the same model on identical prompts before
   switching any developer workflow.

---

## 3. Crosswalk to existing tracking docs

| Repo | `_MASTER_INVENTORY.md` | `_MASTER_BOM.md` | Priority |
|---|---|---|---|
| Infisical | §1.10 Security & Secrets Management (already listed) | 🔐 Security & Secrets Management (already listed, P1) | **P1 — pilot** |
| vscode-copilot-chat-bedrock | §1.11 Code Quality & Autonomous Review (added in this PR) | 🧠 AI & LLM Infrastructure (added in this PR) | **P3 — defer** |

---

## Appendix — How these repos were identified

The issue that triggered this doc listed only the taglines:

> - Application secrets and configuration management for developers.
> - A VSCode extension to use AWS Bedrock models in Copilot Chat

Those taglines were matched back to the source repos by searching GitHub star
metadata; the matches are unambiguous:

1. "Application secrets and configuration management for developers." is the
   exact GitHub description of
   [`Infisical/Infisical`](https://github.com/Infisical/Infisical).
2. "A VSCode extension to use AWS Bedrock models in Copilot Chat" is the exact
   description of
   [`gabrielkoo/vscode-copilot-chat-bedrock`](https://github.com/gabrielkoo/vscode-copilot-chat-bedrock).

If a different repo was intended for either tagline, re-open the source issue
with the repo URL and this document will be updated.

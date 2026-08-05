# Automation Extensions Integration — `automation-app-bot`, Make.com & n8n

**Version:** 1.0.0
**Date:** April 23, 2026
**Status:** Requirements / Recommendation — additive to the existing harness
**Author:** MIDNGHTSAPPHIRE
**Scope:** `midnghtsapphire/revvel-standards` — the docs/standards/skills/templates repo; pattern applies to every repo listed in `docs/REPO_CATALOG.md`
**Related:**
[`docs/GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) ·
[`docs/GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md) ·
[`docs/ANTIGRAVITY_INTEGRATION.md`](./ANTIGRAVITY_INTEGRATION.md) ·
[`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) ·
[`docs/SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) ·
[`docs/Master_Inventory/MARKETING_AUTOMATION_STANDARD.md`](./Master_Inventory/MARKETING_AUTOMATION_STANDARD.md) ·
[`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) ·
[`.github/labels.yml`](../.github/labels.yml)

---

## 1. Problem statement

The originating issue (`automation-app-bot and n8n and make are ready to be put into revvel-standards`) flags three automation tools that are already provisioned and ready to connect via the owner's GitHub **extensions** / Marketplace surface:

1. **`automation-app-bot`** ([`ammar-knowledge/automation-app-bot`](https://github.com/ammar-knowledge/automation-app-bot)) — a FOSS [Probot](https://probot.github.io/) GitHub App, topic `github-app` / `probot`. Provides reusable, event-driven repo automation (issues/PRs/comments).
2. **Make.com** ([make.com](https://www.make.com)) — SaaS visual automation platform. Already referenced as the default scheduler in [`docs/Master_Inventory/MARKETING_AUTOMATION_STANDARD.md`](./Master_Inventory/MARKETING_AUTOMATION_STANDARD.md) §5.4 and as an affiliate platform in [`docs/affiliate_links.md`](./affiliate_links.md).
3. **n8n** ([n8n.io](https://n8n.io)) — open-source, self-hostable workflow automation. Already referenced alongside Make.com in the Marketing Automation Standard.

Today these tools are referenced *inside* a single standard (marketing) and in the master BOM list, but there is **no canonical integration doc** that:

1. Declares where each tool plugs into the existing `openrouter` / `graphite` / `gitkraken` / `antigravity` lanes without overlapping them.
2. Gives each tool a dedicated label so work routed through them is visible in GitKraken Launchpad and the OpenRouter first-line-of-sight comment.
3. Records the secrets/vault provisioning path so credentials never land in code (per [`docs/SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md)).
4. Pins a BOM row so the standards owner can see cost + license at a glance.

This document fills those gaps using the same append-only pattern as the Graphite / GitKraken / Antigravity integrations.

---

## 2. What each tool adds

All three tools sit in a new **automation extensions** lane. They are **write-side** consumers (they can post to APIs, create issues, trigger workflows) and therefore MUST be credential-scoped through the vault (see §5.3), but they do not gate any status check in this repo.

| Concern | Provided by today | What the extensions add |
|---|---|---|
| GitHub-side event automation (label sync, issue routing, PR cross-posts) | `.github/workflows/*.yml` + `openrouter-assignee.yml` | **`automation-app-bot`** — a Probot app that can be reused across repos for lightweight, event-driven tasks that don't justify a full workflow. Opt-in per repo. |
| Cross-app orchestration (GitHub ↔ Supabase ↔ social APIs ↔ email) | Ad-hoc GitHub Actions + per-app scripts | **Make.com** — visual scenarios; default scheduler for the Marketing Automation Standard §5.4. Free tier: 1,000 ops/month. |
| Self-hostable / FOSS equivalent for privacy-sensitive flows | None | **n8n** — self-hostable, Sustainable-Use-licensed workflow automation. Paired with Make.com so the standard offers both a SaaS and a FOSS option. |

### How the extensions compose with existing lanes

```text
PR / issue event  ─►  GitHub (source of truth)
                       │
                       ├─►  openrouter-assignee.yml   (assignee = @Copilot, labels: openrouter, role:*)
                       ├─►  Graphite app              (labels: graphite, graphite:stacked)
                       ├─►  GitKraken Launchpad       (passive read of labels, contributor-side)
                       ├─►  Antigravity IDE           (contributor-local agent run, labels: antigravity*)
                       │
                       └─►  automation extensions     (NEW — this doc)
                              ├─ automation-app-bot   (label: automation-ext, automation-ext:probot)
                              ├─ Make.com scenarios   (label: automation-ext, automation-ext:make)
                              └─ n8n workflows        (label: automation-ext, automation-ext:n8n)
                                      │
                                      └─► downstream APIs (Supabase, social, email, etc.)
```

The extensions are **downstream** of the OpenRouter hand-off. They consume the same labels the existing lanes already emit; they do not rewrite them.

### Why this repo specifically

Because `revvel-standards` owns:

- The canonical label set (`.github/labels.yml`) synced to every repo via `sync-labels.yml`.
- The Marketing Automation Standard that already names Make.com + n8n as the scheduler layer ([`MARKETING_AUTOMATION_STANDARD.md`](./Master_Inventory/MARKETING_AUTOMATION_STANDARD.md) §5.4).
- The master BOM list (`docs/_MASTER_BOM.md`) and repo BOM (`docs/revvel-standards/BOM.md`).
- The vault / secrets guidance every downstream repo inherits.

Every other repo inherits this integration automatically through the existing label sync + BOM reference.

---

## 3. Tool selection rationale

Evaluated against the same criteria as the other integrations in this repo:

| Criterion | `automation-app-bot` (Probot) | Make.com | n8n |
|---|---|---|---|
| License | MIT (Probot core + upstream repo `ammar-knowledge/automation-app-bot`). FOSS. | Proprietary SaaS; **Free tier** 1,000 ops/mo. | [Sustainable Use License](https://docs.n8n.io/sustainable-use-license/) — FOSS for internal use; self-hostable at $0. |
| Cost for this repo | $0 — self-hostable on existing infra or runs on GitHub Actions. | $0 (Free tier). Paid tiers start at ~$9/mo; re-confirm before upgrading. | $0 (self-hosted) or from ~$20/mo Cloud. |
| Maintenance | Probot is actively maintained; upstream fork is advisory. Fork audit lives in `fork-audit/`. | Actively maintained SaaS. | Actively developed on GitHub ([`n8n-io/n8n`](https://github.com/n8n-io/n8n)). |
| CI-friendly | Yes — Probot can run as a GitHub App webhook target or be lifted into `.github/workflows/` as a Node script. | Yes — Make.com exposes webhook triggers and REST API; scenarios can be triggered by GitHub Actions. | Yes — self-hosted instance exposes REST + webhook triggers. |
| Local-first | Yes — Node app, runs anywhere. | No (SaaS). | Yes (self-hostable Docker / Node). |
| Write access to repos | Optional — scoped per installation via GitHub App permissions. | Via personal GitHub token or dedicated bot account. | Same as Make.com. |
| Zero-config possible | No — requires GitHub App registration + webhook. | Yes — sign in with OAuth, connect GitHub + target APIs. | Yes after hosting — connect GitHub node + target nodes. |

### Alternatives considered and not adopted as the primary extensions lane

| Tool | Why not the default (still allowed under the standard) |
|---|---|
| **Zapier** | Already listed in the Marketing Automation Standard as an alternative; paid tiers kick in faster than Make.com's Free tier. Contributors MAY use Zapier. |
| **Pipedream** | Strong developer-first platform, already listed in the master standards. Kept as an optional alternative. |
| **ActivePieces** | FOSS alternative to Zapier; listed as optional FOSS alternative to n8n. |
| **GitHub-hosted workflows only** | Works for trivial cases, but lacks visual scenario authoring for non-coder contributors (see [`docs/NON_CODER_GUIDE.md`](./NON_CODER_GUIDE.md)). |

**Decision:** Adopt **`automation-app-bot` (Probot-style GitHub App)** + **Make.com (SaaS, Free tier)** + **n8n (self-hosted, FOSS)** as the supported — but **not mandatory** — automation extensions lane for `midnghtsapphire/revvel-standards` and every repo listed in [`docs/REPO_CATALOG.md`](./REPO_CATALOG.md). Zapier, Pipedream, and ActivePieces remain permitted alternatives.

---

## 4. Relationship to the Marketing Automation Standard

[`MARKETING_AUTOMATION_STANDARD.md`](./Master_Inventory/MARKETING_AUTOMATION_STANDARD.md) §5.4 already specifies Make.com as the default scheduler and names n8n as the FOSS alternative. This integration doc is the **connection layer** that turns those references into a live, labelled, BOM-tracked lane:

- The scheduler requirements in §5.4 of the Marketing Automation Standard stay unchanged.
- The labels / BOM / rollout plan in this doc add the connective tissue around those requirements.
- No overlap with the OpenRouter / Graphite / GitKraken / Antigravity lanes: those cover *code-authoring* flows; this covers *operational / event-driven* flows.

---

## 5. Requirements (RFC 2119)

### 5.1. Functional

| ID | Requirement |
|---|---|
| **R-AX-01** | Four new labels — `automation-ext`, `automation-ext:probot`, `automation-ext:make`, `automation-ext:n8n` — MUST exist in `.github/labels.yml` so `sync-labels.yml` propagates them to every repo. |
| **R-AX-02** | The `automation-ext` label MUST be applied to any issue or PR that is expected to be actioned (wholly or partly) by one of the three tools covered in this doc. Sub-labels (`:probot`, `:make`, `:n8n`) specify which tool. |
| **R-AX-03** | Enabling `automation-app-bot` on a repo MUST use the standard GitHub App installation flow. The App's **Repository Permissions** MUST be scoped to the minimum set required (typically: `issues: write`, `pull_requests: write`, `metadata: read`). No `contents: write` without explicit standards-owner approval. |
| **R-AX-04** | Make.com and n8n MUST NOT be granted direct write access to `main` or to the merge queue. They MAY create issues, add comments, and apply labels via a dedicated bot account or GitHub App; code changes MUST flow through the normal PR + `openrouter-assignee.yml` hand-off. |
| **R-AX-05** | Every Make.com scenario or n8n workflow that touches a Revvel repo MUST be **named** with a prefix that identifies its owner repo (e.g., `revvel-standards · sync-labels-digest`) so the scenario list in Make.com / n8n is navigable. |
| **R-AX-06** | Each scenario / workflow / Probot handler MUST be **documented** in a short row in [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) (or the consuming repo's BOM) with: name, trigger, purpose, and rotation owner. |

### 5.2. Security & secrets

| ID | Requirement |
|---|---|
| **R-AX-S-01** | All credentials used by Make.com / n8n / `automation-app-bot` (GitHub App private keys, API tokens, webhook secrets) MUST be provisioned through the vault path described in [`docs/SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) and `skills/vault-agent/SKILL.md`. Tokens MUST NEVER be committed to this or any downstream repo. |
| **R-AX-S-02** | Long-lived personal access tokens (PATs) MUST NOT be used. Prefer GitHub Apps (Probot / Make.com / n8n all support App-based auth) or short-lived fine-grained PATs rotated on a schedule. |
| **R-AX-S-03** | Webhook endpoints exposed by self-hosted n8n instances MUST validate GitHub's `X-Hub-Signature-256` header against the configured webhook secret. |
| **R-AX-S-04** | If `automation-app-bot` code is adopted as-is from the upstream fork, it MUST first pass `skills/fork-audit-bot/SKILL.md` and land in `fork-audit/` under the standard fork-audit flow before production use. |

### 5.3. Non-functional

| ID | Requirement |
|---|---|
| **R-AX-N-01** | Make.com usage MUST stay on the Free tier for the `revvel-standards` repo. Any paid upgrade triggers a new BOM row and standards-owner review. |
| **R-AX-N-02** | n8n, when self-hosted, MUST run on infra already listed in `docs/Master_Inventory/INFRASTRUCTURE_MAP.md`. New infra triggers a new BOM row. |
| **R-AX-N-03** | Probot handler versions used in any deployed app MUST be pinned (exact semver in `package.json`). |
| **R-AX-N-04** | Contributor data (source, diffs, branch names beyond what GitHub already exposes) MUST NOT leave the Make.com / n8n / Probot boundary through third-party AI modules unless explicitly approved by the standards owner. |

### 5.4. Governance

| ID | Requirement |
|---|---|
| **R-AX-G-01** | Enabling this integration MUST be logged in `CHANGELOG.md` (this PR). |
| **R-AX-G-02** | A BOM row MUST be added to `docs/revvel-standards/BOM.md` capturing license, cost, priority, and status for the automation-extensions lane as a whole. |
| **R-AX-G-03** | Review the decision every 12 months; re-evaluate Make.com vs Zapier vs Pipedream, and n8n vs ActivePieces. |

---

## 6. Proposed directory / config additions

Additive only — no existing files overwritten.

```text
revvel-standards/
├── .github/
│   └── labels.yml                                  # + automation-ext and 3 sub-labels (R-AX-01)
├── CHANGELOG.md                                    # + entry for this integration (R-AX-G-01)
└── docs/
    ├── AUTOMATION_EXTENSIONS_INTEGRATION.md        # this document
    ├── OPENROUTER_ASSIGNEE_PROCESS.md              # + "See also" cross-link (append-only)
    └── revvel-standards/
        └── BOM.md                                  # + automation-extensions row (R-AX-G-02)
```

No existing file is overwritten or renamed. The Marketing Automation Standard is left intact; this doc is the **connector**, not a replacement.

---

## 7. Rollout plan

Each bullet is a **single PR**:

1. **PR-1 (this PR):** Land this integration doc, add the four `automation-ext*` labels, append the BOM row, append the CHANGELOG entry, cross-link from `OPENROUTER_ASSIGNEE_PROCESS.md`. No runtime behaviour changes.
2. **PR-2:** Fork-audit `ammar-knowledge/automation-app-bot` under `fork-audit/` per `skills/fork-audit-bot/SKILL.md`; publish a short compatibility note at `docs/revvel-standards/AUTOMATION_APP_BOT_AUDIT.md`.
3. **PR-3:** Register the first Make.com scenario and n8n workflow that consume the `automation-ext` label (candidates: label-sync digest, fork-audit cron summary, OpenRouter instantiation-check digest). Document each in the consuming repo's BOM per R-AX-06.
4. **PR-4:** 30-day observation period; record outcomes (ops consumed on Make.com Free tier, webhooks served by n8n, Probot handler count). Promote to "Live" in the BOM if all requirements hold; otherwise roll back.

Total expected engineering time: **≤ 1 day** across PR-2..PR-3, plus the observation window.

---

## 8. How this satisfies the originating issue

| Issue ask | How this doc addresses it |
|---|---|
| *"automation-app-bot is available, see if it might fit in somewhere"* | §2 + §3: slots `automation-app-bot` (Probot) into a new **automation extensions** lane, downstream of the OpenRouter hand-off. §5 R-AX-03 / R-AX-S-04 gate adoption through the fork-audit flow and minimum-permission GitHub App install. |
| *"I have make and n8n ready to be connected from extensions"* | §2: names Make.com + n8n as the SaaS and FOSS halves of the same lane. §4: aligns with the already-specified scheduler layer in the Marketing Automation Standard §5.4. §5 + §6: adds labels, BOM row, and secrets path so "connect from extensions" has a deterministic, standards-compliant home. |
| *Scope: review AGENTS.md, skills, standards, templates, `.github/`* | §1 + §6: cross-references AGENTS.md mandatory skills (vault-agent, fork-audit-bot), the Marketing Automation Standard, `.github/labels.yml`, and the REPO_CATALOG propagation pattern. No skill file changes are needed — `skills/vault-agent` and `skills/fork-audit-bot` already cover the provisioning and audit paths. |
| *Scope: honor the Prime Directive (ship working code, not plans)* | PR-1 ships real artefacts: the integration doc, four canonical labels wired into `sync-labels.yml`, a BOM row, a CHANGELOG entry, and a cross-link — not a proposal. Subsequent PRs add the scenarios/workflows themselves. |

---

## 9. See also

- [`docs/GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) — PR-stacking app whose labels this lane consumes, not rewrites.
- [`docs/GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md) — contributor-side GUI whose Launchpad surfaces the new `automation-ext*` labels alongside existing ones.
- [`docs/ANTIGRAVITY_INTEGRATION.md`](./ANTIGRAVITY_INTEGRATION.md) — contributor-local agent IDE; composes cleanly with the new lane (PRs authored there still traverse the OpenRouter hand-off before extensions fire).
- [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — the PR → OpenRouter hand-off that remains the upstream source of truth.
- [`docs/Master_Inventory/MARKETING_AUTOMATION_STANDARD.md`](./Master_Inventory/MARKETING_AUTOMATION_STANDARD.md) — already names Make.com + n8n as the scheduler layer; this doc is the connector.
- [`docs/SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) — the vault path every extension credential must flow through.
- [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) — Bill of Materials; the automation-extensions row is added in this PR.
- `skills/vault-agent/SKILL.md` — how to provision tokens / App private keys for Make.com / n8n / Probot.
- `skills/fork-audit-bot/SKILL.md` — required audit path before adopting the upstream `automation-app-bot` fork.
- [`ammar-knowledge/automation-app-bot`](https://github.com/ammar-knowledge/automation-app-bot) — upstream Probot app (MIT).
- [Make.com docs](https://www.make.com/en/help) · [n8n docs](https://docs.n8n.io) · [Probot docs](https://probot.github.io/docs/).

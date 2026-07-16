# LieberLieber `setup-LemonTree.Automation@v6` — Evaluation

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluated — **rejected (P3, do not adopt)**; recorded as 🗑️ Removed for institutional memory
**Date:** April 28, 2026
**Scope:** Evaluate the GitHub Action [`LieberLieber/setup-LemonTree.Automation@v6`](https://github.com/LieberLieber/setup-LemonTree.Automation) for permanent functionality in the Revvel ecosystem.
**Source issue:** Jules EVALUATE — `name: Get LemonTreeAutomation / uses: LieberLieber/setup-LemonTree.Automation@v6`
**Related:** [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) · [`_MASTER_BOM.md`](./_MASTER_BOM.md) · [`STACK.md`](./STACK.md) · [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md) · [`CODE_QUALITY_APPS_EVAL_2026-04-23.md`](./CODE_QUALITY_APPS_EVAL_2026-04-23.md) · [`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md) · [`API_CRAFTPRO_EVAL_2026-04-20.md`](./API_CRAFTPRO_EVAL_2026-04-20.md)

---

## Summary

| Tool | Tagline | Fit | Recommendation |
|---|---|---|---|
| [`LieberLieber/setup-LemonTree.Automation@v6`](https://github.com/LieberLieber/setup-LemonTree.Automation) | Installs LemonTree.Automation — LieberLieber's commercial CLI for diff / merge / consistency-check of **Sparx Systems Enterprise Architect** UML/SysML model files (`.eapx`, `.qea`, `.qeax`) — onto a GitHub-hosted runner so the binary can be invoked in later workflow steps. | ⭐ No fit — Revvel has zero Enterprise Architect models; the action is inert without `.eapx`/`.qea`/`.qeax` files and a paid LieberLieber license. | **Skip / Reject (P3) — do not adopt.** Track as 🗑️ Removed; revisit only if a Revvel project starts producing Sparx EA models. |

Tracked in [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §1.11 and [`_MASTER_BOM.md`](./_MASTER_BOM.md) §🚀 CI/CD & Deployment Automation as 🗑️ Removed. This document captures the reasoning behind that status so the same action does not get re-evaluated from scratch on a future starred-repo or marketplace sweep.

---

## 1. What the action actually does

**Marketplace / repo:** <https://github.com/LieberLieber/setup-LemonTree.Automation>
**Bundled tool:** [LemonTree.Automation](https://help.lieberlieber.com/LemonTree/LemonTree-Automation.html) — a Windows-first CLI shipped by [LieberLieber](https://www.lieberlieber.com/lemontree/).
**License:** Commercial. Annual single-user *or* floating (RLM-server) license; quote-only — no public price list. No free tier; a time-limited evaluation key is granted on request via `welcome@lieberlieber.com`.
**Hosting:** Runs inside a GitHub Actions job. Per the action's README it targets Windows runners; LemonTree.Automation itself is a .NET Framework / .NET CLI distributed as a Windows installer.
**Inputs (action):** `LemonTreeAutomationLicense` (license string, expected to come from a GitHub secret) plus an optional version pin.
**Outputs:** None — the action *only* puts the `LemonTree.Automation.exe` binary on the runner's `PATH` so subsequent `run:` steps can invoke commands such as `merge`, `diff`, `consistencycheck`, `validate`.

What the action does **not** do, on its own:

- It does not produce or modify any artifact.
- It is a no-op unless a later workflow step invokes the binary against a real Sparx EA model file (`.eapx` / `.qea` / `.qeax`) checked into the repo.
- It does not work for any other modeling tool (no MagicDraw, no PlantUML, no Mermaid, no draw.io, no Figma).

### Why it showed up

The triggering issue contained only a code fragment (`uses: LieberLieber/setup-LemonTree.Automation@v6`) and asked Jules to deep-research it. There is no prior reference to LemonTree, LieberLieber, Sparx Systems, or Enterprise Architect anywhere in this repo (`grep -ri 'LemonTree\|LieberLieber\|Sparx\|Enterprise Architect' .` returns zero matches as of this PR), which means the action was almost certainly surfaced from an external starred-repo / marketplace sweep rather than from any in-flight Revvel work.

---

## 2. Fit with the Revvel stack

| Dimension | Assessment |
|---|---|
| **Replaces** | Nothing. Revvel ships **zero** Sparx Enterprise Architect models. The current modeling/diagramming surface across the org is Markdown + Mermaid + draw.io / Figma exports embedded in `docs/` (e.g., [`docs/Master Revvel-Standards Flow Charts/`](./Master%20Revvel-Standards%20Flow%20Charts/), [`docs/REVVEL_MASTER_STANDARDS.md`](./REVVEL_MASTER_STANDARDS.md)). None of these formats are touched by LemonTree. |
| **Complements** | Nothing in the current toolchain. The closest neighbors — RecurseML, CodeQL, Gitleaks, the OpenRouter AI PR reviewer ([`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md)) — operate on source code, not model files. |
| **Conflicts with** | **Stack.** Revvel CI defaults to `ubuntu-latest` runners (see the templates under [`../templates/cicd/`](../templates/cicd/) and the workflows in [`.github/workflows/`](../.github/workflows/)). LemonTree.Automation is Windows-only, so adopting it would force a `windows-latest` runner per workflow — Windows runner minutes are billed at **2×** the Linux rate on private repos ([GitHub Actions billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions#minute-multipliers)), with no offsetting benefit. |
| **Replaces / complements an existing CI gap** | No. The action only matters if a repo contains binary EA model files that humans would otherwise three-way-merge by hand. None do. |
| **License model** | Closed-source, paid, quote-only, with a hard runtime license check. Drops out of the "free or near-free" criterion that every adopt-now item in [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md) §0 and [`CODE_QUALITY_APPS_EVAL_2026-04-23.md`](./CODE_QUALITY_APPS_EVAL_2026-04-23.md) §0 had to clear. |
| **Secrets exposure** | Adds a new mandatory secret (`LEMONTREE_AUTOMATION_LICENSE`) that would have to be provisioned per-repo or per-org, tracked in [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md), and rotated annually. Net new secret-management work for zero workflow benefit. |
| **Agent compatibility** | Irrelevant — the OpenRouter-routed Copilot orchestrator and the AI PR reviewers in [`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md) operate on text source / diffs and have no notion of Sparx EA models. |
| **Cost** | Annual license fee (quote-only) **plus** Windows runner minute multiplier **plus** secrets-rotation overhead. Concrete benefit: $0. |

---

## 3. Risks / unknowns (only relevant if the rejection is ever revisited)

- **Vendor lock-in.** LemonTree is the only widely deployed merge tool for Sparx EA. Adopting it commits us to (a) Sparx EA itself (also commercial, also Windows-only), (b) LieberLieber's licensing server, and (c) Windows CI runners. None of those are reversible without re-doing the modeling work.
- **License enforcement.** LemonTree.Automation phones home to a license server (RLM) by default. A network blip on the GitHub-hosted runner can fail the CI step. Floating-license setups also leak runner identity (hostname, MAC) to LieberLieber's RLM.
- **No free path to evaluate.** Even a one-off spike requires emailing `welcome@lieberlieber.com` for an evaluation key, accepting their EULA, and provisioning a secret on the org. Higher friction than every other tool we have evaluated this month.
- **Action maintenance.** `LieberLieber/setup-LemonTree.Automation` is maintained by the vendor; pinning to `@v6` is acceptable, but the action is single-purpose and would orphan immediately if the vendor sunset the product.

---

## 4. Recommendation

**Skip / Reject (P3) — do not adopt; do not add to any template under [`../templates/cicd/`](../templates/cicd/).**

This action solves a problem Revvel does not have. Adopting it would:

1. add a recurring annual license cost,
2. require Windows CI runners (2× minute cost on private repos),
3. add a new secret (`LEMONTREE_AUTOMATION_LICENSE`) to provision and rotate,
4. and produce zero artifact, since no Revvel repo contains Sparx EA model files.

**Revisit only when *all* of the following are true:**

- A Revvel project has a concrete plan to author and check in Sparx Systems Enterprise Architect models (`.eapx` / `.qea` / `.qeax`) — recorded in [`_MASTER_BOM.md`](./_MASTER_BOM.md) and [`STACK.md`](./STACK.md);
- A Sparx EA license has been purchased and is tracked in [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md);
- Free / open-source alternatives (e.g., text-serialized modeling formats such as PlantUML or Structurizr DSL that diff cleanly with `git`) have been evaluated and rejected with a documented reason.

If those conditions are ever met, re-open this evaluation, flip the inventory row from 🗑️ Removed to 🟡 Research Topic, and run a time-boxed spike using a vendor-issued evaluation key before any license is purchased.

---

## 5. Crosswalk to existing tracking docs

| Tool | [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) | [`_MASTER_BOM.md`](./_MASTER_BOM.md) | Priority |
|---|---|---|---|
| `LieberLieber/setup-LemonTree.Automation@v6` | §1.11 Code Quality & Autonomous Review (added in this PR; 🗑️ Removed) | §🚀 CI/CD & Deployment Automation (added in this PR; P3 — skip) | **P3 — reject; revisit only if Revvel adopts Sparx EA modeling** |

---

## Appendix — How this tool was identified

The triggering issue pasted a single GitHub Actions step (`uses: LieberLieber/setup-LemonTree.Automation@v6`) with no surrounding context, no link to a target repo, and no explanation of what the requester intended to do with it. Per the [Jules EVALUATE template](../.github/ISSUE_TEMPLATE/) the request was to deep-research scope before writing anything; that research is captured above.

If a different "LemonTree" was intended (any unrelated same-named package or internal tool — none of which is referenced anywhere in this repo), re-open the source issue with the correct URL and this document will be replaced rather than amended — the conclusions above apply only to LieberLieber's product.

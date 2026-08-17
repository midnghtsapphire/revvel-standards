# API CraftPro — Evaluation

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluated — deferred (P3); tracked as 🟡 Research Topic for prototype-only use
**Date:** April 20, 2026
**Scope:** Evaluate [API CraftPro](https://github.com/marketplace/api-craftpro) for permanent functionality in the Revvel ecosystem.
**Related:** [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) · [`_MASTER_BOM.md`](./_MASTER_BOM.md) · [`STARRED_REPOS_EVAL_2026-04-20.md`](./STARRED_REPOS_EVAL_2026-04-20.md)

---

## Summary

| Tool | Tagline | Fit | Recommendation |
|---|---|---|---|
| [API CraftPro](https://github.com/marketplace/api-craftpro) | Auto-generates a full backend REST API (Go + Gin) from a SQL schema; pushes the generated repo to GitHub with tests, CI/CD, Docker, and a Postman collection. | ⭐⭐ Interesting for one-off prototyping, but the generated stack (Go + Gin) does not match Revvel's Node/TypeScript + Next.js + managed MySQL default stack. | **Defer (P3) — no permanent adoption.** Keep listed as a 🟡 Research Topic for ad-hoc prototype use only. |

Tracked in [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §1.11 and [`_MASTER_BOM.md`](./_MASTER_BOM.md) §🤖 AI Code Quality & Autonomy as 🟡 Research Topic. This document captures the reasoning behind that status.

---

## 1. API CraftPro — Auto-generate backend APIs from a SQL schema

**Marketplace listing:** <https://github.com/marketplace/api-craftpro>
**License:** Commercial SaaS (generated code ownership per vendor ToS — verify before any production use)
**Hosting:** Cloud SaaS (vendor-hosted); output is committed to the user's GitHub repo
**Pricing:** Free trial with a capped number of API generations; paid tiers beyond the trial (verify current tier pricing before adoption)

### What it does

- Ingests a user-supplied SQL schema (e.g., a MySQL/PostgreSQL dump) and auto-generates a full backend project:
  - **Language/framework:** Go with the [Gin](https://github.com/gin-gonic/gin) HTTP framework.
  - **Endpoints:** REST CRUD endpoints for every table in the schema.
  - **Auth:** JWT or PASETO authentication scaffolding.
  - **Tests:** Unit test scaffolding for the generated handlers.
  - **CI/CD:** A starter GitHub Actions workflow.
  - **Ops:** Dockerfile and a Postman collection matching the generated endpoints.
- **Delivery:** The generated project is pushed directly to a repository on the user's GitHub account via the GitHub App installation.
- **Inputs required:** A GitHub account (for the app install + repo push) and a SQL schema file.

### Why it showed up as a candidate

The triggering issue asked to "add API CraftPro to revvel-standards and evaluate it for permanent functionality." API CraftPro is a GitHub Marketplace app marketed as a way to save weeks of backend-API boilerplate, so it is a natural fit to evaluate against our existing pattern of hand-rolled Next.js API routes and manually authored Go services.

### Fit with Revvel stack

| Dimension | Assessment |
|---|---|
| Replaces | Nothing currently in production. Could in principle replace the **initial scaffold** of a new backend, but not the day-to-day maintenance workflow. |
| Complements | Could be used alongside `scripts/bootstrap-repo.sh` as an optional "generate-from-schema" path for greenfield prototypes. |
| Conflicts with | **Revvel default stack.** Most Revvel apps (GrowlingEyes, Neurooz, Soul2Bowl, The Alt Text, Universal SAR App) are Node/TypeScript + Next.js, not Go. Adopting a Go + Gin generator would introduce a second runtime, second dependency manager, and second testing toolchain to maintain. |
| Database coupling | Generates code against a single SQL schema. Our managed MySQL is shared across apps and evolves via migrations — re-running the generator would overwrite hand-written logic every time the schema changes. |
| Agent compatibility | The generated repo includes GitHub Actions, but the vendor workflow is not our [`RecurseML` + Copilot coding-agent pipeline](./_MASTER_INVENTORY.md) (§1.11 Code Quality & Autonomous Review). We would need to reconcile the two or strip the generated workflow. |
| Security / secret handling | SaaS receives the user's SQL schema (potentially sensitive column names / business logic) and installs a GitHub App with write access to repos. Must be reviewed against [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) before any production use. |
| Cost | Free trial covers evaluation; paid tier required for ongoing use (verify current pricing at adoption time). |

### Risks / Unknowns

- **Stack mismatch.** Our defaults are Node/TypeScript on DigitalOcean droplets; API CraftPro emits Go + Gin. Adopting it permanently would create a second production runtime per [`_MASTER_BOM.md`](./_MASTER_BOM.md) and [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) to monitor, patch, and secure.
- **Generator lock-in.** Re-running the generator after schema changes typically overwrites handler code. Any non-trivial hand-edits to generated handlers would be lost, pushing teams to either (a) never edit generated code or (b) abandon the generator after the first schema drift.
- **Schema exposure.** The schema (and any embedded business rules or PII-shaped column names) is uploaded to a third-party SaaS. Needs a vendor security review before any real Revvel schema is sent.
- **GitHub App scope.** The marketplace app requests repo-write access. We should review exact scopes requested and confirm they match the principle of least privilege before installing on the MIDNGHTSAPPHIRE org.
- **License of generated code.** Verify that the vendor grants full ownership of the generated code with no ongoing license obligations before any code lands in a Revvel production repo.
- **Overlap with Copilot coding agent.** The Copilot Coding Agent (already P0 in [`_MASTER_BOM.md`](./_MASTER_BOM.md) §🤖 AI Code Quality & Autonomy) can scaffold API handlers from prompts + schema documents on demand, inside a repo that already follows Revvel conventions. API CraftPro's value-add over "Copilot + a scaffold prompt" is unproven.

### Recommendation

**Defer (P3) — no permanent adoption.** Keep on the watch list as a 🟡 Research Topic for **ad-hoc prototype use only** (e.g., a throwaway Go microservice for a spike), never as the default backend-scaffold path.

**Revisit when:**

- A Revvel project specifically requires a Go + Gin backend (none today), **and**
- The vendor publishes (a) a clear license for generated code, (b) a documented data-handling policy for uploaded schemas, and (c) a GitHub App scope list that fits least-privilege, **and**
- A side-by-side spike shows meaningful time savings vs. "Copilot Coding Agent + Revvel's existing Node/TypeScript scaffold in `scripts/bootstrap-repo.sh`".

### Next steps (only if the deferred decision is revisited)

1. Independent security review: confirm GitHub App scopes, schema-data retention, and license of generated code.
2. Run a time-boxed spike: generate one throwaway Go + Gin service from a sanitized sample schema and compare the output to an equivalent scaffold produced by the Copilot Coding Agent.
3. If adopted for prototypes only, document the "prototype-only" boundary in [`scripts/bootstrap-repo.sh`](../scripts/bootstrap-repo.sh) and update [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §1.11 status from 🟡 → 🧪 Trial Active.

---

## 2. Crosswalk to existing tracking docs

| Tool | `_MASTER_INVENTORY.md` | `_MASTER_BOM.md` | Priority |
|---|---|---|---|
| API CraftPro | §1.11 Code Quality & Autonomous Review (added in this PR) | 🤖 AI Code Quality & Autonomy (added in this PR) | **P3 — defer; prototype-only if ever used** |

---

## Appendix — How this tool was identified

The triggering issue named "API CraftPro" directly. The listing was located on GitHub Marketplace (<https://github.com/marketplace/api-craftpro>) and cross-referenced against the vendor's public description. If a different "CraftPro"-named tool was intended, re-open the source issue with the correct URL and this document will be updated.

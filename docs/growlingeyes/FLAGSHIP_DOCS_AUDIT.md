# Flagship Docs Audit — GrowlingEyes ↔ `revvel-standards`

**Version:** 1.0.0
**Date:** April 19, 2026
**Status:** Audit / Checklist (no file copies performed yet — awaiting owner sign-off)
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)
**Companion to:** [`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](../revvel-standards/TEST_HARNESS_RESEARCH.md)

---

## 1. Why this document exists

The `midnghtsapphire/growlingeyes` repository predates `midnghtsapphire/revvel-standards`. Several **flagship documents** were authored in `growlingeyes` first and were never mirrored or lifted into the standards repo. As a result, the `docs/growlingeyes/` folder here is thinner than its sibling project folders (compare to `docs/Soul2Bowl/`, which has the full flagship set).

This audit:

1. Enumerates what a *complete* flagship folder looks like, using `Soul2Bowl/` as the reference.
2. Lists what `docs/growlingeyes/` currently contains.
3. Flags the gap so the missing docs can be copied over and adapted (with brand/path rewrites) in follow-up PRs.

It is **documentation only** — no files are moved, copied, or rewritten by this PR. That requires owner review and (likely) access to the `growlingeyes` source repo which may contain private branding information.

---

## 2. Reference flagship set (from `docs/Soul2Bowl/`)

Treat this as the canonical "complete" shape for any Revvel product folder inside `revvel-standards/docs/<project>/`:

| # | Document | Purpose |
|---|---|---|
| 1 | `README.md` | Landing page + pointers to every other doc in the folder |
| 2 | `BLUEPRINT.md` | Architecture, stack, and top-level system design |
| 3 | `ROADMAP.md` | Quarter-by-quarter feature/sprint roadmap |
| 4 | `BOM.md` | Bill of Materials — services, costs, status |
| 5 | `BRAND.md` | Brand voice, colors, typography, logo rules |
| 6 | `DATA_MODEL.md` | Tables, fields, relationships |
| 7 | `API_SPEC.md` | REST/tRPC/GraphQL endpoint contracts |
| 8 | `ADMIN_PANEL_SPEC.md` | Admin UI pages, permissions, workflows |
| 9 | `ENV_EXAMPLE.md` | Documented `.env` variables |
| 10 | `DARE_LOG.md` | Decisions / Assumptions / Risks / Escalations |
| 11 | `RAID_LOG.md` | Risks / Actions / Issues / Dependencies |
| 12 | `SEO_STRATEGY.md` | SEO plan, keywords, metadata |
| 13 | `SPRINT_LOG.md` | Sprint history index |

---

## 3. Current state of `docs/growlingeyes/`

| # | Document | Present? | File |
|---|---|---|---|
| 1 | `README.md` | ❌ Missing | — |
| 2 | `BLUEPRINT.md` | ❌ Missing | — |
| 3 | `ROADMAP.md` | ❌ Missing | — |
| 4 | `BOM.md` | ✅ Present | [`BOM.md`](./BOM.md) |
| 5 | `BRAND.md` | ✅ Present | [`BRAND.md`](./BRAND.md) |
| 6 | `DATA_MODEL.md` | ❌ Missing | — |
| 7 | `API_SPEC.md` | ❌ Missing | — |
| 8 | `ADMIN_PANEL_SPEC.md` | ❌ Missing | — |
| 9 | `ENV_EXAMPLE.md` | ❌ Missing | — |
| 10 | `DARE_LOG.md` | ❌ Missing | — |
| 11 | `RAID_LOG.md` | ❌ Missing | — |
| 12 | `SEO_STRATEGY.md` | ❌ Missing | — |
| 13 | `SPRINT_LOG.md` | ✅ Present | [`SPRINT_LOG.md`](./SPRINT_LOG.md) |

> **Note:** The top-level `docs/` folder *does* contain related GrowlingEyes documents that are not duplicated inside `docs/growlingeyes/`:
> - [`docs/GROWLINGEYES_MASTER_SPEC.md`](../GROWLINGEYES_MASTER_SPEC.md) — partial SSOT (branding + CI/CD + precog QA)
> - [`docs/SPRINT_2026_04_GROWLINGEYES.md`](../SPRINT_2026_04_GROWLINGEYES.md) — active sprint
>
> These should be **linked from** the new `docs/growlingeyes/README.md` (when it is created) rather than moved, so the SSOT stays at the top level.

---

## 4. Copy-over checklist

Each checkbox is a **single, small PR** that:

1. Copies the document from the source `growlingeyes` repo into `docs/growlingeyes/<FILE>`.
2. Rewrites any paths that referenced the old repo root (e.g., `./docs/` → `../growlingeyes/`).
3. Replaces any project-private branding that does not belong in a public standards repo.
4. Adds a link from the new `docs/growlingeyes/README.md` index.
5. Adds an entry to `docs/_MASTER_INVENTORY.md` if the file is new to the standards repo.

- [ ] `docs/growlingeyes/README.md` — Landing page indexing every GrowlingEyes doc in this folder plus linking `GROWLINGEYES_MASTER_SPEC.md`, `SPRINT_2026_04_GROWLINGEYES.md`, and the `growlingeyes` entry in `BOM.md`.
- [ ] `docs/growlingeyes/BLUEPRINT.md` — Architecture / stack diagram. Source: likely `growlingeyes/docs/BLUEPRINT.md` or reconstructable from `GROWLINGEYES_MASTER_SPEC.md` §2–3.
- [ ] `docs/growlingeyes/ROADMAP.md` — Quarter roadmap. Source: likely `growlingeyes/ROADMAP.md`.
- [ ] `docs/growlingeyes/DATA_MODEL.md` — Tables/fields. Source: `growlingeyes/server/_core/db/schema.ts` (derive a markdown doc from the schema).
- [ ] `docs/growlingeyes/API_SPEC.md` — REST/tRPC endpoints. Source: `growlingeyes/server/_core/routes/*`.
- [ ] `docs/growlingeyes/ADMIN_PANEL_SPEC.md` — Admin UI. Source: `growlingeyes/client/src/admin/*` + any existing admin spec.
- [ ] `docs/growlingeyes/ENV_EXAMPLE.md` — Env var documentation. Source: `growlingeyes/.env.example` plus commentary.
- [ ] `docs/growlingeyes/DARE_LOG.md` — Decisions/Assumptions/Risks/Escalations. Source: likely `growlingeyes/docs/DARE_LOG.md` if present; otherwise new.
- [ ] `docs/growlingeyes/RAID_LOG.md` — Risks/Actions/Issues/Dependencies. Same provenance as DARE.
- [ ] `docs/growlingeyes/SEO_STRATEGY.md` — SEO plan. Source: `growlingeyes/docs/SEO_STRATEGY.md` if present, otherwise derive from `seo-metadata` skill.

---

## 5. Do NOT copy

These items live in `growlingeyes` but should **not** be mirrored into this public standards repo:

- Secret/env files containing real credentials (`.env`, `*.pem`, SSH keys, `~/.ssh/growlingeyes_deploy`).
- Customer PII, moderation logs, or anything from the OSINT pipeline that identifies individuals.
- Paid-vendor contracts / invoices that are not redacted.
- Any document explicitly labeled `INTERNAL — DO NOT DISTRIBUTE` in `growlingeyes`.

If any of the 10 checklist items above contain the above, they must be **redacted** before copy, not copied verbatim.

---

## 6. How to do each copy-over PR

1. Clone `growlingeyes` locally.
2. Identify the source file (search `growlingeyes/docs/`, `growlingeyes/README*.md`, in that order).
3. Copy into `revvel-standards/docs/growlingeyes/<NAME>.md`.
4. Run the self-eval skill on the new file: `openclaw run-skill openclaw-self-eval` (drift audit will flag the new file).
5. Run the test harness (once [`TEST_HARNESS_RESEARCH.md`](../revvel-standards/TEST_HARNESS_RESEARCH.md) PRs land): `npm test`.
6. Update `docs/_MASTER_INVENTORY.md` if this is a brand-new doc in the standards repo.
7. Open the PR with the title `docs(growlingeyes): copy <FILE> from growlingeyes flagship`.

Each copy-over is a **≤ 1 file** PR so review stays fast and the blast radius stays small.

---

## 7. Open questions

1. Is there a `growlingeyes/docs/` folder in the source repo, or are the flagship docs at the root? (Affects where we look in step 6.2 above.)
2. Should the copy-over preserve the source doc's version history (via `git log --follow` + a note at the top of each file), or is a `Source:` header enough?
3. Does `GROWLINGEYES_MASTER_SPEC.md` (already in this repo) supersede any of the 10 docs above? If so, we can skip those rows and just link into the master spec.

These questions are left for the owner (Audrey Evans) to answer before the first copy-over PR.

---

## 8. Related

- [`docs/growlingeyes/BOM.md`](./BOM.md)
- [`docs/growlingeyes/BRAND.md`](./BRAND.md)
- [`docs/growlingeyes/SPRINT_LOG.md`](./SPRINT_LOG.md)
- [`docs/GROWLINGEYES_MASTER_SPEC.md`](../GROWLINGEYES_MASTER_SPEC.md)
- [`docs/SPRINT_2026_04_GROWLINGEYES.md`](../SPRINT_2026_04_GROWLINGEYES.md)
- [`docs/Soul2Bowl/`](../Soul2Bowl/) — reference flagship folder shape

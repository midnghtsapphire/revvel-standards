# Proposal — Extract `fieldwork/` to Its Own Repo + PDF-With-Code Product Strategy

**Status:** ✅ Approved (2026-06-13) — execute via [`docs/FIELDWORK_EXTRACTION_RUNBOOK.md`](../../FIELDWORK_EXTRACTION_RUNBOOK.md)
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE) / Freedom Angel Corp
**Author (draft):** automation agent, drafted on behalf of Jules
**Date:** 2026-04-24
**Issue:** *[Jules] Fieldwork is residing off the main directory in revvel-standards needs to have its own repository*
**Related skills:** `skills/mvi-contract`, `skills/system-state`, `skills/wrap-up`, `skills/seo-metadata`

> **Why this document exists.** The issue is two requests tangled together:
> (1) move `fieldwork/` out of `revvel-standards` into its own repository, and
> (2) research how to sell PDFs-with-code ($29 single / 10 for $99 — is that
> fair?), including landing-page and one-repo-vs-many strategy.
> Per the issue body, Jules was asked to "post [a proposal] as the first
> comment on this issue" and "wait for Audrey's 👍 before implementing."
> This document is that proposal, committed to the repo so it is reviewable.

---

## 1. Plain-language ask → clear problem statement

**Audrey's words (paraphrased from the issue):**
> "I will be creating PDFs with code in them to sell on various places. I need
> that researched? Fieldwork is sitting in the main directory of
> `revvel-standards` and I don't know why. Should each PDF-product be its own
> repo? Do I need a landing page? I want to sell 1 for $29 and 10 for $99 —
> is that fair?"

**Rewritten problem statement:**

`fieldwork/` currently lives as a top-level directory inside the
`midnghtsapphire/revvel-standards` repository. `revvel-standards` is the
*standards/skills/templates* mono-repo for the org; `fieldwork` is a
**product** (landing page + future Next.js app + planned PDF guides) aimed at
architects and contractors. Co-locating a product with the standards repo:

1. Pollutes `revvel-standards`' scope ("standards for everyone" vs. "one
   product's source").
2. Blocks `fieldwork` from having its own CI, deploy target
   (`fieldwork.oaudrey.com`), issue tracker, license, and versioning.
3. Makes the existing cross-repo docs lie — `docs/GITKRAKEN_INTEGRATION.md`
   already lists a "fieldwork-family" workspace and references `fieldwork` as
   a sibling repo, but it isn't one yet.

Separately, Audrey wants to sell PDFs-with-code. There is no standard in the
org for how those are packaged, priced, licensed, or delivered.

**This proposal covers both, because the decision on "one repo per PDF vs.
one shared repo" determines the layout we need, and `fieldwork`'s
extraction is the first test of that standard.**

---

## 2. Deep-research findings

### 2.1 Mono-repo vs. multi-repo for digital-PDF products

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **One repo per PDF product** | Clean ownership, separate licenses, each product gets its own landing page + analytics, can be sold/transferred/open-sourced individually | N× CI setup, cross-product shared assets (brand, legal boilerplate) drift | Overkill for <10 titles |
| **Single `pdf-products` repo, one folder per title** (recommended) | One CI, shared brand/legal/build chain, easy bulk discounts ("10 for $99"), single checkout landing page | Customers can't fork/own one title's source (fine — sources aren't the deliverable; the PDF is) | ✅ Recommended baseline |
| **Hybrid** — `pdf-products` monorepo for the PDF catalogue + separate repos for *apps* like `fieldwork` (which is a SaaS, not a PDF) | Matches how Audrey actually thinks about them | Two conventions | ✅ Final recommendation |

**Recommendation:** treat `fieldwork` as what it actually is — a **SaaS
product with a landing page**, not a PDF — and give it its own repo. Create a
separate `pdf-products` monorepo for the PDF catalogue when the first title
is ready to ship. Do not conflate the two.

### 2.2 Pricing research — is "$29 single / $99 for 10" fair

Market comparables for PDF-with-code products aimed at working professionals
(pragmatic, not reference-book scope):

| Product | Format | Price | Notes |
|---|---|---|---|
| Refactoring UI (Adam Wathan / Steve Schoger) | PDF + code assets | $99 basic / $149 pro | Benchmark for "designer-quality" PDF |
| The Pragmatic Bookshelf single titles | PDF + epub + code | $24–$39 | Per-title mass-market |
| Wes Bos courses/ebooks | PDF + video + code | $39–$99 | Single-author indie |
| A Book Apart | PDF | $11–$15 single, bundles $45–$90 | Short-form specialist |
| Leanpub minimum suggested | PDF | $9.99 (author-set) | Baseline |
| Gumroad indie ebooks (median) | PDF | $15–$35 | Median floor/ceiling |

**Analysis of Audrey's proposed pricing:**

- **$29/single** — sits comfortably in the indie-professional band
  (Pragmatic, Gumroad median, A Book Apart bundle). Fair and defensible.
- **$99 for 10 titles** — this implies **$9.90/title**, which is below every
  comparable above. That's fine as a **launch/bundle anchor** (creates a
  strong "10× value" story), but it will cannibalize single sales unless the
  bundle is positioned as a *completionist / library* offer, not the default.

**Recommended pricing structure:**

| SKU | Price | Rationale |
|---|---|---|
| Single title | **$29** | Anchor price; matches Pragmatic single-title band |
| 3-title bundle | **$69** | ~20% discount; impulse upsell at checkout |
| 10-title library ("Full Vault") | **$149** | Keeps per-title >$14.90; $99 leaves too much on the table once there actually *are* 10 titles |
| Launch promo (first 30 days) | **$99 for 10** | Keep Audrey's original as a time-boxed launch price — great for marketing copy, terrible as a permanent SKU |

If Audrey prefers to stick with $99/10 permanently, it's still within
market — just note the per-title floor becomes $9.90 and the pricing page
should foreground the bundle to avoid anchoring customers to $9.90/title.

### 2.3 Landing-page strategy

Three realistic delivery paths, in order of time-to-first-dollar:

1. **Gumroad or Lemon Squeezy** hosted checkout — *no landing page needed to
   start.* Upload PDF, set price, take money same day. Lemon Squeezy is
   merchant-of-record (handles EU VAT / US sales tax) — strongly preferred
   once revenue is non-trivial.
2. **Static landing page on `*.oaudrey.com`** that embeds Lemon Squeezy
   checkout. This is the `fieldwork` model already sketched in
   `fieldwork/index.html`. Gives Audrey full brand control; payment still
   handled by LS.
3. **Full Next.js storefront** — only worth building once there are ≥5
   titles *or* Audrey wants subscription/library pricing. Not v1.

**Recommendation for the PDF catalogue:** start with **path 2** (static page
on `pdf.oaudrey.com` or similar) + Lemon Squeezy checkout embed. Defer path 3
until proven demand.

**Recommendation for `fieldwork` specifically:** it already has a static
landing page; keep it on `fieldwork.oaudrey.com` in line with the live-test
subdomain standard in `docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`
and the `fieldwork` references in `oaudrey/README.md`. This proposal does
**not** change `fieldwork`'s product plan — only its repository location.

---

## 3. MVI Contract — `fieldwork` repo extraction

### Section 1 — Context check

- `fieldwork/` lives at the top level of `revvel-standards` (68K, 7 files
  total: 5 at the top level plus 2 under `fieldwork/docs/`).
- The human-maintained Markdown cross-references expected to need updating
  during extraction are `oaudrey/README.md` and
  `docs/GITKRAKEN_INTEGRATION.md`.
- No CI is currently scoped to `fieldwork/` — extraction will not break
  existing workflows in `revvel-standards`.
- `fieldwork/LICENSE` contains an all-rights-reserved copyright notice for
  Audrey Evans / Freedom Angel Corp and must travel with the code.

### Section 2 — Feature definition

> As the owner of MIDNGHTSAPPHIRE, I can treat `fieldwork` as a standalone
> repository (`midnghtsapphire/fieldwork`) with its own issues, CI, and
> deploy pipeline, so that it stops polluting the standards repo and matches
> the conventions already documented in `docs/GITKRAKEN_INTEGRATION.md`.

### Section 3 — Dependency map

- **New repo required:** `midnghtsapphire/fieldwork` (must be created by
  Audrey or an admin — automation cannot create org repos from this
  sandbox).
- **No database / API / env-var changes** in `revvel-standards`.
- **Cross-ref updates** in two Markdown files after the new repo exists.

### Section 4 — Acceptance gates

- [ ] New repo `midnghtsapphire/fieldwork` exists and contains the full
      `fieldwork/` tree with **commit history preserved** (via
      `git subtree split` or `git filter-repo --subdirectory-filter
      fieldwork/`).
- [ ] The new repo's default branch builds / serves the landing page
      (`python3 -m http.server 8080` smoke-test passes).
- [ ] `revvel-standards` no longer contains the `fieldwork/` source tree at
      the top level, aside from an optional minimal redirect stub such as
      `fieldwork/README.md`.
- [ ] `oaudrey/README.md` links now point to
      `https://github.com/midnghtsapphire/fieldwork` instead of relative
      `../fieldwork/README.md`.
- [ ] `docs/GITKRAKEN_INTEGRATION.md` "fieldwork-family" workspace entry
      references the extracted repo.
- [ ] `CHANGELOG.md` of `revvel-standards` records the extraction.
- [ ] Audrey has chosen one transition path: either leave a one-file
      `fieldwork/README.md` redirect stub in `revvel-standards` for 1 release
      cycle, or remove the directory cleanly immediately.

### Section 5 — Out of scope

- Changing `fieldwork`'s product plan, pricing, or tech stack.
- Migrating to Next.js (still on the `fieldwork` side's roadmap).
- Setting up Lemon Squeezy / Gumroad (tracked under the PDF-products
  proposal, not this extraction).
- Creating the `pdf-products` monorepo (separate MVI, after `fieldwork`
  extraction lands).

### Section 6 — Files to touch (follow-up implementation PR)

**In the source repo (`revvel-standards`):**
- *Delete* `fieldwork/` (or replace with a ~10-line redirect `README.md`).
- *Modify* `oaudrey/README.md` — update 1 relative link.
- *Modify* `docs/GITKRAKEN_INTEGRATION.md` — update 2 references.
- *Modify* `CHANGELOG.md` — add extraction entry.
- *Add* `scripts/extract-fieldwork.sh` (optional, one-shot) — documents the
  exact `git filter-repo` command used; delete after use.

**In the new repo (`midnghtsapphire/fieldwork`):**
- Everything currently under `revvel-standards/fieldwork/`, with history.
- *Add* `.github/workflows/pages.yml` (or equivalent) to deploy the static
  landing page to `fieldwork.oaudrey.com`.
- *Symlink* `AGENTS.md` ↔ `CLAUDE.md` per the repo convention documented in
  `docs/AGENTS.md`; handle any `GEMINI.md` alias separately if that
  convention is added later.

### Section 7 — Rollback plan

1. `git revert` the extraction commit in `revvel-standards` — restores
   `fieldwork/` in place.
2. Archive (don't delete) `midnghtsapphire/fieldwork` if the new repo was
   created but needs to be pulled back.
3. Revert the two cross-reference commits.

**Rollback risk:** low. No database migrations, no deployed consumers of
`revvel-standards/fieldwork/` other than two doc links.

---

## 4. Proposed follow-up sessions (after 👍)

1. **Session A — "Extract fieldwork"** (this MVI, ~1 hour)
   Execute Section 6 above. One PR to `revvel-standards`, one initial push
   to the new `midnghtsapphire/fieldwork`.
2. **Session B — "Stand up `pdf-products` monorepo"** (~1 hour)
   New repo `midnghtsapphire/pdf-products`; scaffold
   `titles/<slug>/{manuscript.md, code/, cover/, LICENSE, README.md}`
   structure; CI that builds PDFs with Pandoc/Typst; Lemon Squeezy
   integration doc.
3. **Session C — "First PDF title ships"** (~2 hours)
   Pick Audrey's first title, populate `titles/<slug>/`, publish v0.1 PDF,
   list on Lemon Squeezy at **$29 single**, with a time-boxed launch bundle
   **"$99 for 10" banner**.

---

## 5. Open questions for Audrey (need 👍 / answers before Session A)

1. **New repo visibility:** public or private? (Default recommendation:
   public — the landing page is already public-facing HTML.)
2. **Redirect stub vs. hard delete** of `revvel-standards/fieldwork/`?
   (Default: keep a ~10-line redirect stub for one release cycle.)
3. **Pricing lock-in:** go with "$29 / $69 / $149 + launch promo" *or* stick
   with "$29 / $99 for 10" as permanent SKUs?
4. **First PDF title** — name + rough outline, so Session C has something
   concrete to ship.
5. Confirm Lemon Squeezy as merchant-of-record (vs. Gumroad) for v1.

Once Audrey replies with 👍 + answers to 1 and 2, Session A can execute
immediately. Pricing and first-title answers can come later — they don't
block the extraction.

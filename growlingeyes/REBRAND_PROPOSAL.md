# Rebrand Proposal — GrowlingEyes

> **Status:** 🟡 Awaiting decision from @midnghtsapphire (Audrey)
> **Source issue:** "[Jules] Rebrand growling eyes"
> **Skill applied:** `skills/mvi-contract/SKILL.md`
> **Last updated:** 2026-04-24

This document is the deep-research output the source issue asked for. **No file is being renamed by this PR.** The implementation MVI runs only after Audrey 👍s a chosen identity below.

---

## Section 1 — Context Check

- **Current identity** (from `docs/growlingeyes/BRAND.md` and `docs/GROWLINGEYES_MASTER_SPEC.md`):
  - Name: **GrowlingEyes**
  - Tagline: *"The more we find out, the more our eyes narrow into a digital growl"*
  - Sub-tagline (master spec): *"Neighborhood Watch From Your Livingroom"*
  - Domain: `growlingeyes.com` (registered at Namecheap)
  - Parent: Freedom Angel Corp (EIN 86-1209156) — motto *"We believe you."*
  - Palette: teal `#0D9488` · red `#DC2626` · gold `#F59E0B` · off-white `#F8FAFC`
  - Emblem: frosted teal dome, human iris core, defensive fangs, gold "truth crystal"
- **Production state we cannot break:**
  - DigitalOcean droplet at `growlingeyes.com`, app dir `/var/www/growlingeyes/`
  - PM2 process name `growlingeyes`
  - GitHub repo `midnghtsapphire/growlingeyes` (separate from this repo)
  - SSH key `~/.ssh/growlingeyes_deploy`
  - Vault path `secret/data/growlingeyes/...`
  - Dark Web Listener PM2 worker references the brand string
- **What the issue actually asks** (paraphrased from screenshots + body):
  > "Rebrand growling eyes — every page and sub-page. I do like the wolf or similar for the growling eyes / eye growling. The eyes can be a hero gleaming through a similar background."
- **Triviality check (per `docs/AGENTS.md` issue protocol):** ❌ **Not trivial.**
  - 50 files in *this* repo reference the brand string (see §6).
  - A separate app repo (`midnghtsapphire/growlingeyes`) holds every page from the screenshots and is out of scope for this PR.
  - Domain, deploy paths, PM2 name, vault paths cascade to ops work.
  - The new identity is **not yet defined** — the brief is exploratory.
- **Conclusion:** Per the issue's own instruction — *"Wait for Audrey's 👍 before implementing, unless the change is clearly trivial"* — implementation is gated on this proposal's approval.

---

## Section 2 — Problem Statement

GrowlingEyes' current visual identity (frosted-teal dome + human iris + fangs) reads as a generic "OSINT dashboard" emblem. Audrey wants the brand to lean into the **growl** — a wolf-forward mark — while preserving the **eyes-as-hero** motif: the eyes should *gleam through* the same dark/gold cinematic background already used on the dashboard hero.

**One-sentence feature:** *Replace the GrowlingEyes brand identity (name decision, mark, palette tokens, tagline, emblem spec, web manifest, all docs/specs/templates that reference the brand, and every page in the sister app repo) with an Audrey-approved "wolf + gleaming eyes" identity, with no production downtime and a documented rollback.*

**User story:** *As Audrey, I can land on any GrowlingEyes surface (homepage, sub-pages, favicon, OG share, README, internal docs) and see one consistent wolf-eyes brand, so that the product reads as the cinematic threat-intel platform I pitched, not as generic stock OSINT.*

---

## Section 3 — Decision Inputs (the things Audrey needs to 👍)

The implementation MVI cannot start until these five inputs are pinned. Reply on the issue with the chosen option for each, or amend.

### 3.1 — Name

| Option | Rationale | Cost |
|---|---|---|
| **A. Keep "GrowlingEyes"** — refresh visuals only | Domain, repo, droplet, PM2, vault stay. Lowest blast radius. | Low — this repo + app repo only |
| **B. New name (e.g. "WolfEye", "DireWatch", "LupineIntel")** | Stronger wolf signal | High — new domain, repo rename, droplet path, PM2, vault, certs, OG, ads |
| **C. Keep word-mark, restyle the mark only** | Word "GrowlingEyes" stays, mascot becomes wolf-forward eyes | Low-medium |

> **Recommended default if Audrey doesn't pick:** **Option C** — least destructive, satisfies the screenshots (which still show "GROWLING EYES" type), addresses the "I like the wolf" steer.

### 3.2 — Mark direction

| Option | Description |
|---|---|
| **M1. Wolf head, frontal, eyes glowing gold through dark fur** | Direct read on "growling eyes" |
| **M2. Two gleaming wolf eyes only, in the dark/gold cinematic background** | Closest to "eyes can be a hero gleaming through a similar background" |
| **M3. Wolf silhouette in profile, eye is the focal hot-spot** | Editorial / cinematic |
| **M4. Hybrid: M2 as primary mark, M1 as secondary illustration** | Most flexible across favicon → hero |

> **Recommended default:** **M4** — gives a 16×16-legible favicon (M2 simplified to two glowing dots) and a hero-scale illustration (M1).

### 3.3 — Palette

Current palette (teal/red/gold/off-white) is bright; the actual hero screenshots are **dark + gold + brass**. Proposed reconciliation:

| Token | Current | Proposed |
|---|---|---|
| `--ge-bg` | `#F8FAFC` | `#0A0A0B` (near-black) |
| `--ge-surface` | `#0D9488` (teal) | `#161616` |
| `--ge-primary` | `#0D9488` (teal) | `#D4A24C` (brass-gold) |
| `--ge-accent` | `#F59E0B` (amber) | `#F5C76A` (eye-gleam gold) |
| `--ge-danger` | `#DC2626` | `#DC2626` *(keep)* |
| `--ge-ink` | n/a | `#F8FAFC` |

> Confirm or amend. Accessibility check (WCAG AA on body text) is part of the implementation MVI per `skills/accessibility/SKILL.md`.

### 3.4 — Tagline

| Option |
|---|
| **T1.** *"The more we find out, the more our eyes narrow into a digital growl."* (current) |
| **T2.** *"The wolf is watching."* |
| **T3.** *"Truth has teeth."* |
| **T4.** *"We see in the dark."* |

### 3.5 — Scope of "every page and sub-page

Confirm: *"Every page" = every route in `midnghtsapphire/growlingeyes` (the app) **plus** every doc surface in this repo (`midnghtsapphire/revvel-standards`).* Anything else (e.g. Odoo customer portal, Manus pipeline UI) is **out of scope** unless explicitly added.

---

## Section 4 — Acceptance Gates (for the implementation MVI, not this PR)

```text
[ ] Audrey approves §3.1–§3.5 on the issue thread (👍 + reply)
[ ] All 50 files in this repo updated to the approved identity (see §6)
[ ] templates/brand/REVVEL_EMBLEM_STANDARD.md re-derives the new emblem
[ ] docs/growlingeyes/BRAND.md is the canonical brand sheet, palette tokens defined
[ ] Companion PR opened in midnghtsapphire/growlingeyes that:
      [ ] swaps emblem assets (favicon set, PWA icons, apple-touch, OG image)
      [ ] updates web manifest (name, short_name, theme_color, background_color)
      [ ] updates every page route (home, about, contact, data-reporting, resources, dashboard, sub-pages)
      [ ] keeps the "GROWLING EYES" word-mark per §3.1 decision (or replaces, if B)
      [ ] passes pnpm check, pnpm test, pnpm test:e2e
      [ ] Lighthouse a11y ≥ 95 on home and one sub-page
[ ] If §3.1 = Option B (new name): repo rename, domain DNS, droplet path, PM2 name,
    vault path, SSH key file, deploy.yml + monitor.yml, all updated AND documented
    in docs/growlingeyes/REBRAND_RUNBOOK.md before cut-over
[ ] docs/SPRINT_STATE.md updated; CHANGELOG.md entry added
[ ] Live verification: https://growlingeyes.com (or new domain) returns 200 with new brand
```

---

## Section 5 — Out of Scope (explicit)

- **Any rename in this PR.** This PR is the proposal only.
- The `neurooz/`, `nemoclaw-*`, `penny-sovereign-yield-scout/`, `agent-factory/`, `oaudrey/`, `wr/` projects — they may *mention* GrowlingEyes for context, but their own identities are untouched.
- Marketing copy beyond tagline and hero subtitle.
- New product features. This is rebrand-only.
- Domain transfer to a different registrar.
- Trademark filing.

---

## Section 6 — Files to Touch (when implementation runs)

### 6.1 — In `midnghtsapphire/revvel-standards` (this repo) — **50 files**

#### Canonical brand sources (rewrite, not search/replace)
- `docs/growlingeyes/BRAND.md`
- `docs/GROWLINGEYES_MASTER_SPEC.md`
- `templates/agent-handoff/GROWLINGEYES_BUILD_SPEC.md`
- `templates/brand/REVVEL_EMBLEM_STANDARD.md`
- `README.md` (project list section)

#### Sprint / state / inventory (string-level updates)
- `docs/SPRINT_2026_04_GROWLINGEYES.md` *(rename file if §3.1 = B)*
- `docs/SPRINT_STATE.md`
- `docs/growlingeyes/SPRINT_LOG.md`
- `docs/growlingeyes/BOM.md`
- `docs/growlingeyes/FLAGSHIP_DOCS_AUDIT.md`
- `docs/_MASTER_INVENTORY.md`
- `docs/_MASTER_BOM.md`
- `docs/DATA_DICTIONARY.md`
- `inventory/ideas-found.md`
- `CHANGELOG.md` *(add rebrand entry)*

#### Master inventory / standards (cross-references)
- `docs/Master_Inventory/AUTOMATED_AUDIT_AGENT_STANDARD.md`
- `docs/Master_Inventory/INFRASTRUCTURE_MAP.md`
- `docs/Master_Inventory/ODOO_INTEGRATION_STANDARD.md`
- `docs/Master_Inventory/OSINT_STANDARD.md`
- `docs/Master_Inventory/TESTING_STANDARD.md`
- `docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`
- `docs/Master_Inventory/VAULT_AGENT_STANDARD.md`
- `docs/REVVEL_MASTER_STANDARDS.md`
- `docs/Universal-BOM_List/API_REGISTRY_BOM.md`
- `docs/Universal-BOM_List/FOLDER_STRUCTURE_RECOMMENDATIONS.md`
- `standards/ERROR_REPORTING_STANDARD.md`

#### Eval / pipeline / integration docs
- `docs/API_CRAFTPRO_EVAL_2026-04-20.md`
- `docs/STARRED_REPOS_EVAL_2026-04-20.md`
- `docs/GITHUB_PROJECTS_SETUP.md`
- `docs/GITKRAKEN_INTEGRATION.md`
- `docs/MANUS_DEVELOPMENT_PIPELINE.md`
- `docs/WAYDEV_SETUP.md`
- `docs/nemoclaw-research.md`
- `docs/revvel-standards/HIVE_HARNESS_RESEARCH.md`
- `docs/workflow_evals/JULES_SYSTEM_EVALUATION.md`
- `docs/neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md`
- `docs/neurooz/NEUROOZ_DARE_LOG.md`

#### Templates (consumed by agent-handoff)
- `templates/agent-handoff/README.md`
- `templates/agent-handoff/SHIFT_TESTING_STANDARD.md`
- `templates/agent-handoff/TACTICAL_MAP_PARSING_STANDARD.md`
- `templates/agent-handoff/WOZ_METHOD_EXPLAINED.md`
- `templates/agent-handoff/WOZ_SYSTEM_PROMPT_TEMPLATE.md`
- `templates/cicd/README.md`
- `templates/cicd/deploy.yml` *(if §3.1 = B: rename PM2 process, deploy paths)*
- `templates/cicd/monitor.yml` *(if §3.1 = B)*
- `templates/testing/README.md`

#### Skills vault
- `skills/testing/SKILL.md`
- `skills/testing/testing.skill.yml`
- `skills/vault-agent/tests/promptfoo.yml`

#### Personal / brand surfaces
- `oaudrey/README.md`
- `oaudrey/index.html`

#### Folder rename (only if §3.1 = B)
- `docs/growlingeyes/` → `docs/<new-slug>/`

#### New file added by implementation MVI
- `docs/growlingeyes/REBRAND_RUNBOOK.md` — the cut-over runbook (DNS, droplet, PM2, vault, certs)

### 6.2 — In `midnghtsapphire/growlingeyes` (sister app repo, separate PR)

This PR cannot touch that repo. The implementation MVI will open a companion PR with at minimum:
- `public/` favicon set + PWA icons + apple-touch + maskable
- `public/og-image-1200x630.{png,jpg}`
- `public/manifest.webmanifest` (name, short_name, theme_color, background_color)
- Logo SVGs: `logo-full.svg`, `logo-mark.svg`, `logo-dark.svg`, `logo-light.svg`
- Tailwind/CSS theme tokens to match §3.3
- Hero component (the "GROWLING EYES" hero from the screenshots) — swap emblem + background
- Every route under `app/` or `pages/` for word-mark/header/footer consistency
- Web app `<title>`, meta description, `og:title`, `og:description`, `twitter:card`
- E2E test asserting the new word-mark renders on home + one sub-page

### 6.3 — Out of repo (ops, only if §3.1 = B — new name)
- Namecheap DNS for new domain
- Let's Encrypt cert renewal
- DigitalOcean droplet path rename or new droplet
- PM2 process rename
- HashiCorp Vault path move (`secret/data/growlingeyes/*` → `secret/data/<new-slug>/*`)
- SSH key filename
- Any GitHub Action secrets referencing the old name

---

## Section 7 — Tests to Add

- **In this repo:** add a doc-link smoke test in `tests/` (matching existing test infra) that greps the post-rebrand allow-list — i.e., asserts no remaining `GrowlingEyes` references *unless* §3.1 = A or C (which keep the word-mark). Skipped/inverted depending on the §3.1 choice.
- **In the app repo:** Playwright E2E asserting the home `<h1>`/hero word-mark and favicon hash, plus a snapshot of the wolf mark SVG.
- **Visual regression:** one Percy or `@playwright/test` screenshot baseline per top-level route.

---

## Section 8 — Rollback Plan

| Step | Command |
|---|---|
| 1. Revert this repo's rebrand commit | `git revert <sha> && push` |
| 2. Revert app repo's rebrand commit | same, in `midnghtsapphire/growlingeyes` |
| 3. (Only if §3.1 = B) Re-point DNS to old droplet | Namecheap UI |
| 4. (Only if §3.1 = B) Restore PM2 process name | `pm2 delete <new>; pm2 start growlingeyes` |
| 5. (Only if §3.1 = B) Restore vault path alias | `vault kv copy secret/<new>/ secret/growlingeyes/` |

**Rollback risk:** Low if §3.1 = A or C. **High** if §3.1 = B (involves DNS + ops surfaces).

---

## Section 9 — Sign-Off

```text
[ ] Audrey: name choice (A / B / C) → ____
[ ] Audrey: mark direction (M1 / M2 / M3 / M4) → ____
[ ] Audrey: palette accept / amend → ____
[ ] Audrey: tagline (T1 / T2 / T3 / T4 / custom) → ____
[ ] Audrey: scope confirmed per §3.5 → ____
[ ] Audrey 👍 to proceed with implementation MVI → ____
```

Once signed, the implementation MVI opens a follow-up PR (this repo) plus a companion PR in `midnghtsapphire/growlingeyes`, executes §6, runs §4's gates, and updates `docs/SPRINT_STATE.md` and `CHANGELOG.md`.

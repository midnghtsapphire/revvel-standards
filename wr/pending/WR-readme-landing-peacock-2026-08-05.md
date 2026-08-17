# [WR] Automate README → landing page (readme-peacock pattern)

## Description

**Problem:** README → marketing landing page is still a manual `pip install` / `peacock` / drag-to-Pages loop. That defeats automation-first (2+ years): landing generation must be **Actions-driven**, reviewable via WR/PR, human merge only.

**Pattern source:** third-party [readme-peacock](https://github.com/ZvanTors/readme-peacock) (Landing Page Generator Action — uncertified). We adopt the **pattern** (README → static HTML → Pages), not an unpinned black box as sole path.

**Desired outcome:**
1. Standard: `standards/README_LANDING_AUTOMATION.md`
2. Workflow: `.github/workflows/readme-landing.yml` (push main + dispatch)
3. Headless builder: `scripts/readme-landing-build.mjs` (deterministic HTML from README; no UI)
4. Optional: pin third-party peacock Action SHA if used as accelerator
5. Wire OG/release image packs from image SEO automation when publishing
6. Blueprint stubs for Gumloop/n8n/Zapier notify-on-publish

**Hard rules:**
- Agents open WR + draft PR
- **Humans merge only**
- Prefer Actions over chat/manual CLI
- Third-party Action = optional; pin commit SHA if enabled
- Secrets: none required for static Pages build

## Labels
`wr`, `human-review-required`, `priority:p2`, `automation`, `area:automation`

## Acceptance criteria
- [ ] `workflow_dispatch` builds `site/index.html` from `README.md` without local peacock CLI
- [ ] Pages deploy path documented (GitHub Pages source = Actions)
- [ ] `--repo` style quick links generated from `github.repository`
- [ ] Theme selectable: glass | dark (MIDNGHTSAPPHIRE tokens default)
- [ ] Failure opens WR issue labels
- [ ] Draft PR only; no auto-merge

## Human gate
Review draft PR. Enable Pages → Actions once. Thereafter: push README → auto landing.

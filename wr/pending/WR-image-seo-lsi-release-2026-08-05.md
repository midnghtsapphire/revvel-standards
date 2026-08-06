# [WR] Automate image SEO + LSI + release banners (no manual path).

## Description
Image creation / LSI / SEO / release banners must run through **Actions + blueprints + formal WR/PR**, not manual studio use.

**Draft PR:** `automation/image-seo-lsi-release-banner` (opened as draft — human merge only).

### Desired outcome
1. Land `standards/IMAGE_CREATION_SEO_AUTOMATION.md`
2. Headless builder `scripts/image-seo-build-pack.mjs`
3. Workflows: image-seo-pipeline, release-banner-social, image-seo-qa
4. Multi-surface blueprints under `workflows/blueprints/`
5. Connection secret **names** in `config/connections.image-automation.yml`

### Hard rules
- Agents create WR + code
- **Humans merge only**
- Prefer Actions over labels (AUTOMATION_FIRST_STACK)
- Studio UI is not the production control plane

### Labels
`wr`, `human-review-required`, `priority:p1`, `automation`

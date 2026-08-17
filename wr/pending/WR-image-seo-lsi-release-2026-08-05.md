# [WR] Automate image creation SEO + LSI + release banners (no manual path)

## Description

**Problem:** Image creation, LSI expansion, SEO packaging, and release social banners risk being executed as **manual studio clicks**. That defeats automation-first work (2+ years): processes must run via Actions / n8n / Make / Zapier / Gumloop and land as **WR → draft PR → human merge only**

**Desired outcome:** Land this pack so image SEO + LSI + release-banner posting is **fully automated** after human merge of this WR/PR:

1. Standard: `standards/IMAGE_CREATION_SEO_AUTOMATION.md`
2. Actions: image SEO pipeline (dispatch + schedule) + release banner social post + PR QA gate
3. Blueprints: multi-surface stubs under `workflows/blueprints/`
4. Connection registry rows for Discord / X secrets (**names only**)
5. Formal path: failures open WR; never auto-merge
6. Headless builder: `scripts/image-seo-build-pack.mjs` (no UI)

**Hard rules:**
- Agents write WR + code + docs
- **Humans merge only.**
- No API keys in blueprints
- Prefer Actions over labels (AUTOMATION_FIRST_STACK)
- Studio UI is **dev/debug only**, not the production control plane

## Labels
`wr`, `human-review-required`, `priority:p1`, `automation`, `area:automation`, `formal:auto-wr`

## Acceptance criteria
- [ ] `workflow_dispatch` / schedule builds image SEO packs without human clicking a UI
- [ ] Release event builds release_banner pack; Discord/X when secrets present
- [ ] LSI expansion is scripted (seed + co-occurrence + pins), not a form exercise
- [ ] QA gate fails check on blocker filename/alt patterns
- [ ] Draft-only PRs; `auto_merge: false` everywhere
- [ ] Connection registry lists secret **names** for Discord/X

## Implementation map
| Path | Role |
| --- | --- |
| `standards/IMAGE_CREATION_SEO_AUTOMATION.md` | SSOT process |
| `.github/workflows/image-seo-pipeline.yml` | Cron + dispatch automation |
| `.github/workflows/release-banner-social.yml` | Release → banner pack → social |
| `.github/workflows/image-seo-qa.yml` | PR image QA gate |
| `scripts/image-seo-build-pack.mjs` | Headless image_creation/v1 builder |
| `scripts/image-automation-auto-wr.mjs` | Re-emit this formal pack |
| `workflows/blueprints/*` | Gumloop/n8n/Zapier stubs |
| `config/connections.image-automation.yml` | Secret names |

## Human gate
Review this WR and the draft PR. Merge when checks green. **Do not require manual Image Studio use for production runs.**

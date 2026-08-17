# Image Creation + SEO Automation (Automation-First)

**Status:** ACTIVE · **Updated:** 2026-08-08
**Brand:** MIDNGHTSAPPHIRE
**Schema:** `midnghtsapphire.image_creation/v1`

## Hard rule

Image creation is **not** a manual attach-file or click-through studio ritual in production.

**Allowed human actions:** merge PRs, approve first-run social posts, rotate secrets.  
**Forbidden as the primary path:** hand-building alt/OG/prompts in a UI for every asset.

## Preference order (AUTOMATION_FIRST_STACK)

1. **GitHub Actions** — `image-seo-pipeline`, `release-banner-social`, `image-seo-qa`
2. **n8n / Make / Zapier / Gumloop** — blueprints in `workflows/blueprints/`
3. **OpenRouter** — LSI / copy agents inside those flows
4. **Allowlisted labels** — routing only
5. Studio UI — **dev/debug only**

## Pipeline (canonical)

```txt
intake → LSI expand → discovery/creative → SEO pack → prompts → render
  → derivatives → QA → human approve (PR / first post) → publish
```

## How to run (no studio)

| Trigger | Workflow / command | Output |
| --- | --- | --- |
| Weekly cron / dispatch | `.github/workflows/image-seo-pipeline.yml` | Draft pack PR + artifact |
| GitHub `release` | `.github/workflows/release-banner-social.yml` | `release-pack.json` artifact; Discord if secret present |
| PR with images | `.github/workflows/image-seo-qa.yml` | Fails on `IMG_` / `DSC_` / `Screenshot` / bare `image.*` names |
| Local headless | `node scripts/image-seo-build-pack.mjs --brief brief.json --out pack.json` | `image_creation/v1` JSON |
| Filename QA local | `node scripts/image-seo-filename-qa.mjs path/to/file.webp` | exit 0/1 |
| Re-emit formal pack | `node scripts/image-automation-auto-wr.mjs` | manifest under `artifacts/image-automation/` |

## LSI density

| Surface | Rule |
| --- | --- |
| Filename | Primary slug only |
| Alt | Primary once; ≤1 visible tool LSI |
| Body/H2 | 2–4 natural LSI |
| Schema | Broader list OK |
| Prompt | Visual vocabulary only |

LSI expansion is **scripted** (`seed+cooccurrence` in the headless builder): primary + secondary + pinned/custom pins, minus exclusions. No form exercise.

## Secrets (names only)

Listed in `config/connections.image-automation.yml` — never commit values:

`DISCORD_WEBHOOK_URL`, `TWITTER_CONSUMER_API_KEY`, `TWITTER_CONSUMER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`, `OPENROUTER_API_KEY`, `GUMLOOP_API_KEY`

## Multi-surface blueprints

| File | Surface |
| --- | --- |
| `workflows/blueprints/image-seo-pipeline.gumloop.json` | Gumloop |
| `workflows/blueprints/release-banner-social.n8n.json` | n8n |
| `workflows/blueprints/image-seo.zapier.json` | Zapier |

Blueprints reference secret **names** only and set `human_gate.auto_merge: false`.

## Formal

- Failures → WR with `work-request` + `needs-human` (+ `auto-error` when from Actions)
- Never auto-merge pack PRs (`draft: true`, `human_gate.auto_merge: false`)
- Re-emit pack: `node scripts/image-automation-auto-wr.mjs`
- Related WR: `wr/pending/WR-image-seo-lsi-release-2026-08-05.md`

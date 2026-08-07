# Image Creation + SEO Automation (Automation-First)

**Status:** ACTIVE · **Updated:** 2026-08-05
**Brand:** MIDNGHTSAPPHIRE
**Schema:** `midnghtsapphire.image_creation/v1`

## Hard rule

Image creation is **not** a manual attach-file or click-through studio ritual in production.

**Allowed human actions:** merge PRs, approve first-run social posts, rotate secrets.
**Forbidden as the primary path:** hand-building alt/OG/prompts in a UI for every asset.

## Preference order (AUTOMATION_FIRST_STACK)

1. **GitHub Actions** — image-seo-pipeline, release-banner-social, image-seo-qa
2. **n8n / Make / Zapier / Gumloop** — blueprints in `workflows/blueprints/`
3. **OpenRouter** — LSI / copy agents inside those flows
4. **Allowlisted labels** — routing only
5. Studio UI — **dev/debug only**

## Pipeline (canonical)

```text
intake → LSI expand → discovery/creative → SEO pack → prompts → render
  → derivatives → QA → human approve (PR / first post) → publish
```text

## LSI density

| Surface | Rule |
| --- | --- |
| Filename | Primary slug only |
| Alt | Primary once; ≤1 visible tool LSI |
| Body/H2 | 2–4 natural LSI |
| Schema | Broader list OK |
| Prompt | Visual vocabulary only |

## Secrets (names only)

`DISCORD_WEBHOOK_URL`, `TWITTER_CONSUMER_API_KEY`, `TWITTER_CONSUMER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`, `OPENROUTER_API_KEY`, `GUMLOOP_API_KEY`

## Formal

- Failures → WR with `formal:auto-wr` + `human-review-required`
- Never auto-merge
- Re-emit pack: `node scripts/image-automation-auto-wr.mjs`

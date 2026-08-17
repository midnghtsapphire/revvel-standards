# Marketplace Relisting Pipeline

> WR [#15520](https://github.com/midnghtsapphire/revvel-standards/issues/15520)
> — orders CSV/link → casual listing images + copy. **Personal-use internal
> tool** (owner decision: not a sellable product; no price research).

Turns the owner's human-downloaded Amazon order-history CSV (Account →
Request Your Information) or explicit product links into ready-to-post
marketplace listing packs. Posting stays 100% manual — Facebook Marketplace
has no personal-account listing API and bot-posting violates its ToS.

## Pipeline

| Step | Lane (agent-models.yml) | What happens |
| --- | --- | --- |
| 1. Parse | deterministic | CSV/links → `items[]` {title, ASIN/link, price paid, date} |
| 2. Enrich | `vision` | public product page → official images, specs, category |
| 3. Images | `image_gen` | 3 or 5 casual "normal person's photo" shots, **image-to-image conditioned on the real product photos** (new/sealed items only) |
| 4. Copy | `cheap_summary` | title, description, condition; suggested price = paid × margin (deterministic — no research) |
| 5. Pack | — | one folder per item (`images/` + `listing.json`) + `review-dashboard.html` |
| 6. Post | **human** | manual 30-second copy-paste from the pack |

## Usage

```bash
# Parse only (inspect items)
node scripts/marketplace-relist.js parse "Order History.csv"

# Full run — one CSV, 5 photos + 30–40s video storyboard, new/sealed item
node scripts/marketplace-relist.js run "Order History.csv" \
  --photos 5 --video --condition new --limit 1 --out artifacts/relist/batch-001

# Or one product link
node scripts/marketplace-relist.js run https://www.amazon.com/dp/B07FDJMC9Q

# Review: open <batch>/review-dashboard.html, approve/reject/retry each pack,
# export decisions.json into the batch dir, then:
node scripts/marketplace-relist.js apply-decisions artifacts/relist/batch-001

# Retry one pack (regenerates images/copy with the retry note recorded)
node scripts/marketplace-relist.js retry artifacts/relist/batch-001 001-ninja-air-fryer --note "brighter lighting"
```

Options: `--photos 3|5` (default 3) · `--video` (adds a 30–40s product-video
storyboard) · `--condition new|used` (default `used`) · `--margin 0.6` ·
`--limit N` · `--out DIR`.

## Keys and fallbacks

- `OPENROUTER_API_KEY` (funded account) enables live enrichment, image
  generation, and copy. **Without a key the run is a dry-run**: packs are
  still built with every prompt recorded in `listing.json`, so nothing is
  lost — a later funded run (or `retry`) executes them.
- `401/402/403/429` from OpenRouter → check the key AND the balance at
  <https://openrouter.ai/credits> before assuming a code bug.
- Image model catalog and selection rules: `docs/OPENROUTER_IMAGE_MODELS.md`.

## Guardrails (non-negotiable — encoded in prompts AND behavior)

1. **Accuracy**: images must depict the exact item sold. AI-staged shots are
   generated ONLY for `--condition new` items and only image-to-image from
   that product's real photos. `--condition used` items get **no AI images**
   — the pack emits a real-photo checklist instead.
2. **Human-review gate**: every pack starts `pending-review`; the dashboard's
   approve/reject/retry is the only path to `approved`. Nothing auto-posts.
3. **No account scraping**: order data comes only from the human-downloaded
   CSV or explicitly supplied links (kept in the enrichment prompt too).
4. **Spend cap**: the `image_gen` lane stops at
   `IMAGE_GEN_BATCH_SPEND_CAP_USD` (default $1.00/batch,
   ≈`IMAGE_GEN_COST_PER_IMAGE_USD` $0.04/image); capped items are marked
   `skipped:spend-cap` and can be retried in a later batch.

## Tests

```bash
node --test tests/marketplace-relist.test.js
```

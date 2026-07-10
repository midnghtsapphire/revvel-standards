# OpenRouter Image Models — Catalog

> Requested in WR [#15520](https://github.com/midnghtsapphire/revvel-standards/issues/15520)
> (owner screenshots of the OpenRouter image-model list, 2026-07-08).
> Source of truth for CURRENT ids and prices: <https://openrouter.ai/models?output_modalities=image>
> — always verify an id there before adding it to a profile
> (house rule in `.github/agent-models.yml`).

## Active lane

The fleet's image-generation lane is the `image_gen` profile in
`.github/agent-models.yml`:

| Role | Model | Why |
| --- | --- | --- |
| Primary | `google/gemini-2.5-flash-image` | Cheap (≈$0.039/image), strong image-to-image editing — required for "casual photo staged from the REAL product photos" |
| Fallback | `openai/gpt-image-1` | High-quality text-to-image + editing; absorbs a bad primary |

Per-batch spend cap: `profiles.image_gen.batch_spend_cap_usd` (default $1.00,
env override `IMAGE_GEN_BATCH_SPEND_CAP_USD`). Pipelines must stop requesting
new images when the cap is hit — see `scripts/marketplace-relist.js`.

## Catalog (from owner screenshots + openrouter.ai/models, 2026-07)

Image models on OpenRouter are called through the normal
`/api/v1/chat/completions` endpoint with `modalities: ["image", "text"]`;
generated images come back as base64 data URLs in
`choices[0].message.images[].image_url.url`. Image-to-image = attach source
images as `image_url` content parts.

| Model id | Vendor | ≈ Price | Strengths / notes |
| --- | --- | --- | --- |
| `google/gemini-2.5-flash-image` | Google | $0.039/image | "Nano banana." Fast, cheap, excellent image-to-image editing and multi-image conditioning. Fleet primary. |
| `openai/gpt-image-1` | OpenAI | $0.011–$0.25/image (quality-tiered) | Strong prompt adherence, text rendering, editing. Fleet fallback. |
| `recraft/recraft-v4.1` | Recraft | $0.035/image | High fidelity/detail density, purposeful lighting, 3D rendering, soft gradients. |
| `recraft/recraft-v4.1-utility` | Recraft | $0.035/image | General-purpose; simple controlled scenes, front-facing composition. |
| `recraft/recraft-v4.1-pro` | Recraft | $0.21/image | Higher fidelity and detail density, more natural photographic sensibility. |
| `recraft/recraft-v4-pro-vector` | Recraft | $0.30/image | SVG (vector) output variant — logos, icons, scalable art. |
| `black-forest-labs/flux-1.1-pro` | BFL | ≈$0.04/image | Photorealism workhorse; good for product-style shots. |
| `black-forest-labs/flux-kontext-pro` | BFL | ≈$0.04/image | In-context editing — modify a supplied image with a text instruction. |
| `stability-ai/sdxl` family | Stability | cheap | Commodity generation; style LoRA ecosystem. |

Screenshots in the WR thread also list additional vendor variants (Recraft
tiers, etc.); when a new lane is needed, pick from the live catalog page
rather than this table — prices and ids churn.

## Selection rules

1. **Image-to-image accuracy beats raw beauty** for marketplace/product work:
   prefer models that accept source images (`gemini-2.5-flash-image`,
   `flux-kontext-pro`, `gpt-image-1`) so the depicted item is the actual item.
2. **Cost discipline**: default to ≤$0.05/image models; anything ≥$0.20/image
   (Recraft Pro, Pro Vector) needs an explicit per-batch justification and
   still rides the spend cap.
3. **Every profile ships with a fallback** — never a single-model lane.
4. **Guardrail**: AI-staged product shots only for new/sealed items,
   conditioned on that product's real photos; used items get real photographs
   only (see `docs/MARKETPLACE_RELIST_PIPELINE.md`).

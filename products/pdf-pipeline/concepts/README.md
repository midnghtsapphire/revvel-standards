# PDF Pipeline — Concept Generator

Module path: `products/pdf-pipeline/concepts/`

One stage of the PDF Product Pipeline. Given a niche, this module emits a batch
of 20 distinct, sellable PDF product concepts that downstream stages (research,
cover-designer, PDF renderer, uploader) consume.

## Contract

### Input

- `--niche "<niche>"` — a single niche string, OR
- nothing — the script reads `products/pdf-pipeline/state/top-niches.json` and
  picks the highest-`score` entry.

`top-niches.json` is expected to look like:

```json
{
  "niches": [
    { "niche": "Bullet journaling for ADHD adults", "score": 0.93 },
    { "niche": "Macro meal prep for shift workers",  "score": 0.81 }
  ]
}
```

Either `niche`, `name`, or `title` is accepted as the niche field, and a bare
array (no `niches` wrapper) is also accepted.

### Output (success)

`products/pdf-pipeline/state/concepts-{YYYY-MM-DD}.json`:

```json
{
  "niche": "Bullet journaling for ADHD adults",
  "generated_at": "2026-06-17T12:34:56.000Z",
  "count": 20,
  "model_used": "deepseek/deepseek-v3.2",
  "concepts": [
    {
      "title": "The 30-Day ADHD Bullet Journal Reset",
      "subtitle": "A guided 30-day system to rebuild focus, one spread at a time.",
      "format": "workbook",
      "target_buyer": "Adults with ADHD who keep abandoning their bullet journals by week two.",
      "toc": [
        "Why ADHD brains quit bullet journals",
        "The 10-minute morning spread",
        "Brain-dump rituals that actually finish",
        "Dopamine-aware habit tracking",
        "Weekly reviews in five questions",
        "Recovering from a missed week",
        "Templates you can copy by hand",
        "What to keep, what to drop"
      ],
      "hook": "If your bullet journal is a graveyard of half-finished spreads, you are not lazy — you are using a system that wasn't built for an ADHD brain. This 30-day workbook walks you through a focus-friendly format that actually sticks. By day 30 you'll have a journal habit that survives bad weeks.",
      "price_usd": 19,
      "tags": ["adhd", "bullet journal", "productivity", "focus", "planner", "neurodivergent"],
      "cover_prompt": "Flat editorial illustration of an open bullet journal on a warm desk with soft morning light, scattered colored pens and a coffee cup, muted dopamine-friendly palette of soft teal, peach, and cream. Centered title block reserved across the top third. Modern, calm, slightly hand-drawn vector style. No text in the image. No real faces."
    }
  ]
}
```

### Output (failure)

If OpenRouter returns invalid JSON twice (initial attempt + one retry with a
"JSON only" reminder), the script writes
`products/pdf-pipeline/state/concepts-failed-{YYYY-MM-DD}.json` containing the
niche, the last error, the model used, and the raw response text, then exits 1.

## Concept shape

Every concept in the output array contains:

| Field          | Type      | Constraint                                                       |
|----------------|-----------|------------------------------------------------------------------|
| `title`        | string    | 3-59 chars; buyer-grabbing                                        |
| `subtitle`     | string    | 5-200 chars; one-sentence value prop                              |
| `format`       | enum      | `planner`, `workbook`, `guide`, `checklist`, `ebook`, `template-pack`, `journal`, `course` |
| `target_buyer` | string    | one-line persona                                                  |
| `toc`          | string[]  | 6-15 section titles                                               |
| `hook`         | string    | 30-600 chars; 2-3 sentence Gumroad listing opener, ends with a benefit |
| `price_usd`    | number    | 1-199                                                             |
| `tags`         | string[]  | 5-10 SEO tags                                                     |
| `cover_prompt` | string    | 30-800 chars; text-to-image prompt, no literal title text         |

Full machine-readable schema: [`schema.json`](./schema.json).

The batch is also validated for **format variety** (≥5 distinct formats when the
batch is ≥10) and **title uniqueness**.

## CLI

```bash
node products/pdf-pipeline/concepts/generate.mjs --niche "Bullet journaling for ADHD adults"
node products/pdf-pipeline/concepts/generate.mjs --niche "Macro meal prep" --count 20
node products/pdf-pipeline/concepts/generate.mjs                  # uses top-niches.json
node products/pdf-pipeline/concepts/generate.mjs --dry-run --niche "X"   # prints prompts, no API call
node products/pdf-pipeline/concepts/generate.mjs --out /tmp/concepts.json --niche "X"
```

### Flags

- `--niche <string>` — niche to generate for. If omitted, reads
  `state/top-niches.json` and picks the top-ranked entry.
- `--count <n>` — number of concepts (default 20, max 100).
- `--out <path>` — override output path. Default: `state/concepts-{YYYY-MM-DD}.json`.
- `--dry-run` — print resolved system + user prompts and exit; no API call.

### Exit codes

| Code | Meaning                                                                   |
|------|---------------------------------------------------------------------------|
| 0    | Success — valid JSON written to the output path.                          |
| 1    | Generation or validation failed both attempts; failure file written.      |
| 2    | Usage error (bad flags, missing niche AND missing top-niches.json, etc.). |

## Env vars

| Variable                 | Required?     | Purpose                                                      |
|--------------------------|---------------|--------------------------------------------------------------|
| `OPENROUTER_API_KEY`     | yes (unless `--dry-run`) | Auth for the OpenRouter call.                     |
| `OPENROUTER_HTTP_REFERER`| no            | `HTTP-Referer` header (defaults to repo URL).                |
| `OPENROUTER_APP_TITLE`   | no            | `X-Title` header.                                            |

## Routing

Uses the `cheap_batch_edits` profile from
[`scripts/openrouter-routing.js`](../../../scripts/openrouter-routing.js) — a
single batched prompt returns all 20 concepts at once to keep cost low.

The system prompt (`prompts/system.md`) enforces JSON-only output, format
variety, and the no-duplicates rule. On a JSON parse failure the script retries
once with an explicit "JSON only" reminder appended to the user message.

## Downstream contract notes

- The `cover_prompt` field is consumed by the **cover-designer** module. It
  intentionally does NOT contain the literal title text — the cover-designer
  composites the title separately.
- The `toc` field is consumed by the **PDF renderer** as a section outline; the
  renderer fills each section with body copy generated from `target_buyer` and
  the niche context.
- The `hook` field is consumed by the **uploader** as the first paragraph of
  the Gumroad listing description.

## Stays in lane

This module does **not** do research, PDF rendering, cover image generation,
upload, pricing optimization, or analytics. It only converts a niche into a
validated batch of concept specifications. Other modules consume `concepts-{date}.json`.

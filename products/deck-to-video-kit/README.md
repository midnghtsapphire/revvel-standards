# Deck-to-Video Kit

## Live Deployment

| What | Where |
| --- | --- |
| Store page (public) | https://deck2vid-fenbmfwl.manus.space/ |
| Product repo (private) | https://github.com/midnghtsapphire/deck-to-video-kit |
| Sellable files | Release [`v1.0.0`](https://github.com/midnghtsapphire/deck-to-video-kit/releases/tag/v1.0.0): `Deck-to-Video-Playbook-v1.0.0.pdf` (882,832 bytes), `Deck-to-Video-Kit-v1.0.0.zip` (78,815,100 bytes), `SHA256SUMS.txt` |

## What it is

The kit turns a slide deck into a 30-second video. Two Seedance 2.5 clips are generated at the same time and share one original score. The title and key lines are set in the deck's own fonts and added in post, and the data cards are animated. The worked example is Audrey's Taplio connector deck, *Turn inspiration into LinkedIn content.*

| Tier | Price | Buyer gets |
| --- | --- | --- |
| Playbook | $19 | 10-page PDF: the method, prompt formulas, timing, mix and QA checklist |
| Full Kit | $49 | The PDF, the Python pipeline (overlay renderer, audio builder, render and QA tools), prompt templates, configs, the worked example with every source file, tests, and a customer licence |
| Done-for-you | from $299 | Audrey's team makes the video from the buyer's deck |

The prices come from the repo's `research/brief.md` and `decision/pricing.json`. Prompt packs sell for $0 to $19.99, short agency explainers start at about $500, and the model cost is at most about $35 per film.

## Why it lives in its own repo

`standards/PRODUCT_INCUBATION_STANDARD.md` says products incubate here first. Audrey explicitly asked for a new repo ("put this in my github midnghtsapphire generate a repo follow everything in revvel-standards first then ship it as a sellable product"), and the paid kit content must not be public. So the code lives in the private product repo, and this folder is the incubation and graduation record.

## Standards applied

| Standard | How |
| --- | --- |
| `AGENTS.md` owner rules | Nothing was deleted. Retired text is commented out with a date. Every change to an existing repo goes through a draft PR, and the agent merges none of them. |
| `docs/DEFAULT_APP_TEMPLATE.md` | Exact LICENSE text, the standard folders, the CHANGELOG workflow, the five accessibility modes, and Schema.org JSON-LD and meta tags |
| `docs/DEFINITION_OF_DONE.md` | The live URL is under `## Live Deployment`, with no placeholders, and the receipts are below |
| `standards/shapes/PDF.md` | `research/brief.md`, `decision/pricing.json`, a branded PDF and a listing |
| `standards/LEDGER_STANDARD.md`, `WRITE_AS_YOU_GO_STANDARD.md` | `LEDGER.md`, a CHANGELOG line per change, `docs/PROVENANCE_SESSION_LOG.md` |
| `REPO_LIBRARY_STANDARD.md` | `Library/` holds the source deck and the research sources |
| Every error is a training module | `learnings.md`, TM-0001 to TM-0007 |

## Receipts (2026-11-12)

The full render from the repo pipeline reproduces the shipped MP4 byte for byte (SHA-256 `f8172562…3b84`). All 9 pytest tests pass locally, and `actionlint` passes all four workflows. An anonymous fetch of the live page returned 200 with the correct title. The video returned 200 `video/mp4` at 19,429,304 bytes, and the frames, emblem and OG image all returned 200.

## Open items

1. **Checkout.** The buttons are order-by-email (angelreporters@gmail.com) until Gumroad or Polar listings exist. Copy for those listings is in the product repo at `docs/listing/STOREFRONT_LISTING.md`. Next owner: Audrey.
2. **GitHub Actions.** Every run on the product repo ends in `startup_failure`. This is the same account-level billing cause that `wr/memory/decisions.jsonl` already records ("GitHub Actions is skipped (billing)"). Until it is fixed, CI, Pages and the auto-changelog workflow do not run.
3. **Hosting under oaudrey.com.** The store page could also move under oaudrey.com, matching the latest main commit, "point product hosts at oaudrey.com". Next owner: Audrey (DNS).

Built by Manus (Manus AI agent) for Audrey Evans. The source deck was made by Manus Slides, the footage by Seedance 2.5 (ByteDance), and the score by the Manus music generator.

All Rights Reserved. Copyright 2010-2026 Freedom Angel Corp / Audrey Evans.

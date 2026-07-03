# WR: [WR] Pre-Jules image-to-text parser + LLM WR enrichment

**Issue:** #15041
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Research Date:** 2026-07-03
**Researcher:** Copilot (OpenRouter-routed) + repository analysis
**WR Status:** 🟢 Implemented

Closes #15041

---

## Issue Context

Priority 1 blocker: before Jules is invoked on a Work Request, there needs to be
(1) an image-to-text parser so requirements pasted as screenshots are not lost,
and (2) an LLM/copilot step that takes whatever exists in the WR and turns it
into a WR that carries every requirement Jules needs to rewrite the WR and PR.

## Research Checklist

<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
- [x] Deep market research
- [ ] BOM — N/A, software-only automation step
- [x] Community chatter
- [x] Competitor analysis
- [ ] Domain strategy — N/A, internal pipeline component
- [x] Monetization

## Executive Summary

Jules and the other coding agents receive a WR as `title + body` text only
(see `.github/workflows/jules-invoke.yml`, which builds the prompt from
`github.event.issue.title` + `github.event.issue.body`). Two failure modes leak
requirements before that hand-off:

1. **Images are invisible.** Users paste mock-ups, error screenshots, and specs
   as images. The markdown reaches Jules but the pixels do not, so the real
   requirement is silently dropped.
2. **Sparse WR fields.** A one-line `[WR]` title with every form field left as
   `_No response_` / `None` gives Jules nothing to normalize, so it under-scopes
   or stalls.

This WR delivers `scripts/wr-preprocess.js`: the step that runs **before** Jules.
It extracts every image URL from the WR body, runs the existing PaddleOCR service
(`scripts/ocr-service.py`) to turn each image into text, then asks an LLM (via the
repository's OpenRouter routing layer) to rewrite the WR so every canonical field
Jules needs is populated. It degrades gracefully at every I/O boundary so the
pipeline never dead-ends.

## Step 1A — Product/Output Selections

Output Type: production-app (automation pipeline component). Delivery shape: a
reusable Node module + CLI (`scripts/wr-preprocess.js`) with node-test coverage,
composed from existing repository building blocks (OCR service + OpenRouter
routing) so it carries no new runtime dependencies.

## Step 2 — Deep Web Research

### Image-to-text (OCR) engine comparison

| Engine | GitHub stars | Cost | Fit |
| --- | --- | --- | --- |
| PaddleOCR | ~44k | Free / self-host | Layout-aware (PP-Structure), multilingual, already wired in `scripts/ocr-service.py` |
| Tesseract (tesseract-ocr) | ~62k | Free / self-host | Mature but weaker on tables and rotated text |
| EasyOCR | ~24k | Free / self-host | Simple API, heavier models, no layout output |
| AWS Textract | Closed source | Paid per page | Strong tables but per-call cost and cloud dependency |

Decision: reuse **PaddleOCR** via the existing `scripts/ocr-service.py`. The
prior deep evaluation in WR-13653 already selected it (documented in that script's
header) for cost-free, layout-aware, multilingual extraction, so this WR adds no
new engine — it wires the existing one into the pre-Jules path.

### LLM enrichment routing

Enrichment reuses `scripts/openrouter-routing.js` (`routedChat`) with the
`deep_search` profile (resolves to `anthropic/claude-3.5-sonnet` + `openrouter/fusion`
per `config/model-lookup.json`). This keeps a single, funded OpenRouter lane and
inherits the repository's fallback-chain behaviour. Prompt design mirrors
`scripts/openrouter-triage.js`: user text is a research starting point, not gospel,
and the model must infer missing fields rather than fail.

### Community chatter

PaddleOCR and Tesseract dominate self-hosted OCR discussion on GitHub and
Hacker News; the recurring theme is that cloud OCR (Textract, Google Vision)
wins only when tables are complex and budget is available — which does not apply
to an internal, high-volume WR pipeline where per-call cost compounds.

## Step 3 — Requirements

- Extract markdown images `![alt](url)` (including extension-less GitHub
  user-attachments), HTML `<img src>`, and bare image-extension URLs; de-dupe.
- Run OCR per image, catching missing Python/PaddleOCR/unreachable URLs so one
  bad image cannot abort the WR.
- Build an enrichment prompt that lists every canonical WR field
  (kept in sync with `.github/ISSUE_TEMPLATE/00-work-request.yml`).
- Enrich via `routedChat`; fall back to the original body plus an OCR appendix
  when no key, module, or model is available.
- Ship pure, injectable functions so the logic is unit-testable without network
  or Python (`tests/wr-preprocess.test.js`, node-test).

## Recommendations

- Wire `scripts/wr-preprocess.js` into the WR flow ahead of `jules-invoke.yml`
  so Jules always receives the enriched, image-aware body.
- Keep OCR and LLM behind their graceful-fallback boundaries: a missing
  `OPENROUTER_API_KEY` or PaddleOCR install must degrade, never block.

## Monetization

Directly serves the PRIME DIRECTIVE (faster, lower-friction automated product
pipeline): fewer stalled/under-scoped WRs means more shippable output per unit of
human time, and recovered image requirements reduce rework. The same
image-to-text + normalize primitive is reusable in the OSINT and sellable-PDF
lines (turning screenshots and scanned documents into structured, sellable
intelligence). Marketing/SEO keywords: "OCR work request", "screenshot to
requirements", "AI issue triage", "image to text automation", "LLM ticket
normalization".

## Risks

- OCR accuracy on low-resolution screenshots — mitigated by PP-Structure layout
  mode and by never trusting OCR as the sole source (the appendix is additive).
- OpenRouter key unfunded — mitigated by the no-throw fallback to the original
  body plus OCR appendix.
- Prompt injection from image/body text — the enrichment prompt treats user and
  OCR content as data to normalize, not instructions to obey.

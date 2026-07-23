# PDF Work Request (WR) Playbook

> **Prime Directive:** Ship revenue-generating artifacts that move us from $10k/month → $10M in 3 years.

This playbook codifies how we convert a Work Request (WR) into a polished, client-ready PDF deliverable — the kind that justifies premium pricing on Polar.sh, OSINT report subscriptions, and the automated product pipeline.

---

## 1. When to use this playbook

Use this playbook when a WR (issue, ticket, or contract line-item) requires:

- A **client-facing PDF** (OSINT report, audit, compliance doc, research brief).
- A **Polar.sh digital product** sold as a one-shot or subscription tier.
- An **internal reference doc** that must survive handoff to a future operator or LLM agent.

If the output is code or a dashboard, use the engineering WR flow instead.

---

## 2. Revenue alignment (why this matters)

| Phase | Monthly target | PDF role |
|-------|----------------|----------|
| 1 | $10k/mo | One-off OSINT / audit PDFs at $500–$2,500 each |
| 2 | $30k/mo | Productized PDF bundles + subscription briefs |
| 3 | $100k/mo | Tiered report pipeline (self-serve + enterprise) |
| 4 | $10M total | Licensed templates + white-label PDF workflows |

Every PDF we ship should be reusable as a template for the next phase. **No one-off throwaways.**

---

## 3. Intake: turning a WR into a brief

Before any writing, capture these fields in the WR issue:

1. **Client / buyer persona** — who pays, what pain does this solve?
2. **Delivery SKU** — Polar.sh product id or internal SKU.
3. **Price point** — current tier and target uplift.
4. **Scope boundaries** — pages, sections, data sources, cutoff date.
5. **Source material** — links, OSINT queries, prior reports, datasets.
6. **Deadline** — hard date + buffer for review.
7. **Definition of done** — what the buyer sees, signs, or downloads.

If any field is missing, **block the WR** and request clarification. Do not start production.

---

## 4. Production pipeline

```text
WR issue  ─▶  Brief (this doc §3)
          ─▶  Outline (markdown in repo)
          ─▶  Draft (markdown + assets)
          ─▶  Review (internal QA checklist §6)
          ─▶  PDF render (pandoc / weasyprint / typst)
          ─▶  Delivery (Polar.sh upload or client handoff)
          ─▶  Post-mortem (template reuse §7)
```

### 4.1 Recommended toolchain

- **Source format:** Markdown (portable, diff-friendly, LLM-editable).
- **Render:** `pandoc` → PDF via LaTeX, or `weasyprint` for HTML/CSS-styled reports, or `typst` for modern typesetting.
- **Assets:** store under `assets/pdf/<wr-id>/`.
- **Versioning:** semantic filename `WR-<id>-<slug>-v<major>.<minor>.pdf`.

### 4.2 Repo layout

```text
docs/
  playbooks/
    pdf-wr-playbook.md        ← this file
  pdf/
    <wr-id>/
      brief.md
      outline.md
      draft.md
      assets/
      output/WR-<id>-<slug>-v1.0.pdf
```

---

## 5. Content standards

Every PDF WR must include:

1. **Cover page** — title, client, date, version, confidentiality label.
2. **Executive summary** — ≤ 1 page, pain → finding → recommendation.
3. **Methodology / sources** — reproducibility for OSINT credibility.
4. **Findings / body** — structured sections, each with a TL;DR.
5. **Recommendations** — prioritized, actionable, with effort estimates.
6. **Appendix** — raw data, query strings, screenshots.
7. **Contact / next-step CTA** — link back to Polar.sh or upsell SKU.

The CTA is **non-negotiable**. Every delivered PDF is a sales surface.

---

## 6. QA checklist (run before render)

- [ ] All §3 brief fields filled in the WR issue
- [ ] No hardcoded secrets, API keys, or client PII beyond scope
- [ ] All claims sourced (footnote or appendix reference)
- [ ] Screenshots redacted where required
- [ ] Consistent voice, tense, and terminology
- [ ] Cover page metadata matches filename version
- [ ] Upsell CTA present and links validated
- [ ] Spellcheck + link check passed
- [ ] PDF renders under 10MB (or justification logged)
- [ ] Accessibility: tagged PDF, alt text on images where feasible

---

## 7. Post-delivery: compounding value

After delivery, within 48 hours:

1. **Extract template** — strip client-specific content, commit a reusable skeleton to `docs/pdf/_templates/`.
2. **Log SKU performance** — price, delivery time, buyer feedback.
3. **File follow-ups** — upsell opportunities, expansion WRs.
4. **Update REMINDERS.md** — renewal dates, subscription touchpoints.

This is how a one-off $1k PDF becomes a $10k/month productized line.

---

## 8. Automation targets (roadmap)

To hit Phase 3 ($100k/mo), the following should be automated:

- [ ] CLI scaffold: `scripts/new-pdf-wr.sh <wr-id> <slug>` creates the folder + templates
- [ ] CI job: render PDF on merge to `main` when `docs/pdf/**` changes
- [ ] Polar.sh webhook: auto-attach rendered PDF to product SKU
- [ ] LLM outline pass: given `brief.md`, emit `outline.md` draft
- [ ] Link + claim checker in CI

Track these as separate issues; this playbook is the contract they implement against.

---

## 9. References

- Polar.sh docs: <https://docs.polar.sh>
- Pandoc user guide: <https://pandoc.org/MANUAL.html>
- Typst: <https://typst.app/docs>
- WeasyPrint: <https://weasyprint.org>

---

_Last updated: see git log. Changes to this playbook require a PR with the `docs:` prefix._

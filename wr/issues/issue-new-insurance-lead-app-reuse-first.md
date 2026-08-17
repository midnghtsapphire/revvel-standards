# WR: New Insurance Lead App (reuse-first build)

**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-05-25
**Output Type:** `production-app` → `deliver:app` (landing + lead pipeline)
**Revenue target (monthly USD):** $5,000 _(placeholder — owner to confirm; required by CONTRACT Rule 4)_
**WR Status:** 🟡 Spec ready — awaiting owner go

---

## Goal

Build a **new** life-insurance lead-generation app (not a reimagining of
GodsofInsurance — that stays untouched). Same Blue-Ocean thesis: source exclusive,
fresh leads from **public-record life events** (marriage licenses, new home
purchases, business filings, birth/death records, new driver's licenses), package
them as exclusive batches, and support agents with an AI phone/quote layer.

**Non-negotiable build rule:** this is a **reuse-first** build. Pull the existing
code listed below — do **not** rebuild functionality the repo already has. New
code is only for the genuine gaps. Ship it **complete** (Completeness Gate), don't
overwrite anything (No-Destroy Guard).

---

## ♻️ Reuse manifest (REQUIRED — pull these, do not rebuild)

### Reuse as-is
| Capability | Source file(s) |
| --- | --- |
| Lead capture form/flow | `products/life-insurance-lead-engine/build/src/components/LeadGenerator/LeadGenerator.tsx` |
| Lead de-duplication (logic + UI) | `products/life-insurance-lead-engine/build/src/components/Dedupe/Dedupe.tsx`, `.../build/src/utils/dedupe.ts` |
| Lead data parsing | `products/life-insurance-lead-engine/build/src/utils/parser.ts` |
| Email / newsletter capture | `products/life-insurance-lead-engine/build/src/components/Newsletter.tsx` |
| Monetization block | `products/life-insurance-lead-engine/build/src/components/AffiliateMarketing.tsx` |
| Accessibility panel | `products/life-insurance-lead-engine/build/src/components/AccessibilityControls.tsx` |

### Adapt (foundation exists — extend it)
| Capability | Reuse from | Adapt into |
| --- | --- | --- |
| Public-records scraping (the Blue Ocean) | `reesereviews/vine-marketplace/lib/amazon-parser.js`, `gmail-reader.js`, `facebook-poster.js` | county/marriage-license/home-purchase record scrapers |
| AI features (phone answering, quotes) | `src/lib/model-router.js`, `src/lib/model-routing-modes.js`, `products/music-video-creator/src/lib/orchestrator.ts`, `.../openrouter-config.ts`, `products/prompt-generation-app/lib/prompt-generator.js` | AI phone-answer agent + quote-explanation flow |

### Build net-new (no reusable code in repo)
- Public-records source connectors (use the adapted scraper pattern above)
- Multi-carrier quote comparison
- Twilio/voice integration for AI phone answering
- Billing/checkout + agent auth

> Reuse coverage at start ≈ **40–50%**. The builder must reference each file above
> in its plan and justify any case where it chooses to rebuild instead of reuse.

---

## Definition of Done (Completeness Gate — must pass before `status: done`)

- App **builds and runs** (`npm install && npm run build`), no errors.
- Every flow implemented end-to-end: capture → dedupe → package → deliver. **No
  TODO/placeholder/"coming soon"/empty handlers** in shipped product code.
- Landing page real (not default Next.js boilerplate); deploys on Vercel.
- Reused modules wired in and working (not re-stubbed copies).
- Net-new gaps either implemented or written to a Procurement BOM if blocked on a
  missing API/credential (don't fail silently).

---

## Guardrails

- **New build is approved** (it's net-new, not a reimagining). Reimagining any
  *existing* app still requires owner approval (propose → approve → build).
- **No-Destroy:** never overwrite/delete existing apps or the reused source files.
- **Research:** standard research defaults apply (market, BOM, competitors,
  compliance — TCPA/FCRA/CAN-SPAM/source ToS are critical for public-records data).

---

## Pipeline

Route through revvel-standards: research-engine → coder (reuse-first per the
manifest) → full review jury (OpenRouter code review + Jules + Semgrep + CodeQL) →
draft PR for owner approval → ship.

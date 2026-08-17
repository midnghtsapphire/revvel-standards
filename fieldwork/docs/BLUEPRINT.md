# FieldWork — Blueprint

**Version:** 0.1.0
**Status:** Concept
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE) / Freedom Angel Corp

---

## 1. Plausibility — "Yes or No

**Verdict: YES.**

### Why the idea holds up

1. **Real, measurable pain.** Architects, general contractors, and superintendents
   spend 5–15 hours/week converting raw site documentation (photos, voice memos,
   hand sketches, punch-list scribbles) into formal progress reports, RFIs, and
   owner updates. This is time billed at $75–$250/hr that clients increasingly
   resist paying.
2. **Under-served niche.** Horizontal PM tools (Asana, Monday, Notion) don't
   speak the AEC dialect. Vertical incumbents (Procore, PlanGrid/Autodesk Build,
   Fieldwire) are enterprise-priced and enterprise-paced. There is a gap for an
   **opinionated, fast, document-output-focused** tool aimed at solo architects
   and small GCs (1–25 seats).
3. **Narrow output = shippable MVP.** "Photos + notes → PDF progress report"
   is a single workflow. That constraint keeps the v1 small and legible, which
   is the whole point of the industrial-premium brand.
4. **Differentiated aesthetic.** Competitors lean "construction-yellow
   clip-art." A Dieter-Rams / blueprint aesthetic signals professionalism to
   design-minded architects — the exact early-adopter segment.

### Risks (acknowledged, not fatal)

| Risk                                         | Mitigation                                                  |
|----------------------------------------------|-------------------------------------------------------------|
| Offline-first requirement on job sites       | PWA + local cache; defer heavy sync to v1.1                 |
| OCR / voice-note accuracy                    | Use hosted Whisper + cloud OCR; manual edit always allowed  |
| Enterprise procurement cycles                | Target sole practitioners first; self-serve pricing         |
| Commodity "AI report generator" competitors  | Vertical focus + brand + PDF fidelity as the moat           |

### If "No" — the fallback pivot

If user interviews kill FieldWork, the closest adjacent idea is
**"Punchlist Pro"** — a narrower tool that only produces punchlists (not full
progress reports) from photos. Same stack, smaller scope, faster to validate.
Keep that in the back pocket; don't build it yet.

---

## 2. Product One-Liner

> **FieldWork** turns a contractor's phone camera roll into a client-ready PDF
> progress report in under 60 seconds.

## 3. Primary Personas

1. **The Solo Architect (Alex).** Runs a 1–3 person studio. Visits 3–8 sites
   per week. Hates formatting reports in InDesign.
2. **The Small GC Superintendent (Sam).** Supervises 2–5 active jobs.
   Currently emails photo dumps and calls it a report.
3. **The Owner's Rep (Morgan).** Consumes reports. Wants consistency,
   timestamps, and a clear punchlist — not a PowerPoint.

## 4. Core User Story (v1)

> As a field user, I upload 10 site photos and speak 2 minutes of notes.
> FieldWork clusters photos by location, transcribes my notes, attaches them
> to the right photos, and emits a branded PDF with cover page, site summary,
> photo grid, notes, and an open-items punchlist.

## 5. Design System (authoritative)

### 5.1 Palette

| Role                 | Hex       | Usage                                     |
|----------------------|-----------|-------------------------------------------|
| Background — Stark   | `#FFFFFF` | Page background                           |
| Surface — Concrete   | `#F5F5F5` | Secondary panels, "input" transformation  |
| Border — Blueprint   | `#111418` | 1px section dividers, card borders        |
| Text — Blueprint     | `#111418` | Body and headlines                        |
| Text — Graphite      | `#4A4F55` | Secondary copy                            |
| Accent — Safety      | `#FF5733` | **CTAs and critical status only**         |

> Safety Orange is rationed. It appears **only** on: primary CTA buttons,
> the "LIVE" / "WIP" status dots, and the pricing card's single highlight
> rule. Never in body type. Never as a gradient.

### 5.2 Typography

- **Sans:** Inter — `tracking-tight` on headlines (`-0.02em`), `leading-[1.15]`
  on display, `leading-[1.6]` on body.
- **Mono:** JetBrains Mono — used for metadata labels (e.g. `// 01 — CAPTURE`),
  the "WIP" chip, timestamps, and file-name style UI strings.
- **Scale:** 12 / 14 / 16 / 20 / 28 / 40 / 64 / 88 px.

### 5.3 Grid & Spacing

- 12-column, 1440px max width, 80px horizontal gutters on desktop.
- **80px minimum** vertical whitespace between sections (`py-20` or more).
- 1px `#111418` hairlines separate sections (`border-t`).
- Radius: **`0`** everywhere. No exceptions.

### 5.4 Motion

- Transitions limited to `colors` and `opacity`, `duration-200`, linear.
- No bouncy springs, no parallax, no scroll-jacking.

## 6. Landing Page Sections (shipped in `index.html`)

1. **Top nav** — wordmark left, inline links, one orange CTA right.
2. **Hero** — left-aligned heavy headline, mono kicker, floating browser
   mockup with sharp drop shadow.
3. **Process** — 3 bordered cards: **01 CAPTURE → 02 ANNOTATE → 03 REPORT**.
4. **Transformation** — side-by-side "Input (messy)" vs "Output (PDF)".
5. **Social proof** — 3 blockquotes, mono caps attribution, no headshots.
6. **Pricing** — single centered "Studio" tier card, feature checklist.
7. **Footer** — mono, minimal, with copyright.

## 7. Non-Goals (v0.1 landing page)

- No backend.
- No auth, no waitlist form beyond a mailto link.
- No analytics beyond what Tailwind CDN implies (none).
- No CMS. Copy is hard-coded intentionally.

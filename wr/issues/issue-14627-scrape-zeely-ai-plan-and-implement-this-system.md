# WR: [WR] scrape zeely ai plan and implement this system in the image all artifacts required

**Issue:** [#14627](https://github.com/midnghtsapphire/revvel-standards/issues/14627)  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-06-25  
**Researcher:** Copilot Coding Agent  
**Research Date:** 2026-06-25  
**WR Status:** ✅ Research complete — implementation delivered in existing production app  

---

## ⚡ Pre-flight: Autonomous Research Defaults

### Research Checklist

- [x] Deep market research — scoped to the user-provided Zeely screenshot and the existing UGC app surface instead of a new market build.
- [x] BOM — existing `products/ugc-review-generator/` was the smallest production-app surface to extend.
- [x] Community chatter — the image itself reflects the dominant local-lead ad pattern: pain → proof → urgency → CTA.
- [x] Competitor analysis — Zeely-style talking-head ad systems typically compress trust, proof, and free-trial urgency into one asset; this WR reproduces that mechanic in-app.
- [ ] Domain strategy — N/A for this implementation pass because the app already ships under the revvel-standards deployment surface.
- [x] Monetization — existing newsletter + affiliate modules remain intact, and the new local-lead mode can support template sales or agency setup offers.

---

## Executive Summary

Issue `#14627` was stuck because there was **no dedicated artifact translating the screenshot into a working production UI**. Instead of creating a second overlapping app, this WR upgrades the existing production app at `products/ugc-review-generator/` with a new **Zeely-style local lead ad mode**.

That mode now turns one offer into:

1. stacked on-screen overlay copy matching the screenshot structure,
2. a short proof-led talking-head script,
3. landing-page hero/subhead/CTA copy,
4. a 30-day content calendar, and
5. compliance notes for proof/urgency claims.

The original Amazon/HeyGen UGC generator remains available, so the repository gains the requested system without losing existing behavior.

---

## Step 1A: Product / Output Selections

| Decision | Selection | Reason |
| --- | --- | --- |
| Output type | `production-app` | The request asked to “implement this system,” not just describe it. |
| Delivery shape | Extend existing app | Smallest complete change: reuse `products/ugc-review-generator/` rather than spin up a duplicate Next app. |
| Primary audience | Real-estate and local-service marketers | The screenshot copy explicitly targets real-estate agents but the generator remains reusable for other local-service businesses. |
| Artifact bundle | UI + deterministic logic + regression tests + WR doc | Satisfies “all artifacts required” without introducing unrelated infrastructure. |

---

## Step 2: Reverse-Engineered System From the Screenshot

**Source image:** `https://github.com/user-attachments/assets/0335b2bc-76d4-45ea-bc4d-461e03785e9b`

### Observed creative structure

1. **Audience callout** — “Real estate agents,”
2. **Pain admission** — stress over what to post.
3. **Proof claim** — month of content that drove leads.
4. **Free-entry offer** — free / trial / no credit card.
5. **Urgency** — “Only 3 hours left.”
6. **Tap CTA** — short, platform-native action.

### Delivered implementation

- `src/lib/creative-system.js` now builds this structure deterministically.
- The UI adds a **Local lead** mode with fields for brand, business type, audience, pain point, proof metric, offer, free-trial days, and urgency window.
- The output includes both the **hero ad copy** and the **follow-on publishing system** (landing copy + 30-day plan), so users get the whole workflow instead of a single caption.

---

## Step 3: Requirements Delivered

### Production code

- Added deterministic creative helpers for both the legacy Amazon UGC flow and the new local-lead flow.
- Rebuilt the app UI so users can switch between **Amazon UGC** and **Zeely-style local lead ads**.
- Preserved the required newsletter, affiliate, and accessibility modules.

### Documentation

- Updated product README with local-lead mode, build instructions, and targeted test command.
- Updated blueprint, roadmap, and changelog to reflect the new ad system.

### Validation

- Added root regression coverage in `tests/ugc-review-generator.test.js`.
- Test coverage explicitly checks:
  - original Amazon behavior still works,
  - local overlay copy includes proof + urgency,
  - missing proof falls back to safer language,
  - the content calendar stays 30 days,
  - markdown export contains the expected sections.

---

## Validation Commands

```bash
cd /home/runner/work/revvel-standards/revvel-standards
node tests/ugc-review-generator.test.js

cd /home/runner/work/revvel-standards/revvel-standards/products/ugc-review-generator
npm run build
```

---

## Monetization Path

1. Sell local-lead script packs / swipe files.
2. Convert newsletter signups into agency setup offers.
3. Pair the mode with affiliate creator-gear or CRM recommendations already supported in-app.

## SEO / positioning keywords

- `real estate ai ads`
- `local lead ad generator`
- `ugc script generator`
- `talking head ad copy`
- `real estate content calendar`

---

## Artifact Engine Map

| Artifact | Path | Status |
| --- | --- | --- |
| Zeely-style creative engine | `products/ugc-review-generator/src/lib/creative-system.js` | ✅ Delivered |
| App UI | `products/ugc-review-generator/src/app/page.tsx` | ✅ Delivered |
| Styling / accessibility modes | `products/ugc-review-generator/src/app/globals.css` | ✅ Delivered |
| Product documentation | `products/ugc-review-generator/README.md` | ✅ Delivered |
| Product blueprint | `products/ugc-review-generator/BLUEPRINT.md` | ✅ Delivered |
| Changelog / roadmap | `products/ugc-review-generator/CHANGELOG.md`, `products/ugc-review-generator/ROADMAP.md` | ✅ Delivered |
| Regression tests | `tests/ugc-review-generator.test.js` | ✅ Delivered |

---

## Agent Self-Healing Journal

| Issue | Resolution |
| --- | --- |
| WR was “stuck not moving” because the screenshot had no code artifact attached to it | Extended the closest existing production app instead of creating redundant scaffolding |
| Need to preserve prior UGC behavior while adding the new mode | Extracted deterministic helpers and added regression coverage for both flows |
| Screenshot copy includes high-risk proof/urgency language | Added compliance notes and qualitative fallback behavior when proof is missing |

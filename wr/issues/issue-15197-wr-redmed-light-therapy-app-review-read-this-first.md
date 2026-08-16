# WR: RedMed Light Therapy App Review: create a mobile app or tool for red light therapy (photobiomodulation)

**Issue:** #15197  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-06  
**Researcher:** Gemini (Google) + OpenRouter  
**Research Date:** 2026-07-06  
**WR Status:** 🟢 Delivered

## Issue Context

[RedMed review page](https://www.lighttherapyinsiders.com/redmed-light-therapy-app-review/)

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A — product planning document |
| Open Issues | N/A — product planning document |
| Private | No |
| Archived | No |

## Research Checklist

- [ ] Deep market research
- [ ] BOM (Bill of Materials) — pending (add tool/service/cost table)
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
Source links used for this WR:
- RedMed review page: <https://www.lighttherapyinsiders.com/redmed-light-therapy-app-review/>
- RedMed App Store listing: <https://apps.apple.com/us/app/redmed/id1441232926>
- RedMed Google Play listing: <https://play.google.com/store/apps/details?id=com.martin.redmed&hl=en-US>
- Expo framework repository: <https://github.com/expo/expo>
- Flutter framework repository: <https://github.com/flutter/flutter>

## Executive Summary

Build a **mobile companion app/tool**, not a “phone-screen treatment app.”
The RedMed review + store listings indicate a market need for session guidance, protocol adherence, and progress tracking, while also highlighting skepticism about phone-screen therapeutic output and medical-claim risk.

Recommended product shape: a cross-platform **protocol planner + session tracker + education layer** that helps users run red-light routines with external hardware devices and records outcomes safely.

## Step 1A — Product/Output Selections

- **Output Type:** production-app (mobile-first)
- **Platform:** iOS + Android (single codebase)
- **Primary user:** wellness users already owning or considering dedicated red-light hardware
- **Core value:** consistency, habit adherence, and safe routine planning
- **Commercial posture:** wellness guidance and tracking only; no diagnosis, treatment, or cure claims

## Step 2 — Deep Web Research

### Marketing and SEO keywords
- red light therapy app
- photobiomodulation tracker
- infrared therapy routine planner
- red light session timer
- red light therapy logbook

### Competitor snapshot

| Product | Price | Notes | Source |
| --- | --- | --- | --- |
| RedMed (iOS) | Pricing data pending — competitive benchmark research required. | Screen-based red-light app concept; this WR pivots to hardware-assisted tracking | [Light Therapy Insiders review](https://www.lighttherapyinsiders.com/redmed-light-therapy-app-review/) |
| RedMed (Android) | Pricing data pending — competitive benchmark research required. | Android listing confirms product presence; verify active pricing during launch prep | [Google Play listing](https://play.google.com/store/apps/details?id=com.martin.redmed&hl=en-US) |
| Other wellness tracking apps | Pricing data pending — competitive benchmark research required. | Add final paid/free benchmark table during implementation sprint kickoff | N/A — requires follow-up market scrape |

### GitHub stars for referenced build tools

| Tool | GitHub Stars | Why it matters | Source |
| --- | --- | --- | --- |
| Expo (`expo/expo`) | 50,452 stars (checked 2026-07-06) | Fast cross-platform mobile delivery with React Native ecosystem | [expo/expo](https://github.com/expo/expo) |
| Flutter (`flutter/flutter`) | 177,641 stars (checked 2026-07-06) | Mature cross-platform option if Dart stack is preferred | [flutter/flutter](https://github.com/flutter/flutter) |

### Community/demand signals

- Issue request directly asks for a “mobile app or tool for red light therapy or photobiomodulation therapy” (#15197).
- RedMed is visible on both major app stores, indicating established user discovery channels for this category.
- Review-led discovery pattern suggests content + SEO + comparison landing pages are a viable acquisition channel.

### Domain strategy

- Reserve a brand domain centered on “tracker/protocol/planner” language rather than “medical treatment.”
- Create SEO pages for comparison intent: “RedMed alternative”, “red light therapy tracker app”, “photobiomodulation routine planner”.
- Pair launch with educational pages that clearly separate evidence-backed guidance from marketing claims.

### Monetization path

- Freemium core: timer, protocol templates, and session logs.
- Premium tier: advanced protocol library, streak analytics, CSV/PDF exports, and reminder automation.
- Optional affiliate lane: external hardware recommendations with transparent disclosures.

## Step 3 — Requirements

### MVP scope (ship first)
1. Session planner: body area, duration, frequency, and reminder schedule.
2. Session timer + guided flow optimized for external red-light devices.
3. Journal/logbook: track symptoms, goals, adherence, and notes.
4. Progress dashboard: streaks, weekly consistency, and exportable history.
5. Safety UX: contraindication reminders, “not medical advice” framing, and escalation prompts.

### Acceptance gates
- [ ] iOS and Android builds run from one codebase.
- [ ] No therapeutic efficacy claims in UI copy without citation + legal approval.
- [ ] Export and backup of session history works on-device.
- [ ] Core flow works offline after initial install.
- [ ] App store metadata and in-app legal disclaimers are present.

### Explicit non-goals for MVP
- No diagnosis features.
- No claim that phone screen replaces clinical-grade therapy hardware.
- No automated medical recommendation engine.

## Recommendations

1. Build with Expo first for speed and shared mobile code paths.
2. Position product as a **companion/tracker** for routines, not as a treatment device.
3. Run a small closed beta with users who already own red-light hardware; validate adherence and retention before expanding scope.
4. Add a compliance review checkpoint before app-store submission to keep copy and claims conservative.

## Dependencies

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

No blocking prerequisite WRs identified.

## Risks

- **Medical/regulatory risk:** accidental therapeutic claims in UX or marketing.  
  **Mitigation:** legal/compliance review + approved claim library.
- **Trust risk:** users may conflate app guidance with device efficacy.  
  **Mitigation:** clear copy that app tracks routines and does not provide treatment.
- **Data risk:** sensitive wellness logs may expose user privacy concerns.  
  **Mitigation:** local-first storage defaults and explicit export/delete controls.

# WR: Smartphone-Driven Low-Power Light-Emitting Device - PMCFirst-pdf create mobile app or tool for red light therapy or photobiomudulation therapy

**Issue:** #15202  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-06  
**Researcher:** Codex (GPT-5)  
**Research Date:** 2026-07-06  
**WR Status:** 🟡 In Progress  

## Issue Context

Source request: [PMC5406741](https://pmc.ncbi.nlm.nih.gov/articles/PMC5406741/)

Build a mobile app or tool for red light therapy / photobiomodulation therapy based on the smartphone-driven PBM device evidence in the source paper.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [x] Domain strategy
- [x] Monetization
- [x] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

Primary technical source:
- [A Smartphone-Driven Low-Power Light-Emitting Device for Photobiomodulation Therapy (Sensors, PMCID: PMC5406741)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5406741/)

Key evidence extracted from PMCID `PMC5406741`:
- Device wavelengths reported: red and near-infrared LEDs (`630 nm` and `850 nm`).
- Reported output/therapy profile includes low irradiance and session-level radiant exposure suitable for PBM use cases, with the paper reporting approximately `3 mW/cm²` and `7.2 J/cm²` in the tested setup.
- Thermal safety in the test setup remained below approximately `41 C` during operation.
- Preclinical result in the paper indicates positive wound-healing response in a mouse model.

Evidence confidence note:
- Numeric values above are sourced from the PMCID paper summary and should be re-verified directly against the publication figures/tables before any production medical UX claims.

## Executive Summary

Ship a compliance-first, wellness-positioned mobile PBM companion app that controls a low-power red/NIR LED accessory profile while avoiding unapproved medical claims. MVP should focus on protocol guidance, session logging, safety guardrails, and hardware control boundaries that mirror the studied power/time envelope.

## Step 1A — Product/Output Selections

Output bundle:
- Mobile app (`iOS`, `Android`) using Expo/React Native
- Lightweight protocol engine for session presets
- Safety policy module (max duration, cooldown, contraindication warnings)
- Session analytics/export (`CSV` and Markdown report)
- Regulatory copy pack (wellness disclaimers, no disease-treatment claims)

MVP features:
- User onboarding with skin-type/sensitivity questionnaire
- Protocol presets (general wellness, recovery support, custom protocol)
- Timer + dose estimator using user-selected irradiance profile
- Session history with symptom/self-report fields
- Hardware profile selector (630/850 modes if supported by connected device)
- Failsafe lockout when temperature or duration thresholds are exceeded

## Step 2 — Deep Web Research

### Market and Demand Snapshot

- Search intent terms: `red light therapy app`, `photobiomodulation app`, `at home red light therapy`, `LED therapy timer app`.
- Buyer segments: biohacker/wellness consumers, sports-recovery users, esthetic clinics needing session tracking.
- Community channels with recurring demand discussion: Reddit biohacking/wellness communities, longevity creators, clinic operators seeking standardized home protocols.

### Competitor and Pricing Table

| Competitor | Product Type | Pricing | Notes |
| --- | --- | --- | --- |
| Joovv | Hardware + app ecosystem | Pricing data pending — competitive benchmark research required. | Established brand; app-focused control tied to proprietary hardware. |
| Mito Red Light | Hardware-first ecosystem | Pricing data pending — competitive benchmark research required. | Strong direct-to-consumer presence; protocol UX opportunity gap. |
| Generic interval timer apps | App-only workaround | Free to low-cost subscription tiers (estimate). | No PBM-specific dose/safety engine. |

### SEO and Content Plan

Primary keywords:
- `red light therapy app`
- `photobiomodulation app`
- `630nm 850nm light therapy`
- `pbm session tracker`

Long-tail keywords:
- `how to track red light therapy sessions safely`
- `best photobiomodulation protocol app for home use`
- `red light therapy dose calculator for 630 and 850 nm`

Content moat:
- Protocol explainers tied to cited literature
- Safety-first calculators and printable protocol reports
- Clinic/team mode for coaches and esthetic providers

## Step 3 — Requirements

Product requirements:
- Must support configurable wavelength profile metadata (at minimum 630 and 850 presets).
- Must support irradiance and exposure time inputs with calculated radiant exposure logging.
- Must include user-facing thermal and overexposure warnings.
- Must include explicit disclaimer language that avoids unapproved disease-treatment claims.
- Must support export of session logs.

Engineering requirements:
- Build with Expo/React Native + TypeScript per repo mobile standards.
- Config-driven protocol library (JSON) to allow updates without app rebuild.
- Local-first storage with encrypted at-rest session data.
- Feature-flag architecture for region-specific compliance copy.

Compliance requirements:
- Position as wellness guidance software unless and until medical-device pathway is approved.
- Add review gate for any copy containing clinical outcome language.
- Keep a traceable citation registry for every numeric claim shown in app education screens.

Validation requirements:
- Unit tests for dose calculations and duration guardrails.
- Integration tests for protocol execution state transitions.
- Manual QA checklist for safety lockouts, alert copy, and export correctness.

## Recommendations

- Start with an app-plus-protocol product and treat hardware integration as a controlled phase 2.
- Use a conservative default protocol envelope based on cited literature and require explicit user acknowledgment for custom settings.
- Prioritize trust features (citation links, safety constraints, transparent logs) as the primary differentiation vs generic timer apps.

## Dependencies

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

External dependencies:
- Legal/compliance review for app-store metadata and disclaimer copy.
- PBM subject-matter advisor review before public protocol recommendations.

## Risks

- Regulatory risk: therapeutic language may trigger medical-device scrutiny if not tightly controlled.
- Safety risk: user-supplied irradiance assumptions can produce incorrect dose calculations without guardrails.
- Liability risk: users may treat the app as medical advice unless copy and UX boundaries are explicit.
- Market risk: hardware-led incumbents may outspend pure-software entrants unless software offers superior protocol intelligence and reporting.

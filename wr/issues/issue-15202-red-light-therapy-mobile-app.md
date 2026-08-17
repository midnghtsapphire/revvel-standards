# WR: Red Light Therapy Mobile App - Protocol guidance and session tracking for photobiomodulation therapy

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

<!-- revvel-research-findings -->

Primary technical source:
- [A Smartphone-Driven Low-Power Light-Emitting Device for Photobiomodulation Therapy (Sensors, PMCID: PMC5406741)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5406741/)

Key evidence extracted from PMCID `PMC5406741`:
- Device wavelengths reported: red and near-infrared LEDs (`630 nm` and `850 nm`).
- Reported output/therapy profile includes low irradiance and session-level radiant exposure suitable for PBM use cases, with the paper reporting approximately `3 mW/cm²` and `7.2 J/cm²` in the tested setup.
- Thermal safety in the test setup remained below approximately `41 °C` during operation.
- Preclinical result in the paper indicates positive wound-healing response in a mouse model.

Evidence confidence note:
- Numeric values above are sourced from the PMCID paper summary and should be re-verified directly against the publication figures/tables before any production medical UX claims.

## Executive Summary

Ship a demand-led mobile PBM companion app for people already buying red/NIR hardware and still lacking strong protocol UX. Lead with protocol guidance, session logging, reminders, and dose tracking; keep safety/compliance controls as quiet implementation boundaries rather than the main product story.

## Step 1A — Product/Output Selections

Output bundle:
- Mobile app (`iOS`, `Android`) using Expo/React Native
- Lightweight protocol engine for session presets
- Dose/session calculator tuned to the PMC5406741 study's reported 630/850 nm profile
- Session analytics/export (`CSV` and Markdown report)
- Hardware pairing/control layer for supported BLE or USB-C accessories

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
- Community channels with recurring demand discussion: Reddit biohacking/wellness communities, longevity creators, RealSelf LED-treatment threads, and device-specific app users looking for better protocol guidance.

### Competitor and Pricing Table

| Competitor | Product Type | Pricing | Notes |
| --- | --- | --- | --- |
| Joovv | Hardware + app ecosystem | `$599-$6,995+` | Premium hardware positioning with app-linked control and recovery messaging per [INIA cost overview](https://theinia.com/a/blog/red-light-therapy-cost) and [Comfytemp cost overview](https://comfytemp.com/blogs/news/red-light-therapy-cost-professional-vs-home). |
| Mito Red Light | Hardware-first ecosystem | `$199-$999` | Value-oriented home-device pricing range cited in [Comfytemp](https://comfytemp.com/blogs/news/red-light-therapy-cost-professional-vs-home) and [INIA](https://theinia.com/a/blog/red-light-therapy-cost). |
| RedLightOS | Android app / tracker | Free | Device-focused session tracking and protocol UX, which validates demand for software-first logging and reminders ([RedLightOS](https://redlightos.com/)). |
| RedMed | App-only workaround | `$1` | Low-cost "use your phone as the light source" positioning shows bargain demand but also leaves room for a serious protocol companion product ([Light Therapy Insiders review](https://www.lighttherapyinsiders.com/redmed-light-therapy-app-review/)). |

### Bill of Materials (BOM)

| Item | Category | Cost | Notes |
| --- | --- | --- | --- |
| Expo + React Native + TypeScript | App stack | Free to start | Matches repo mobile default; no incremental license cost for the first shipped build. |
| EAS Build / app store delivery | Build/distribution | `$0/month` free tier or `$19/month` starter tier | As of `2026-07-06`, public Expo pricing shows a usable free tier and a starter tier for launch-stage apps ([Expo pricing](https://expo.dev/pricing)). |
| Local encrypted storage library | App dependency | Internal estimate: low / open-source | Needed for private session history and export on-device. |
| BLE-enabled light accessory dev kit | Hardware integration | Internal estimate: `$50-$150/unit` | Small prototype budget for pairing, timer sync, and thermal-state testing. |
| Temperature sensor or thermal telemetry path | Safety instrumentation | Internal estimate: `$5-$15/unit` if external sensor is required | Only needed if the chosen accessory does not already expose temperature or duty-cycle telemetry. |

### Community Chatter

- Consistency and visible streak tracking are a recurring theme in red-light-therapy app discussions; users respond well to reminder loops and gamified adherence rather than a bare countdown timer ([Ubie Health](https://ubiehealth.com/doctors-note/red-light-therapy-app-track-gamify-glow-streaks-5743q2)).
- Public LED-treatment threads show ongoing peer-to-peer questions about whether users are dosing correctly, seeing results, or overdoing sessions, which supports a protocol-explainer + logging product instead of another generic timer ([RealSelf LED Light Therapy discussions](https://community.realself.com/forums/led-light-therapy)).
- Existing app-positioning pages already sell "intelligent tracker" language, which is evidence that the software wedge is protocol clarity and progress tracking, not just remote control ([RedLightOS](https://redlightos.com/)).
- Protocol-guide publishers keep producing device/dose explainers because users are still confused about timing, distance, and total energy delivered, which is exactly where a calculator-led mobile companion can win ([Red Light Therapy Expert protocols](https://redlighttherapy.expert/protocols/)).

### Domain Name Strategy

- `redlightprotocol.app`
- `pbmtracker.app`
- `lightdose.app`
- `photobiomodulationcoach.com`

Registrar availability was not verified in this pass, so treat these as naming directions to check before brand lock. Action: verify domain availability and registrar pricing before finalizing brand decisions.

### Revenue / Monetization Model

- Free core app for timer, reminders, and session logging to lower adoption friction.
- Premium upgrade for protocol packs, deeper exports, clinician/coach notes, and device-specific calculators (internal estimate: `$9-$19/month` or a discounted annual tier in roughly the `$99-$199/year` band).
- Affiliate revenue from compatible red/NIR hardware once the protocol library is trusted enough to recommend device classes.
- Team/clinic mode for estheticians, recovery studios, or coaching programs that need shared protocol templates and client progress exports.

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
- Must include user-facing thermal and overexposure warnings without turning the core experience into a compliance lecture.
- Must include explicit disclaimer language that avoids unapproved disease-treatment claims.
- Must support export of session logs.

Engineering requirements:
- Build with Expo/React Native + TypeScript per repo mobile standards.
- Config-driven protocol library (JSON) to allow updates without app rebuild.
- Local-first storage with encrypted at-rest session data.
- Feature-flag architecture for region-specific compliance copy.

Compliance requirements:
- Position as a protocol/tracking companion unless and until a medical-device pathway is intentionally pursued.
- Review public-facing copy for disease-treatment claims, but keep most limits internal to the protocol engine and session thresholds.
- Keep a traceable citation registry for every numeric claim shown in app education screens.

Validation requirements:
- Unit tests for dose calculations and duration guardrails.
- Integration tests for protocol execution state transitions.
- Manual QA checklist for safety lockouts, alert copy, and export correctness.

## Recommendations

- Start with an app-plus-protocol product that can pair with existing devices, then deepen hardware integration once the protocol/logging wedge is sticky.
- Use a conservative default protocol envelope based on cited literature and require explicit user acknowledgment for custom settings.
- Prioritize protocol clarity, reminders, and transparent session logs as the main differentiation vs generic timer apps; keep safety thresholds present but not overbearing.

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

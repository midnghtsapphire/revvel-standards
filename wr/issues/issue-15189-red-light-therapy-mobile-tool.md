# WR: Red Light Therapy Mobile Tool for Photobiomodulation

**Issue:** #15189  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-06  
**Researcher:** Copilot Coding Agent (GPT-5.5)  
**Research Date:** 2026-07-06  
**WR Status:** 🟡 In Progress

## Issue Context

The requester provided this source and asked for a mobile app or tool:

- [PMC8879555 article](https://pmc.ncbi.nlm.nih.gov/articles/PMC8879555/)

Requested outcome: create a red light therapy / photobiomodulation product
concept based on evidence from the cited publication.

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
- [x] Competitor analysis (table includes concrete prices or notes pending)
- [x] Domain strategy
- [x] Monetization
- [x] Every statistic/percentage cited with a source link or labeled estimate

## Research Findings

### 1. Executive Decision

Proceed with a **wellness-focused MVP** (timer + protocol assistant + tracking),
not a diagnosis or treatment app. The cited paper is useful as scientific context
for photosensitizers in photodynamic therapy, but the app should avoid medical
claims beyond cited evidence and should include strong safety disclaimers.

### 2. Evidence Base and Scope

- The provided article reviews natural photosensitizers and medicinal properties
  for photodynamic therapy:  
  [PMC8879555](https://pmc.ncbi.nlm.nih.gov/articles/PMC8879555/)
- PBM literature supports use of red/near-infrared light in specific contexts,
  but dosage and protocol quality are critical:  
  [PBM overview (NCBI Bookshelf)](https://www.ncbi.nlm.nih.gov/books/NBK580017/)
- FDA has cleared specific red-light devices for narrow intended uses; a generic
  app should not claim FDA clearance unless paired with a cleared device/use:  
  [FDA laser products overview](https://www.fda.gov/medical-devices/products-and-medical-procedures/laser-products-and-instruments)

### 3. Competitor and Pricing Snapshot

| Product | Positioning | Price |
| --- | --- | --- |
| Joovv App + hardware ecosystem | Device companion + routines | Hardware starts at $599 (Joovv shop) |
| Mito Red Light products | Device-led consumer PBM | Typical panels range by model (pricing changes by SKU) |
| Generic interval/timer apps | Habit/timer only | Free to low-cost subscriptions |

Pricing verification links:

- [Joovv products](https://joovv.com/products)
- [Mito Red Light](https://mitoredlight.com/)

Where exact competitor app subscription pricing is not publicly stable:
**Pricing data pending — competitive benchmark research required before MVP
feature-lock (collect final subscription benchmarks during implementation
kickoff).**

### 4. Target User and Core Jobs

Primary user:

- Wellness and recovery users who already own a red-light device and need a
  safer protocol/timer/tracking workflow.

Jobs to be done:

1. Select a protocol goal (recovery, skin routine, sleep support).
2. Run timed sessions with guardrails (max duration, cooldowns, reminders).
3. Track consistency and symptom notes.
4. Export a personal session history.

### 5. MVP Feature Set

1. **Protocol library:** evidence-linked routine templates with configurable
   duration and frequency.
2. **Session timer + safety guardrails:** automatic stop, cooldown reminders,
   eye-protection reminder, skin-sensitivity warning.
3. **Progress journal:** date, protocol, duration, optional notes.
4. **Device profile:** wavelength and power density fields for user-provided
   hardware specs.
5. **Disclaimer and risk screen:** non-medical tool notice, stop-use guidance,
   and referral to clinician for adverse effects.

### 6. Build Recommendation

Ship as a mobile-first web app first (PWA), then package native wrappers only
if demand validates.

Suggested starter stack:

- Next.js (existing repo standards)
- Local-first storage for MVP session history
- Optional account sync in phase 2

### 7. BOM (MVP)

- Product/design: protocol content and UX flows
- Frontend engineering: protocol engine, timer, history, settings
- Compliance review: wording for safety disclaimers and claims boundaries
- QA: mobile browser matrix + offline/PWA checks

## Requirements

### Functional Requirements

- User can select a protocol and run a guided timed session.
- App stores session history locally.
- App shows a required safety/disclaimer screen before first session.
- User can edit protocol defaults within safe bounds.

### Non-Functional Requirements

- Mobile responsive from 360px width and up.
- No protected health information required for MVP.
- Works offline after first load (PWA mode).
- Clear citation links for any medical/scientific statement in-app.

### Regulatory and Risk Guardrails

- Do not claim cure, diagnosis, or treatment of disease.
- Require explicit acknowledgement: informational wellness support only.
- Include “consult a licensed clinician” guidance for medical conditions.

## Recommendations

1. Open implementation as a dedicated product folder using existing monorepo
   Next.js conventions.
2. Gate launch copy through compliance review before public release.
3. Start with protocol/timer/tracking MVP and defer advanced personalization
   until usage data validates demand.

## Dependencies

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

## Risks

- **Medical-claim risk:** mitigated by strict non-diagnostic language.
- **Protocol misuse risk:** mitigated by conservative defaults + warnings.
- **Data interpretation risk:** mitigated by “journal only” framing and export
  for user/provider discussion rather than automated conclusions.

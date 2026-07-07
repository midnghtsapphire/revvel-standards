# WR: [WR] create mobile app or tool for red light therapy / photobiomodulation therapy

**Issue:** #15191  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-06  
**Research Date:** 2026-07-06  
**Researcher:** Copilot Coding Agent  
**WR Status:** 🟡 In Progress

## Issue Context

### Output Type (required)

production-app

### Summary

Build a mobile-first red light therapy / photobiomodulation tool, grounded in the referenced PubMed evidence, with explicit safety guardrails for oral lesions and cancer-risk contexts.

### Objective

Use the study at [PubMed PMID 33119134](https://pubmed.ncbi.nlm.nih.gov/33119134/) as the anchor source to define a safe, user-facing protocol assistant that helps users:

- choose session parameters by treatment goal,
- track sessions and symptoms,
- avoid risky use cases through clear contraindication warnings,
- export logs for clinician review.

### Required Bundle

- Mobile-first web app (PWA acceptable) with guided protocol builder
- Safety triage gate before each session
- Session timer + treatment log
- Symptom check-in and trend view
- CSV export for provider handoff

### Definition of Done

- A working mobile-first prototype is available from this repository
- Users can complete: onboarding → safety triage → protocol generation → timer → log save
- Safety guardrails block or warn on high-risk oral-cancer-related scenarios
- Session data can be exported as CSV

### Validation Expectations

- Basic flow works on phone viewport sizes
- Safety warnings trigger for contraindication answers
- Session logs persist locally for repeat use
- CSV export includes timestamp, body area, wavelength, dose plan, and symptom note

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

### 1) Evidence anchor and safety implications

Primary source: [PubMed PMID 33119134](https://pubmed.ncbi.nlm.nih.gov/33119134/)

The referenced study investigates wavelength- and dose-dependent effects of 660 nm and 810 nm low-power diode laser irradiation on oral cancer cells in vitro. Product scope should therefore treat this source as a safety-critical constraint, not only as a growth/usage opportunity.

Product requirement from evidence:

- hard-stop safety copy for users with known/suspected oral malignancy,
- explicit recommendation to seek licensed clinical guidance when red-flag symptoms are present,
- no medical cure claims in onboarding, protocol output, or marketing pages.

### 2) Audience we are going after and why

Primary audience:

- consumers already using at-home red light devices who need structure, tracking, and safer decision support.

Secondary audience:

- wellness clinics that want a simple patient-facing follow-up tracker.

Why this audience:

- they need practical workflow support (screening, timing, logging, consistency),
- they can adopt a mobile-first tool quickly without hardware changes.

### 3) Marketing and SEO plan

Core keyword set:

- red light therapy app
- photobiomodulation tracker
- red light therapy session log
- near infrared therapy safety
- 660nm 810nm photobiomodulation protocol

Content plan:

- educational landing page summarizing evidence limits and safe-use boundaries,
- protocol-tracking feature page,
- clinician-export feature page.

### 4) Competitor and GitHub star intelligence

| Competitor / Tool | Pricing | GitHub Stars | Notes |
| --- | --- | --- | --- |
| Consumer red-light timer apps (general category) | Pricing data pending — competitive benchmark research required. | N/A | Most focus on timers, not evidence-driven screening guardrails. |
| Generic habit trackers | Freemium across market; pricing varies. | N/A | Can track sessions but lacks domain-specific contraindication checks. |
| Open-source PBM-specific mobile project | Pricing data pending — competitive benchmark research required. | N/A | No clear dominant OSS PBM app identified from this issue packet alone. |

### 5) Chatter and demand signals

Observed demand pattern (qualitative):

- users ask for practical tools that simplify repeat treatment routines,
- users want accountability and easier provider communication,
- users are uncertain about safe parameter choices and risk boundaries.

### 6) Factual validation and evidence gaps

Verified now:

- PubMed source exists and is directly referenced by the issue: [PubMed PMID 33119134](https://pubmed.ncbi.nlm.nih.gov/33119134/)

Evidence still needed before medical-grade launch claims:

- additional clinical studies beyond one in-vitro paper,
- clinician-reviewed contraindication matrix for broader populations,
- regulatory/legal review for market-specific medical/wellness claims.

## Step 1A — Product/Output Selections

Selected output:

- mobile-first PWA first,
- optional React Native wrapper later if app-store distribution is required.

## Step 2 — Deep Web Research

Initial research packet uses the issue-provided PubMed source as the anchor constraint. Next research pass should add:

- systematic review sources,
- consensus statements/guidelines,
- device-manufacturer safety language cross-checks.

## Step 3 — Requirements

Functional requirements:

1. Safety triage questionnaire with red-flag branching.
2. Protocol builder with configurable wavelength, session duration, frequency, and target area.
3. Session timer with completion logging.
4. Symptom and response journaling.
5. Exportable CSV treatment history.

Non-functional requirements:

1. Mobile-first responsive UI.
2. Local data persistence.
3. Clear, non-therapeutic-disclaimer banner on all protocol views.
4. Audit-friendly timestamped logs.

## Recommendations

- Ship as a lightweight mobile web tool first to validate retention and safety-flow completion.
- Keep default protocol suggestions conservative and editable, with explicit clinician-review prompts.
- Position the product as a tracking and safety-support tool, not a diagnosis or treatment replacement.

## Dependencies

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

## Risks

- Clinical misuse risk if users skip warning language.
- Liability risk if marketing or UI wording implies medical treatment outcomes.
- Data privacy risk if logs later include sensitive health notes without proper controls.

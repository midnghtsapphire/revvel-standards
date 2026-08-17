# WR: Reclaiming Your Skin — How Contour Light / Red Light Therapy Can Help With Stretch Marks

**Issue:** #15279
**Status:** Draft — Compliance Review Required (HIPAA scope pack: issue #16111)
**Owner:** Product / Legal
**Last Updated:** 2026-08-08
**HIPAA entity scope SSOT:** `compliance/red-light-therapy/` (status in `status.json`)

---

## 1. Opportunity Summary

Postpartum and body-conscious consumers are actively seeking non-invasive, at-home solutions for stretch marks. Red light therapy (RLT) and contour light devices are a growing wellness category with strong search demand, high AOV affiliate products, and a receptive audience willing to pay for educational content, tracking tools, and curated product recommendations.

**Revenue vectors:**
- Affiliate commissions on RLT devices ($200–$2,000 AOV)
- Sponsored content from device manufacturers
- Premium subscription (progress tracking, protocol guides)
- Digital products (e-books, protocol PDFs)

**Target:** Contribute $2k–$5k/month toward the Phase 1 $10k/month goal within 90 days.

---

## 2. Product Concept

A content-first web property + companion progress tracking tool that helps users:
- Understand what stretch marks are and why RLT may help
- Compare devices (wavelength, irradiance, coverage, price)
- Log sessions and track visual progress over time
- Access educational protocols (frequency, duration, adjuncts)

---

## 3. Content Pillars

1. Science explainers (photobiomodulation basics, wavelengths, mechanisms)
2. Product reviews and comparisons
3. Protocols and routines (educational, non-prescriptive)
4. Postpartum recovery context (lifestyle, not medical advice)
5. Progress case studies (user-submitted, consented)

---

## 4. Traffic Strategy

- SEO: long-tail keywords ("red light therapy for stretch marks postpartum", "contour light vs joovv", etc.)
- Pinterest: high-visual before/after and infographic pins
- YouTube shorts + TikTok: 30–60s explainers
- Email list from lead magnet (protocol PDF)

---

## 5. Monetization Stack

| Channel | Est. Month 3 | Est. Month 6 |
|---|---|---|
| Affiliate (devices) | $1,500 | $4,000 |
| Affiliate (adjuncts: oils, creams) | $300 | $800 |
| Sponsored posts | $0 | $1,500 |
| Digital products | $200 | $700 |
| **Total** | **$2,000** | **$7,000** |

---

## 6. Tech Stack

- Next.js + MDX for content
- Vercel hosting
- Convertkit / Beehiiv for email
- Polar.sh for digital product checkout (aligns with $10M funding strategy)
- Optional: lightweight progress tracker (see §7)

---

## 7. Progress Tracker (Optional Feature)

A lightweight tool where users can log sessions and upload photos to visualize change over time.

**Original design (rejected):** client-side-only storage + medical disclaimers, framed as "not subject to HIPAA."

**Why rejected — see §8.**

---

## 8. Regulatory & Compliance Framework

> **Status: BLOCKING for tracker / health-data features.** Content-only publishing (no user health-data collection) and the shipped dosage calculator (ephemeral client-side numerics + honest `/privacy` policy) may proceed under the interim posture below. Progress tracker, photo upload, symptom logging, and any identifiable health-data intake remain on hold until §8.5 counsel items are complete.

> **Regulatory posture (canonical):** This property is a direct-to-consumer wellness / educational surface and is **not**, under current documented facts, operated as a HIPAA Covered Entity or Business Associate. We **do not claim HIPAA compliance**. Client-side calculation and encryption are engineering choices that reduce blast radius — **not** regulatory exemptions. FDA SaMD risk is a **separate** track. Source of truth: `compliance/red-light-therapy/entity-classification.md` and `compliance/red-light-therapy/status.json` (issue #16111). Any clinic partnership, HSA/FSA clinical workflow, insurance billing, telehealth, or receipt of PHI from a Covered Entity **voids** the provisional classification until counsel re-determines scope.

Earlier drafts of this WR conflated three separate regulatory concerns and attempted to use disclaimers and client-side storage as a substitute for compliance. That approach is legally insufficient and has been removed. The correct framing separates each regime and treats them as **independent** obligations.

### 8.1 Three Independent Regulatory Regimes

| Regime | Triggered By | Mitigated By |
|---|---|---|
| **HIPAA** | Handling Protected Health Information (PHI) as a Covered Entity or Business Associate | Full administrative, physical, and technical safeguards — **not** disclaimers, **not** storage location |
| **FDA SaMD** | Software that diagnoses, treats, cures, mitigates, or prevents disease | Scoping the product as wellness/educational; disclaimers; avoiding diagnostic claims |
| **State privacy laws** (CCPA/CPRA, WA My Health My Data, etc.) | Collecting personal or consumer health data, even outside HIPAA | Privacy notices, consent, deletion rights, data minimization |

These must be evaluated **separately**. Reducing FDA SaMD risk via disclaimers does **not** reduce HIPAA exposure. Client-side storage does **not** remove HIPAA applicability if PHI is being handled.

### 8.2 PHI Classification — Honest Assessment

The following inputs contemplated by the tracker are health data and, when linked to an identifiable individual, may constitute PHI or state-regulated consumer health data:

- Postpartum week / pregnancy status
- Stretch mark severity ratings
- Symptom notes
- Body photographs
- Session logs tied to a health goal

HIPAA applicability depends on whether we act as a **Covered Entity** or **Business Associate**. A direct-to-consumer wellness app is typically **not** a Covered Entity — but:

- Any integration with a healthcare provider, insurer, or clearinghouse can pull us in as a Business Associate.
- Even outside HIPAA, Washington's **My Health My Data Act**, CCPA/CPRA "sensitive personal information" rules, and similar state laws apply and carry private rights of action.
- Encryption and client-side storage do **not** change classification. They are controls, not exemptions.

### 8.3 What Disclaimers Can and Cannot Do

**Disclaimers CAN:**
- Support scoping the product as general wellness/educational for FDA SaMD purposes
- Set user expectations about non-medical intent
- Support consent and informed use

**Disclaimers CANNOT:**
- Exempt the app from HIPAA if PHI is handled
- Exempt the app from state consumer health privacy laws
- Substitute for BAAs, audit logging, access controls, or breach procedures
- Reclassify PHI as non-PHI

### 8.4 If HIPAA Applies — Minimum Required Program

If compliance review concludes HIPAA applies, the following must be in place **before** collecting any user health data:

1. **Business Associate Agreements (BAAs)** with every downstream processor (hosting, storage, analytics, email, backups, AI/ML providers).
2. **Administrative safeguards:** designated Privacy Officer and Security Officer, workforce privacy and security training, sanction policy, documented policies and procedures.
3. **Technical safeguards:** access controls with unique user IDs, automatic logoff, encryption at rest and in transit, integrity controls, transmission security.
4. **Audit controls:** comprehensive, tamper-evident audit logging of PHI access, modification, export, and deletion, with retention aligned to HIPAA requirements (minimum 6 years for related documentation).
5. **Breach notification procedures:** documented process meeting HHS timelines (individuals within 60 days, HHS notification, media notification for breaches >500 individuals).
6. **Risk analysis and risk management** documented and periodically updated.
7. **Contingency plan:** backup, disaster recovery, emergency mode operation.
8. **Physical safeguards** for any workstations or media handling PHI.

Encryption alone is not compliance. Storage location alone is not compliance.

### 8.5 Required Actions Before Tracker Launch

- [ ] **Formal Privacy Impact Assessment (PIA)** with legal/compliance covering HIPAA, FDA SaMD, CCPA/CPRA, WA MHMDA, GDPR (if EU traffic), and applicable state laws.
- [x] **Data classification review (shipped calculator):** `compliance/red-light-therapy/data-inventory.md` — ephemeral client-side numerics only; no accounts/photos/journals in shipped code.
- [x] **Internal regulatory scoping memo (provisional):** `compliance/red-light-therapy/entity-classification.md` + counsel packet `counsel-engagement-brief.md` (issue #16111). **Still requires human counsel countersignature** — `status.json` remains `UNSIGNED` until then.
- [ ] **Regulatory scoping memo signed by counsel** stating whether HIPAA applies and why/why not (fill §8 sign-off block; set `status.json` to `COUNSEL_SIGNED_PATH_B` or `COUNSEL_SIGNED_PATH_A`).
- [ ] **If HIPAA applies (Path A):** complete the §8.4 program *before* the tracker collects any user input.
- [x] **If HIPAA does not apply (Path B provisional):** reasoning documented in entity-classification memo; honest privacy policy published at product `/privacy` with **no** HIPAA-compliance claim; re-evaluation triggers in `compliance/red-light-therapy/re-evaluation-triggers.*`.
- [ ] **State-law consumer health privacy program** for any future identifiable health-data features (notice, consent, DSAR, deletion, minimization) — required before tracker launch even on Path B.
- [ ] **Separate FDA SaMD analysis:** confirm that content, features, and marketing claims stay within wellness/educational scope. Track any feature that could imply diagnosis, treatment, mitigation, prevention, or cure of disease and route to legal review. (Draft track: `wr/issues/issue-15279-fda-samd-intended-use-strategy.md`.)
- [x] **Vendor review (shipped calculator):** no app-level processors of dosage inputs; host/CDN only for static delivery — see data inventory. Re-run before adding analytics, accounts, or cloud sync.
- [ ] **Incident response runbook** documented and tested (FTC HBNR applicable even outside HIPAA).

### 8.6 Interim Posture

Until §8.5 is complete:

- Content publishing (articles, reviews, comparisons) may proceed.
- Affiliate links may proceed.
- Email capture may proceed **only** with a plain-language privacy notice, no collection of health inputs on signup, and standard marketing consent.
- **The progress tracker, photo upload, symptom logging, and any health-data intake are on hold.**
- Marketing copy must not make diagnostic, treatment, or medical-outcome claims.

### 8.7 Documentation Trail

All compliance decisions — including a decision that HIPAA does *not* apply — must be documented, dated, and signed off. "We used disclaimers" and "we stored it client-side" are not acceptable entries in that record.

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Regulatory action (HIPAA / state health privacy) | Medium | High | Complete §8.5 before any health data collection |
| FDA SaMD reclassification | Low–Medium | High | Strict wellness/educational scoping; legal review of claims |
| Affiliate program changes | Medium | Medium | Diversify across 3+ affiliate networks |
| SEO algorithm shifts | Medium | Medium | Multi-channel traffic (Pinterest, YouTube, email) |
| Content liability (medical claims) | Medium | High | Editorial review checklist; no outcome guarantees |

---

## 10. Timeline

- **Week 1–2:** Content architecture, first 10 pillar articles, legal scoping memo kickoff
- **Week 3–4:** Launch site, affiliate integrations, email capture
- **Week 5–8:** Scale content to 30 articles, Pinterest/YouTube distribution
- **Week 9–12:** Evaluate whether to build tracker — **gated on §8.5 completion**
- **Month 4–6:** Sponsored content outreach, digital product launch

---

## 11. Success Metrics

- Month 3: $2k MRR, 15k monthly visitors, 2k email subscribers
- Month 6: $7k MRR, 60k monthly visitors, 8k email subscribers
- Month 12: $15k+ MRR contribution to Phase 2 goal

# WR: Reclaiming Your Skin — Contour Light / Red Light Therapy Stretch Marks App

## Issue Reference
Issue #15279 — Red light therapy stretch marks app

## Summary
A guided companion app for users exploring red light therapy (RLT) as a self-care approach for stretch marks (including postpartum striae). The app provides education, session tracking, progress photo comparisons, and habit reminders. It is **not** a medical device and does **not** diagnose, treat, cure, or prevent any disease.

## Product Scope
- Educational content about red light therapy and skin recovery.
- Optional session logging (time, device used, area).
- Optional progress photos (stored locally by default).
- Reminders and habit streaks.
- Community/inspiration feed (opt-in, no health data shared).

## Revenue Model (aligned with $10k → $10M directive)
- **Polar.sh** GitHub funding for open-source core.
- Freemium mobile app: $9.99/mo premium tier (advanced tracking, unlimited photos, export).
- Affiliate revenue from vetted RLT device partners.
- White-label licensing to wellness brands (Phase 3).

Target: 1,000 paying users by month 6 → $10k MRR.

---

## Regulatory & Compliance Framework

> **Important:** This section replaces prior guidance that conflated medical disclaimers with regulatory compliance. Disclaimers reduce FDA SaMD classification risk **but do not substitute for HIPAA obligations**. These are treated as independent regulatory tracks.

### Track 1 — Data Classification & Privacy (HIPAA / GDPR / CCPA)

**Step 1: Formal Privacy Impact Assessment (PIA) — REQUIRED BEFORE LAUNCH**

Before any production release, engage privacy counsel to conduct a documented PIA covering:
- What data is collected (postpartum weeks, stretch mark severity ratings, symptom notes, photos, device usage).
- Whether collected data, when linked to identity, constitutes **Protected Health Information (PHI)** under HIPAA.
- Whether the entity operating the app qualifies as a **Covered Entity** or **Business Associate** under 45 CFR §160.103.
- Applicability of GDPR Article 9 (special category health data) and CCPA/CPRA sensitive personal information rules.

**Key principle:** Client-side storage, on-device encryption, and "we never see your data" architectures **do not** exempt an entity from HIPAA if PHI is being processed. HIPAA applies to the *entity handling PHI*, not merely the *storage location*.

**Step 2: Decision Point**

Based on the PIA, one of two paths must be formally documented:

#### Path A — HIPAA Applies (PHI is collected)
A complete HIPAA compliance program is required **before launch**, including:

| Requirement | Deliverable |
|---|---|
| Business Associate Agreements | BAA templates executed with **every** third-party processor (cloud, analytics, crash reporting, email, push notification providers, AI/ML vendors). No vendor without a BAA touches PHI. |
| Administrative Safeguards (§164.308) | Designated Privacy Officer and Security Officer; documented risk analysis; workforce sanctions policy. |
| Physical Safeguards (§164.310) | Device and media controls; facility access policies for any on-prem infrastructure. |
| Technical Safeguards (§164.312) | Access controls (unique user IDs, automatic logoff, encryption at rest and in transit — AES-256 / TLS 1.2+); integrity controls; audit controls. |
| Audit Logging | Immutable, tamper-evident logs of all PHI access, modification, export, and disclosure — retained ≥ 6 years. |
| Breach Notification | Documented procedure meeting §164.400–414: individual notice within 60 days, HHS notice, media notice for breaches ≥ 500 individuals, incident response runbook. |
| Workforce Training | HIPAA privacy and security training for **all** personnel with PHI access, completed before access is granted and annually thereafter; training records retained. |
| Access Controls | Role-based access, principle of least privilege, MFA, quarterly access reviews. |
| Patient Rights | Mechanisms to honor rights of access, amendment, accounting of disclosures, and restriction requests (§164.524–528). |
| Policies & Procedures | Written, versioned policies covering all of the above (§164.316). |

#### Path B — HIPAA Does Not Apply
If, after formal review, the PIA concludes HIPAA does not apply, **the reasoning must be explicitly documented**, including:
- Why collected data does not meet the PHI definition (e.g., no linkage to identity, no covered entity relationship, no treatment/payment/operations context).
- Which data elements were reviewed and the classification of each.
- Sign-off from qualified privacy counsel.
- A commitment to re-run the PIA whenever data collection scope changes.

Under Path B, GDPR and CCPA/CPRA obligations still apply and must be independently addressed — storage location is **not** a substitute for compliance.

**Step 3: Data Minimization (both paths)**
- Collect the minimum data necessary for the stated feature.
- Default to on-device storage; require explicit, granular consent for any cloud sync.
- Provide export and deletion tools that meet GDPR Article 17 and CCPA §1798.105.
- No sale of user data. Ever.

---

### Track 2 — FDA SaMD Risk Mitigation (INDEPENDENT from Track 1)

This track addresses whether the app functions as **Software as a Medical Device (SaMD)** under FDA guidance. It is separate from — and does not affect — HIPAA obligations under Track 1.

**Design choices to keep the app outside SaMD classification:**
- No diagnostic claims. No treatment recommendations. No dosage guidance.
- No algorithmic severity scoring presented as a clinical assessment.
- Educational content is clearly framed as general wellness information.
- Progress tracking is user-driven journaling, not clinical measurement.

**Disclaimers (required, but NOT a compliance substitute):**
- "This app is for general wellness and educational purposes only."
- "This app does not diagnose, treat, cure, or prevent any medical condition."
- "Consult a licensed healthcare provider before starting any therapy, especially postpartum."
- Disclaimers appear at onboarding, in-app, and in Terms of Service.

**Reminder:** Disclaimers may reduce SaMD classification risk. They do **not** exempt the app from HIPAA, GDPR, CCPA, FTC Act §5, or state health privacy laws (e.g., Washington My Health My Data Act, California CMIA).

---

### Track 3 — Other Applicable Regimes (checklist)
- **Washington My Health My Data Act (MHMDA)** — broad definition of "consumer health data"; likely applies regardless of HIPAA status.
- **California CMIA** — applies to health apps even outside HIPAA scope.
- **FTC Health Breach Notification Rule** — applies to non-HIPAA health apps.
- **App Store / Play Store health data policies** — separate contractual obligations.
- **State biometric laws** (BIPA, etc.) — relevant if photos are analyzed with ML.

---

## Pre-Launch Compliance Gate

The app **must not** ship to production until the following are complete and signed off by counsel:

- [ ] Documented Privacy Impact Assessment (Track 1, Step 1).
- [ ] Path A or Path B decision recorded with legal sign-off.
- [ ] If Path A: full HIPAA program stood up (all rows in the table above).
- [ ] If Path B: written classification memo justifying non-applicability.
- [ ] BAAs executed with all applicable vendors (Path A) or vendor list documented (Path B).
- [ ] FTC Health Breach Notification Rule compliance confirmed (both paths).
- [ ] MHMDA and CMIA analyses complete.
- [ ] Disclaimers implemented (SaMD risk mitigation — Track 2).
- [ ] Privacy policy and Terms of Service reviewed by counsel.
- [ ] Incident response runbook tested.

---

## Roadmap

### Phase 1 (Month 1–6) — Foundation, $10k MRR
- Complete PIA and compliance gate above.
- Ship MVP: education + local session tracking + local photos.
- Polar.sh funding page live.
- 1,000 paying users at $9.99/mo.

### Phase 2 (Month 6–18) — Growth, $30k MRR
- Affiliate partnerships with reputable RLT device vendors.
- Community features (opt-in, no health data shared publicly).
- Re-run PIA before enabling any cloud sync.

### Phase 3 (Month 18–30) — Scale, $100k MRR
- White-label / B2B licensing (each licensee runs its own PIA).
- International launch — GDPR readiness formalized.

### Phase 4 (Month 30–36) — $10M total
- Category expansion (postpartum recovery adjacent verticals).
- Each new data type triggers a new PIA.

---

## Notes
- Storage location is an engineering choice, not a compliance control.
- Disclaimers address FDA SaMD risk, not HIPAA.
- When in doubt, assume the stricter regime applies and get counsel involved early.

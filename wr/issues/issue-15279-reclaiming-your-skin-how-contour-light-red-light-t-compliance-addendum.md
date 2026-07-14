# Compliance Addendum: Issue #15279 — Red Light Therapy Stretch Marks App

**Related Issue:** #16058
**Parent WR:** `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md`
**Status:** Corrective addendum — supersedes prior HIPAA framing at lines 163, 208, and 220 of parent WR (Non-Functional Requirements §HIPAA-adjacent privacy, Recommendations §6 HIPAA posture, and Risks §1 Regulatory risk).

---

## 1. Purpose

This addendum corrects a material compliance error in the parent WR, which conflated **medical disclaimers** and **client-side storage** with **HIPAA regulatory compliance**. Those are independent regulatory considerations and must be treated as such.

The original framing created legal and liability exposure by implying that:

- Client-side encryption/storage exempts the app from HIPAA, and
- Educational disclaimers substitute for HIPAA compliance obligations.

Both assumptions are incorrect. This document establishes the corrected compliance posture.

---

## 2. Corrected PHI Classification

### 2.1 What we collect

The app collects, at minimum:

- Postpartum week / timeline
- Stretch mark severity ratings and photos
- Symptom notes and free-text health entries
- Session logs (device use, frequency, duration)
- User identity (email, account ID, device identifier)

### 2.2 Regulatory classification

When health-related data is **linked (or linkable) to an identified individual**, it constitutes **Protected Health Information (PHI)** under HIPAA if the entity handling it is a **Covered Entity** or **Business Associate**.

**Key correction:** HIPAA classification is determined by:

1. **Who** is handling the data (Covered Entity / Business Associate status), and
2. **What** the data is (individually identifiable health information),

**NOT by where or how the data is stored.** Client-side storage, end-to-end encryption, and "the server never sees it" architectures do **not** remove data from HIPAA scope if the entity otherwise meets Covered Entity or Business Associate criteria.

### 2.3 Covered Entity and Business Associate determination

**How an app becomes a Covered Entity (CE):** Only three categories qualify — (1) a healthcare provider that transmits health information electronically in connection with HIPAA-covered transactions (claims, eligibility, referrals), (2) a health plan, or (3) a healthcare clearinghouse. A D2C wellness app does not become a CE by collecting health data; it becomes one only by engaging in provider/plan/clearinghouse activities.

**Preliminary CE determination:** This app, as currently scoped (D2C wellness, no insurance billing, no provider relationship), is likely **NOT** a HIPAA Covered Entity.

**How an app becomes a Business Associate (BA):** A Business Associate is any entity that creates, receives, maintains, or transmits PHI *on behalf of* a Covered Entity as part of a service or function. BA status is determined by the nature of the work performed for a CE — **not** by whether a BAA has been signed. A missing BAA does not mean HIPAA does not apply; it means a required agreement is absent, which is itself a compliance violation.

**Preliminary BA determination:** This app is likely **NOT** a BA in its current D2C form. However, it would become a BA if it later integrates with a clinic, EHR platform, or health plan to process data on that entity's behalf.

**Both determinations must be:**

- Confirmed in writing by qualified healthcare counsel, and
- Re-evaluated any time the business model changes (e.g., partnering with a clinic, accepting HSA/FSA with provider integration, offering telehealth).

---

## 3. Other Applicable Regulations (Not Substituted by "Not HIPAA")

Even if HIPAA does not apply, the following regimes independently apply and must be addressed:

| Regime | Trigger | Requirement Summary |
|---|---|---|
| **FTC Health Breach Notification Rule (HBNR)** | Vendors of personal health records (PHRs), PHR-related entities, and third-party service providers to such entities — applicability must be confirmed before treating this as a requirement | Breach notification to users and FTC; media notice if >500 residents of one state or jurisdiction are affected |
| **FTC Act Section 5** | All consumer apps | No deceptive privacy claims; honor stated policies |
| **State laws (CCPA/CPRA, WA My Health My Data, CT, NV, TX)** | Consumers in those states | Consent, deletion rights, sensitive-data protections; WA MHMDA requires explicit consent for health data |
| **GDPR / UK GDPR** | EU/UK users | Article 9 special-category health data requires a lawful processing condition (explicit consent is one option; others include vital interests, legitimate public-health purposes, and research); Article 35 DPIA required when processing is *likely to result in high risk* — not automatically for every app with EU/UK users |
| **FDA SaMD** | Software intended for diagnosis/treatment | Classification review; mitigate via intended-use scoping and disclaimers |
| **App store policies (Apple HealthKit, Google Health Connect)** | Distribution | Data-use restrictions independent of law |

**Washington's My Health My Data Act (MHMDA)** is particularly notable: it applies broadly to consumer health data outside HIPAA, requires explicit opt-in consent, and carries a private right of action.

---

## 4. Required Actions (Blocking Launch)

### 4.1 Privacy Impact Assessment (PIA) — REQUIRED

Conduct a formal PIA with qualified counsel covering:

- Complete data inventory (fields, sources, purposes, retention)
- Data flow diagrams (client → server → third parties)
- Regulatory mapping (HIPAA, HBNR, MHMDA, GDPR, CCPA)
- Third-party processor inventory (analytics, crash reporting, cloud, LLM APIs)
- Risk register with mitigations

**Owner:** Legal + Engineering Lead
**Deadline:** Before any user data is collected in production.

### 4.2 If HIPAA IS in scope — role-specific roadmaps

Determine the role first, then apply only the obligations that correspond to that role.

#### 4.2a If the app is a Covered Entity (CE)

Full compliance roadmap required **before launch**:

- [ ] Business Associate Agreements (BAAs) executed with every third-party processor (vendor, cloud provider, analytics tool, error tracker, email, LLM API, etc.) that touches PHI on the CE's behalf
- [ ] HIPAA Security Rule administrative, physical, and technical safeguards
- [ ] Audit logging (access, modification, disclosure) with tamper-evident retention (minimum 6 years)
- [ ] Access controls with least-privilege, MFA, and periodic access review
- [ ] Documented breach notification procedures:
  - Breaches affecting **fewer than 500** individuals: notify HHS within **60 days after the close of the calendar year** in which the breach is discovered; notify affected individuals without unreasonable delay (no later than 60 days of discovery)
  - Breaches affecting **500 or more** individuals: notify HHS, affected individuals, and prominent media outlets serving the relevant state(s) within **60 days of discovery**
  - Note: media notice threshold is **>500 residents of a single state or jurisdiction**, not 500 people overall
- [ ] Workforce HIPAA training with attestation records
- [ ] Designated Privacy Officer and Security Officer
- [ ] Risk analysis and risk management plan (Security Rule §164.308(a)(1))
- [ ] Incident response runbook
- [ ] Contingency / disaster recovery plan
- [ ] Notice of Privacy Practices (CE-specific obligation; not required of BAs)

#### 4.2b If the app is a Business Associate (BA)

A BA has overlapping but distinct obligations:

- [ ] Execute a valid BAA with each Covered Entity for which PHI is processed
- [ ] Execute sub-BA (subcontractor) agreements with any downstream entities that touch the CE's PHI on the BA's behalf
- [ ] Implement the same Security Rule safeguards (administrative, physical, technical) as a CE
- [ ] Audit logging with 6-year retention
- [ ] Breach notification: a BA reports a breach to the **Covered Entity** (not directly to HHS or individuals) within **60 days of discovery** (or shorter if the BAA specifies); the CE then handles the HHS and individual notifications
- [ ] Workforce training and designated security contact
- [ ] Risk analysis and risk management plan

### 4.3 If HIPAA is NOT in scope

Document the determination explicitly:

- [ ] Written legal memo from qualified counsel stating why the app is not a Covered Entity or Business Associate
- [ ] Update all marketing, in-app copy, and this WR to remove any implication that "HIPAA-compliant" architecture provides regulatory protection it does not
- [ ] Confirm HBNR applicability with counsel — the FTC Health Breach Notification Rule applies to *vendors of personal health records, PHR-related entities, and their third-party service providers*, not to all non-HIPAA health apps automatically; applicability must be established under those defined categories before treating HBNR compliance as a requirement
- [ ] Implement MHMDA-compliant explicit opt-in consent flow for WA users (and consider applying nationally for simplicity)
- [ ] Publish honest privacy policy that describes actual data handling — do NOT claim HIPAA compliance if not audited/attested

### 4.4 Separate FDA SaMD Mitigation (Independent Track)

FDA SaMD classification is **independent** of HIPAA. Mitigations:

- Scope intended use to **general wellness** (21st Century Cures Act §3060 / FDA general wellness guidance)
- Avoid claims of diagnosis, cure, mitigation, treatment, or prevention of disease
- Clear educational-content framing and disclaimers
- No dosimetry recommendations that would constitute treatment guidance

**These disclaimers reduce SaMD risk. They do NOT and cannot reduce HIPAA, HBNR, MHMDA, or GDPR obligations.**

---

## 5. Prohibited Framings (Do Not Use)

The following statements are **prohibited** in code comments, marketing, documentation, and internal planning until validated by counsel:

- ❌ "Client-side storage means HIPAA doesn't apply."
- ❌ "Encryption at rest satisfies HIPAA."
- ❌ "Our disclaimers exempt us from HIPAA."
- ❌ "HIPAA-compliant" (without a completed compliance program and, ideally, third-party attestation)
- ❌ Any framing that treats disclaimers and HIPAA as substitutes for each other.

---

## 6. Revision to Parent WR

The HIPAA-related framing at lines 163, 208, and 220 of `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` is superseded by this addendum. The parent WR has been updated in this PR to:

1. Add a notice at the top cross-linking this addendum as the authoritative compliance framing.
2. The three affected sections (Non-Functional Requirements §HIPAA-adjacent privacy, Recommendations §6 HIPAA posture, Risks §1 Regulatory risk) remain as originally written for traceability; this addendum's guidance governs wherever there is a conflict.

---

## 7. Mission Alignment

Regulatory exposure is a launch-blocking risk for health-adjacent products. A single FTC HBNR enforcement action, MHMDA class action, or state AG investigation can halt revenue, impose multi-million-dollar settlements, and permanently damage brand equity.

Getting compliance right pre-launch is materially cheaper than remediation post-breach. This addendum is a required launch gate; no PHI-touching feature should reach production without the sign-off checklist in §8 being complete.

---

## 8. Sign-off Required Before Launch

- [ ] Qualified healthcare privacy counsel — written opinion on HIPAA scope
- [ ] Engineering Lead — technical safeguards implemented per determination
- [ ] Product Lead — user-facing copy reviewed for prohibited framings (§5)
- [ ] Designated Privacy Officer (if HIPAA in scope) — program attestation

---

*This addendum was created in response to Issue #16058 to correct the compliance conflation identified in the parent WR. It is advisory and does not itself constitute legal advice.*

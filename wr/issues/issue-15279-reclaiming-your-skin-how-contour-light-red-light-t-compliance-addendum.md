# Compliance Addendum: Issue #15279 — Red Light Therapy Stretch Marks App

**Related Issue:** #16058
**Parent WR:** `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md`
**Status:** Corrective addendum — supersedes prior HIPAA framing on line 190 of parent WR.

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

### 2.3 Covered Entity determination

A direct-to-consumer wellness app is generally **NOT** a Covered Entity unless it:

- Bills insurance / operates as a healthcare provider,
- Is a health plan, or
- Acts as a healthcare clearinghouse,
- Or is a Business Associate to any of the above.

**Preliminary determination:** This app, as currently scoped (D2C wellness, no insurance billing, no provider relationship, no BAAs with covered entities), is likely **NOT** a HIPAA Covered Entity.

**However**, this determination MUST be:

- Confirmed in writing by qualified healthcare counsel, and
- Re-evaluated any time the business model changes (e.g., partnering with a clinic, accepting HSA/FSA with provider integration, offering telehealth).

---

## 3. Other Applicable Regulations (Not Substituted by "Not HIPAA")

Even if HIPAA does not apply, the following regimes independently apply and must be addressed:

| Regime | Trigger | Requirement Summary |
|---|---|---|
| **FTC Health Breach Notification Rule (HBNR)** | Non-HIPAA health apps handling identifiable health data | Breach notification to users, FTC, and (if >500) media |
| **FTC Act Section 5** | All consumer apps | No deceptive privacy claims; honor stated policies |
| **State laws (CCPA/CPRA, WA My Health My Data, CT, NV, TX)** | Consumers in those states | Consent, deletion rights, sensitive-data protections; WA MHMDA requires explicit consent for health data |
| **GDPR / UK GDPR** | EU/UK users | Article 9 special-category data; explicit consent; DPIA |
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

### 4.2 If HIPAA IS in scope

Full compliance roadmap required **before launch**:

- [ ] Business Associate Agreements (BAAs) with **every** third-party processor touching PHI (cloud, analytics, error tracking, email, LLM APIs, etc.)
- [ ] HIPAA Security Rule administrative, physical, and technical safeguards
- [ ] Audit logging (access, modification, disclosure) with tamper-evident retention (min. 6 years)
- [ ] Access controls with least-privilege, MFA, and periodic review
- [ ] Documented breach notification procedures (60-day HHS notification, individual notice, media if >500)
- [ ] Workforce HIPAA training with attestation records
- [ ] Designated Privacy Officer and Security Officer
- [ ] Risk analysis and risk management plan (Security Rule §164.308(a)(1))
- [ ] Incident response runbook
- [ ] Contingency / disaster recovery plan
- [ ] Notice of Privacy Practices

### 4.3 If HIPAA is NOT in scope

Document the determination explicitly:

- [ ] Written legal memo from qualified counsel stating why the app is not a Covered Entity or Business Associate
- [ ] Update all marketing, in-app copy, and this WR to remove any implication that "HIPAA-compliant" architecture provides regulatory protection it does not
- [ ] Implement FTC HBNR breach notification procedures (non-HIPAA health apps are still subject to HBNR)
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

Line 190 of `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` and any surrounding compliance section is hereby **superseded** by this addendum. The parent WR should be updated in a follow-up PR to:

1. Remove any claim that storage architecture confers HIPAA compliance.
2. Reference this addendum as the authoritative compliance framing.
3. Split compliance discussion into two independent subsections: **(a) Health data privacy regulation** (HIPAA / HBNR / MHMDA / GDPR / CCPA) and **(b) FDA SaMD risk**.

---

## 7. Mission Alignment ($10M / 3 years)

Regulatory blowups are the fastest way to zero a health-adjacent product. A single FTC HBNR enforcement action, MHMDA class action, or state AG investigation can:

- Halt revenue,
- Impose settlements in the millions,
- Destroy the brand equity required to scale from $10k/mo → $10M.

Getting this right pre-launch is **cheaper by 2–3 orders of magnitude** than remediation post-breach. This addendum is a load-bearing gate for the Phase 1 → Phase 2 revenue transition.

---

## 8. Sign-off Required Before Launch

- [ ] Qualified healthcare privacy counsel — written opinion on HIPAA scope
- [ ] Engineering Lead — technical safeguards implemented per determination
- [ ] Product Lead — user-facing copy reviewed for prohibited framings (§5)
- [ ] Designated Privacy Officer (if HIPAA in scope) — program attestation

---

*This addendum was created in response to Issue #16058 to correct the compliance conflation identified in the parent WR. It is advisory and does not itself constitute legal advice.*

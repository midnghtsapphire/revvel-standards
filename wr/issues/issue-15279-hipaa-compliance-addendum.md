# HIPAA Compliance Addendum — Issue #15279 (Red Light Therapy Stretch Marks App)

**Status:** Corrective addendum to WR for issue #15279
**Supersedes:** Section on HIPAA compliance (line ~190) in `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md`
**Related Issues:** #16058, #16065
**Prime Directive Alignment:** Protect the $10k → $10M revenue path by eliminating regulatory liability that could halt operations.

---

## 1. Problem Statement

The original WR conflated **disclaimers and client-side storage** with **HIPAA compliance**. This is legally incorrect and exposes the business to material liability. HIPAA applies based on **what data is handled and by whom**, not where the bytes physically reside or how the UI is framed.

Three specific defects in the prior approach:

1. **PHI misclassification** — Postpartum week, stretch mark severity scores, symptom notes, and progress photos, when linked to an identifiable user (email, account, device ID, IP), meet the HIPAA definition of Protected Health Information (PHI) if the entity is a Covered Entity or Business Associate.
2. **Incomplete controls** — Encryption at rest is one of ~50+ HIPAA Security Rule requirements. It does not satisfy Administrative or Physical Safeguards, BAAs, audit logs, breach notification, access control, or workforce training.
3. **Disclaimer ≠ exemption** — Medical/educational disclaimers may lower FDA SaMD classification risk but do **not** exempt an app from HIPAA, GDPR, CCPA, or state health privacy laws (WA My Health My Data, CA CMIA, etc.).

---

## 2. Decision Framework — Are We a HIPAA-Regulated Entity?

HIPAA applies only if we are a **Covered Entity** (healthcare provider, plan, clearinghouse) OR a **Business Associate** (contracted to handle PHI on behalf of one).

### Decision Tree

```
Does the app receive data from, or transmit data to, a Covered Entity
(hospital, clinic, insurer, telehealth provider) on their behalf?
 │
 ├── YES → We are a Business Associate. Full HIPAA compliance REQUIRED.
 │
 └── NO → Are we billing insurance, prescribing, or diagnosing?
 │
 ├── YES → Likely Covered Entity. Full HIPAA compliance REQUIRED.
 │
 └── NO → Direct-to-consumer wellness app.
 HIPAA does NOT apply, BUT:
 • FTC Health Breach Notification Rule DOES apply
 • State health privacy laws DO apply (WA MHMD, CA CMIA)
 • GDPR Article 9 (special category data) DOES apply for EU users
 • FDA SaMD analysis STILL required independently
```

**Current classification for this app:** Direct-to-consumer wellness/cosmetic tracking. **HIPAA does not apply.** However, other regimes do — see Section 4.

---

## 3. Corrected Compliance Posture

### 3.1 If HIPAA IS in scope (future B2B/clinical pivot)

Mandatory before any PHI touches our systems:

- [ ] **BAAs signed** with every downstream processor (hosting, analytics, email, error tracking, LLM providers).
- [ ] **Administrative Safeguards:** designated Privacy Officer, Security Officer, written policies, workforce training (annual), sanction policy.
- [ ] **Physical Safeguards:** facility access controls, workstation security, device/media disposal procedures.
- [ ] **Technical Safeguards:** unique user IDs, automatic logoff, encryption in transit (TLS 1.2+) and at rest (AES-256), audit logs (6-year retention), integrity controls.
- [ ] **Breach Notification:** 60-day notification to affected individuals, HHS, and (if >500 affected) media. Documented incident response playbook.
- [ ] **Risk Analysis:** annual documented NIST 800-66 / HHS SRA Tool assessment.
- [ ] **Access Controls:** RBAC, least privilege, MFA on all admin accounts.

### 3.2 If HIPAA is NOT in scope (current D2C posture) — REQUIRED regardless

Even without HIPAA, we still owe users:

- [ ] **FTC Health Breach Notification Rule** compliance (applies to D2C health apps as of 2024 rule expansion).
- [ ] **Washington My Health My Data Act** compliance (opt-in consent for consumer health data, geofence restrictions, right to delete).
- [ ] **California CMIA + CCPA/CPRA** — treat symptom/health data as sensitive personal information.
- [ ] **GDPR Article 9** — explicit consent for special category (health) data from EU users.
- [ ] **Written Privacy Policy** listing every data element collected, purpose, retention, third-party sharing.
- [ ] **Data Minimization** — do not collect health data we do not need for the stated feature.
- [ ] **Deletion API** — user-initiated hard delete within 30 days.
- [ ] **Encryption in transit and at rest** — table stakes, not a compliance claim.
- [ ] **Vendor review** — DPA (not BAA) with every processor.

---

## 4. Separation of Concerns: HIPAA vs FDA SaMD

These are **independent** regulatory tracks and must be assessed separately.

| Concern | Regulator | Trigger | Mitigation |
|---|---|---|---|
| PHI handling | HHS / OCR (HIPAA) | Being a CE or BA | Full Security Rule + BAAs |
| Consumer health data | FTC + State AGs | D2C collection of health data | Privacy policy, MHMD, breach rule |
| Medical device software | FDA (SaMD) | Diagnosing, treating, or informing clinical decisions | Wellness/educational framing, no diagnostic claims, disclaimers |
| EU health data | EU DPAs (GDPR Art. 9) | EU user data | Explicit consent, DPO, SCCs |

**Disclaimers reduce FDA risk only.** They have zero effect on HIPAA, FTC, or state privacy law obligations.

---

## 5. Action Items

1. **Immediate (Week 1):** Legal counsel review to formally classify entity status (CE / BA / neither). Document the determination in `/compliance/entity-classification.md`.
2. **Immediate (Week 1):** Data inventory — enumerate every field collected, whether it is health data, identifiability status, retention period.
3. **Pre-launch (Week 2-3):** Publish privacy policy compliant with WA MHMD + GDPR Art. 9 + CCPA sensitive-data disclosures.
4. **Pre-launch (Week 3):** Implement user-facing data export + deletion.
5. **Pre-launch (Week 4):** DPA (or BAA if applicable) signed with every processor; catalog in `/compliance/vendor-register.md`.
6. **Ongoing:** Annual privacy impact assessment; re-run entity classification if business model changes (e.g., B2B clinic partnerships).

---

## 6. Revised Framing for the Original WR

Replace the prior HIPAA section with:

> **Regulatory posture:** This app is a direct-to-consumer wellness product and is not, at launch, a HIPAA Covered Entity or Business Associate. We do not claim HIPAA compliance. We do comply with the FTC Health Breach Notification Rule, Washington My Health My Data Act, CCPA/CPRA sensitive-data provisions, and GDPR Article 9. Client-side storage and encryption are engineering choices that reduce breach blast radius, not compliance controls. FDA SaMD risk is separately mitigated via wellness/educational framing and explicit non-diagnostic disclaimers. If the business model expands to include clinical partnerships, insurance billing, or receipt of PHI from Covered Entities, a full HIPAA compliance program will be stood up before any such data is accepted.

---

## 7. Revenue-Path Impact ($10k → $10M)

- **Removes launch blocker:** Correct classification unblocks D2C launch without pretending to a HIPAA posture we cannot defend.
- **Preserves B2B upside:** Documented framework lets us pivot to clinic/telehealth partnerships (higher ACV) with a known compliance ramp cost.
- **Reduces tail risk:** A single FTC or state AG enforcement action ($50k–$5M+ penalties) would end the $10M trajectory. This addendum eliminates the largest legal tail risk in the WR.

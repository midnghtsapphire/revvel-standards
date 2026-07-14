# HIPAA / PHI Compliance Strategy

**Status:** Draft v1 — supersedes prior disclaimer-based framing in `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` (line ~190).

**Owner:** Compliance Lead (TBD)  
**Reviewers:** Legal, Security, Product

---

## 1. Problem Statement

Prior WR content implied that HIPAA obligations could be avoided by:

- Storing health data client-side.
- Adding medical disclaimers.
- Framing the app as "educational."

**This is legally insufficient.** HIPAA applies to Covered Entities and Business Associates that create, receive, maintain, or transmit Protected Health Information (PHI). Storage location and disclaimer language do **not** change PHI classification, and disclaimers do **not** exempt an app from HIPAA. Disclaimers may reduce FDA SaMD classification exposure but are an independent control from HIPAA compliance.

## 2. Data We Collect (Red-Light / Stretch Marks App Example)

The app under review collects:

- Postpartum week / timeline data
- Stretch mark severity (self-rated + photo)
- Symptom notes
- Optional email / account identity
- Device usage session data

When any of the above are linked to an identifier (email, account ID, device ID, photo of identifiable body region), the combination is health data tied to an identity.

## 3. Regulatory Analysis (Two Independent Tracks)

HIPAA and FDA SaMD are **separate** regulatory considerations. Both must be evaluated independently.

### 3a. HIPAA Applicability

HIPAA applies **only** if the entity is a Covered Entity (health plan, provider, clearinghouse) or a Business Associate of one. A direct-to-consumer (D2C) wellness app that:

- Does not bill insurance,
- Does not receive PHI from a Covered Entity,
- Does not act as a Business Associate,

is generally **not** subject to HIPAA. However, it **is** subject to:

- **FTC Health Breach Notification Rule (HBNR)** — expanded 2024 scope explicitly covers health apps.
- **FTC Act Section 5** — deceptive/unfair privacy practices.
- **State laws:** CCPA/CPRA (CA), WA My Health My Data Act, CT, TX, VA, CO consumer health data laws.
- **GDPR / UK GDPR** if EU/UK users (Article 9 special category data).
- **PIPEDA** (Canada), **LGPD** (Brazil), etc.

**Conclusion:** Even where HIPAA does not apply, a robust health-data compliance program is required. The prior "we're not HIPAA because it's client-side" framing is wrong on multiple axes.

### 3b. FDA SaMD Applicability (Independent Track)

SaMD classification depends on **intended use**, not storage. If the app:

- Claims to diagnose, treat, cure, mitigate, or prevent a condition → likely device.
- Provides general wellness / educational content without medical claims → likely non-device (FDA General Wellness Policy).

Disclaimers and educational framing **can** legitimately reduce SaMD classification risk here — but they do **nothing** for HIPAA/HBNR/state privacy law.

## 4. Decision Framework

Before launch, complete this checklist per app:

| # | Question | If Yes | If No |
|---|----------|--------|-------|
| 1 | Are we a Covered Entity or Business Associate? | Full HIPAA program required (§5) | Continue |
| 2 | Do we collect identifiable health/wellness data? | FTC HBNR + state consumer-health laws apply (§6) | Minimal privacy program |
| 3 | Do we make diagnostic/therapeutic claims? | FDA SaMD pathway (§7) | General wellness lane |
| 4 | Do we serve EU/UK/CA/CO/CT/TX/VA/WA users? | Apply strictest applicable regime (§6) | Continue |
| 5 | Do we share data with third parties (analytics, LLMs, cloud)? | Vendor DPAs / BAAs required (§5.2) | Continue |

## 5. HIPAA Compliance Roadmap (Required if §4.Q1 = Yes)

Storage encryption alone is **not** sufficient. Required components:

### 5.1 Administrative Safeguards
- Designated Privacy Officer and Security Officer
- Documented policies & procedures
- Workforce training (initial + annual)
- Sanction policy for violations
- Risk analysis and risk management plan (documented, updated annually)
- Contingency plan (backup, disaster recovery, emergency mode)

### 5.2 Business Associate Agreements (BAAs)
Execute BAAs with every downstream processor that touches PHI, including:
- Cloud hosts (AWS, GCP, Azure — use HIPAA-eligible services only)
- Email / SMS providers
- Analytics vendors (most consumer analytics are **not** BAA-eligible)
- LLM / AI providers (OpenAI, Anthropic, etc. — enterprise tier + BAA)
- Error monitoring, customer support tools

### 5.3 Physical Safeguards
- Facility access controls
- Workstation/device security policies
- Media disposal & re-use procedures

### 5.4 Technical Safeguards
- Access control (unique user IDs, automatic logoff, encryption)
- Audit controls (comprehensive, tamper-evident audit logs)
- Integrity controls
- Transmission security (TLS 1.2+, at-rest AES-256)
- Authentication (MFA for admin access)

### 5.5 Breach Notification
- Documented breach response runbook
- 60-day individual notification
- HHS notification (≥500 records: immediate; <500: annual log)
- Media notification (≥500 in a state/jurisdiction)

### 5.6 Documentation
- Retain policies, risk analyses, and BAAs for **6 years**.

## 6. Non-HIPAA Health-Data Compliance (Required if §4.Q2 = Yes, even if §4.Q1 = No)

### 6.1 FTC Health Breach Notification Rule
- Applies to "vendors of personal health records" — broadly interpreted (2024 rule).
- Breach notification to consumers, FTC, and (≥500) media within 60 days.

### 6.2 Washington My Health My Data Act (and analogs)
- Requires **explicit consent** before collecting consumer health data.
- Separate consent for sharing/selling.
- Consumer rights: access, delete, withdraw consent.
- Geofencing restrictions around health facilities.
- Private right of action → high litigation risk.

### 6.3 CCPA/CPRA Sensitive Personal Information
- "Health" is SPI; users can limit use.
- Notice at collection required.

### 6.4 GDPR Article 9
- Health data is "special category."
- Requires an Article 9 lawful basis (usually explicit consent).
- DPIA required.
- DPO likely required.

### 6.5 Baseline Program (all apps handling health data)
- Privacy Impact Assessment (PIA) / DPIA on file before launch
- Public privacy policy accurately describing data flows
- Consent capture + withdrawal mechanism
- Data minimization: collect only what's needed
- Retention schedule + automated deletion
- Vendor inventory + DPAs
- Encryption in transit and at rest
- Access controls and audit logs
- Incident response plan
- Annual security review / penetration test

## 7. FDA SaMD Risk Mitigation (Independent of HIPAA)

Use disclaimers and educational framing to stay within the FDA General Wellness Policy where appropriate. Guardrails:

- No diagnostic/therapeutic claims in copy, UI, or marketing
- No claims to cure, treat, mitigate, or prevent specific diseases
- Reference to general wellness / lifestyle only
- "Not a medical device / consult your clinician" disclaimer prominently displayed
- Review by regulatory counsel before major claim changes

**Reminder:** These disclaimers address FDA risk only. They do **not** reduce HIPAA, HBNR, or state consumer-health-data obligations.

## 8. Client-Side / On-Device Storage Position

On-device storage is a **useful data-minimization control** and reduces breach blast radius, but it is **not** a compliance exemption:

- PHI classification is based on **what** the data is, not **where** it lives.
- If any identifiable health data leaves the device (backups, analytics, crash reports, sync, support tickets, LLM prompts), full obligations apply to that flow.
- Document the data-flow diagram and label every egress.

## 9. Required Actions Before Launch (per app)

1. Complete formal Privacy Impact Assessment with Legal + Security sign-off.
2. Complete Data Classification Review — enumerate every field and label PHI / consumer health data / other.
3. Produce Data Flow Diagram identifying all third parties and egress points.
4. Execute DPAs / BAAs with every applicable vendor.
5. Publish accurate Privacy Policy + in-app Notice at Collection.
6. Implement consent capture (WA MHMDA-grade explicit consent for health data).
7. Stand up audit logging + breach response runbook.
8. Complete workforce privacy & security training.
9. Legal sign-off memo: which regimes apply, which do not, and why (in writing).
10. If HIPAA is deemed **out of scope**, document the reasoning explicitly (do not rely on storage location as the justification).

## 10. Corrections to Prior WR Framing

Any WR, spec, or marketing artifact that states or implies the following must be revised:

- ❌ "Client-side storage means we're not subject to HIPAA."
- ❌ "Disclaimers make us exempt from HIPAA."
- ❌ "Educational framing removes health-data compliance requirements."
- ❌ "Encryption alone satisfies HIPAA."

Replace with language grounded in §3–§7 of this document.

## 11. References

- 45 CFR Parts 160, 162, 164 (HIPAA Privacy, Security, Breach Notification Rules)
- FTC Health Breach Notification Rule, 16 CFR Part 318 (2024 amendments)
- FDA General Wellness: Policy for Low Risk Devices (Guidance, Sept 2019)
- FDA Software as a Medical Device (SaMD) — IMDRF framework
- Washington My Health My Data Act (RCW 19.373)
- CCPA/CPRA — Cal. Civ. Code §1798.100 et seq.
- GDPR Articles 6, 9, 35

---

**Change log**

- v1 (initial): Establishes independent HIPAA vs. FDA SaMD tracks; deprecates disclaimer-as-HIPAA-control framing; defines pre-launch checklist. Closes #16058, #16067.

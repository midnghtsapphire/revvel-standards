# HIPAA Compliance Addendum — Issue #15279

**Status:** DRAFT — Legal review required before implementation
**Supersedes:** HIPAA guidance in `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` (line 190)
**Related Issues:** #16058, #16065, #16075, #15279
**PR:** #15280

---

## 1. Problem Statement

The original WR document conflated three independent regulatory concerns:

1. **HIPAA** (health data privacy — HHS/OCR jurisdiction)
2. **FDA SaMD** (Software as a Medical Device — FDA jurisdiction)
3. **General consumer disclaimers** (liability limitation — contract/tort law)

It incorrectly asserted that:

- Client-side storage exempts the app from HIPAA.
- Encryption alone satisfies HIPAA.
- Medical disclaimers reduce or eliminate HIPAA obligations.

**All three assertions are legally incorrect.** HIPAA applies to any covered entity or business associate that creates, receives, maintains, or transmits Protected Health Information (PHI), regardless of storage architecture. Disclaimers do not alter regulatory classification.

---

## 2. Data Classification Decision Tree

Before any launch, product + legal MUST answer these in writing:

### Step 1 — Are we a Covered Entity or Business Associate

- **Covered Entity:** health plan, healthcare clearinghouse, or healthcare provider that transmits health info electronically in connection with a HIPAA transaction.
- **Business Associate:** performs functions/services on behalf of a covered entity involving PHI.

If **NO to both** → HIPAA does not directly apply. State privacy laws (CCPA/CPRA, Washington My Health My Data Act, biometric laws) still apply.

If **YES** → full HIPAA Privacy + Security + Breach Notification Rules apply. Proceed to Step 2.

### Step 2 — Is the collected data PHI

Data is PHI when it is **individually identifiable health information** created/received by a covered entity or business associate. Examples in this app that likely qualify **if** Step 1 = YES:

- Postpartum week counter tied to a user account
- Stretch mark severity self-assessments tied to identity
- Symptom notes, photos, treatment logs tied to identity
- Device usage patterns correlated with a named/emailed user

Data is **NOT** PHI when:

- Fully de-identified per 45 CFR §164.514 (Safe Harbor or Expert Determination), OR
- Collected outside a covered entity/business associate relationship (direct-to-consumer wellness app with no provider relationship).

### Step 3 — Direct-to-Consumer Wellness Path

Most stretch-mark / red-light-therapy consumer apps are **NOT** HIPAA-regulated because there is no covered entity relationship. However, they ARE regulated by:

- **FTC Health Breach Notification Rule** (16 CFR Part 318) — applies to vendors of personal health records and health apps.
- **State laws:** Washington MHMDA, Nevada SB 370, California CMIA/CPRA, Illinois BIPA (if photos/biometrics).
- **FDA SaMD** — if the app makes diagnostic/treatment claims.

**Conclusion:** "We're not HIPAA-covered" is a defensible position for a D2C wellness app, but it must be documented and the alternative regulatory obligations must be met.

---

## 3. Compliance Roadmap (Two Paths)

### Path A — D2C Wellness (Recommended for MVP)

Document in writing that the app is not a covered entity and does not enter business associate relationships. Then implement:

- [ ] Written data classification memo signed by legal counsel
- [ ] Privacy policy compliant with CCPA/CPRA, MHMDA, GDPR (if EU users)
- [ ] FTC Health Breach Notification Rule compliance (breach response plan, 60-day notification)
- [ ] Explicit opt-in consent for any health data collection (MHMDA requires this)
- [ ] Right-to-delete, right-to-access workflows
- [ ] Data minimization — collect only what the feature requires
- [ ] No sale/share of health data (MHMDA prohibits without separate consent)
- [ ] Vendor review: any analytics/crash/AI vendor touching health data needs DPA + review
- [ ] Remove any language implying provider/clinical relationship
- [ ] FDA SaMD analysis — separate track (see §4)

### Path B — HIPAA-Covered (Required if partnering with providers/insurers)

Triggered if the app integrates with clinics, accepts provider referrals with PHI, or bills insurance. Requires:

- [ ] Designated Privacy Officer and Security Officer
- [ ] Business Associate Agreements (BAAs) with **every** downstream vendor (hosting, analytics, email, SMS, AI/LLM providers, error monitoring, CDN if it sees PHI)
- [ ] HIPAA Security Rule technical safeguards: access control, audit controls, integrity, transmission security, encryption at rest + in transit
- [ ] Administrative safeguards: risk analysis, workforce training, sanctions policy, contingency plan
- [ ] Physical safeguards for any on-prem systems
- [ ] Audit logging of all PHI access (who, what, when) with tamper-evident retention (≥6 years)
- [ ] Breach notification procedures per 45 CFR §164.400–414 (individual, HHS, media if ≥500)
- [ ] Annual risk assessment + remediation tracking
- [ ] Workforce HIPAA training on hire + annually
- [ ] Minimum-necessary access enforcement
- [ ] Patient rights workflows: access, amendment, accounting of disclosures, restrictions

**Client-side storage and end-to-end encryption REDUCE risk surface but do NOT exempt from Path B obligations.**

---

## 4. FDA SaMD — Separate Track

HIPAA and FDA SaMD are independent. The SaMD analysis asks:

- Does the software drive clinical management or inform clinical management? (higher risk)
- Does it provide information for non-serious situations? (lower risk)
- Is it a general wellness product under FDA's 2019 wellness guidance? (typically out of scope)

Disclaimers + educational framing help keep the app in **general wellness** territory, which reduces FDA SaMD risk. **This is orthogonal to HIPAA** and must not be conflated.

---

## 5. Corrections to Original WR Document

The following statements in `issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` around line 190 must be revised:

| Original (incorrect) framing | Corrected framing |
|---|---|
| "Client-side storage avoids HIPAA" | Storage architecture does not determine HIPAA applicability. Covered-entity status does. |
| "Disclaimers exempt us from HIPAA" | Disclaimers address FDA SaMD and tort liability, not HIPAA. |
| "Encryption = HIPAA compliance" | Encryption is one Security Rule safeguard among many; full compliance requires BAAs, audit logs, training, breach procedures, etc. |
| "We are HIPAA-safe because we don't store on our servers" | Restate as: "We are not a HIPAA covered entity or business associate; therefore HIPAA does not apply. We comply with FTC HBNR, MHMDA, CCPA/CPRA instead." (pending legal sign-off) |

---

## 6. Action Items (Owners TBD)

1. **Legal:** written data classification memo — is app a covered entity / BA? (blocking launch)
2. **Product:** inventory every health data field collected, its purpose, retention, and sharing.
3. **Engineering:** map data flows to identify any vendor that would need a BAA under Path B.
4. **Compliance:** draft privacy policy per Path A obligations; draft HIPAA program per Path B if triggered.
5. **Regulatory:** separate FDA SaMD determination memo — do not bundle with HIPAA analysis.
6. **Docs:** update WR document to remove conflated language and link to this addendum.

---

## 7. References

- 45 CFR Parts 160, 162, 164 (HIPAA Privacy, Security, Breach Notification)
- 45 CFR §164.514 (De-identification)
- 16 CFR Part 318 (FTC Health Breach Notification Rule)
- Washington RCW 19.373 (My Health My Data Act)
- FDA Guidance: "General Wellness: Policy for Low Risk Devices" (Sept 2019)
- FDA Guidance: "Software as a Medical Device (SaMD): Clinical Evaluation" (Dec 2017)

---

**Nothing in this document constitutes legal advice. Retain qualified healthcare regulatory counsel before launch.**

# Compliance Addendum: Issue #15279 — Red Light Therapy Stretch Marks App

**Supersedes:** Section on HIPAA compliance in `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` (line 190)
**Status:** Authoritative — read this before implementing any data collection features
**Issue Reference:** Response to WR review flagging HIPAA/disclaimer conflation

---

## 1. Problem With Prior Framing

The original write-up assumed that:
- Client-side storage exempts the app from HIPAA
- Medical disclaimers reduce regulatory obligations
- Encryption satisfies compliance requirements

**All three assumptions are legally incorrect.** HIPAA applies based on *who handles PHI and for what purpose*, not on *where the bytes live*. Disclaimers address FDA SaMD scope, not HIPAA scope. Encryption is one control among many required by the Security Rule.

---

## 2. Data Classification Decision Tree

Before any data field is added to the app, run it through this decision tree:

```
Does the field describe a health condition, symptom,
treatment, or physiological measurement?
         │
         ├── NO ──► Non-health data. Standard privacy rules (GDPR/CCPA) apply.
         │
         └── YES ─► Is it linked (directly or indirectly) to an identifiable person?
                         │
                         ├── NO ──► De-identified per HIPAA Safe Harbor.
                         │         Document the de-identification method.
                         │
                         └── YES ─► Are we acting as, or on behalf of,
                                    a Covered Entity (provider, plan, clearinghouse)?
                                         │
                                         ├── YES ──► PHI. Full HIPAA compliance required.
                                         │
                                         └── NO ───► Consumer health data.
                                                     Not HIPAA-regulated, but subject to:
                                                     - FTC Health Breach Notification Rule
                                                     - State laws (WA My Health My Data,
                                                       CA CMIA, CO/CT/VA consumer health)
                                                     - GDPR Article 9 (special category) if EU
```

### Fields Currently Proposed and Their Classification

| Field | Category | Regulatory Regime (Consumer B2C Model) |
|---|---|---|
| Postpartum week | Health status | Consumer health data — WA MHMDA, GDPR Art. 9 |
| Stretch mark severity photos/scores | Health condition | Consumer health data — WA MHMDA, GDPR Art. 9 |
| Symptom notes | Health condition | Consumer health data — WA MHMDA, GDPR Art. 9 |
| Device usage timestamps | Behavioral | Standard privacy |
| Email / account ID | Identifier | Standard privacy |

**Conclusion for the current B2C direct-to-consumer model:** The app is *not* a HIPAA Covered Entity or Business Associate, because it is not acting on behalf of a provider, plan, or clearinghouse. However, the collected data **is consumer health data** and triggers a parallel (and in some cases stricter) set of obligations. HIPAA is out of scope; consumer health data laws are not.

---

## 3. Two Independent Regulatory Tracks

These are **separate** and must be treated separately. Neither can substitute for the other.

### Track A — FDA SaMD Scope Management
**Goal:** Avoid being classified as a medical device.
**Controls:**
- Position app as wellness/educational, not diagnostic or therapeutic
- Do not claim to diagnose, treat, cure, mitigate, or prevent disease
- No automated treatment recommendations tied to clinical thresholds
- Clear disclaimers: "Not a medical device. Not medical advice."
- Route symptom escalations to "consult your clinician" language

**Disclaimers belong here — and only here.**

### Track B — Consumer Health Data Privacy
**Goal:** Lawfully collect, store, and process consumer health data.
**Controls (mandatory before launch):**

1. **Consent architecture**
 - Separate, opt-in consent for each category of health data
 - Withdrawable, granular, timestamped, versioned
 - Meets WA MHMDA "valid authorization" bar (which is stricter than HIPAA authorization)

2. **Data minimization**
 - Collect only fields with a documented product purpose
 - Default retention: 90 days after last use; user-triggered deletion within 30 days

3. **Third-party processor controls**
 - Every vendor touching health data signs a Data Processing Agreement (DPA)
 - If a vendor is *also* a HIPAA BA for other clients, execute a BAA as belt-and-suspenders even though we are not a Covered Entity
 - Vendor inventory maintained in `compliance/vendors.md`

4. **Security controls**
 - Encryption at rest (AES-256) and in transit (TLS 1.2+)
 - Access controls: role-based, least privilege, MFA for all admin access
 - Audit logging: immutable log of every read/write of health data fields, retained 6 years
 - Key management via managed KMS, not application-embedded

5. **Breach response**
 - Documented playbook: detection → containment → assessment → notification
 - FTC Health Breach Notification Rule: notify affected users and FTC within 60 days
 - State AG notifications as required (varies)
 - Tabletop exercise before launch and annually

6. **Workforce training**
 - Privacy and security training on hire and annually
 - Signed acknowledgment retained
 - Contractor access gated on completion

7. **User rights**
 - Access, correction, deletion, portability endpoints
 - Response SLA: 30 days

8. **Governance**
 - Named Privacy Lead (documented in `compliance/roles.md`)
 - Privacy Impact Assessment (PIA) completed and reviewed by counsel before launch
 - Annual PIA refresh; ad-hoc PIA on any new health data field

---

## 4. If We Later Pivot to B2B (Provider/Clinic Partnerships)

The moment we sign a contract to process health data *on behalf of* a Covered Entity, we become a Business Associate and full HIPAA applies. This pivot requires, before any data flows:

- Executed BAA with the Covered Entity
- HIPAA Security Rule risk analysis
- Administrative, physical, and technical safeguards per 45 CFR § 164.308–312
- Breach Notification Rule procedures (60-day notification to CE)
- Subcontractor BAAs
- Independent HIPAA readiness assessment

**Do not accept a B2B deal on the assumption that current controls are HIPAA-sufficient.** They are designed for consumer health data, which overlaps with but does not equal HIPAA.

---

## 5. Pre-Launch Checklist (Blocking)

- [ ] Data classification memo signed by counsel
- [ ] PIA completed and filed
- [ ] Consent flows implemented and legal-reviewed
- [ ] Vendor inventory + DPAs executed
- [ ] Audit logging deployed and tested
- [ ] Breach response playbook + tabletop completed
- [ ] Workforce training records on file
- [ ] User rights endpoints live
- [ ] Terms of Service + Privacy Notice reviewed against WA MHMDA, GDPR, CCPA/CPRA
- [ ] FDA SaMD scope memo (Track A) signed off separately from privacy memo (Track B)

---

## 6. What Changed vs. Original Write-Up

| Original claim | Corrected position |
|---|---|
| "Client-side storage avoids HIPAA" | Storage location is irrelevant to classification. Classification depends on the actor and the purpose. |
| "Disclaimers reduce compliance burden" | Disclaimers address FDA SaMD scope only. They do not affect privacy law obligations. |
| "Encryption = compliance" | Encryption is one required control. Consent, minimization, vendor management, audit logging, breach response, training, and governance are equally required. |
| "HIPAA is the concern" | For the current B2C model, HIPAA is out of scope but WA MHMDA, FTC HBNR, GDPR Art. 9, and state consumer health laws are in scope and in some ways stricter. |

---

## 7. Action Items

1. Update the original write-up (`issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md`) to link to this addendum and remove the disclaimer-as-compliance language.
2. Engage privacy counsel to sign off on the data classification memo.
3. Complete the PIA before any production data collection.
4. Stand up audit logging and consent infrastructure as part of MVP scope, not post-launch hardening.

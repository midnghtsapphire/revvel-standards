# HIPAA Entity Classification — Red Light Therapy Products

**Document ID:** `RLT-HIPAA-ENTITY-2026-08`  
**Issue:** #16111 (parent WR #15279)  
**Product surface:** `products/red-light-therapy-dosage-calculator` and related stretch-mark / Contour Light content properties under WR #15279  
**Status:** `PROVISIONAL_INTERNAL` — **not** a counsel-signed legal opinion  
**Effective date (provisional):** 2026-08-08  
**Next review:** immediately on any re-evaluation trigger (see §6), otherwise no later than 2027-02-08  
**Supersedes:** incorrect HIPAA framing previously embedded near line ~190 of  
`wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md`  
**Companion docs:**

- `compliance/red-light-therapy/counsel-engagement-brief.md`
- `compliance/red-light-therapy/re-evaluation-triggers.md`
- `compliance/red-light-therapy/data-inventory.md`
- `wr/issues/issue-15279-hipaa-compliance-addendum.md`
- Product privacy policy: `/privacy` in `products/red-light-therapy-dosage-calculator`

---

## 0. Important disclaimer (read first)

This memo is an **internal compliance engineering artifact**. It records facts, cites the statutory decision tree, and locks marketing/in-app language so we do not overclaim.

It is **not**:

- legal advice
- a substitute for a written opinion from qualified U.S. healthcare regulatory counsel
- a HIPAA compliance attestation
- permission to claim the product is “HIPAA-compliant,” “HIPAA-certified,” or “HIPAA-safe”

**Shipping rule:** Do **not** market, label, or imply HIPAA regulatory protection until either:

1. Qualified counsel countersigns §8 of this document confirming Path B (not a Covered Entity / not a Business Associate) under the stated facts, **or**
2. A full Path A HIPAA program (Privacy + Security + Breach Notification Rules, BAAs, officers, training, risk analysis, audit controls) is implemented and attested.

Until one of those two conditions is true, public and in-product language must follow §5 (prohibited and required framings).

---

## 1. Scope of determination

### In scope

| Item | Detail |
| --- | --- |
| Operating entity (working name) | Freedom Angel / GlowStarLabs / MIDNGHTSAPPHIRE consumer wellness properties publishing the Red Light Therapy Dosage Calculator and related educational content for WR #15279 |
| Product | Browser-based dosage calculator (`products/red-light-therapy-dosage-calculator`) |
| Related content | Educational / affiliate content described in WR #15279 (stretch marks, Contour Light, postpartum wellness education) |
| Jurisdiction focus | United States federal HIPAA (45 CFR Parts 160, 162, 164); notes other regimes that still apply outside HIPAA |

### Out of scope (separate tracks)

- FDA Software as a Medical Device (SaMD) / general-wellness intended-use analysis — see `wr/issues/issue-15279-fda-samd-intended-use-strategy.md`
- Full CCPA/CPRA, WA MHMDA, GDPR Article 9 program build-out (listed as residual obligations in §4)
- Clinic / B2B / telehealth / insurance integrations (explicitly excluded from current facts; any addition is a re-evaluation trigger)

---

## 2. Material facts (current business model)

These facts are the factual predicate for the provisional classification. **If any fact changes, this memo is void until re-run** (see §6).

1. **Direct-to-consumer only.** The calculator is offered to individual consumers for general wellness / educational session timing. There is no provider portal, no clinic dashboard, and no patient charting workflow in the shipped product.
2. **No healthcare provider relationship.** The operator does not furnish health care, does not employ or contract treating clinicians for the app, and does not maintain medical records on behalf of a provider.
3. **No HIPAA standard transactions.** The product does not conduct or facilitate electronic transactions listed at 45 CFR Part 162 (e.g., health care claims, eligibility, referral authorization, claim status, payment/remittance, coordination of benefits, enrollment).
4. **No insurance billing / HSA-FSA adjudication.** There is no payer integration, no CPT/ICD coding, no superbills, and no HSA/FSA merchant category or receipt workflow tied to clinical services.
5. **No Business Associate Agreements in force or contemplated for launch.** The product does not receive PHI from a Covered Entity to create, receive, maintain, or transmit on that entity’s behalf.
6. **No user accounts for health data in the shipped calculator.** Inputs (irradiance, target dose, area, sessions/week, duty cycle, compensation profile) are entered ephemerally in the browser. They are not persisted to operator-controlled servers by the application code. There is no photo upload, postpartum-week counter, symptom journal, or identifiable health profile in the shipped calculator.
7. **No sale of consumer health data.** The calculator does not implement advertising pixels that exfiltrate dosage inputs as health signals (see data inventory).
8. **Wellness / educational positioning.** UI and README state the tool is not a medical device and does not diagnose, treat, cure, or prevent disease.

### Explicitly NOT claimed as facts

- That encryption or “client-side storage” creates a HIPAA exemption (it does not).
- That disclaimers create a HIPAA exemption (they do not).
- That the absence of server storage means data is never “PHI” if a CE/BA relationship exists (storage location is irrelevant to entity status).

---

## 3. Legal decision tree applied

HIPAA’s Privacy, Security, and Breach Notification Rules apply to **Covered Entities** and **Business Associates** (45 CFR §160.102–103), not to every app that touches health-ish numbers.

```text
Q1. Are we a health plan, health care clearinghouse, or a health care provider
    who transmits health information electronically in connection with a
    HIPAA standard transaction (45 CFR §160.103 “covered entity”)?
    → On current facts: NO
       (no plan, no clearinghouse, no provider services, no Part 162 transactions)

Q2. Do we create, receive, maintain, or transmit PHI on behalf of a Covered
    Entity (or organize/subcontract such work) such that we are a
    Business Associate (45 CFR §160.103 “business associate”)?
    → On current facts: NO
       (no CE customer, no BAA, no PHI received from a CE)

Q3. Therefore, do the HIPAA Privacy/Security/Breach Rules directly regulate
    this product under the stated facts?
    → PROVISIONAL ANSWER: NO (Path B — D2C wellness, neither CE nor BA)

Q4. Do OTHER regimes still apply to consumer health / personal data?
    → YES — see §4 (FTC HBNR, state consumer health privacy, CCPA/CPRA,
      GDPR Art. 9 if EU users, app-store policies). These are independent.
```

### Provisional classification

| Field | Value |
| --- | --- |
| Entity status | **Neither Covered Entity nor Business Associate** (provisional) |
| Path | **Path B — D2C Wellness** (per compliance addendum) |
| HIPAA Privacy/Security/Breach Rules directly applicable? | **No** (provisional; counsel confirmation required) |
| May we claim “HIPAA-compliant”? | **No** — and we must not, even after Path B confirmation, unless a full HIPAA program is built and attested for a future CE/BA posture |
| PHI handling in shipped calculator | No identifiable health profile collected or stored by operator |
| Residual privacy obligations | Yes (§4) |

Confidence label for the provisional answer: **medium-high on facts as coded today; low as a legal conclusion until counsel countersigns.**

---

## 4. Residual obligations even when HIPAA does not apply

Path B is **not** a free pass. At minimum the product program must address:

| Regime | Why it can still apply | Current control posture |
| --- | --- | --- |
| FTC Health Breach Notification Rule (16 CFR Part 318) | D2C health apps / PHR vendors can be in scope even outside HIPAA | Breach runbook tracked under related WR work; do not claim HIPAA breach procedures as a substitute |
| Washington My Health My Data Act | Consumer health data + WA nexus | Opt-in / notice / deletion obligations if collecting consumer health data from covered consumers |
| CCPA/CPRA sensitive personal information | Health-related inferences / data about CA residents | Honest privacy policy; no sale/share of health inputs; DSAR path |
| GDPR Art. 9 (if EU users) | Special-category health data | Avoid collecting; if EU traffic + health data, explicit consent + DPA stack required before collection |
| App Store / Play policies | Contractual | Wellness framing; privacy nutrition labels must match actual collection |
| FDA general wellness / SaMD | Independent of HIPAA | Separate intended-use memo; no diagnostic/treatment claims |

**Engineering controls that remain table stakes (not “HIPAA compliance”):**

- TLS in transit for any hosted surface
- No silent exfiltration of calculator inputs to ad networks
- Clear privacy policy describing actual data handling
- User-visible wellness disclaimer (not a privacy-law exemption)

---

## 5. Required and prohibited public framing

### Prohibited (anywhere: ads, README, WR, UI, sales decks, app-store text)

- “HIPAA-compliant,” “HIPAA-certified,” “HIPAA-ready,” “HIPAA-safe”
- “Client-side storage means we don’t need HIPAA”
- “Encryption satisfies HIPAA”
- “Disclaimers exempt us from HIPAA”
- Any implication that architecture alone provides HIPAA regulatory protection
- BAAs marketed as proof of compliance when no CE/BA relationship and no HIPAA program exist

### Required (minimum)

- State the product is a **direct-to-consumer wellness / educational** tool
- State we **do not claim HIPAA compliance**
- Link an honest privacy policy that matches actual collection
- Keep FDA/wellness disclaimers, but never present them as a HIPAA control
- If asked “are you HIPAA compliant?” answer:  
  **“We are a D2C wellness product and do not claim HIPAA compliance. Our provisional internal classification is that we are not a Covered Entity or Business Associate under the current business model; that determination is pending written confirmation from qualified healthcare counsel. We follow applicable consumer privacy and FTC health-breach rules instead.”**

Canonical short posture (for WR / README):

> **Regulatory posture:** This app is a direct-to-consumer wellness product and is not, at launch, operated as a HIPAA Covered Entity or Business Associate under the facts in `compliance/red-light-therapy/entity-classification.md`. We do **not** claim HIPAA compliance. Client-side calculation and encryption choices reduce engineering blast radius; they are **not** regulatory exemptions. FDA SaMD risk is a separate track. Any clinic partnership, HSA/FSA clinical benefit workflow, insurance billing, telehealth, or receipt of PHI from a Covered Entity **voids** this classification until a new determination is signed.

---

## 6. Re-evaluation triggers (hard gates)

Any of the following **immediately invalidates** this provisional classification. Product, growth, and eng must open a new counsel review **before** shipping the change:

1. Clinic, med-spa, hospital, or provider partnership where the app receives or sends patient data
2. Telehealth, clinician dashboard, e-consult, or “share with my provider” features involving health inputs
3. Insurance billing, claims, eligibility, prior auth, or other 45 CFR Part 162 transactions
4. HSA/FSA integrations that depend on medical-care substantiation or provider coding
5. Executing or being asked to execute a Business Associate Agreement
6. Receiving PHI from a Covered Entity (including CSV/EHR exports, HL7/FHIR, photos from clinic systems)
7. Adding user accounts that store identifiable health journals, severity scores, postpartum status, or body photos on operator-controlled systems **in connection with a CE/BA relationship** — and, even outside CE/BA, this still requires an updated privacy PIA
8. Marketing the product as a clinical/medical record system or as “HIPAA-compliant”
9. Change of operating entity, acquisition by a Covered Entity, or white-labeling inside a Covered Entity’s workflow

Machine-readable mirror: `compliance/red-light-therapy/re-evaluation-triggers.json`  
Operational checklist: `compliance/red-light-therapy/re-evaluation-triggers.md`

---

## 7. What counsel must confirm or reject

Counsel is asked to issue a short written memo that either:

**Option A — Path B confirmation**

- States the operator is not a Covered Entity and not a Business Associate under the §2 facts
- States HIPAA Privacy/Security/Breach Rules do not directly apply to the current product
- Lists residual non-HIPAA obligations counsel considers material
- Restates re-evaluation triggers counsel wants enforced
- Explicitly authorizes (or forbids) any public language beyond §5

**Option B — Path A required**

- States CE and/or BA status applies (with legal basis)
- Lists the minimum HIPAA program that must exist before any PHI (or CE-related data) is accepted
- Identifies which vendors would need BAAs
- Blocks launch of health-data features until that program is evidenced

Engagement packet: `compliance/red-light-therapy/counsel-engagement-brief.md`

---

## 8. Counsel sign-off block (empty until real counsel signs)

> Do not fill this block with an agent name, bot name, or “AI counsel.”  
> Only a qualified human healthcare regulatory attorney (or law firm) may sign.

| Field | Value |
| --- | --- |
| Law firm / counsel name | _pending_ |
| Counsel bar jurisdiction(s) | _pending_ |
| Date of written opinion | _pending_ |
| Opinion reference / file no. | _pending_ |
| Path selected (A or B) | _pending_ |
| Confirms §2 facts were reviewed (Y/N) | _pending_ |
| Confirms §6 triggers (Y/N) | _pending_ |
| Public language authorized beyond §5 | _pending_ |
| Signature / wet or digital sign artifact location | `compliance/red-light-therapy/signed/` (gitignored secrets-free PDF or letter; no client confidences) |
| Status flag for automation | `UNSIGNED` |

Automation reads the status flag from `compliance/red-light-therapy/status.json`.

---

## 9. Implementation checklist (this issue)

- [x] Written internal determination recorded (this document)
- [x] Counsel engagement brief prepared
- [x] Re-evaluation triggers documented (md + json)
- [x] Data inventory for shipped calculator recorded
- [x] Honest privacy policy published in product (`/privacy`) — **no HIPAA compliance claim**
- [x] Parent WR + addendum updated to remove overclaim / point here
- [x] In-app + README marketing copy aligned to §5
- [ ] **Human:** retain qualified healthcare counsel and obtain countersignature in §8
- [ ] **Human:** drop signed opinion into `compliance/red-light-therapy/signed/` and set `status.json` → `COUNSEL_SIGNED_PATH_B` or `COUNSEL_SIGNED_PATH_A`
- [ ] **Human:** if Path A, block health-data features until HIPAA program evidence is linked

---

## 10. References

- 45 CFR §160.103 (definitions: covered entity, business associate, PHI, health care provider)
- 45 CFR Parts 160, 162, 164 (HIPAA Administrative, Transaction, Privacy, Security, Breach)
- 45 CFR §164.514 (de-identification — not relied on for current Path B; noted for future)
- 16 CFR Part 318 (FTC Health Breach Notification Rule)
- FDA “General Wellness: Policy for Low Risk Devices” (Sept 2019) — separate track
- `wr/issues/issue-15279-hipaa-compliance-addendum.md`
- `wr/issues/issue-15279-hipaa-compliance-clarification.md`

---

**Nothing in this document is legal advice.** Retain qualified healthcare regulatory counsel before relying on the provisional classification for launch decisions involving health data, clinic partnerships, or insurance adjacency.

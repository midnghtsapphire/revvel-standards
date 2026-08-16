# HIPAA Scope Re-Evaluation Triggers — Red Light Therapy

**Document ID:** `RLT-HIPAA-TRIGGERS-2026-08`
**Issue:** #16111
**Status source of truth (machine):** `compliance/red-light-therapy/re-evaluation-triggers.json`
**Parent determination:** `compliance/red-light-therapy/entity-classification.md`

---

## Rule

If **any** trigger below becomes true (planned or shipped), then:

1. Set `compliance/red-light-therapy/status.json` → `"status": "REEVAL_REQUIRED"`.
2. Treat the provisional Path B classification as **void**.
3. Do **not** ship the triggering feature until counsel issues a new written determination.
4. Do **not** expand marketing claims; keep §5 prohibitions from the entity-classification memo.

---

## Trigger list

| ID | Trigger | Examples | Default path if triggered |
| --- | --- | --- | --- |
| T1 | Clinic / provider partnership with patient data | Med-spa dashboard, Contour Light clinic portal, EHR import | Likely BA or CE-adjacent → Path A review |
| T2 | Telehealth / clinician workflow | “Share with my provider”, e-consult, remote monitoring ordered by clinician | Path A review |
| T3 | Insurance / HIPAA transactions | Claims, eligibility, prior auth, remittance, coordination of benefits | CE or BA → Path A |
| T4 | HSA/FSA clinical substantiation | Receipt flows requiring diagnosis/procedure codes for medical care | Path A review |
| T5 | BAA requested or signed | Customer or vendor requires Business Associate Agreement | BA posture → Path A program |
| T6 | PHI received from a Covered Entity | Clinic CSV, FHIR/HL7 feed, provider-originated photos | BA → Path A |
| T7 | Identifiable cloud health profile | Accounts storing severity scores, postpartum week, symptom notes, body photos on our servers | Privacy PIA required; HIPAA if CE/BA nexus |
| T8 | “HIPAA-compliant” marketing | Ads, app-store text, sales decks claiming HIPAA compliance without program | **Forbidden**; correct copy + re-review |
| T9 | Entity change | Acquisition by CE, white-label inside CE workflow, operating-entity change | Full re-determination |
| T10 | Scheduled review due | 6 months from last signed opinion, or from provisional date if still unsigned | Administrative re-confirm |

---

## Owner actions

| Role | Action when trigger fires |
| --- | --- |
| Product | Stop feature flag / do not merge enabling PR |
| Eng | Flip `status.json` to `REEVAL_REQUIRED`; link triggering PR/issue |
| Growth/Marketing | Revert any CE/BA or “HIPAA-compliant” language |
| Compliance owner (human) | Send updated facts to counsel using `counsel-engagement-brief.md` |

---

## Non-triggers (still may need privacy review, but do not alone flip HIPAA entity status)

- Pure content/SEO articles with no health-data intake
- Affiliate links to device merchants
- Ephemeral client-side calculator numerics with no accounts (current shipped posture)
- Standard web analytics that **do not** send dosage/health inputs (verify in data inventory)

These still require honest privacy-policy coverage and must not be used to claim HIPAA compliance.

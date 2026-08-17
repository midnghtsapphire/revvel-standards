# Entity Classification Memo — WR-15279

**Product:** Reclaiming Your Skin / Contour Light red-light therapy stretch-marks app  
**Document ID:** COMP-15279-ENTITY-001  
**Version:** 1.0.0-draft  
**Status:** DRAFT — requires countersignature by qualified healthcare privacy counsel  
**Date:** 2026-08-08  
**Owners:** Legal (sign-off) + Engineering Lead (technical facts)

---

## 1. Question presented

Is the product, at the planned direct-to-consumer (D2C) MVP launch, a HIPAA **Covered Entity**, a HIPAA **Business Associate**, both, or neither?

## 2. Facts relied upon (engineering)

1. The product is marketed and sold directly to consumers for general wellness / educational purposes.
2. There is **no** contractual relationship with hospitals, clinics, insurers, telehealth providers, or clearinghouses to create, receive, maintain, or transmit PHI on their behalf.
3. The product does **not** bill insurance, submit HIPAA standard transactions, prescribe, or diagnose.
4. Contemplated health-related inputs (if tracker ships): postpartum week, stretch-mark severity self-ratings, progress photos, symptom notes, session logs — linked to a user account (email/auth).
5. Hosting is expected on consumer cloud (e.g., Vercel) with optional analytics/crash/LLM vendors — none currently under a BAA for this product.
6. FDA SaMD posture is separately scoped as general wellness (see `wr/issues/issue-15279-fda-samd-intended-use-strategy.md`). SaMD status does **not** determine HIPAA status.

## 3. Legal framework (summary for counsel)

- **Covered Entity (45 CFR §160.103):** health plan, healthcare clearinghouse, or healthcare provider who transmits health information in electronic form in connection with a covered transaction.
- **Business Associate:** a person or entity that performs functions or activities on behalf of, or provides services to, a Covered Entity involving PHI.
- Individually identifiable health information is **PHI** only when created/received/maintained/transmitted by a Covered Entity or Business Associate in that capacity. The same data elements outside a CE/BA relationship are typically **consumer health data**, regulated by FTC HBNR, state laws (e.g., WA MHMDA), CCPA/CPRA sensitive PI, and GDPR Art. 9 — not the HIPAA Privacy/Security Rules.

## 4. Determination (draft)

| Classification | Applies at MVP? | Rationale |
| --- | --- | --- |
| Covered Entity | **No** | Not a health plan, clearinghouse, or provider submitting covered transactions |
| Business Associate | **No** | No CE customer; no PHI handled on behalf of a CE |
| D2C consumer health app | **Yes** | Collects (or will collect) consumer health data from individuals for wellness features |

**Draft conclusion:** HIPAA does **not** apply at D2C MVP launch. FTC Health Breach Notification Rule, Washington My Health My Data Act (if WA residents / applicable nexus), CCPA/CPRA sensitive personal information rules, and GDPR Article 9 (if EU/UK users) **do** apply to contemplated health inputs.

## 5. Triggers that invalidate this determination

Re-run this memo **before** accepting any of the following:

- Clinic, spa-with-provider, telehealth, or insurer partnership that sends or receives patient data
- Receiving referrals containing patient identifiers from a Covered Entity
- Insurance billing, prior auth, or claims attachments
- White-label deployment inside a provider EHR / patient portal
- Acting as a PHR vendor interconnected with Covered Entities in a way that creates BA status

Any trigger → Path B HIPAA program (BAAs, Security Rule, breach rule, workforce training, etc.) **before** data acceptance.

## 6. Sign-off block

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Engineering Lead (facts) | _TBD_ | ________ | ________ |
| Privacy / Healthcare Counsel | _TBD_ | ________ | ________ |
| Product Owner | _TBD_ | ________ | ________ |

**Counsel instruction:** Confirm or revise §4. Do not allow production health-data collection on an unsigned draft.

## 7. References

- 45 CFR §160.103 (definitions)
- 45 CFR Parts 160, 164 (HIPAA)
- 16 CFR Part 318 (FTC Health Breach Notification Rule)
- Washington RCW 19.373 (My Health My Data Act)
- Cal. Civ. Code §1798.100 et seq. (CCPA/CPRA)
- Regulation (EU) 2016/679 Art. 9 (special category data)
- Parent package: `compliance/wr-15279/privacy-impact-assessment.md`

# Compliance Addendum — MHMDA Opt-In Consent (WR-15279 / Issue #16113)

**Status:** Implemented in product code (engineering). Legal counsel review still required before production marketing of health-data features.  
**Parent WR:** `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md`  
**HIPAA addendum:** `wr/issues/issue-15279-hipaa-compliance-addendum.md`  
**Product:** `products/red-light-therapy-dosage-calculator`

---

## 1. Scope

Washington My Health My Data Act (RCW 19.373) requires **affirmative, separate, opt-in** consent before collecting, sharing, or selling consumer health data, with consumer rights to access, withdraw, and delete. This addendum records how the red-light / stretch-mark product meets the engineering portion of that duty.

This document is **not legal advice**.

---

## 2. Decision: national MHMDA-grade flow

| Option | Pros | Cons | Decision |
|---|---|---|---|
| WA-only geofenced consent | Minimal friction elsewhere | Easy to mis-detect residency; gaps for travelers | Rejected |
| **National explicit opt-in for all health-data features** | One flow; covers CT/NV/TX sensitive-data consent baselines; simpler QA | Extra click for non-WA users | **Selected** |

Dosage calculator inputs used only for on-screen math (not persisted as a health record) remain available without MHMDA consent.

---

## 3. Consent screen requirements (implemented)

The in-app gate (`MhmdaConsentGate`) and pure module (`app/data/mhmda-consent.ts`) enforce:

1. **Categories disclosed individually** with purpose + retention:
   - Stretch mark / progress photos
   - Symptom and skin notes
   - Postpartum / recovery timeline
   - Treatment session logs
   - Severity self-assessment
2. **Third-party recipients listed** (default: no health-data sale; hosting; support only if user emails health details).
3. **Separate from Terms of Service** checkbox (hard requirement).
4. **Explicit opt-in** checkbox (hard requirement).
5. **Separate share/sell** checkbox (defaults off; collection consent never implies sale).
6. Policy version stamped on the consent record (`MHMDA_POLICY_VERSION`).

Invalid payloads never unlock `mayCollectCategory()`.

---

## 4. Consumer rights (DSAR)

| Right | Implementation |
|---|---|
| Access | In-app export JSON via `buildAccessExport` |
| Correction | `id=<entryId>; body=...` correction applied to local journal |
| Deletion | Hard-clears local journal + withdraws consent (30-day SLA target) |
| Withdraw consent | `withdrawConsent()` blocks further collection |

UI: `HealthDataRights` on the product home page. Privacy copy: `/privacy`.

---

## 5. Sister-state assessment (CT, NV, TX, CA)

| State | Law | Explicit opt-in? | Private RoA? | Covered by national flow? |
|---|---|---|---|---|
| WA | MHMDA (RCW 19.373) | Yes | Yes | Yes (baseline) |
| CT | CTDPA health/sensitive amendments | Yes (sensitive) | No (AG) | Yes |
| NV | SB 370 consumer health data | Yes | No | Yes (re-check geofence/ads if marketing expands) |
| TX | TDPSA sensitive data | Yes (sensitive) | No | Yes |
| CA | CPRA sensitive PI + CMIA | Right-to-limit / CMIA | Yes (limited) | Yes (opt-in is stricter) |

Full notes live in `STATE_LAW_ASSESSMENTS` inside `mhmda-consent.ts` and the privacy page table.

---

## 6. Engineering checklist

- [x] Consent module with validation + tests
- [x] Consent UI separate from ToS
- [x] Category / purpose / recipient disclosures
- [x] Access, correction, deletion handling
- [x] Privacy policy page with MHMDA sections
- [x] Sister-state assessment documented
- [ ] Counsel sign-off on production copy
- [ ] Production privacy@ mailbox + ticket SLA runbook
- [ ] Vendor DPA register if any processor later touches health payloads

---

## 7. Code map

| Path | Role |
|---|---|
| `products/red-light-therapy-dosage-calculator/app/data/mhmda-consent.ts` | Consent, DSAR, state-law SSOT |
| `products/red-light-therapy-dosage-calculator/app/components/MhmdaConsentGate.tsx` | Opt-in UI |
| `products/red-light-therapy-dosage-calculator/app/components/HealthDataRights.tsx` | Journal + rights UI |
| `products/red-light-therapy-dosage-calculator/app/privacy/page.tsx` | Privacy policy |
| `products/red-light-therapy-dosage-calculator/tests/mhmda-consent.test.ts` | Regression tests |

---

## 8. References

- RCW 19.373 (Washington My Health My Data Act)
- 16 CFR Part 318 (FTC Health Breach Notification Rule)
- Parent HIPAA clarification addendum (Path A D2C wellness)
- Issue #16113

# WR-15279 Privacy & Compliance Package

**Product:** Reclaiming Your Skin / Contour Light red-light therapy stretch-marks experience  
**Parent WR:** #15279  
**PIA issue:** #16110  
**Status:** Engineering draft complete — **counsel sign-off required before any production health-data collection**  
**Last updated:** 2026-08-08

---

## Purpose

This package satisfies the blocking launch requirement in parent WR §8.5 and issue #16110: a Privacy Impact Assessment (PIA) covering data inventory, data flows, regulatory mapping, third-party processors, and a risk register with mitigations.

Nothing in this package is legal advice. It is the engineering + product record that qualified healthcare privacy counsel must review and countersign before production health-data collection.

## Documents

| Artifact | Path | Covers |
| --- | --- | --- |
| Privacy Impact Assessment (master) | [`privacy-impact-assessment.md`](./privacy-impact-assessment.md) | Full PIA narrative, scope, residual risk, launch gate |
| Data inventory | [`data-inventory.md`](./data-inventory.md) + [`data-inventory.json`](./data-inventory.json) | Fields, sources, purposes, retention, sensitivity |
| Data flow diagrams | [`data-flows.md`](./data-flows.md) | Client → server → third parties (current + planned) |
| Regulatory mapping | [`regulatory-mapping.md`](./regulatory-mapping.md) | HIPAA, FTC HBNR, MHMDA, GDPR, CCPA/CPRA (+ related) |
| Third-party processors | [`third-party-processors.md`](./third-party-processors.md) + [`vendor-register.json`](./vendor-register.json) | Analytics, crash, cloud, LLM, email, payments |
| Risk register | [`risk-register.md`](./risk-register.md) + [`risk-register.json`](./risk-register.json) | Risks, likelihood, impact, mitigations, owners |
| Entity classification memo | [`entity-classification.md`](./entity-classification.md) | CE / BA / neither determination (draft for counsel) |

## Related existing docs

- `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` — parent WR
- `wr/issues/issue-15279-hipaa-compliance-addendum.md` — HIPAA framing correction
- `wr/issues/issue-15279-hipaa-compliance-clarification.md`
- `wr/issues/issue-15279-fda-samd-intended-use-strategy.md` — FDA SaMD track (independent)

## Launch gate (production health data)

Production collection of postpartum timelines, stretch-mark photos, symptom notes, session logs tied to identity, or equivalent consumer health data is **blocked** until:

1. [x] Engineering PIA package committed (this directory)
2. [ ] Counsel reviews and signs `entity-classification.md`
3. [ ] Counsel reviews and signs `privacy-impact-assessment.md` residual-risk acceptance
4. [ ] Privacy policy + MHMDA/CCPA/GDPR consent UX shipped
5. [ ] DSAR export/delete endpoints live and tested
6. [ ] DPAs (or BAAs if classification changes) executed for every in-scope processor
7. [ ] Incident / breach runbook tested (tabletop)

Content-only publishing and non-health email capture may proceed under parent WR §8.6.

## Tests

Regression coverage lives in `tests/wr-15279-pia.test.js` and fails if required sections, inventory fields, processors, regulations, or risk mitigations are removed.

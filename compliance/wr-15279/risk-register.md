# Risk Register — WR-15279

**Document ID:** COMP-15279-RISK-001  
**Machine-readable source of truth:** [`risk-register.json`](./risk-register.json)  
**Status:** Draft for counsel  
**Updated:** 2026-08-08

---

## 1. Scoring

- **Likelihood:** low | medium | high  
- **Impact:** low | medium | high | critical  
- Any **critical** impact risk with status containing `blocking` must be mitigated before Phase 2 production health-data collection.

## 2. Register

| ID | Risk | L | I | Key mitigations | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Unauthorized disclosure of photos/notes | M | C | Private storage, encryption, authZ, on-device photo preference | Eng | open-blocking-phase2 |
| R-02 | Health payloads in analytics/crash tools | M | H | SDK deny-list, scrubbing, CI assertions | Eng | open-blocking-phase2 |
| R-03 | Missing/invalid CHD consent | M | H | Affirmative opt-in, consent audit fields, API guard | Product + Legal | open-blocking-phase2 |
| R-04 | Wrong HIPAA non-applicability call | L | C | Counsel sign-off; B2B triggers freeze intake | Legal | open-blocking-phase2 |
| R-05 | FDA SaMD via treatment/diagnostic claims | M | H | Wellness intended use, disclaimers, language audit | Product + Regulatory | mitigating |
| R-06 | Processor without DPA | M | H | Vendor register gate; no prod integration pre-DPA | Eng + Legal | open-blocking-phase2 |
| R-07 | DSAR access/delete SLA miss | M | H | Export/delete APIs; 30-day hard delete; audit | Eng | open-blocking-phase2 |
| R-08 | Breach without notification process | L | C | IR runbook; tabletop; vendor SLAs | Eng + Legal | open-blocking-phase2 |
| R-09 | LLM/AI vision on photos/notes unsafely | M | C | Not in MVP; feature flag off; AI consent + SaMD review | Product + Legal + Eng | mitigated-for-mvp |
| R-10 | Over-collection / purpose creep | M | M | Inventory-driven schema; quarterly review | Product + Eng | open |
| R-11 | EU transfer without SCCs/TIA | M | H | EU scope decision; SCCs or geo-fence | Legal + Eng | open-blocking-if-eu |
| R-12 | Biometric law exposure from face processing | L | H | No face geometry/recognition; delete on request | Product + Legal | mitigating |

## 3. Phase 2 entry criteria (risk view)

All of the following must be true:

1. R-01 through R-08 mitigations implemented or accepted in writing by counsel  
2. R-09 remains **not_in_mvp** / feature-flagged off unless separately approved  
3. R-04 entity classification countersigned  
4. Residual risk accepted in master PIA sign-off block  

## 4. Cross-links

- Master PIA: [`privacy-impact-assessment.md`](./privacy-impact-assessment.md)
- Regulatory map: [`regulatory-mapping.md`](./regulatory-mapping.md)
- Processors: [`third-party-processors.md`](./third-party-processors.md)

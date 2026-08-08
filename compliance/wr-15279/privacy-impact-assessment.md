# Privacy Impact Assessment (PIA) — WR-15279

**Document ID:** COMP-15279-PIA-001  
**Product:** Reclaiming Your Skin / Contour Light red-light therapy stretch-marks experience  
**Parent WR:** #15279  
**Issue:** #16110  
**Version:** 1.0.0-draft  
**Status:** Engineering complete — **blocking counsel review before production health-data collection**  
**Date:** 2026-08-08  
**Owners:** Legal (sign-off) + Engineering Lead (technical accuracy)  
**Prime directive:** Protect the $10k → $10M path by removing unquantified privacy/regulatory tail risk before launch.

> **Not legal advice.** This PIA is the engineering and product record for qualified healthcare privacy counsel. Production collection of user health data is forbidden until the sign-off block is completed.

---

## 0. Resolution checklist (issue #16110)

| Requirement | Artifact | Status |
| --- | --- | --- |
| Complete data inventory | [`data-inventory.md`](./data-inventory.md) + [`data-inventory.json`](./data-inventory.json) | Done (draft) |
| Data flow diagrams | [`data-flows.md`](./data-flows.md) | Done (draft) |
| Regulatory mapping (HIPAA, HBNR, MHMDA, GDPR, CCPA) | [`regulatory-mapping.md`](./regulatory-mapping.md) | Done (draft) |
| Third-party processor inventory | [`third-party-processors.md`](./third-party-processors.md) + [`vendor-register.json`](./vendor-register.json) | Done (draft) |
| Risk register with mitigations | [`risk-register.md`](./risk-register.md) + [`risk-register.json`](./risk-register.json) | Done (draft) |
| Entity classification (supporting) | [`entity-classification.md`](./entity-classification.md) | Done (draft) |
| Counsel engagement / countersignature | Sign-off §11 | **Pending human** |

---

## 1. Executive summary

### 1.1 What we assessed

A D2C wellness content property plus optional progress-tracking features that may collect:

- Postpartum / recovery timelines  
- Stretch-mark severity self-scores  
- Progress photos  
- Symptom / skin notes  
- Session logs  
- Account identity (email / auth subject)

### 1.2 Current technical reality

| Surface | Health data server-side? | Launch posture |
| --- | --- | --- |
| Content + affiliate pages | No | Allowed (parent WR §8.6) |
| Dosage calculator (`products/red-light-therapy-dosage-calculator`) | No — client React state only | Allowed as wellness math tool with disclaimer |
| Progress tracker (planned) | Would yes | **Blocked** until counsel sign-off + controls below |

### 1.3 Classification snapshot

| Question | Draft answer |
| --- | --- |
| HIPAA Covered Entity / Business Associate at MVP? | **No** |
| Consumer health privacy regimes apply if tracker ships? | **Yes** — FTC HBNR, MHMDA (nexus-dependent), CCPA/CPRA sensitive PI, GDPR Art. 9 if EU/UK |
| FDA SaMD? | Parallel track; general wellness framing required (separate doc) |

### 1.4 Bottom line

- **Do not** collect production health inputs until §11 is signed and Phase 2 entry criteria in the risk register are met.  
- **Do** continue content, affiliate, and client-only calculator work.  
- **Do not** claim “HIPAA compliant.” Claim accurate consumer-privacy controls instead.

---

## 2. Scope and methodology

### 2.1 In scope

- Data elements in [`data-inventory.json`](./data-inventory.json)  
- Flows in [`data-flows.md`](./data-flows.md)  
- Processors in [`vendor-register.json`](./vendor-register.json)  
- Regimes: HIPAA, FTC HBNR, WA MHMDA, GDPR/UK GDPR, CCPA/CPRA (plus biometric/FDA notes)  
- Risks in [`risk-register.json`](./risk-register.json)

### 2.2 Out of scope (separate workstreams)

- Full HIPAA Security Rule implementation (only required if classification flips)  
- 510(k) / De Novo FDA filings (only if SaMD claims cannot be avoided)  
- Corporate-wide multi-product RoPA (this PIA is product-scoped)

### 2.3 Method

1. Inventory every contemplated field (source, purpose, retention, sharing, sensitivity).  
2. Map phase-based data flows and trust boundaries.  
3. Map each regime’s trigger and MVP obligations.  
4. Inventory processors and contract instruments (DPA vs BAA).  
5. Score risks; assign mitigations and Phase 2 blockers.  
6. Gate launch on counsel countersignature.

Sources: parent WR, HIPAA compliance addendum/clarification, FDA SaMD strategy, current calculator implementation.

---

## 3. Data inventory (summary)

Full table: [`data-inventory.md`](./data-inventory.md).

**Highest-sensitivity fields (Phase 2 only):**

- `postpartum_week`  
- `stretch_mark_severity`  
- `progress_photo`  
- `symptom_notes`  
- `session_log` (when linked to identity + health goal)

**Minimization hard rules:**

1. No health collection in Phase 0/1 server paths.  
2. Analytics/crash tools never receive health values or photo bytes.  
3. LLM APIs default off for health payloads.  
4. Photos prefer on-device; cloud optional and private.  
5. Every CHD write requires recorded opt-in.

---

## 4. Data flows (summary)

Full diagrams: [`data-flows.md`](./data-flows.md).

| Phase | Path | Health at rest on our servers? |
| --- | --- | --- |
| 0 Content | Browser → CDN/host → optional ESP/payments | No |
| 1 Calculator | Browser local state only | No |
| 2 Tracker | Browser → API → DB/object storage (+ allow-listed processors) | **Yes — blocked pending gate** |

Prohibited flows (regression targets): health→analytics, notes/photos→LLM without AI consent, public photo URLs, health content in email bodies.

---

## 5. Regulatory mapping (summary)

Full matrix: [`regulatory-mapping.md`](./regulatory-mapping.md).

| Regime | MVP applicability | Primary control theme |
| --- | --- | --- |
| HIPAA | No (draft CE/BA = neither) | Documented classification; freeze if B2B PHI appears |
| FTC HBNR | Yes when identifiable health held | Security + breach notification readiness |
| MHMDA | Yes if WA CHD nexus | Opt-in, policy, rights, no CHD sale |
| CCPA/CPRA | Yes (baseline / CA residents) | Notice, sensitive PI limits, DSAR, SP contracts |
| GDPR Art. 6/9 | Yes if EU/UK users | Explicit consent for health; DSR; transfers |
| FDA SaMD | Parallel | Wellness intended use + language audit |

---

## 6. Third-party processors (summary)

Full inventory: [`third-party-processors.md`](./third-party-processors.md).

Categories covered: cloud hosting/CDN, object storage, database, auth, email, analytics, crash reporting, LLM (future/off), payments (Polar.sh/Stripe).

**Contract default:** DPA before personal data. BAA only if HIPAA path activates.

---

## 7. Risk register (summary)

Full register: [`risk-register.md`](./risk-register.md).

Top residual themes after planned mitigations:

1. Photo/notes confidentiality (R-01) — engineering controls mandatory  
2. Classification error (R-04) — counsel signature mandatory  
3. Breach response readiness (R-08) — tabletop mandatory  
4. AI feature creep (R-09) — kept out of MVP  

No critical-impact Phase 2 blocker may remain “open” without written acceptance.

---

## 8. Necessary controls before Phase 2 production

### 8.1 Legal / policy

- [ ] Counsel signs [`entity-classification.md`](./entity-classification.md)  
- [ ] Counsel signs this PIA §11  
- [ ] Privacy policy covering CHD categories, purposes, retention, processors, rights  
- [ ] MHMDA/CPRA/GDPR consent copy approved  
- [ ] Incident/breach runbook (HBNR + state + GDPR paths)

### 8.2 Product / UX

- [ ] Separate health-data opt-in (not buried in ToS)  
- [ ] Notice at collection  
- [ ] In-app wellness disclaimer on health-output surfaces  
- [ ] Age gate (no under-13; EU age-of-consent handling)

### 8.3 Engineering

- [ ] TLS 1.2+ everywhere  
- [ ] Encryption at rest for DB + object storage  
- [ ] Consent flag enforced server-side on CHD writes  
- [ ] DSAR export endpoint  
- [ ] DSAR delete endpoint + 30-day hard-delete job  
- [ ] Analytics/crash deny-list + scrubbing  
- [ ] Private photo storage (no public ACL)  
- [ ] Audit log of admin/support access to user health records  
- [ ] Vendor integrations only if present in vendor register with DPA status

### 8.4 Explicit non-goals for MVP

- HIPAA “compliance certification” marketing  
- AI skin diagnosis / photo LLM analysis  
- Sale or adtech share of consumer health data  
- Clinic/EHR integrations

---

## 9. Necessity, proportionality, and alternatives

| Option | Privacy impact | Product impact | Decision |
| --- | --- | --- | --- |
| A. Content-only forever | Lowest | Loses tracker retention/monetization | Fallback if counsel blocks tracker |
| B. Tracker fully on-device | Low | Weaker multi-device sync / backup | Preferred technical default for photos |
| C. Cloud tracker with controls (this PIA) | Medium (manageable) | Enables accounts, sync, premium | **Target after sign-off** |
| D. Cloud tracker + AI vision | High | SaMD + privacy spike | Deferred; separate PIA |

Cloud tracker (C) is justified only with the mitigations above and counsel acceptance of residual risk. AI vision (D) is not approved by this PIA.

---

## 10. Residual risk statement

After implementing §8 controls:

- Residual risk of confidentiality incidents is **reduced but not zero** (internet-facing systems).  
- Residual regulatory risk is **acceptable for D2C MVP** only if HIPAA remains inapplicable and consumer-privacy controls operate as designed.  
- Residual FDA risk depends on continued wellness framing (owned by SaMD track).  
- Any clinic/insurer pivot **voids** this residual-risk acceptance.

Counsel must either:

1. Accept residual risk and authorize Phase 2 engineering, or  
2. Require additional controls / scope cuts (e.g., on-device-only photos, no EU, no free-text notes), or  
3. Reject Phase 2 until a different architecture ships.

---

## 11. Sign-off

| Role | Name | Decision (accept / accept-with-conditions / reject) | Signature | Date |
| --- | --- | --- | --- | --- |
| Engineering Lead | _TBD_ | ________ | ________ | ________ |
| Product Owner | _TBD_ | ________ | ________ | ________ |
| Healthcare Privacy Counsel | _TBD_ | ________ | ________ | ________ |
| Security / Privacy Officer (if designated) | _TBD_ | ________ | ________ | ________ |

**Conditions (if any):** _record counsel conditions below this line_

---

**Next review date:** on first of (a) 12 months, (b) any entity-classification trigger, (c) addition of AI vision / new processor category, (d) expansion to EU if not already scoped.

---

## 12. References

- Issue #16110 — PIA blocking requirement  
- `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md` §8  
- `wr/issues/issue-15279-hipaa-compliance-addendum.md`  
- `wr/issues/issue-15279-hipaa-compliance-clarification.md`  
- `wr/issues/issue-15279-fda-samd-intended-use-strategy.md`  
- 45 CFR Parts 160, 164 (HIPAA)  
- 16 CFR Part 318 (FTC HBNR)  
- Washington RCW 19.373 (MHMDA)  
- Cal. Civ. Code §1798.100 et seq. (CCPA/CPRA)  
- Regulation (EU) 2016/679 (GDPR), Art. 6, 9, 35  
- FDA General Wellness Guidance (Sept 2019)

---

## 13. Document control

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 1.0.0-draft | 2026-08-08 | Engineering (Copilot agent) | Initial complete PIA package for #16110 |

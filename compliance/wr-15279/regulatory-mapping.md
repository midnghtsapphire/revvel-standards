# Regulatory Mapping — WR-15279

**Document ID:** COMP-15279-REG-001  
**Status:** Draft for counsel  
**Updated:** 2026-08-08  
**Entity posture:** D2C wellness (HIPAA CE/BA = No at MVP) — see [`entity-classification.md`](./entity-classification.md)

---

## 1. Regime matrix

| Regime | Applies at MVP? | Trigger | Primary obligations | Owner |
| --- | --- | --- | --- | --- |
| **HIPAA** (45 CFR 160/164) | **No** (draft) | CE or BA status | Privacy/Security/Breach Rules, BAAs, 6-year docs | Legal — re-open if B2B clinical |
| **FTC Health Breach Notification Rule** (16 CFR 318) | **Yes** if health PHR-like app / health app vendor | D2C health app holding identifiable health data | Breach notice to users (and FTC per rule), security practices, vendor oversight | Legal + Eng |
| **WA My Health My Data Act (MHMDA)** | **Yes** if WA consumer health data / applicable nexus | Collect/share consumer health data of WA consumers | Opt-in consent, privacy policy, consumer rights (access/delete), no geofence sale, authorization for share | Legal + Product |
| **CCPA/CPRA** (Cal. Civ. Code 1798.100 et seq.) | **Yes** if CA personal info thresholds / practice baseline | Personal info of CA residents; health = sensitive PI | Notice at collection, purpose limitation, sensitive PI limit-use, DSAR, service-provider contracts | Legal + Eng |
| **GDPR / UK GDPR Art. 6 + Art. 9** | **Yes** if EU/UK users offered the service | Special category health data | Explicit consent (Art. 9), DPIA when high risk, RoPA, DPA/SCCs for transfers, DSR | Legal + Eng |
| **CA CMIA** | Possibly if medical information held | Medical information disclosure rules | Authorization limits, confidentiality | Legal |
| **IL BIPA / biometric laws** | Risk if face geometry from photos | Biometric identifiers | Written policy, consent, retention limits | Legal — avoid face biometrics |
| **FDA SaMD / general wellness** | Parallel track | Device software claims | Wellness framing; no diagnose/treat claims | Regulatory — see FDA SaMD doc |
| **FTC Act §5 / advertising** | **Yes** | Marketing claims | Substantiation; no deceptive health claims | Marketing + Legal |

## 2. HIPAA detail (why out of scope at MVP)

| Element | Assessment |
| --- | --- |
| Covered Entity? | No — not provider/plan/clearinghouse submitting covered transactions |
| Business Associate? | No — no CE customer relationship |
| Are inputs “health data”? | Yes (when tracker ships) — but as **consumer health data**, not PHI in CE/BA sense |
| If wrong? | Immediate freeze on health intake; stand up Path B HIPAA program before resume |

**Explicit non-claim:** This product does **not** claim “HIPAA compliant” at MVP. Encryption and client-side storage are risk reducers, not HIPAA exemptions.

## 3. FTC Health Breach Notification Rule (HBNR)

| Topic | MVP control |
| --- | --- |
| In-scope data | Identifiable health information in a personal health record / health app context |
| Security | TLS in transit; encryption at rest for stored health fields; least privilege |
| Vendor | DPAs; prohibit sale of health data; inventory in vendor register |
| Breach process | Detect → contain → assess → notify individuals without unreasonable delay and no later than rule timelines; document decisions |
| Runbook | Required pre-Phase-2 launch artifact (incident response) |

## 4. Washington MHMDA

| Obligation | Implementation requirement |
| --- | --- |
| Consumer health data definition | Map fields flagged `consumer_health_data=true` in data-inventory.json |
| Opt-in consent | Separate, affirmative opt-in **before** collecting CHD; store timestamp + policy version |
| Privacy policy | Link from collection UI; list CHD categories, purposes, sharing, retention |
| Access / delete | In-product or email DSAR path; 30-day delete completion target |
| Share / sell | Default **no sale/share** of CHD; any share needs valid authorization |
| Geofence | Do not implement location-based health advertising geofences |
| Service providers | Contracts limiting use to specified purpose |

## 5. CCPA/CPRA

| Obligation | Implementation requirement |
| --- | --- |
| Notice at collection | Categories + purposes before or at collection |
| Sensitive PI (health) | Limit use to purposes that enable the service user requested; offer Limit Use/Disclosure where required |
| Right to know / delete / correct | DSAR workflow |
| Right to opt-out of sale/share | If any sale/share adtech — Prefer “no sale/share” architecture for health |
| Service provider / contractor terms | CPRA-compliant terms with processors |
| Metrics | Publish annual stats if thresholds met |

## 6. GDPR / UK GDPR

| Topic | MVP control |
| --- | --- |
| Lawful basis identity | Art. 6(1)(b) contract for account; Art. 6(1)(a) consent for marketing |
| Special category health | Art. 9(2)(a) **explicit consent** before health fields |
| DPIA | This PIA package is the engineering DPIA input; counsel confirms if formal DPIA record required (likely **yes** for Phase 2 cloud health + photos) |
| Transfer | SCCs + TIA if US processors receive EU data; consider EU region hosting |
| DSR | Access, erase, portability within one month |
| Children | 16+ (or member-state age); no under-13; age gate |
| Records of processing | Maintain RoPA derived from data-inventory.json |

## 7. FDA SaMD (independent)

Disclaimers and wellness framing reduce SaMD risk only. They do **not** satisfy HIPAA, HBNR, MHMDA, CCPA, or GDPR. See:

`wr/issues/issue-15279-fda-samd-intended-use-strategy.md`

## 8. Crosswalk — inventory field → regimes

| Field ID | HIPAA PHI if CE/BA | HBNR health info | MHMDA CHD | CPRA sensitive | GDPR Art. 9 |
| --- | --- | --- | --- | --- | --- |
| email | No* | No | No | No | No |
| postpartum_week | Yes | Yes | Yes | Yes | Yes |
| stretch_mark_severity | Yes | Yes | Yes | Yes | Yes |
| progress_photo | Yes | Yes | Yes | Yes | Yes |
| symptom_notes | Yes | Yes | Yes | Yes | Yes |
| session_log (identified) | Yes | Yes | Yes | Yes | Yes |
| calculator_inputs (anonymous local) | No | No | No | No | No |
| device_analytics (scrubbed) | No | No | No | No | No |

\*Email becomes an identifier that makes health fields identifiable; store linkage carefully.

## 9. Residual regulatory decisions for counsel

1. Confirm HIPAA non-applicability draft in entity-classification.md.  
2. Confirm whether EU offering is in-scope at launch (if no → geo-block EU or no-EU marketing until ready).  
3. Confirm MHMDA nexus analysis for non-WA entity.  
4. Confirm whether Phase 2 cloud photos require formal DPIA filing beyond this package.  
5. Confirm breach notification playbooks under HBNR vs state laws vs GDPR.

## 10. Cross-links

- Entity: [`entity-classification.md`](./entity-classification.md)
- Inventory: [`data-inventory.md`](./data-inventory.md)
- Risks: [`risk-register.md`](./risk-register.md)
- Master PIA: [`privacy-impact-assessment.md`](./privacy-impact-assessment.md)

# Data Inventory — WR-15279

**Document ID:** COMP-15279-DATA-001  
**Machine-readable source of truth:** [`data-inventory.json`](./data-inventory.json)  
**Status:** Draft for counsel  
**Updated:** 2026-08-08

---

## 1. Scope

Inventory of personal data and consumer health data contemplated by:

- **Phase 0** — content site + optional marketing email (allowed under parent WR §8.6)
- **Phase 1** — dosage calculator (`products/red-light-therapy-dosage-calculator`) — client-side only today
- **Phase 2** — progress tracker (postpartum timeline, photos, symptoms, session logs) — **blocked** until PIA counsel sign-off

## 2. Classification legend

| Label | Meaning |
| --- | --- |
| `personal_data` | Identifies or is reasonably linkable to a person |
| `special_category_health` | GDPR Art. 9 health data when linked to identity |
| `consumer_health_data` | Regulated under WA MHMDA / similar state CHD laws |
| `phi_if_ce_ba` | Would be PHI **if** entity were CE/BA (see entity-classification.md) |
| `ccpa_sensitive` | CPRA sensitive personal information (health) |

## 3. Field table

| ID | Field | Phases | Source | Purpose | Sensitivity | Retention | Shared with |
| --- | --- | --- | --- | --- | --- | --- | --- |
| email | Email address | 0, 2 | user | Auth, transactional, marketing | personal_data | account + 30d / until delete | email ESP |
| auth_subject | Auth user id | 2 | auth provider | Session binding | personal_data | account + 30d | auth provider |
| display_name | Display name | 2 | user | UI personalization | personal_data | account / until delete | — |
| postpartum_week | Postpartum / pregnancy timeline | 2 | user | Timeline context | health / CHD / CPRA sensitive | account / 24 mo inactive / delete | — |
| stretch_mark_severity | Severity self-score | 2 | user | Progress tracking | health / CHD / CPRA sensitive | account / 24 mo inactive / delete | — |
| progress_photo | Body / stretch-mark photo | 2 | user upload | Visual diary | health + biometric risk | account / 24 mo inactive / delete | cloud storage |
| symptom_notes | Free-text notes | 2 | user | Journal | health / CHD / CPRA sensitive | account / 24 mo inactive / delete | — (never LLM without separate consent) |
| session_log | Session duration / params / time | 1, 2 | user / calculator | History & weekly totals | health when linked to identity + goal | local (P1); account (P2) | — |
| calculator_inputs | Irradiance, dose, area, duty cycle | 1 | user | Client-side time estimate | non-identifying if not linked | browser memory / local | — |
| ip_address | IP | 0–2 | network | Security, abuse, geo nexus | personal_data | 90 days edge logs | hosting / CDN |
| device_analytics | Usage events | 0–2 | SDK | Product analytics | personal_data | 14 months | analytics vendor |
| crash_reports | Error reports | 1–2 | SDK | Reliability | personal_data if IDs | 90 days | crash vendor |
| payment_metadata | Checkout tokens / receipts | 0, 2 | processor | Billing | financial metadata | tax retention ~7y | Polar.sh / Stripe |

## 4. Minimization rules (engineering must enforce)

1. **Do not collect** postpartum, severity, photos, or symptom notes until Phase 2 gate clears.
2. Analytics and crash SDKs **must not** receive health field values or photo bytes.
3. LLM / AI vendors **must not** receive symptom notes, photos, or identifiable health payloads without (a) explicit separate consent, (b) DPA, (c) no-training contractual clause.
4. Prefer **on-device photo storage** for MVP; cloud sync is optional and off by default.
5. Every health field requires **MHMDA-style opt-in** before write, and is included in export/delete.

## 5. Retention & deletion

| Class | Default retention | User delete SLA |
| --- | --- | --- |
| Account identity | Life of account + 30 days | Start within 72 hours; complete within 30 days |
| Consumer health fields | Life of account or 24 months inactive | Same as account delete; hard delete primary + object storage |
| Edge / security logs | 90 days | Not individually deletable; rotated |
| Analytics | 14 months | Delete/suppress via vendor tools on DSAR |
| Payment records | Per processor + tax law | Processor-mediated |

## 6. Cross-links

- Flows: [`data-flows.md`](./data-flows.md)
- Processors: [`third-party-processors.md`](./third-party-processors.md)
- Regulations: [`regulatory-mapping.md`](./regulatory-mapping.md)
- Master PIA: [`privacy-impact-assessment.md`](./privacy-impact-assessment.md)

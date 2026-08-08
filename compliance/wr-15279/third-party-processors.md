# Third-Party Processor Inventory — WR-15279

**Document ID:** COMP-15279-VENDOR-001  
**Machine-readable source of truth:** [`vendor-register.json`](./vendor-register.json)  
**Status:** Draft for counsel  
**Updated:** 2026-08-08

---

## 1. Policy defaults

1. **No sale** of consumer health data.
2. **DPA required** before any processor receives personal data.
3. **BAA required** only if entity classification flips to HIPAA CE/BA (not MVP).
4. **LLM health payloads default OFF** — require explicit AI consent + DPA + no-training clause + SaMD review for any vision/notes feature.
5. Privacy policy must list categories of processors and purposes.

## 2. Processor table

| ID | Processor | Category | Phases | CHD received? | Contract | MVP status | Key control |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vercel | Vercel | Hosting / CDN | 0–2 | No (logs only) | DPA | planned/in use | No health body logging |
| object_storage | S3/GCS/R2 TBD | Object storage | 2 | Yes (photos) | DPA | planned | Private bucket, SSE, lifecycle delete |
| app_database | Managed Postgres TBD | Database | 2 | Yes | DPA | planned | Encryption at rest, network lockout |
| auth_provider | Auth.js/Clerk/Supabase TBD | Auth | 2 | No | DPA | planned | No health in auth metadata |
| email_esp | Resend/Postmark/Beehiiv TBD | Email | 0, 2 | No | DPA | planned | No health in templates |
| analytics | Plausible/PostHog/Amplitude TBD | Analytics | 0–2 | **No** | DPA | planned | Deny-list health keys |
| crash_reporting | Sentry TBD | Crash | 1–2 | **No** | DPA | planned | Scrub PII/bodies |
| llm_api | OpenRouter/OpenAI/Anthropic TBD | LLM | future only | **No at MVP** | DPA + no-train | **not in MVP** | Feature flag off |
| payments | Polar.sh / Stripe | Payments | 0, 2 | No | DPA/payment terms | planned/in use | Tokens only; no PAN |

## 3. Onboarding checklist (per processor)

- [ ] Business owner + purpose recorded
- [ ] Data categories mapped to inventory field IDs
- [ ] CHD yes/no validated against actual SDK payloads
- [ ] DPA (or BAA if HIPAA path) executed and stored
- [ ] Subprocessor list reviewed
- [ ] Region / transfer mechanism documented (SCCs if EU)
- [ ] Retention + deletion API/process confirmed
- [ ] Security contact + breach notify timeline confirmed
- [ ] Added to privacy policy processor list
- [ ] Added/updated in `vendor-register.json`

## 4. Explicit exclusions for MVP

| Vendor type | Why excluded |
| --- | --- |
| Ad networks receiving CHD | MHMDA/CPRA sale-share risk |
| General LLM with user photos/notes | High privacy + SaMD risk |
| Non-HIPAA analytics on health properties | HBNR/FTC + state AG risk |
| Public CDN for user photos | Unauthorized disclosure risk |

## 5. If HIPAA path activates later

Every processor that would touch PHI needs:

1. Signed BAA **before** PHI flows  
2. HIPAA-eligible product tier  
3. Audit log support where required  
4. Re-entry in risk register + entity-classification revision  

## 6. Cross-links

- Flows: [`data-flows.md`](./data-flows.md)
- Inventory: [`data-inventory.md`](./data-inventory.md)
- Risks: [`risk-register.md`](./risk-register.md)
- Master PIA: [`privacy-impact-assessment.md`](./privacy-impact-assessment.md)

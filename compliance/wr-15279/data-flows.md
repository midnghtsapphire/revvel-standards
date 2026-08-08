# Data Flow Diagrams — WR-15279

**Document ID:** COMP-15279-FLOW-001  
**Status:** Draft for counsel  
**Updated:** 2026-08-08

---

## 1. Phase 0 — Content only (allowed now)

```text
[Browser]
   |  HTTPS page views
   v
[CDN / Vercel edge] --logs(IP, UA, path, 90d)--> [Hosting logs]
   |
   | optional email signup (no health fields)
   v
[Email ESP] <--- email, consent timestamp

Optional:
[Browser] --checkout--> [Polar.sh / Stripe] (payment tokens only)
```

**Health data in this phase:** none.  
**Blocked:** photo upload, symptom forms, postpartum fields, session health cloud sync.

## 2. Phase 1 — Dosage calculator (current shipped calculator)

```text
[Browser React state]
   |  irradiance, target dose, area, duty cycle, sessions/week
   |  (memory only — products/red-light-therapy-dosage-calculator)
   v
[Client calculateDosage()] --> display estimated session time
   |
   | page assets only
   v
[CDN / Vercel] --edge logs--> [Hosting logs]

Optional (if enabled later, scrubbed):
[Browser] --usage events (no health payloads)--> [Analytics]
[Browser] --scrubbed stack traces--> [Crash reporting]
```

**Server-side health store:** none.  
**Identifiers linked to calculator inputs:** none by design.

## 3. Phase 2 — Progress tracker (PLANNED — production blocked)

```text
[User device]
   |  TLS 1.2+
   |  email/password or magic link
   v
[Auth provider] ----auth subject, email----\
                                           \
[User device]                               \
   |  health opt-in consent                  \
   |  postpartum_week, severity, notes,       \
   |  session_log, optional photo             |
   v                                          v
[App API / BFF] -----------------------> [App database]
   |  encrypt in transit + at rest            |
   |                                          |
   |  optional photo object                   v
   +------------------------------> [Object storage]
   |
   |  transactional email (no health body)
   +------------------------------> [Email ESP]
   |
   |  FORBIDDEN without separate consent+DPA:
   |     health fields --> Analytics
   |     notes/photos  --> LLM APIs
   |     raw PHI-like  --> Crash tools
   v
[Allow-listed processors only — see third-party-processors.md]
```

### 3.1 Ingress

| Flow | Data | Control |
| --- | --- | --- |
| Signup / login | email, auth subject | MFA optional; rate limit; no health on signup |
| Tracker write | health fields after opt-in | Consent flag stored with timestamp, policy version |
| Photo upload | image bytes | Size limits; malware scan; private bucket; no public ACL |
| Session log write | duration, device params | Tied to auth subject; no third-party fan-out |

### 3.2 Egress

| Flow | Data | Control |
| --- | --- | --- |
| User export (DSAR) | all user + health fields | AuthN required; audit log |
| User delete | all user primary keys + objects | 30-day hard delete SLA |
| Email | receipt / security only | No severity, notes, or photos in email body |
| Analytics | page/feature events | Deny-list health keys in SDK |
| Support tools | ticket text | Agents see health only with need-to-know + audit |

### 3.3 Trust boundaries

1. **Device** — user-controlled; local-only mode keeps photos/session on device.
2. **Edge / hosting** — TLS termination; logs must not capture request bodies with health fields.
3. **App core** — authoritative store; encryption at rest; access RBAC.
4. **Processors** — contractual DPA; no sale of CHD; subprocessors listed in privacy policy.

## 4. Prohibited flows (regression targets)

The following flows are **out of policy**. Tests and code review must reject them:

1. Health field values in analytics event properties
2. Progress photos or symptom notes sent to general-purpose LLM APIs without explicit AI consent
3. Public object-storage URLs for progress photos
4. Email/SMS content containing photos, severity scores, or free-text symptoms
5. Cross-product data sharing inside MIDNGHTSAPPHIRE orgs without purpose limitation + notice

## 5. Sequence — account delete (Phase 2)

```text
User -> API: DELETE /me (authenticated)
API -> DB: soft-delete flag + purge job enqueued
API -> Object storage: delete photo keys
API -> Auth provider: schedule account delete
API -> Email ESP: suppress / delete contact (marketing)
API -> Analytics: user-id suppression request
API -> Audit log: record deletion event (retain audit ≥ 6 years if HIPAA path ever activates; else ≥ 3 years)
Job: hard-delete residual rows within 30 days
```

## 6. Cross-links

- Inventory: [`data-inventory.md`](./data-inventory.md)
- Processors: [`third-party-processors.md`](./third-party-processors.md)
- Master PIA: [`privacy-impact-assessment.md`](./privacy-impact-assessment.md)

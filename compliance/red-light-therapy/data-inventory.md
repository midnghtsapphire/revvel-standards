# Data Inventory — Red Light Therapy Dosage Calculator

**Document ID:** `RLT-DATA-INV-2026-08`  
**Issue:** #16111  
**Product:** `products/red-light-therapy-dosage-calculator`  
**Inventory date:** 2026-08-08  
**Scope:** Shipped calculator code paths only (not future tracker features from WR #15279)

---

## 1. Summary

The shipped product is a **client-side numeric calculator**. It does **not** implement user accounts, photo upload, cloud sync of health journals, insurance APIs, or provider messaging.

| Question | Answer (shipped code) |
| --- | --- |
| Identifiable user profile stored by operator? | No |
| Health journal / photos stored by operator? | No |
| Dosage inputs sent to operator API? | No application API for inputs (pure client calculation) |
| CE/BA data flows? | None |
| Suitable to claim HIPAA compliance? | **No** |

---

## 2. Data elements

| Element | Source | Stored where | Identifiable? | Health-related? | Shared with third parties by app code? | Purpose | Retention |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Irradiance (mW/cm²) | User form input | Browser memory / React state only | No (numeric only) | Wellness device parameter | No | Compute session time | Until page unload / refresh |
| Target dose (J/cm²) | User form input | Browser memory only | No | Wellness parameter | No | Compute session time | Until page unload |
| Treatment area (cm²) | User form input | Browser memory only | No | Wellness parameter | No | Total energy calc | Until page unload |
| Sessions / week | User form input | Browser memory only | No | Wellness parameter | No | Weekly dose load | Until page unload |
| Duty cycle (%) | User form input | Browser memory only | No | Wellness parameter | No | Pulse adjustment | Until page unload |
| Compensation profile | User form select | Browser memory only | No | Wellness parameter | No | Practical timing adjustment | Until page unload |
| Derived session time / energy | Computed client-side | Browser memory only | No | Wellness output | No | Display result | Until page unload |
| Standard HTTP request metadata (IP, user-agent) | Hosting/CDN (if deployed) | Hosting provider logs (environment-dependent) | Possibly (IP) | No (not linked by us to health inputs) | Hosting provider as processor | Security / ops | Per host retention |
| Privacy policy page views | Hosting/CDN | Hosting logs | Possibly (IP) | No | Hosting provider | Ops | Per host retention |

### Not collected by shipped calculator

- Name, email, phone, account ID  
- Postpartum week / pregnancy status  
- Stretch-mark severity scores  
- Symptom notes  
- Body / progress photographs  
- Device serial numbers tied to a person  
- Precise geolocation  
- Payment / insurance identifiers  
- Government IDs  

---

## 3. Future WR #15279 tracker features (NOT shipped — blocked)

The parent WR contemplates progress photos, severity ratings, and session logs. Those features are **out of inventory scope** and remain **blocked** until:

1. Counsel determination is signed (`status.json` ≠ `UNSIGNED` / `REEVAL_REQUIRED`), and  
2. If Path B: state-law privacy program + honest policy update for the new elements, or  
3. If Path A: full HIPAA program before collection.

Adding any blocked element is trigger **T7** (and possibly T1–T6).

---

## 4. Vendor touchpoints (shipped)

| Vendor category | Touches calculator inputs? | Instrument required under Path B | Instrument if Path A later |
| --- | --- | --- | --- |
| Static web host / CDN (e.g. Vercel) | No app-level forward of form fields | DPA / host terms as applicable | BAA only if PHI is actually processed there under CE/BA posture |
| Analytics | None configured in product source for health inputs | Do not add health-input analytics without PIA | HIPAA-eligible analytics + BAA if PHI |
| AI / LLM | None in calculator path | N/A | BAA if PHI sent to model provider |
| Email / SMS | None in calculator path | N/A | BAA if PHI |

---

## 5. Classification notes

- Under a **Path B** (not CE/BA) posture, these ephemeral numerics are **not HIPAA PHI**, because PHI is a HIPAA construct that applies to CE/BA-held individually identifiable health information.  
- They may still be **consumer health data** or sensitive personal information under state laws **if** linked to identity or used to infer health status in a covered way — the shipped calculator avoids that link.  
- Under a **Path A** posture, even similar fields can become PHI when tied to an identifiable individual in a CE/BA context. Architecture (client-side vs server) does not decide entity status.

# HBNR Entity Classification — Red Light Therapy Product Line

**Product:** Red Light Therapy Dosage Calculator / stretch-marks companion surfaces  
**Issue:** [#16112](https://github.com/midnghtsapphire/revvel-standards/issues/16112)  
**Related PIA:** [#16110](https://github.com/midnghtsapphire/revvel-standards/issues/16110)  
**Regulation:** FTC Health Breach Notification Rule, 16 CFR Part 318  
**Status:** Operational determination for engineering + ops — **counsel sign-off required before production collection of identifiable health data**  
**Last updated:** 2026-08-08

> Nothing in this document is legal advice. Retain qualified healthcare privacy counsel to ratify this classification as part of the Privacy Impact Assessment (#16110).

---

## 1. Question

Does the product qualify as a **vendor of personal health records (PHR)**, a **PHR-related entity**, or a **third-party service provider** under the FTC Health Breach Notification Rule (HBNR), such that breach notification procedures are mandatory even when HIPAA does not apply?

---

## 2. Facts about the product (current + near-term roadmap)

| Fact | Current dosage calculator | If accounts / logs / photos ship |
| --- | --- | --- |
| Health-related inputs | Irradiance, dose, session timing (wellness calculator) | Session logs, symptom notes, stretch-mark photos, postpartum timeline |
| Identifiers | None required today (client-side calculator) | Email/account, device identity, photos of a person |
| Sources of health info | User-entered device specs only | User entry + device///app history + optional photos (multiple sources) |
| HIPAA covered entity / BA? | No (D2C wellness; see HIPAA addendum) | No, unless clinical partnerships begin |
| Draws info from multiple sources? | Not yet | Yes, when identity-linked logs + photos + user entry combine |

HIPAA posture (from `wr/issues/issue-15279-hipaa-compliance-addendum.md`): **direct-to-consumer wellness — HIPAA does not apply at launch.** HBNR and state health-privacy laws still may.

---

## 3. HBNR role decision

### Machine-readable baseline (enforced in `scripts/hbnr-procedures.js`)

```text
offersOrMaintainsPhr: true
drawsFromMultipleSources: true
hasIdentifiableHealthData: true
hipaaCoveredForSameData: false
→ role: phr_vendor
→ applicability: applies
→ requiresBreachProcedures: true
```

### Narrative determination

1. **HIPAA exclusion does not apply** — we are not a covered entity or business associate for this data at launch.  
2. **PHR-identifiable health information** will exist once session logs, symptom notes, or photos are linked to a user identity (email, account, or comparable identifier).  
3. **Multiple sources** — user-entered assessments plus device/session telemetry (and photos) meet the multi-source PHR pattern described in the FTC’s 2024 HBNR update for apps and connected devices.  
4. Therefore the product line is treated as a **vendor of personal health records** for HBNR readiness.

### Conservative rule for engineering

- If the app collects **any** health data linked to an identity → **maintain full HBNR breach procedures** (this repo).  
- If counsel later documents a de-identified, single-source, non-PHR design → update this memo and the baseline flags in `scripts/hbnr-procedures.js` in the same PR.  
- If the business model adds clinic/insurer PHI flows → switch to HIPAA Breach Notification Rule procedures; HBNR yields for that HIPAA-covered data.

---

## 4. What this means operationally

| Obligation | Required? |
| --- | --- |
| Written breach notification runbook | Yes — `compliance/breach-notification-runbook.md` |
| Ops contacts + escalation | Yes — `docs/runbooks/red-light-therapy-dosage-calculator.md` |
| Privacy policy timelines | Yes — `PRIVACY.md` + in-app `/privacy` |
| Individual notice ≤ 60 calendar days | Yes, when a reportable breach occurs |
| FTC notice ≤ 60 calendar days (or ≤ 10 business days if >500 residents of any state/jurisdiction) | Yes |
| Media notice where ≥500 residents of a state/jurisdiction are affected | Yes |
| PIA completion before production identifiable health data | Yes — blocking, issue #16110 |

---

## 5. Sign-off

| Role | Name | Date | Decision |
| --- | --- | --- | --- |
| Engineering (procedures implemented) | Copilot agent / revvel-standards | 2026-08-08 | Baseline `phr_vendor` + procedures shipped |
| Privacy Lead | Audrey Evans (@midnghtsapphire) | _pending_ | _pending counsel pack_ |
| Outside healthcare privacy counsel | _TBD_ | _pending_ | Ratify or revise via PIA #16110 |

---

## 6. References

- FTC HBNR: <https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule>  
- 16 CFR Part 318  
- Compliance addendum: `wr/issues/issue-15279-hipaa-compliance-addendum.md` §3, §3.2, §4  
- Implementation helpers: `scripts/hbnr-procedures.js`  
- Tests: `tests/hbnr-procedures.test.js`

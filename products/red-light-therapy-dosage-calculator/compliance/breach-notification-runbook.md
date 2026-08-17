# Breach Notification Runbook — FTC HBNR (Non-HIPAA)

**Product:** Red Light Therapy Dosage Calculator
**Regulation:** FTC Health Breach Notification Rule (16 CFR Part 318)
**Issue:** [#16112](https://github.com/midnghtsapphire/revvel-standards/issues/16112)
**Code helpers:** `scripts/hbnr-procedures.js`
**Last updated:** 2026-08-08

Use this runbook when unsecured **PHR-identifiable health information** may have been acquired without authorization. HIPAA Breach Notification procedures apply instead only if counsel classifies the incident as HIPAA-covered.

---

## 0. Contacts (page immediately)

| Role | Contact |
| --- | --- |
| On-call channel | `#incident-response` — page privacy + security within **1 hour** of confirmed breach |
| Privacy Lead | <privacy@revvel.io> (Audrey Evans) |
| Security Lead | <security@revvel.io> |
| Legal counsel | <legal@revvel.io> (healthcare privacy counsel) |
| Executive escalation | @midnghtsapphire |
| User-notice from address | <privacy@revvel.io> |
| FTC intake | <https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule> |

Full escalation path also lives in `docs/runbooks/red-light-therapy-dosage-calculator.md`.

---

## 1. Discovery (clock starts here)

**Discovery** is the first day we know of the breach or would have known by exercising reasonable diligence.

1. Anyone who suspects unauthorized access opens an incident ticket and posts in `#incident-response` within **15 minutes**.
2. Security Lead starts containment (credential revoke, session kill, access lock, snapshot logs).
3. Privacy Lead records:
   - `discoveredOn` (YYYY-MM-DD, UTC date used in tooling)
   - systems and vendors involved
   - data elements potentially exposed
   - whether encryption/other securing methods rendered data unusable
4. Do **not** delay the discovery date for internal debate.

```bash
# Optional: compute deadlines once counts are known (from repo root)
node -e "
const h=require('./scripts/hbnr-procedures');
console.log(JSON.stringify(h.buildBreachNotificationPlan({
  discoveredOn: 'YYYY-MM-DD',
  affectedIndividuals: 0,
  unauthorizedAcquisition: true,
  byJurisdiction: [{ jurisdiction: 'California', affectedResidents: 0 }],
}), null, 2));
"
```

---

## 2. Assessment (reportability)

Work through this checklist within **24 hours** (same calendar day if large-breach indicators exist):

| # | Question | If yes |
| --- | --- | --- |
| A | Was there **unauthorized acquisition** of data? | Continue |
| B | Was the data **PHR-identifiable health information** (health data + identity link)? | Continue |
| C | Was the data **unsecured** (not rendered unusable/unreadable/indecipherable)? | HBNR notice likely required |
| D | Are we HIPAA CE/BA for this same data? | Use HIPAA rule instead; stop HBNR path for that data |
| E | Count affected individuals and residents **per state/jurisdiction** | Drives FTC + media clocks |

**Secure data exception:** If encryption or equivalent means made the PHR data unusable to the unauthorized party, document the determination with counsel. Notices may not be required — still complete the incident record.

**Tooling:** `buildBreachNotificationPlan()` sets `isReportableBreach`, `largeBreach`, and per-audience deadlines.

### Timelines (from discovery)

| Audience | Trigger | Deadline |
| --- | --- | --- |
| Affected individuals | Reportable breach | Without unreasonable delay, **≤ 60 calendar days** |
| FTC | Reportable breach, no state ≥500 residents | **≤ 60 calendar days** |
| FTC | Reportable breach, **>500 residents of any state/jurisdiction** | **≤ 10 business days** |
| Prominent media | **≥500 residents** in that state/jurisdiction | Without unreasonable delay, **≤ 60 calendar days** (coordinate with individual notice) |

---

## 3. Containment and evidence (parallel to assessment)

1. Revoke compromised credentials and keys; rotate secrets via secret manager (never commit secrets).
2. Preserve logs, access records, and backups in write-once storage.
3. Identify processors/subprocessors that touched the data; open vendor incident channels.
4. Determine whether data is still exfiltrating; stop the bleed before broad notification if possible — **do not** burn the entire 60-day clock on forensics.

---

## 4. Individual (user) notification

### Channel

- Email to the account address on file (primary).
- In-app banner when the user next authenticates, if email bounces.
- First-class mail only if required for users without a working email and counsel directs it.

### Template

Generate with:

```bash
node -e "
const h=require('./scripts/hbnr-procedures');
process.stdout.write(h.renderUserNotificationTemplate({
  productName: 'Red Light Therapy Dosage Calculator',
  discoveredOn: 'YYYY-MM-DD',
  description: 'Describe the incident in plain language.',
  dataElements: ['email address', 'session logs', 'symptom notes'],
  stepsTaken: ['Contained the access', 'Reset sessions', 'Notified regulators as required'],
  userActions: ['Reset your password', 'Enable MFA if offered', 'Contact us with questions'],
  contactEmail: '<privacy@revvel.io>',
}));
"
```

### Required content elements

1. **What happened**
2. **What information was involved**
3. **What we are doing**
4. **What you can do**
5. **How to contact us**
6. Reference to the FTC Health Breach Notification Rule (16 CFR Part 318)

### Approval

Privacy Lead drafts → Legal reviews → Executive owner approves → Privacy Lead sends and archives proof (recipients count, timestamp, exact body).

---

## 5. FTC notification process

1. Privacy Lead assembles:
   - entity identity and contact
   - description of the breach
   - discovery date
   - number of individuals affected
   - residency counts by state/jurisdiction
   - types of PHR-identifiable information
   - steps taken and planned
2. Submit via the FTC HBNR process linked from
   <https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule>
3. **Deadline:**
   - **10 business days** after discovery if any state/jurisdiction has **more than 500** affected residents
   - otherwise **60 calendar days** after discovery
4. File confirmation PDF + submission ID in the incident ticket.

---

## 6. Media notification trigger

**Trigger:** ≥ **500 residents** of a single state or jurisdiction are affected.

1. Privacy + Legal identify “prominent media” outlets in each triggered state/jurisdiction.
2. Prepare a press-ready statement consistent with the individual notice (same facts, no speculation).
3. Executive owner approves.
4. Distribute without unreasonable delay and track placements.
5. If residency data is incomplete but totals exceed 500, **obtain state breakdowns immediately** — the accelerated FTC window may apply once a state crosses 500.

---

## 7. Escalation path (ordered)

1. Discoverer pages on-call channel and opens incident ticket within 15 minutes.
2. Security Lead confirms containment and evidence preservation within 1 hour.
3. Privacy Lead opens this HBNR checklist and starts the discovery clock documentation.
4. Legal counsel reviews reportability within 1 business day (same day if `largeBreach`).
5. Executive owner approves individual / FTC / media notice packages before send.
6. Privacy Lead files FTC notice and sends user notices; records proof of send + content.
7. Post-incident review within 10 business days; update this runbook and vendor controls.

---

## 8. Post-incident

- [ ] Root-cause analysis filed
- [ ] User questions / complaints queue drained or ticketed
- [ ] Vendor DPA / security addenda updated if a processor failed
- [ ] `scripts/hbnr-procedures.js` tests still green
- [ ] Privacy policy still accurate (`PRIVACY.md`, `/privacy`)
- [ ] Lessons linked from the incident ticket to PIA #16110 if scope assumptions changed

---

## 9. Related artifacts

- Entity classification: `compliance/hbnr-entity-classification.md`
- Privacy policy: `PRIVACY.md` and in-app `/privacy`
- Operational runbook: `docs/runbooks/red-light-therapy-dosage-calculator.md`
- HIPAA addendum (D2C posture): `wr/issues/issue-15279-hipaa-compliance-addendum.md`

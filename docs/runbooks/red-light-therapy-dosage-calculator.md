# Runbook: Red Light Therapy Dosage Calculator

**Service:** Red Light Therapy Dosage Calculator (Next.js wellness tool)  
**Owner:** Audrey Evans (@midnghtsapphire)  
**Product path:** `products/red-light-therapy-dosage-calculator`  
**Dev port:** 3010  
**Last updated:** 2026-08-08  
**Related issue:** [#16112](https://github.com/midnghtsapphire/revvel-standards/issues/16112) (FTC HBNR breach procedures)

---

## Health Check

```bash
cd products/red-light-therapy-dosage-calculator
npm install
npm run dev -- -p 3010
curl -I http://127.0.0.1:3010
curl -I http://127.0.0.1:3010/privacy
```

Expected:

- Home page returns HTTP 200 and renders the dosage calculator  
- `/privacy` returns HTTP 200 and shows breach-notification timelines  
- `npm test` inside the product directory passes  

Root regression for HBNR procedures:

```bash
node --test tests/hbnr-procedures.test.js
```

---

## Restart / redeploy

Follow the product README for local dev. Production deploy uses the repo’s standard Vercel path for Next.js products (`npm run build` in the product directory, then the org deploy workflow).

```bash
cd products/red-light-therapy-dosage-calculator
npm run build
npm run start -- -p 3010
```

---

## Breach response contacts

| Role | Contact | When to page |
| --- | --- | --- |
| On-call / incident channel | `#incident-response` | Within 15 minutes of suspected unauthorized access |
| Privacy Lead | <privacy@revvel.io> (Audrey Evans) | All suspected PHR / health-data incidents |
| Security Lead | <security@revvel.io> | Containment, forensics, credential rotation |
| Legal counsel | <legal@revvel.io> | Reportability, notice wording, regulator filings |
| Executive escalation | @midnghtsapphire | Large breach (≥500/state), press, or unresolved blocker >4 hours |
| User notice from | <privacy@revvel.io> | Outbound individual HBNR notices |
| FTC HBNR intake | [FTC HBNR page](https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule) | Regulator notification |

---

## Escalation path (HBNR)

1. Discoverer pages `#incident-response` and opens an incident ticket within **15 minutes**.  
2. **Security Lead** confirms containment and evidence preservation within **1 hour**.  
3. **Privacy Lead** opens `products/red-light-therapy-dosage-calculator/compliance/breach-notification-runbook.md` and records `discoveredOn`.  
4. **Legal counsel** reviews reportability within **1 business day** (same day if any state may exceed 500 residents).  
5. **Executive owner** approves individual / FTC / media notice packages before send.  
6. **Privacy Lead** files FTC notice and sends user notices; stores proof of send.  
7. Post-incident review within **10 business days**; update runbooks and vendor controls.

### Deadline cheat sheet

| Notice | Deadline from discovery |
| --- | --- |
| Individuals | ≤ 60 calendar days (sooner if practical) |
| FTC (default) | ≤ 60 calendar days |
| FTC (if >500 residents of any state/jurisdiction) | ≤ 10 business days |
| Media (per state/jurisdiction with ≥500 residents) | Without unreasonable delay (coordinate with individual notice) |

Compute deadlines:

```bash
node -e "console.log(require('./scripts/hbnr-procedures').buildBreachNotificationPlan({
  discoveredOn: '2026-08-08',
  affectedIndividuals: 600,
  unauthorizedAcquisition: true,
  byJurisdiction: [{ jurisdiction: 'California', affectedResidents: 600 }],
}))"
```

---

## Common failures

| Symptom | Check |
| --- | --- |
| Dev server port conflict | Use `-p 3010`; stop other Next apps on 3000 |
| Privacy page 404 | Confirm `app/privacy/page.tsx` is deployed |
| HBNR tests fail | `node --test tests/hbnr-procedures.test.js` |
| Workflow validation fails | `npm run workflows:validate` |

---

## Related documents

- Entity classification: `products/red-light-therapy-dosage-calculator/compliance/hbnr-entity-classification.md`  
- Breach runbook: `products/red-light-therapy-dosage-calculator/compliance/breach-notification-runbook.md`  
- Privacy policy: `products/red-light-therapy-dosage-calculator/PRIVACY.md`  
- HIPAA addendum (D2C posture): `wr/issues/issue-15279-hipaa-compliance-addendum.md`  
- Implementation module: `scripts/hbnr-procedures.js`

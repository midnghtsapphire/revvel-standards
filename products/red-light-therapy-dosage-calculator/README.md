# Red Light Therapy Dosage Calculator

Mobile-friendly calculator for red light therapy / photobiomodulation session timing.

Core formula used:

`time (seconds) = (target dose J/cm2 × 1000) / irradiance mW/cm2`

The app also supports:

- duty-cycle adjustment for pulsed mode
- compensation profiles (`x2` solar-meter correction, `x2.5` skin reflection correction)
- weekly dose and per-session total energy outputs

## Live Deployment

Production URL is published by the org ship-to-market / Vercel deploy path for this product. Local verification uses port `3010` (see below). Privacy policy path: `/privacy`.

## Local Development

```bash
cd products/red-light-therapy-dosage-calculator
npm install
npm run dev -- -p 3010
```

Default port: `3010`

## Validation

```bash
npm run test
npm run lint
npm run build
```

Root HBNR procedure tests (from monorepo root):

```bash
node --test tests/hbnr-procedures.test.js
```

## Privacy and breach notification (FTC HBNR)

This product is positioned as a direct-to-consumer wellness tool (not HIPAA-covered at launch). If it stores PHR-identifiable health information, the FTC Health Breach Notification Rule applies.

| Artifact | Path |
| --- | --- |
| Privacy policy (markdown) | [`PRIVACY.md`](./PRIVACY.md) |
| In-app privacy policy | [`/privacy`](./app/privacy/page.tsx) |
| HBNR entity classification | [`compliance/hbnr-entity-classification.md`](./compliance/hbnr-entity-classification.md) |
| Breach notification runbook | [`compliance/breach-notification-runbook.md`](./compliance/breach-notification-runbook.md) |
| Operational runbook (contacts + escalation) | [`docs/runbooks/red-light-therapy-dosage-calculator.md`](../../docs/runbooks/red-light-therapy-dosage-calculator.md) |
| Procedure helpers | [`scripts/hbnr-procedures.js`](../../scripts/hbnr-procedures.js) |
| HIPAA entity scope compliance pack | [`compliance/red-light-therapy/`](../../compliance/red-light-therapy/) |
| Compliance status file | [`compliance/red-light-therapy/status.json`](../../compliance/red-light-therapy/status.json) |

**Notification timelines (also stated in the privacy policy):**

- Affected users: without unreasonable delay, within **60 calendar days** of discovery
- FTC: within **60 calendar days**, or within **10 business days** if more than **500 residents** of any state/jurisdiction are affected
- Media: prominent media in each state/jurisdiction where **≥500 residents** are affected

**We do not claim HIPAA compliance.** The calculator is a direct-to-consumer wellness tool. Inputs are handled in the browser for the session; the app does not implement accounts or server-side storage of dosage inputs. Client-side calculation is an engineering choice, not a regulatory exemption. Any clinic, telehealth, HSA/FSA clinical, or insurance feature requires a new HIPAA scope determination before shipping (see re-evaluation triggers in the compliance pack).

## Disclaimer

This app is for general wellness and informational purposes only. It is not a medical device and does not diagnose, treat, cure, or prevent any condition. Session parameters vary by device design, wavelength, distance, and individual response. Consult a qualified clinician for medical decisions. Wellness disclaimers address product framing only — they do not create HIPAA coverage.

## Deploy

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

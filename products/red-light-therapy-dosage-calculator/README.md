# Red Light Therapy Dosage Calculator

Mobile-friendly calculator for red light therapy / photobiomodulation session timing, plus an optional MHMDA-aligned health progress journal.

Core formula used:

`time (seconds) = (target dose J/cm2 × 1000) / irradiance mW/cm2`

The app also supports:

- duty-cycle adjustment for pulsed mode
- compensation profiles (`x2` solar-meter correction, `x2.5` skin reflection correction)
- weekly dose and per-session total energy outputs
- **Washington My Health My Data Act (MHMDA) explicit opt-in** before any consumer health data (photos, symptom notes, postpartum timeline, session logs, severity scores) is stored
- access / correction / deletion requests and a privacy policy with MHMDA disclosures

## Local Development

```bash
cd products/red-light-therapy-dosage-calculator
npm install
npm run dev
```

Default port: `3010`

## MHMDA consent (WR-15279 / #16113)

Health journal features are gated behind a **separate** affirmative opt-in screen (not bundled into Terms). Implementation:

| Path | Role |
| --- | --- |
| `app/data/mhmda-consent.ts` | Consent validation, DSAR, sister-state assessment |
| `app/components/MhmdaConsentGate.tsx` | Opt-in UI |
| `app/components/HealthDataRights.tsx` | Journal + rights UI |
| `app/privacy/page.tsx` | Privacy policy |
| `tests/mhmda-consent.test.ts` | Regression coverage |

National default: same MHMDA-grade flow for all users (covers CT/NV/TX sensitive-data baselines). See `wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t-compliance-addendum.md`.

## Validation

```bash
npm run test
npm run lint
npm run build
```

## Disclaimer

This app is for general wellness and informational purposes only. It is not a medical device and does not diagnose, treat, cure, or prevent any condition. Session parameters vary by device design, wavelength, distance, and individual response. Consult a qualified clinician for medical decisions. MHMDA engineering controls are not a substitute for legal counsel sign-off.

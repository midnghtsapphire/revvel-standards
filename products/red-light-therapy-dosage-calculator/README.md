# Red Light Therapy Dosage Calculator

Mobile-friendly calculator for red light therapy / photobiomodulation session timing.

Core formula used:

`time (seconds) = (target dose J/cm2 × 1000) / irradiance mW/cm2`

The app also supports:
- duty-cycle adjustment for pulsed mode
- compensation profiles (`x2` solar-meter correction, `x2.5` skin reflection correction)
- weekly dose and per-session total energy outputs

## Local Development

```bash
cd products/red-light-therapy-dosage-calculator
npm install
npm run dev
```

Default port: `3010`

## Validation

```bash
npm run test
npm run lint
npm run build
```

## Disclaimer

Educational planning tool only. Protocols vary by device design, wavelength, distance, and individual response. Consult a qualified clinician for medical decisions.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

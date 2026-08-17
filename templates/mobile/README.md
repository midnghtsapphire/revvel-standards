# Mobile Deployment Templates

This scaffold is **inactive**. See `MOBILE_DEPLOYMENT.md` for activation instructions.

---

## Files in This Directory

| File | Purpose |
|---|---|
| `MOBILE_DEPLOYMENT.md` | Complete guide to activating Android and iOS store deployment |
| `pwa-audit.sh` | Shell script to audit PWA readiness |
| `fastlane/Fastfile` | Fastlane lanes scaffold (inactive until accounts ready) |
| `fastlane/Appfile` | Fastlane app identifiers (fill in with real values when ready) |
| `testing/` | **Mobile test harness templates** — `jest-expo` + `@testing-library/react-native` + Maestro starter configs and a `mobile-test.yml` GH Actions workflow. See [`testing/README.md`](./testing/README.md). |

---

## Current State

All Revvel apps are deployed as **Progressive Web Apps (PWA)**. This means:

- ✅ Users can "Add to Home Screen" on Android and iOS **right now**
- ✅ The app works offline (if a service worker is configured)
- ❌ The app is NOT yet in the Google Play Store
- ❌ The app is NOT yet in the Apple App Store

The Play Store and App Store paths are documented in `MOBILE_DEPLOYMENT.md` and will be activated when the required developer accounts are purchased.

---

## Activation Checklist

- [ ] Google Play Developer account ($25 one-time) — see `MOBILE_DEPLOYMENT.md`
- [ ] Apple Developer Program ($99/year) — see `MOBILE_DEPLOYMENT.md`
- [ ] Fill in `fastlane/Appfile` with real app identifiers
- [ ] Activate `deploy-android.yml` by replacing TODO steps
- [ ] Activate `deploy-ios.yml` by replacing TODO steps

---

## Related Evaluations

- [`../../docs/CI_APPS_MOBILE_EVAL_2026-04-23.md`](../../docs/CI_APPS_MOBILE_EVAL_2026-04-23.md) — Review of 20 GitHub Marketplace CI/CD apps (Codemagic, Bitrise, Appcircle, etc.) scored specifically for Play Store + App Store automation on top of this scaffold.
- [`../../docs/CAPACITOR_MOBILE_EVAL_2026-04-28.md`](../../docs/CAPACITOR_MOBILE_EVAL_2026-04-28.md) — Evaluation of Ionic Capacitor as the primary PWA → native shell wrapper for both Android and iOS, with rollout plan against the Fastlane + GitHub Actions scaffolds in this directory.

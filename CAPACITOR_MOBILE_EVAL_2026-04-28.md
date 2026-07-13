# Capacitor — Mobile Store Wrapping Evaluation (April 28, 2026)

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluation (decision: **Adopt as primary PWA-to-store wrapper**, conditional on Apple/Google account purchases per [`../templates/mobile/MOBILE_DEPLOYMENT.md` §2–§3](../templates/mobile/MOBILE_DEPLOYMENT.md))
**Scope:** Score Ionic **Capacitor** (currently v6.x line, with v7 in active release) as the framework Revvel uses to wrap its PWAs into native Android `.aab` and iOS `.ipa` artifacts and ship them to the **Google Play Store** and **Apple App Store**, on top of the existing GitHub Actions + Fastlane scaffold.
**Related:** [`../templates/mobile/MOBILE_DEPLOYMENT.md`](../templates/mobile/MOBILE_DEPLOYMENT.md) · [`../templates/mobile/CORDOVA_STANDARD.md`](../templates/mobile/CORDOVA_STANDARD.md) · [`../templates/mobile/fastlane/Fastfile`](../templates/mobile/fastlane/Fastfile) · [`../templates/cicd/deploy-android.yml`](../templates/cicd/deploy-android.yml) · [`../templates/cicd/deploy-ios.yml`](../templates/cicd/deploy-ios.yml) · [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) · [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md) · [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) · [`../standards/REVENUECAT.md`](../standards/REVENUECAT.md)

---

## 0. TL;DR — What to actually do

- **Adopt Capacitor as the primary "PWA → native shell" layer for both Android and iOS** in every Revvel app that needs to land in a store. It is the strongest fit for our stack: framework-agnostic web → native, MIT-licensed, no SaaS lock-in for the core, and a first-class GitHub Actions + Fastlane integration story.
- **Keep Bubblewrap/TWA** as the *zero-cost fallback* for an Android-only Play Store listing of a pure PWA when no native APIs (push, IAP, biometrics, file system) are required. Capacitor wins the moment a native API is required, which is true for any app using **RevenueCat** ([`../standards/REVENUECAT.md`](../standards/REVENUECAT.md)), push notifications, or background sync.
- **Demote Apache Cordova to "legacy / migration only."** Keep [`../templates/mobile/CORDOVA_STANDARD.md`](../templates/mobile/CORDOVA_STANDARD.md) and [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) for any inherited Cordova app, but do **not** start new projects on Cordova. The recommendation already in `CORDOVA_STANDARD.md` §2 ("Use Capacitor for new projects") is now the formal default; this evaluation upgrades it from a sentence in a sibling doc to a standards-level decision.
- **Do not adopt Ionic Appflow / Live Updates today.** Capacitor's CodePush-style live-update SaaS is paid (~$499+/mo for the Launch tier as of 2026-Q1), and Apple's App Store guideline 4.5.5 + Google Play Developer Program Policies both restrict what can be live-updated without a re-review. Defer until a real over-the-air patch need is documented in [`./_MASTER_BOM.md`](./_MASTER_BOM.md).
- **No new CI vendor required.** Capacitor builds use the same `./gradlew bundleRelease` / `xcodebuild archive` invocations the existing [`../templates/cicd/deploy-android.yml`](../templates/cicd/deploy-android.yml) and [`../templates/cicd/deploy-ios.yml`](../templates/cicd/deploy-ios.yml) already drive via Fastlane. Adoption is a **template addition** (a `templates/mobile/CAPACITOR_STANDARD.md` + a `templates/cicd/deploy-capacitor.yml` mirror of the Cordova workflow), not a CI rewrite.
- **Net new tooling cost:** **$0**. Capacitor core + official platform plugins are MIT-licensed. Build minutes are unchanged from the Bubblewrap/Cordova path. The only new bills are the developer-account fees already tracked in [`../templates/mobile/MOBILE_DEPLOYMENT.md`](../templates/mobile/MOBILE_DEPLOYMENT.md): Google Play Developer ($25 one-time) and Apple Developer Program ($99/year).

---

## 1. Summary scorecard — Capacitor vs. the incumbents

Legend: Fit = ⭐ (poor) … ⭐⭐⭐⭐ (excellent), scored *for Revvel's stack* (PWA-first, framework-agnostic, GH Actions + Fastlane, RevenueCat for IAP). "Stores" = can it produce a signed artifact and submit to Play / App Store.

| Dimension | Capacitor (v6/v7) | Apache Cordova | Bubblewrap (TWA) | Native (Kotlin/Swift) |
|---|---|---|---|---|
| Android `.aab` for Play | ✅ Gradle, standard | ✅ Gradle, standard | ✅ via TWA | ✅ |
| iOS `.ipa` for App Store | ✅ Xcode/`xcodebuild` | ✅ Xcode/`xcodebuild` | ❌ Android only | ✅ |
| Framework-agnostic (vanilla / React / Vue / Svelte) | ✅ | ✅ | ✅ (loads any PWA) | ❌ |
| Native API plugin ecosystem | ⭐⭐⭐⭐ — official + community, actively maintained | ⭐⭐⭐ — large but aging; many plugins unmaintained | ⭐ — Web APIs only | ⭐⭐⭐⭐ — full SDK |
| TypeScript-first plugin authoring | ✅ (`@capacitor/cli` scaffolds plugins in TS) | ❌ (JS + native, no TS scaffold) | N/A | N/A |
| Native code customization | ✅ — open the `ios/` and `android/` projects directly in Xcode/Android Studio | ⚠️ — discouraged; native projects are regenerated | ❌ — TWA shell is opaque | ✅ |
| Web-asset sync workflow | `npx cap sync` (deterministic, CI-safe) | `cordova prepare` (regenerates platforms) | Manual (Bubblewrap rebuild) | N/A |
| Fastlane compatibility | ✅ — `gym` / `supply` / `pilot` work unchanged on the generated Xcode project and Gradle module | ✅ | ⚠️ — `supply` works; `gym` N/A | ✅ |
| RevenueCat support ([`../standards/REVENUECAT.md`](../standards/REVENUECAT.md)) | ✅ — official `@revenuecat/purchases-capacitor` plugin | ⚠️ — community Cordova plugin, sporadic maintenance | ❌ — TWA cannot use Play Billing directly | ✅ |
| License / lock-in | MIT, Ionic-maintained | Apache 2.0, Apache Foundation | Apache 2.0, Google | Platform SDKs |
| Maintenance signal (2026-Q1) | Active — v7 shipping; quarterly minor releases | Maintenance mode — last major release cadence has slowed | Active — Google-maintained | Active |
| Live updates (out of the box) | ❌ core; ✅ via paid Appflow | ❌ core; community CodePush-likes exist | N/A | ❌ |
| Developer-account cost | $25 + $99/yr | Same | $25 (Android only) | Same |
| **Mobile Fit (PWA → stores)** | **⭐⭐⭐⭐** | ⭐⭐⭐ | ⭐⭐ (Android-only PWA) | ⭐⭐⭐⭐ (but expensive engineering cost) |
| **Recommendation** | **Adopt — primary** | **Legacy only** | **Keep — Android-only PWA fallback** | **Skip** unless we hit a hard WebView ceiling |

---

## 2. Assessment rubric

Each option above is scored against the same five mobile-shipping dimensions the [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md) eval uses, plus three Capacitor-specific axes.

| Dimension | What we check |
|---|---|
| **Replaces Fastlane path?** | Does it produce a signed `.aab` / `.ipa` and let Fastlane (`supply`, `pilot`, `deliver`) push to the stores? Capacitor: **yes** — the generated `android/` Gradle module and `ios/App.xcworkspace` are standard inputs to the lanes already scaffolded in [`../templates/mobile/fastlane/Fastfile`](../templates/mobile/fastlane/Fastfile). |
| **Managed macOS** | iOS builds need a macOS runner. Capacitor adds **zero** new macOS minutes vs. Cordova — both shell out to `xcodebuild`. The mobile-CI options in [`CI_APPS_MOBILE_EVAL_2026-04-23.md` §3](./CI_APPS_MOBILE_EVAL_2026-04-23.md) (Codemagic primary fallback, Bitrise on condition) apply unchanged. |
| **Signing UX** | Keystore + provisioning profiles + ASC API key flow per [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md). Capacitor does not touch signing — the existing Fastlane `match`/`gym`/`supply` story remains the source of truth. |
| **Store submission** | `supply` (Play internal/closed/production) and `pilot` + `deliver` (TestFlight / App Store review) work against Capacitor-generated projects without changes. |
| **Plugin governance** | Risk of pulling abandonware. Capacitor's official plugins (`@capacitor/*`) are versioned in lockstep with core, which gives Dependabot a clean upgrade lane (see [`../templates/cicd/dependabot.yml`](../templates/cicd/dependabot.yml)). |
| **WebView parity** | Capacitor uses **WKWebView** on iOS and the system **WebView** on Android. We must document and enforce a min-WebView baseline (Chrome 100+ / iOS 15+) via app support docs, `browserslist`, CI smoke tests, and runtime compatibility checks. |
| **Live-update legality** | Apple App Store Review Guideline 4.5.5 and Google Play Developer Program Policies both restrict what can be hot-patched. Any future Live-Updates adoption needs an Audrey-signed memo before enabling, regardless of vendor. |
| **Migration cost from incumbent** | From PWA-only: low (3 commands per platform — see §3.1). From Cordova: medium (re-author plugins to Capacitor equivalents; ~1 dev-day per app of Revvel's current size). From Bubblewrap: zero — Capacitor coexists; Bubblewrap stays as Android-only fallback. |

---

## 3. Why Capacitor wins for Revvel — deep dive (⭐⭐⭐⭐)

### 3.1 It already matches the steps documented in `MOBILE_DEPLOYMENT.md`

`templates/mobile/MOBILE_DEPLOYMENT.md` §3 already prescribes Capacitor for the iOS path (`pnpm add @capacitor/core @capacitor/ios` → `npx cap init` → `npx cap add ios` → `npx cap sync ios` → `npx cap open ios`). This evaluation makes that prescription **symmetric for Android** — the same five steps swapping `ios` for `android` produce a Gradle project that Fastlane's `supply` lane can ship. No new commands, no new tools, just a consistent pattern across both stores.

### 3.2 Framework-agnostic, which protects the PWA-first invariant

Every Revvel app is a PWA first (see [`../templates/mobile/README.md`](../templates/mobile/README.md) "Current State"). Capacitor wraps **whatever the build output is** — vanilla HTML/JS, Vite + React, SvelteKit, or Next.js static export — by pointing `capacitor.config.ts` at the `dist/` (or `out/`, or `build/`) directory. There is no framework lock-in and no requirement to adopt Ionic UI, which is the most common misconception about Capacitor.

### 3.3 First-class plugin ecosystem with TypeScript types

Official Ionic-maintained plugins under `@capacitor/*` cover the native APIs Revvel apps care about today and on the 12-month horizon:

| Native need | Capacitor plugin | Notes |
|---|---|---|
| Push notifications (FCM + APNs) | `@capacitor/push-notifications` | Pairs with our existing FCM setup |
| In-app purchases / subscriptions | `@revenuecat/purchases-capacitor` | RevenueCat-maintained, satisfies [`../standards/REVENUECAT.md`](../standards/REVENUECAT.md) |
| Camera / photo library | `@capacitor/camera` | |
| Filesystem | `@capacitor/filesystem` | Sandboxed; safe by default |
| Geolocation | `@capacitor/geolocation` | |
| Local notifications | `@capacitor/local-notifications` | |
| Preferences (KV) | `@capacitor/preferences` | More reliable than `localStorage` in WKWebView; persists across app runs and updates |
| App / device info | `@capacitor/app`, `@capacitor/device` | |
| Status bar / splash screen | `@capacitor/status-bar`, `@capacitor/splash-screen` | |

Community plugins (e.g., HealthKit, BLE) are available, but every adoption beyond the official set should be filtered through [`./MARKETPLACE_GUIDE.md`](./MARKETPLACE_GUIDE.md)-style scrutiny: maintenance signal in the last 6 months, license is MIT/Apache, and at least one Revvel-internal smoke test before a release ships.

### 3.4 CI/CD slot-in is a copy of `deploy-cordova.yml`

The shape of [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) (Node 20 setup → Java 17 → Android SDK → `cordova prepare` → `cordova build android --release` → Fastlane `supply`) maps 1:1 to Capacitor:

```text
Cordova                              Capacitor
─────────────────────────────────    ─────────────────────────────────
cordova prepare                  →   pnpm build && npx cap sync android
cordova build android --release  →   cd android && ./gradlew bundleRelease
fastlane supply ...              →   fastlane supply ...   (unchanged)
```

The iOS half mirrors this against `xcodebuild -workspace ios/App/App.xcworkspace` — exactly what `templates/cicd/deploy-ios.yml` already calls. **No CI rewrite is required.** The follow-up adoption ticket should land a `templates/cicd/deploy-capacitor.yml` that is a near-line-for-line rename of `deploy-cordova.yml`, plus a `templates/mobile/CAPACITOR_STANDARD.md` modeled on `CORDOVA_STANDARD.md` (same 15-section outline).

### 3.5 No new SaaS dependency

Capacitor core and the `@capacitor/*` official plugins are MIT-licensed and published to npm. There is no required SaaS account, no telemetry call-home, no license key. The optional Ionic Appflow product (CI builds, Live Updates, Deploy) is **explicitly out of scope** for adoption today — see §5.1.

---

## 4. Risks and mitigations (⭐⭐⭐ caveats)

### 4.1 WebView fragmentation on Android

Android Capacitor apps render in the **System WebView**, which on most devices is auto-updated Chrome but on low-end OEM forks can lag. **Mitigation:** declare `minSdkVersion 24` in `android/app/build.gradle` (Android 7.0+, which guarantees a separate-process WebView since Chrome 51+) and run the existing PWA audit ([`../templates/mobile/pwa-audit.sh`](../templates/mobile/pwa-audit.sh)) against a target Chrome of 100+ in CI. Document the baseline in each repo's README.

### 4.2 iOS WKWebView storage quotas

WKWebView caps `IndexedDB` and `localStorage` differently from desktop Safari, and quota-exceeded errors silently fail. **Mitigation:** prefer `@capacitor/preferences` and `@capacitor/filesystem` over web-storage APIs for anything that must survive an app update; add a Playwright smoke test that exercises offline persistence on iOS Simulator before a release ships.

### 4.3 Plugin churn at major-version bumps

Capacitor majors (v5 → v6 → v7) have, historically, required platform-folder regeneration and plugin-version bumps in lockstep. **Mitigation:** pin `@capacitor/core` and every `@capacitor/*` plugin to the same major in `package.json`; add a Dependabot group rule under [`../templates/cicd/dependabot.yml`](../templates/cicd/dependabot.yml) so all `@capacitor/*` updates land in a single PR. Treat majors as a planned migration ticket, not an automerge.

### 4.4 Live Updates legal/policy surface

Both Apple (Guideline 4.5.5) and Google (Developer Program Policies — "Device and Network Abuse") restrict what can be live-updated without re-review. **Mitigation:** do not enable Live Updates in any Revvel app without an Audrey-signed decision logged in [`../DECISIONS.md`](../DECISIONS.md). The default is: ship a real store update.

### 4.5 macOS minutes still required for iOS

This is not a Capacitor risk — it is the same constraint already managed in [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md). Capacitor inherits whatever macOS-runner strategy that eval lands (GitHub Actions primary, Codemagic free tier as fallback). Capacitor does **not** introduce new macOS minutes vs. Cordova.

---

## 5. Skip / defer (⭐⭐ and below)

### 5.1 Ionic Appflow (paid)

- **What:** Ionic's hosted CI + Live Updates + native binary builds product, layered on top of Capacitor.
- **Why skip today:** the Launch tier starts at ~$499/mo (Ionic public pricing as of 2026-Q1), and every capability we need on day one is covered free by GitHub Actions + Fastlane (build, sign, ship) plus Capacitor's open-source CLI (`npx cap sync`). Live Updates are gated by App Store Guideline 4.5.5 and Google's policies anyway (§4.4), so the headline feature is not safe to enable without an explicit decision.
- **Revisit when:** (a) we have a documented over-the-air patch need that survives the §4.4 legal check, or (b) we exhaust GitHub-hosted macOS minutes *and* Codemagic's free tier (§3.4 of [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md)).

### 5.2 Capgo / cap-go (community Live-Updates)

- **What:** Open-source/Live-Updates-as-a-service alternative to Appflow.
- **Why defer:** same App Store policy gate as §4.4. Revisit alongside Appflow if and when Live Updates are sanctioned.

### 5.3 Native rewrites (Kotlin / Swift / SwiftUI / Jetpack Compose)

- **Why skip:** all four pre-store paths in [`../templates/mobile/MOBILE_DEPLOYMENT.md`](../templates/mobile/MOBILE_DEPLOYMENT.md) assume one PWA codebase fans out to all platforms. A native rewrite would multiply maintenance cost by ~3x (web + Android + iOS) for zero shipped-feature benefit on Revvel's current backlog. Revisit only if a feature requires an iOS/Android API with no Capacitor plugin and no plausible community plugin within one release cycle.

### 5.4 React Native / Expo

- **Why skip:** Revvel's invariant is "PWA first, native shell second" ([`../templates/mobile/README.md`](../templates/mobile/README.md)). React Native inverts that invariant — it is native-first with a JS bridge — and would force every shared UI component into RN's render tree, splitting the codebase from the web app. Capacitor preserves the single PWA codebase; that's the entire point.

---

## 6. Rollout plan

This eval is the decision artifact. The follow-up implementation tickets (each tracked separately) are:

1. **Land `templates/mobile/CAPACITOR_STANDARD.md`** — copy the 15-section structure of [`../templates/mobile/CORDOVA_STANDARD.md`](../templates/mobile/CORDOVA_STANDARD.md), swap Cordova commands for Capacitor equivalents (§3.4 above), and link back to this evaluation. Keep `CORDOVA_STANDARD.md` in place as the legacy/migration reference.
2. **Land `templates/cicd/deploy-capacitor.yml`** — line-for-line clone of [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) with the command swaps from §3.4. Mark inactive until store accounts exist (same "inactive scaffold" pattern the rest of `templates/cicd/` uses).
3. **Update `templates/mobile/README.md`** to list the new files and add this eval to its "Related Evaluations" section (alongside [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md)).
4. **On Apple Developer Program purchase** — pilot Capacitor on the first iOS-shipping repo (likely `oaudrey` per the [`CI_APPS_MOBILE_EVAL_2026-04-23.md` §6](./CI_APPS_MOBILE_EVAL_2026-04-23.md) rollout). Reuse the existing `templates/cicd/deploy-ios.yml` Fastlane lanes; the Capacitor-generated `ios/App.xcworkspace` is a drop-in input.
5. **On Google Play Developer purchase** — same flow for Android via the new `deploy-capacitor.yml`. Bubblewrap stays available for the pure-PWA-no-native-API case (§0).
6. **Dependabot grouping** — add a group rule covering `@capacitor/*` to [`../templates/cicd/dependabot.yml`](../templates/cicd/dependabot.yml) (mitigation for §4.3) when the standard lands.
7. **Cordova migration triggers** — any inherited Cordova app gets a one-time migration ticket the next time it ships a substantive feature. No big-bang rewrite required; Capacitor and Cordova can coexist in the same monorepo during transition.

---

## 7. Out of scope (deliberately)

- We do **not** adopt Ionic UI / `@ionic/*` framework components. Capacitor is the wrapper; the UI layer stays whatever the PWA already uses (vanilla, React, Vue, Svelte). Mixing is supported but unnecessary.
- We do **not** enable Capacitor Live Updates / Appflow Deploy without an explicit Audrey-signed decision in [`../DECISIONS.md`](../DECISIONS.md), per §4.4.
- We do **not** retire [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) or [`../templates/mobile/CORDOVA_STANDARD.md`](../templates/mobile/CORDOVA_STANDARD.md). Cordova stays maintained for legacy/migration.
- We do **not** replace Bubblewrap. For an Android-only PWA listing with no native APIs, Bubblewrap remains the lowest-cost path.
- We do **not** introduce a third mobile CI vendor on the basis of this eval — that decision belongs to [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md), and Capacitor is compatible with whatever it picks.

---

*Authored: April 28, 2026. Next review: on Apple Developer Program purchase, on Capacitor v8 release, or if Apple/Google publish a Live-Updates policy change — whichever comes first.*

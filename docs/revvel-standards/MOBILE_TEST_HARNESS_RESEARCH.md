# Mobile Test Harness Research — Android & iOS (Expo / React Native)

**Version:** 1.0.0
**Date:** April 28, 2026
**Status:** Recommendation (adopt as the default mobile test harness for Revvel apps)
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)
**Scope:** All Revvel/MIDNGHTSAPPHIRE applications targeting iOS and/or Android (default stack: Expo + React Native + TypeScript per [`docs/AGENTS.md`](../AGENTS.md))
**Related:** [`standards/TESTING.md`](../../standards/TESTING.md) · [`standards/MOBILE_TESTING.md`](../../standards/MOBILE_TESTING.md) · [`skills/testing/`](../../skills/testing/) · [`skills/mobile-testing/`](../../skills/mobile-testing/) · [`templates/mobile/`](../../templates/mobile/) · [`templates/mobile/testing/`](../../templates/mobile/testing/) · [`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](./TEST_HARNESS_RESEARCH.md)

---

## 1. Introduction

[`docs/AGENTS.md`](../AGENTS.md) mandates that every Revvel mobile app uses **Expo + React Native + TypeScript + NativeWind** and builds for the App Store / Play Store via **EAS Build** — explicitly forbidding Flutter, Ionic/Cordova, Xamarin/.NET MAUI, and separate native iOS/Android codebases. The repo-level [`standards/TESTING.md`](../../standards/TESTING.md) covers Vitest + Playwright for *web*, but is silent on **native iOS and Android** test execution.

This document closes that gap. It:

1. Enumerates what needs testing in an Expo/React Native app on iOS + Android.
2. Evaluates affordable / FOSS test-harness tooling.
3. Recommends a single default stack — **jest-expo + React Native Testing Library + Maestro** (with **Detox** as an alternate-tier option) — and captures it as RFC-2119 requirements so it can be adopted incrementally per repo.
4. Wires the harness into Expo / EAS so **no local Xcode or Android Studio install is required**, matching the AGENTS.md mandate that EAS Build handles native builds in the cloud.

The companion [`standards/MOBILE_TESTING.md`](../../standards/MOBILE_TESTING.md) is the short, normative version of this research.

---

## 2. Terminology — Reuse from §2 of [`TEST_HARNESS_RESEARCH.md`](./TEST_HARNESS_RESEARCH.md)

The same suite / harness / framework distinctions apply. For mobile:

| Term | Meaning | Mobile example |
|---|---|---|
| **Test case** | A single assertion or scenario. | "Login button is disabled until email is valid." |
| **Test suite** | A collection of test cases grouped by subject (a screen, a hook, a flow). | All Maestro flows in `tests/e2e/maestro/auth/`. |
| **Test harness** | The machinery that discovers, runs, reports on, and gates suites — runners, devices/simulators, fixtures, CI wiring. | `npm test` + `maestro test` + GH Actions matrix that boots an iOS simulator (macOS runner) and Android emulator (Linux runner). |
| **Test framework** | A library that provides primitives for writing test cases. | `jest-expo`, `@testing-library/react-native`, Maestro YAML, Detox. |

**Answer to the issue question:** What we need is a **mobile test harness** — one reproducible entry point (`npm test` for unit/component, `npm run test:e2e:ios` / `:android` for E2E) that runs multiple specialized frameworks across iOS + Android via cloud-runnable simulators/emulators.

---

## 3. What Actually Needs Testing in an Expo / React Native App

| Layer | Examples | Why it matters on mobile specifically |
|---|---|---|
| **Pure logic** | `lib/`, `utils/`, `services/`, Zod schemas, reducers, selectors | Same as web; runs on Node — fast, deterministic. |
| **React Native components** | `components/*.tsx`, screens under `app/(tabs)/*.tsx` (Expo Router) | RN renderers differ from `react-dom`; must use `@testing-library/react-native`, not `@testing-library/react`. |
| **Hooks & navigation** | Auth state, `useRouter`, deep links, tab navigation | Expo Router file-based routing has quirks not covered by web tests. |
| **Native module surface** | `expo-secure-store`, `expo-image`, `expo-notifications`, RevenueCat, Stripe Mobile SDK | Must be mocked in unit tests; must be exercised on a real simulator/emulator in E2E. |
| **Platform-specific code** | `Platform.OS === 'ios'` branches, `*.ios.tsx` / `*.android.tsx` files | Each branch needs a test on the matching platform. |
| **Permissions & deep links** | Camera, photo library, push notification consent, universal links / app links | Real OS dialogs only appear on simulator/emulator/device. |
| **App startup / cold-start** | First-launch flow, OTA update fetch, splash screen | Cold-start is a primary mobile UX risk; must be E2E-asserted. |
| **Accessibility (mobile)** | VoiceOver (iOS) and TalkBack (Android) labels, dynamic type, contrast | Required by the [`accessibility`](../../skills/accessibility/) skill; jest-axe doesn't apply to RN — use accessibility-prop tests + Maestro a11y assertions. |
| **App-store metadata** | App icon, splash, `app.json` keys, EAS build profiles | A broken `app.json` breaks the store build; lint it as part of the harness. |
| **OTA update channels** | EAS Update channels, runtime version, fallback behavior | A bad OTA update can brick the app for users; must be smoke-tested in CI before publishing a channel. |

Each row above is a **suite**. The harness wires them together.

---

## 4. FOSS Tool Evaluation

### 4.1. Evaluation criteria

Same six criteria as the parent [`TEST_HARNESS_RESEARCH.md`](./TEST_HARNESS_RESEARCH.md) §4.1, plus three mobile-specific ones:

1. **No local native toolchain required** — must runnable from CI without forcing every developer to install Xcode (≈ 12 GB) or Android Studio (≈ 8 GB) locally. Matches AGENTS.md "EAS Build handles App Store / Play Store builds in the cloud — no Xcode or Android Studio required."
2. **Works with Expo managed workflow** — does not force ejecting to bare React Native, since Expo managed is the documented default.
3. **Cross-platform parity** — the same test (or trivially-shared YAML) runs on both iOS and Android with one assertion model, not two.

### 4.2. Recommended tools

| Concern | Recommended Tool | License | Cost | Why |
|---|---|---|---|---|
| **Unit + component tests** (RN) | **[jest-expo](https://docs.expo.dev/develop/unit-testing/)** preset for Jest | MIT | $0 | Official Expo preset. Pre-configures Jest for Expo SDK + transforms RN. Drop-in. |
| **Component tests** (DOM-style assertions for RN trees) | **[@testing-library/react-native](https://github.com/callstack/react-native-testing-library)** | MIT | $0 | De-facto RN component test library; RTL-equivalent API. |
| **DOM-matcher extensions** | **[@testing-library/jest-native](https://github.com/testing-library/jest-native)** | MIT | $0 | Adds `toBeVisible()`, `toHaveAccessibilityState()`, etc. |
| **Mock RN/Expo native modules** | Built-in `jest-expo` mocks + per-test `jest.mock()` | MIT | $0 | No extra dep needed for `expo-secure-store`, `expo-image`, etc. |
| **E2E — iOS + Android (recommended default)** | **[Maestro](https://maestro.mobile.dev)** | Apache-2.0 | $0 (CLI + local + GH Actions); Maestro Cloud paid (optional) | Declarative YAML flows. One flow file runs on both iOS and Android. No native code wiring required (works with Expo managed). Survives small UI churn (`extendedWaitUntil`). Single CLI: `maestro test flows/`. Far less flaky than Appium. |
| **E2E — alternative tier** | **[Detox](https://github.com/wix/Detox)** (when grey-box internals must be asserted) | MIT | $0 | More programmable (JavaScript), grey-box (synchronizes with RN bridge → far less flaky than Appium). Heavier setup; requires `expo prebuild` (bare workflow). Use only when Maestro can't reach a specific assertion. |
| **E2E — REJECTED for default** | Appium | Apache-2.0 | $0 | Industry-standard but slowest, flakiest, and heaviest setup of the three. Listed for completeness; do not adopt as default. |
| **Native build for E2E** | **[EAS Build](https://docs.expo.dev/build/introduction/)** with `--profile preview --platform ios\|android` | Free tier sufficient for OSS / low volume | $0 within Expo's free monthly EAS Build minutes; otherwise EAS pricing applies (still cheaper than maintaining local Xcode runners) | Cloud builds → no local Xcode/Android Studio needed. Output `.app` (sim) and `.apk` (emu) consumed directly by Maestro / Detox. |
| **iOS simulator runtime** | **GitHub Actions `macos-14` runner** (free for public repos; paid for private at standard GH Actions rates) | — | $0 (public) | Has Xcode + iOS simulator pre-installed. No local install needed for any developer. |
| **Android emulator runtime** | **GitHub Actions `ubuntu-latest`** + **[reactivecircus/android-emulator-runner](https://github.com/ReactiveCircus/android-emulator-runner)** | Apache-2.0 | $0 (public) | Boots a headless Android emulator on the runner; well-maintained. |
| **App-store metadata lint** | Custom Node script (`scripts/check-app-json.js`) using `ajv` | MIT | $0 | Validates `app.json` / `app.config.ts` against Expo's published schema. ~80 LoC. |
| **OTA update smoke test** | `eas update --channel preview` followed by Maestro flow that asserts the new build's runtime version | — | $0 | One additional Maestro flow; no new tool. |
| **Accessibility (mobile)** | RNTL queries (`getByA11yLabel`, `getByA11yRole`) + Maestro `assertAccessible` | MIT | $0 | No mobile equivalent of jest-axe; the above two layers cover RN. Tracked under [`skills/accessibility`](../../skills/accessibility/). |
| **Coverage** | `jest --coverage` (built-in V8) with thresholds in `jest.config.js` | MIT | $0 | Same 80 / 75 / 80 / 80 thresholds as web (see [`skills/testing`](../../skills/testing/)). |
| **Orchestration / entry point** | npm scripts (`test`, `test:unit`, `test:component`, `test:e2e:ios`, `test:e2e:android`) | — | $0 | Same convention as parent harness. |
| **CI runner** | GitHub Actions (matrix over `ios` + `android`) | — | $0 (public repos) | Same as parent harness. |

### 4.3. Alternatives considered and rejected

| Tool | Why rejected |
|---|---|
| **Appium** | Slow, flaky, heavy setup. Maestro and Detox both surpass it for Expo apps. |
| **Calabash** | Archived / unmaintained since 2017. |
| **WebdriverIO + Appium** | Same Appium problems; extra abstraction layer. |
| **Espresso (Android only) + XCUITest (iOS only)** | Native — requires ejecting from Expo managed and writing per-platform tests in Kotlin/Swift. Violates AGENTS.md "no separate native iOS + Android codebases." |
| **BrowserStack App Live / App Automate** | Paid. Maestro Cloud free tier + GH Actions runners cover our needs at $0. Reconsider only if real-device cloud runs become mandatory. |
| **Sauce Labs** | Paid. Same reason. |
| **Firebase Test Lab** | Free quota exists but very limited; ties tests to Google Cloud. Reconsider if we already have GCP. |
| **AWS Device Farm** | Paid; requires AWS account; overkill. |
| **Mabl** (already a Revvel skill) | Web-focused; mobile mode is paid and immature. Keep Mabl for web E2E only. |

### 4.4. Total cost of ownership

| Category | Annual Cost |
|---|---|
| Licensing (all FOSS) | **$0** |
| GitHub Actions minutes (public repo) | **$0** |
| GitHub Actions minutes (private repo, ~30 PRs/month, ~6 min iOS + 4 min Android per PR) | **≈ $30/month for macOS + $5/month for Linux ≈ $420/year** |
| EAS Build minutes (Expo free tier: 30 builds/month for `--profile preview`) | **$0** for OSS / low-volume; **$19–99/month** for the paid Production / Enterprise tiers (already in BOM under [`docs/AGENTS.md`](../AGENTS.md) Expo line) |
| Maestro Cloud (optional — only if real-device runs are required later) | **$0** free tier (≤ 100 flow executions/month); paid above |
| **Total — public repo, GH-Actions only** | **$0** |
| **Total — private repo, GH-Actions only** | **≈ $420/year** (plus existing EAS) |

This sits inside the existing Expo / EAS budget; no new line items required for public repos. For private repos, GH-Actions macOS minutes are the only material cost — and they are still cheaper than maintaining a local Mac Mini runner.

---

## 5. Requirements (RFC 2119)

### 5.1. Functional requirements

| ID | Requirement |
|---|---|
| **R-MTH-01** | Every Revvel app targeting iOS or Android MUST expose a single command — `npm test` — that runs unit + component tests with coverage and exits non-zero on failure. |
| **R-MTH-02** | Every such app MUST expose `npm run test:e2e:ios` and `npm run test:e2e:android` that build the app via EAS (`--profile preview`) and run the Maestro flow suite against an iOS simulator and Android emulator respectively. |
| **R-MTH-03** | Unit + component tests MUST use the **`jest-expo`** preset and **`@testing-library/react-native`**. Snapshot tests are PROHIBITED for screens; they MAY be used only for stable leaf components (mirrors `skills/testing/SKILL.md`). |
| **R-MTH-04** | E2E tests MUST default to **Maestro**. **Detox** MAY be added in addition to Maestro when grey-box internals must be asserted. **Appium MUST NOT** be adopted for new Revvel apps. |
| **R-MTH-05** | The harness MUST run end-to-end in CI on both iOS and Android **without requiring any developer to install Xcode or Android Studio locally** — i.e., builds happen on EAS, simulators/emulators run on GitHub-hosted runners. This is non-negotiable per `docs/AGENTS.md`. |
| **R-MTH-06** | Coverage thresholds MUST match `skills/testing/SKILL.md`: **80% statements, 75% branches, 80% functions, 80% lines**. Configured in `jest.config.js`. |
| **R-MTH-07** | The Maestro flow suite MUST cover, at minimum, the four mandatory journeys from `skills/testing/SKILL.md`: **Auth (Sign Up, Sign In, Sign Out)**, **Checkout**, **Admin / feature flag toggle**, and **Accessibility / keyboard-or-VoiceOver navigation**, on both iOS and Android. |
| **R-MTH-08** | The harness MUST validate `app.json` / `app.config.ts` against Expo's published JSON schema as part of `npm test` (suite name `app-config`). A failing app config MUST fail CI. |
| **R-MTH-09** | The harness MUST provide an OTA-update smoke test that, after `eas update --channel preview`, runs at least one Maestro flow asserting the app boots and reports the expected `Updates.runtimeVersion`. This MAY be gated behind a `test:ota` script and is not required to run on every PR. |
| **R-MTH-10** | The harness MUST block PR merges on failure via a required GitHub status check named `mobile-test`. |
| **R-MTH-11** | Native module mocks (e.g., `expo-secure-store`, `expo-image`, RevenueCat, Stripe) MUST be defined once in a shared `tests/mocks/` directory and imported per-suite — never inlined into individual test files. |

### 5.2. Non-functional requirements

| ID | Requirement |
|---|---|
| **R-MTH-N-01** | Full unit + component run MUST complete in ≤ 60 s on a standard GH-hosted runner. Full E2E (Maestro on iOS *or* Android) SHOULD complete in ≤ 12 minutes including build. |
| **R-MTH-N-02** | Every tool selected MUST be OSI-approved FOSS; no proprietary SaaS MAY be required to pass CI. (Maestro Cloud, EAS paid tiers, BrowserStack, etc. are explicitly optional.) |
| **R-MTH-N-03** | The harness MUST NOT require ejecting from Expo managed workflow. If a future Detox addition forces `expo prebuild`, that switch MUST be a separate, reviewed decision logged in `DECISIONS.md`. |
| **R-MTH-N-04** | All tool versions MUST be pinned in `package.json` and any `@version`s in workflow files. |
| **R-MTH-N-05** | Any new dependency added to a downstream app MUST be vetted against the GitHub Advisory DB (see `gh-advisory-database` tool in agent runbooks). |

### 5.3. Governance / process requirements

| ID | Requirement |
|---|---|
| **R-MTH-G-01** | Each adopting app SHOULD record its harness adoption in its repo BOM with license, cost, and justification. |
| **R-MTH-G-02** | Changes to the recommended stack itself (adding/removing a default tool) MUST be reviewed by the standards owner (Audrey Evans), logged in this repo's `CHANGELOG.md`, and propagated to `skills/mobile-testing/`. |
| **R-MTH-G-03** | App authors MUST run `npm test` locally before opening a PR touching app code. |
| **R-MTH-G-04** | This document MUST be revisited every 12 months; re-evaluate Maestro vs. Detox vs. anything new (e.g., RN's experimental built-in test runner) and update the recommendation. |

---

## 6. Reference directory layout (downstream app)

This is what an adopting Revvel app SHOULD look like. None of these files are added to `revvel-standards` — only the **starter copies** under `templates/mobile/testing/`.

```text
my-revvel-app/
├── app.json                            # Expo config (linted by app-config suite)
├── eas.json                            # EAS Build profiles (preview profile required)
├── jest.config.js                      # extends jest-expo preset; sets coverage thresholds
├── jest.setup.ts                       # imports jest-native matchers, registers shared mocks
├── package.json                        # scripts: test, test:unit, test:component,
│                                       #          test:e2e:ios, test:e2e:android, test:ota
├── tests/
│   ├── unit/                           # Jest — pure logic
│   ├── component/                      # Jest + @testing-library/react-native
│   ├── e2e/
│   │   └── maestro/
│   │       ├── auth/
│   │       │   ├── sign-up.yaml
│   │       │   ├── sign-in.yaml
│   │       │   └── sign-out.yaml
│   │       ├── checkout/
│   │       │   └── happy-path.yaml
│   │       ├── admin/
│   │       │   └── feature-flag.yaml
│   │       └── a11y/
│   │           └── voiceover-nav.yaml
│   └── mocks/
│       ├── expo-secure-store.ts
│       ├── expo-image.ts
│       └── stripe.ts
└── .github/
    └── workflows/
        └── mobile-test.yml             # matrix: { os: macos-14, platform: ios } and
                                        #         { os: ubuntu-latest, platform: android }
```

Starter copies of every file referenced above live under [`templates/mobile/testing/`](../../templates/mobile/testing/).

---

## 7. Rollout plan (incremental, per-app)

Each bullet is a **single PR** in the adopting app, so adoption can be paused at any point:

1. **PR-1** — Add `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `jest.config.js`, `jest.setup.ts`, and one smoke test. Wire `npm test`. CI non-blocking.
2. **PR-2** — Add component tests for top 5 screens. Flip CI to blocking once coverage ≥ 60%.
3. **PR-3** — Raise coverage to the standard thresholds (80/75/80/80). Block CI on the thresholds.
4. **PR-4** — Add Maestro CLI install + `tests/e2e/maestro/auth/sign-in.yaml` + `mobile-test.yml` workflow on `ubuntu-latest` (Android). Non-blocking at first.
5. **PR-5** — Extend the workflow with a `macos-14` job for iOS using EAS `--profile preview --platform ios`. Non-blocking.
6. **PR-6** — Add Maestro flows for the remaining mandatory journeys (checkout, admin, a11y). Block CI on iOS + Android.
7. **PR-7** — Add `app-config` suite (`scripts/check-app-json.js`) to `npm test`.
8. **PR-8** — Add the OTA smoke test (`test:ota`), gated to run on push to `main` only.

Total expected engineering time per app: **~2 days** across the 8 PRs, with most of the cost in PR-2/3 (writing component tests for existing screens).

---

## 8. Decision record

- **Decision:** Adopt **jest-expo + @testing-library/react-native + Maestro** as the default mobile test harness for every Revvel iOS/Android app, with Detox as an opt-in additional tier and Appium explicitly excluded.
- **Cloud execution:** Default to **GitHub Actions `macos-14` (iOS) + `ubuntu-latest` + reactivecircus/android-emulator-runner (Android)**, with EAS Build supplying `.app` / `.apk` binaries. Real-device cloud runs (Maestro Cloud, BrowserStack) are explicitly optional.
- **Alternatives rejected:** see §4.3.
- **Owner:** Audrey Evans.
- **Review date:** April 2027.
- **Open questions:** None blocking adoption. Per-app config (which screens to test first, coverage ramp) is left to each repo's PR-1 / PR-2.

---

## 9. Related documents

- [`docs/AGENTS.md`](../AGENTS.md) — Universal AI Agent Instructions (Expo / EAS mandate).
- [`standards/TESTING.md`](../../standards/TESTING.md) — application-level testing standard (web Vitest/Playwright).
- [`standards/MOBILE_TESTING.md`](../../standards/MOBILE_TESTING.md) — short, normative mobile testing standard derived from this document.
- [`skills/testing/SKILL.md`](../../skills/testing/SKILL.md) — developer-facing testing skill (web).
- [`skills/mobile-testing/SKILL.md`](../../skills/mobile-testing/SKILL.md) — developer-facing testing skill (mobile).
- [`skills/testing-agent/SKILL.md`](../../skills/testing-agent/SKILL.md) — ephemeral test-generation agent.
- [`templates/mobile/testing/`](../../templates/mobile/testing/) — starter configs and Maestro flow.
- [`templates/mobile/MOBILE_DEPLOYMENT.md`](../../templates/mobile/MOBILE_DEPLOYMENT.md) — App Store / Play Store deployment guide (sibling document — deployment, not testing).
- [`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](./TEST_HARNESS_RESEARCH.md) — parallel research for *this* repo's documentation harness (terminology shared from §2).
- [`docs/CI_APPS_MOBILE_EVAL_2026-04-23.md`](../CI_APPS_MOBILE_EVAL_2026-04-23.md) — earlier evaluation of paid CI/CD apps; this document supersedes it for the testing layer.

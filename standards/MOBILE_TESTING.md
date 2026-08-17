# Mobile Testing Standards (iOS + Android)

All Revvel/MIDNGHTSAPPHIRE applications targeting iOS and/or Android MUST follow these standards.
The default mobile stack is **Expo + React Native + TypeScript + NativeWind** per [`docs/AGENTS.md`](../docs/AGENTS.md).

For the full research and rationale, see [`docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md`](../docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md).
For the *web* testing standard, see [`standards/TESTING.md`](./TESTING.md).

---

## Quick Start

```bash
# Install
npx expo install jest-expo jest @types/jest \
  @testing-library/react-native @testing-library/jest-native
npm install --save-dev maestro-cli   # or: curl -fsSL https://get.maestro.mobile.dev | bash

# Run
npm test                       # unit + component (jest-expo)
npm run test:e2e:android       # Maestro on Android emulator
npm run test:e2e:ios           # Maestro on iOS simulator
```

---

## Recommended Stack

| Layer | Tool | License | Notes |
|---|---|---|---|
| Unit + component | **jest-expo** preset for Jest | MIT | Official Expo preset. |
| RN component queries | **@testing-library/react-native** | MIT | RTL-equivalent API for RN trees. |
| Matchers | **@testing-library/jest-native** | MIT | Adds `toBeVisible()`, `toHaveAccessibilityState()`, etc. |
| E2E (default) | **Maestro** | Apache-2.0 | Declarative YAML; one flow runs on iOS + Android. |
| E2E (alternate tier) | **Detox** | MIT | Add only when grey-box internals must be asserted; requires `expo prebuild`. |
| Native build for E2E | **EAS Build** `--profile preview` | Free tier sufficient for low volume | No local Xcode / Android Studio. |
| iOS sim runner | GitHub Actions `macos-14` | — | Free for public repos. |
| Android emu runner | GitHub Actions `ubuntu-latest` + `reactivecircus/android-emulator-runner` | Apache-2.0 | Headless emulator on the runner. |

**Excluded:** Appium (slow, flaky), Calabash (unmaintained), separate native iOS/Android codebases (forbidden by AGENTS.md).

---

## Coverage Thresholds (Hard CI Gate)

| Metric | Minimum |
|---|---|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

Same as [`skills/testing/SKILL.md`](../skills/testing/SKILL.md). Configure in `jest.config.js`:

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverage: true,
  coverageThreshold: {
    global: { statements: 80, branches: 75, functions: 80, lines: 80 },
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind))',
  ],
};
```

---

## Required E2E Journeys

Mirror the web mandate from [`skills/testing/SKILL.md`](../skills/testing/SKILL.md), enforced on **both** iOS and Android:

| Journey | Required |
|---|---|
| Auth: Sign Up, Sign In, Sign Out | ✅ |
| Checkout: Add to Cart, Complete Purchase | ✅ |
| Admin: Toggle Feature Flag | ✅ |
| Accessibility: VoiceOver / TalkBack navigation | ✅ |

Starter Maestro flows live in [`templates/mobile/testing/maestro/`](../templates/mobile/testing/maestro/).

---

## Mocking Strategy

| What | Tool |
|---|---|
| `expo-secure-store`, `expo-image`, `expo-notifications` | Built-in `jest-expo` mocks; override per-test with `jest.mock()` |
| RevenueCat | Mock the SDK at the import boundary, never the wire format |
| Stripe Mobile SDK | Same — mock at import boundary |
| Time / Date | `jest.useFakeTimers()` (always reset after) |
| Network | `msw/native` |

Shared mocks MUST live in `tests/mocks/` and be imported by `jest.setup.ts`. Never inline mock blocks into individual test files.

**Never mock** the code under test or Zod schemas.

---

## CI Configuration

Every mobile repo MUST run mobile tests on every PR via a `.github/workflows/mobile-test.yml`
matrix that covers iOS (`macos-14`) and Android (`ubuntu-latest`).
A starter workflow lives at [`templates/mobile/testing/mobile-test.yml`](../templates/mobile/testing/mobile-test.yml).

The required GitHub status check is named **`mobile-test`** and MUST block PR merges on failure.

---

## Test Naming Convention

```ts
describe('ScreenOrModuleName', () => {
  describe('behavior or method', () => {
    it('should [behavior] when [condition]', () => { ... });
    it('should throw [error] when [invalid input]', () => { ... });
  });
});
```

Maestro flows are named by journey: `auth/sign-in.yaml`, `checkout/happy-path.yaml`, etc.

---

## Directory Structure

```text
tests/
├── unit/
├── component/
├── e2e/
│   └── maestro/
│       ├── auth/
│       ├── checkout/
│       ├── admin/
│       └── a11y/
└── mocks/
    ├── expo-secure-store.ts
    ├── expo-image.ts
    └── stripe.ts
```

---

## Hard Rules (RFC 2119 — full set in the research doc)

- **MUST** use `jest-expo` + `@testing-library/react-native` for unit + component.
- **MUST** use Maestro as the default E2E runner. Detox MAY be added in addition; **MUST NOT** adopt Appium.
- **MUST NOT** require Xcode or Android Studio to be installed locally — EAS Build + GH Actions runners cover all native execution.
- **MUST NOT** eject from Expo managed workflow without a separate, reviewed decision logged in `DECISIONS.md`.
- **MUST** match the 80 / 75 / 80 / 80 coverage thresholds.
- **MUST** lint `app.json` / `app.config.ts` against Expo's published JSON schema as part of `npm test`.

---

## Notes

- Snapshot tests are PROHIBITED for screens; only allowed for stable leaf components.
- VoiceOver/TalkBack labels MUST be asserted in component tests (`getByA11yLabel`, `getByA11yRole`) — there is no `jest-axe` for React Native.
- Cold-start and OTA-update behavior MUST be E2E-tested before publishing a new EAS Update channel.

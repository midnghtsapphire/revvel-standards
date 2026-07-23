# Mobile Testing Skill (iOS + Android — Expo / React Native)

Apply Revvel mobile testing standards: **jest-expo + @testing-library/react-native** for unit/component
and **Maestro** for E2E on both iOS and Android, runnable entirely in the cloud (EAS Build +
GitHub Actions runners) with **no local Xcode or Android Studio install required**.

This skill is the mobile counterpart to [`skills/testing/`](../testing/SKILL.md).
For full research and rationale, see
[`docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md`](../../docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md).
For the normative standard, see [`standards/MOBILE_TESTING.md`](../../standards/MOBILE_TESTING.md).

---

## When to Activate

Trigger this skill on any mobile-test work in an Expo/React Native repo:

- "test this app on iOS / Android"
- "set up E2E for the mobile app"
- "Maestro flow", "Detox config", "jest-expo"
- "react-native testing library", "RNTL"
- "EAS preview build for testing"
- "test coverage on mobile"
- Any work in a repo containing `app.json` + `expo` in `package.json`.

---

## Stack Decision (do NOT re-litigate)

| Layer | Use this. Do not substitute. |
|---|---|
| Unit + component | `jest-expo` preset + `@testing-library/react-native` + `@testing-library/jest-native` |
| E2E (default) | **Maestro** — declarative YAML, one flow runs on both iOS and Android |
| E2E (alternate tier — only when grey-box internals must be asserted) | Detox (requires `expo prebuild`; needs a separate decision in `DECISIONS.md`) |
| Native build for E2E | EAS Build `--profile preview --platform ios\|android` |
| iOS sim runner | GitHub Actions `macos-14` |
| Android emu runner | GitHub Actions `ubuntu-latest` + `reactivecircus/android-emulator-runner` |

**Forbidden:** Appium, Calabash, separate native iOS/Android codebases, ejecting from Expo managed without a `DECISIONS.md` entry.

---

## Coverage Thresholds (Hard CI Gate — same as web)

| Metric | Minimum |
|---|---|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

Configure in `jest.config.js`. Starter copy: [`templates/mobile/testing/jest.config.js`](../../templates/mobile/testing/jest.config.js).

---

## Mandatory E2E Journeys (iOS *and* Android)

| Journey | Required |
|---|---|
| Auth: Sign Up, Sign In, Sign Out | ✅ |
| Checkout: Add to Cart, Complete Purchase | ✅ |
| Admin: Toggle Feature Flag | ✅ |
| Accessibility: VoiceOver / TalkBack navigation | ✅ |

Starter flows: [`templates/mobile/testing/maestro/`](../../templates/mobile/testing/maestro/).

---

## Mocking Strategy

| What | Tool |
|---|---|
| `expo-secure-store`, `expo-image`, `expo-notifications` | Built-in `jest-expo` mocks; override per-test with `jest.mock()` |
| RevenueCat / Stripe SDK | Mock at the import boundary, never the wire format |
| Time / Date | `jest.useFakeTimers()` — always reset after |
| Network | `msw/native` |

All shared mocks live in `tests/mocks/` and are loaded once in `jest.setup.ts`. **Never inline a mock inside a single test file.**

**Never mock** the code under test or Zod schemas.

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

Maestro flow files are named by journey: `auth/sign-in.yaml`, `checkout/happy-path.yaml`, etc.

---

## Workflow When Activated

1. Confirm the repo is Expo managed (`app.json` + `expo` in `package.json`). If it is bare RN or some other stack, **stop and escalate** — the default skill assumes Expo managed.
2. Copy `templates/mobile/testing/*` into the target repo.
3. `npx expo install jest-expo @types/jest @testing-library/react-native @testing-library/jest-native`
4. Add scripts to `package.json`:
   ```json
   {
     "scripts": {
       "test": "jest --coverage",
       "test:unit": "jest tests/unit",
       "test:component": "jest tests/component",
       "test:e2e:android": "maestro test tests/e2e/maestro",
       "test:e2e:ios": "maestro test tests/e2e/maestro",
       "test:ota": "maestro test tests/e2e/maestro/ota"
     }
   }
   ```
5. Add `.github/workflows/mobile-test.yml` from the template; the required check name is **`mobile-test`**.
6. Build the first `--profile preview` artifact via EAS — log the EAS build URL in the PR description so reviewers can side-load it.
7. Land the harness incrementally per the 8-PR rollout plan in the research doc. Do NOT try to land everything in one PR.

---

## Commands

```bash
# Unit + component (Jest)
npx jest --coverage

# Maestro E2E
maestro test tests/e2e/maestro/auth/sign-in.yaml          # one flow
maestro test tests/e2e/maestro                             # whole suite

# EAS preview builds (no local Xcode / Android Studio)
eas build --profile preview --platform ios   --non-interactive
eas build --profile preview --platform android --non-interactive

# Validate app.json against Expo's schema
node scripts/check-app-json.js
```

---

## Hard Rules (RFC 2119 — full list in the research doc)

- **MUST** use `jest-expo` + `@testing-library/react-native` for unit + component.
- **MUST** default to Maestro for E2E. Detox MAY be added in addition. **MUST NOT** adopt Appium.
- **MUST NOT** require any developer to install Xcode or Android Studio locally — EAS + GH Actions runners cover all native execution.
- **MUST NOT** eject from Expo managed workflow without a logged decision.
- **MUST** match 80 / 75 / 80 / 80 coverage thresholds.
- **MUST** lint `app.json` / `app.config.ts` against Expo's published schema as part of `npm test`.

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

## Related Skills

- [`skills/testing/`](../testing/SKILL.md) — web testing (Vitest + Playwright). Same coverage gates.
- [`skills/testing-agent/`](../testing-agent/SKILL.md) — ephemeral test-generation agent; understands Jest, Vitest, and Playwright. **Extend it to Maestro before delegating mobile-test generation.**
- [`skills/accessibility/`](../accessibility/SKILL.md) — WCAG + VoiceOver/TalkBack rules referenced by the a11y journey above.
- [`skills/deployment/`](../deployment/SKILL.md) — EAS Build / Submit (where the preview binaries used by E2E come from).

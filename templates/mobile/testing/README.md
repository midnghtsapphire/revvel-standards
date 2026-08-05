# Mobile Testing Templates (iOS + Android)

Drop-in starter configs for the **jest-expo + @testing-library/react-native + Maestro**
test harness recommended by [`standards/MOBILE_TESTING.md`](../../../standards/MOBILE_TESTING.md)
and researched in
[`docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md`](../../../docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md).

These files are **opinionated starting points**. Each adopting Revvel app should:

1. Copy this whole directory into the app repo as `tests/` + `jest.config.js` +
   `jest.setup.ts` + `.github/workflows/mobile-test.yml`.
2. Replace the placeholders (`[APP_NAME]`, `[EAS_PROJECT_ID]`, `[BUNDLE_ID]`) with real values.
3. Land the harness incrementally per the 8-PR rollout plan in the research doc §7.

---

## Files in This Directory

| File | Purpose |
|---|---|
| `jest.config.js` | jest-expo preset + 80/75/80/80 coverage thresholds |
| `jest.setup.ts` | Loads `@testing-library/jest-native/extend-expect` and shared mocks |
| `mocks/expo-secure-store.ts` | Shared mock for `expo-secure-store` |
| `maestro/auth/sign-in.yaml` | Reference Maestro flow for the mandatory Sign-In journey |
| `mobile-test.yml` | GitHub Actions workflow matrix for `mobile-test` (iOS on `macos-14`, Android on `ubuntu-latest`) |

---

## Adopting in a Repo

```bash
# 1. Install dependencies (Expo will pick compatible versions)
npx expo install jest-expo jest @types/jest \
  @testing-library/react-native @testing-library/jest-native

# 2. Install Maestro CLI (one-time, per dev or CI host)
curl -fsSL "https://get.maestro.mobile.dev" | bash

# 3. Add scripts to package.json
#    "test":             "jest --coverage",
#    "test:unit":        "jest tests/unit",
#    "test:component":   "jest tests/component",
#    "test:e2e:android": "maestro test tests/e2e/maestro",
#    "test:e2e:ios":     "maestro test tests/e2e/maestro",
#    "test:ota":         "maestro test tests/e2e/maestro/ota"

# 4. First run
npm test
```

Required CI status check name: **`mobile-test`** — must block PR merges.

---

## Substitutions

| Marker | Replace With | Example |
|---|---|---|
| `[APP_NAME]` | Display name shown in Maestro flows | `Sessiono` |
| `[BUNDLE_ID]` | iOS bundle identifier / Android package | `com.revvel.sessiono` |
| `[EAS_PROJECT_ID]` | EAS project id from `eas init` | `12345678-...` |

---

## What Goes Where in an Adopting App

```text
my-revvel-app/
├── jest.config.js              ← from templates/mobile/testing/jest.config.js
├── jest.setup.ts               ← from templates/mobile/testing/jest.setup.ts
├── tests/
│   ├── unit/
│   ├── component/
│   ├── e2e/
│   │   └── maestro/            ← from templates/mobile/testing/maestro/
│   └── mocks/                  ← from templates/mobile/testing/mocks/
└── .github/
    └── workflows/
        └── mobile-test.yml     ← from templates/mobile/testing/mobile-test.yml
```

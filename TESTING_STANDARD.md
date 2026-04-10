# Revvel Testing Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Every Revvel application ships with comprehensive automated tests. Testing is not optional, not a nice-to-have, and not something done after the fact. Tests are written alongside code as part of the EXRUP one-iteration delivery model. A PR that contains new functionality without corresponding tests will be rejected automatically by CI.

---

## 2. Coverage Thresholds (Hard CI Gate)

The following coverage minimums are enforced by CI. A build that falls below any threshold fails and blocks deployment.

| Metric | Minimum | Enforcement |
|---|---|---|
| **Statements** | 80% | CI fails below this |
| **Branches** | 75% | CI fails below this |
| **Functions** | 80% | CI fails below this |
| **Lines** | 80% | CI fails below this |

These are minimums. Strive for 90%+ on all core business logic modules.

### Vitest Coverage Configuration

Every repo must include this coverage configuration in `vitest.config.ts`. Copy from `templates/cicd/vitest.config.ts`.

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types/**',
        'tests/**',
      ],
    },
  },
});
```

Run coverage locally: `npx vitest run --coverage`

---

## 3. Test Categories and What to Test

### 3.1. Unit Tests (Vitest)

**What:** Pure functions, utilities, service layer logic, data transformations, validation schemas.

**Rule:** Every exported function in `lib/`, `utils/`, `services/`, and `helpers/` directories requires at least one unit test.

**Location:** `tests/unit/` or co-located as `*.test.ts` next to the source file.

**What to cover:**
- Happy path (valid inputs, expected outputs)
- Edge cases (empty inputs, null, undefined, boundary values)
- Error paths (invalid inputs, thrown exceptions)
- Each branch of conditional logic

**What NOT to test with unit tests:**
- Database connections
- HTTP endpoints (use integration tests)
- Full rendered UIs (use E2E or component tests)

### 3.2. Integration Tests (Vitest + Supertest or direct handler calls)

**What:** API routes, database interactions, external service integrations (mocked).

**Rule:** Every API route handler requires an integration test covering success and failure responses.

**Location:** `tests/integration/`

**What to cover:**
- Each HTTP method and route
- Authentication/authorization checks (authenticated vs. unauthenticated requests)
- Input validation rejection (malformed request bodies)
- Database reads and writes (using a test database or in-memory SQLite)
- External service calls with mocked responses

### 3.3. End-to-End Tests (Playwright)

**What:** Critical user journeys from the browser perspective.

**Rule:** The following journeys are mandatory E2E tests for every Revvel application:

| Journey | Description |
|---|---|
| **Auth — Sign Up** | New user creates an account successfully |
| **Auth — Sign In** | Returning user logs in and sees their dashboard |
| **Auth — Sign Out** | User signs out and is redirected to home |
| **Checkout — Add to Cart** | User adds an item and views the cart |
| **Checkout — Complete Purchase** | User completes Stripe checkout (test mode) |
| **Admin — Access Panel** | Admin user accesses the admin panel |
| **Admin — Toggle Feature Flag** | Admin enables/disables a feature |
| **Accessibility — Keyboard Nav** | All interactive elements reachable via keyboard |

**Location:** `tests/e2e/`

**Playwright config location:** `playwright.config.ts` at repo root. Copy from `templates/cicd/playwright.config.ts`.

### 3.4. Component Tests (Vitest + React Testing Library)

**What:** React UI components in isolation.

**Rule:** Every UI component that contains business logic or conditional rendering requires a component test.

**Location:** Co-located as `ComponentName.test.tsx` or in `tests/components/`.

**What to cover:**
- Renders without crashing (smoke test)
- Conditional rendering branches (loading state, error state, success state)
- User interaction handlers (click, input, form submit)
- Accessibility attributes (aria labels, roles)

**Snapshot testing policy:**
- Snapshots are **PROHIBITED** for components that change frequently (navigation, forms, layouts).
- Snapshots are **PERMITTED ONLY** for stable, leaf-level display components (icons, badges, static content blocks) where the visual output should never change unexpectedly.
- Never commit an auto-generated snapshot without reviewing it first.
- Use `toMatchInlineSnapshot()` over file-based snapshots when possible.

### 3.5. Contract / API Tests (Pact or OpenAPI validation)

**What:** Verifies that the frontend and backend agree on the API contract.

**Rule:** Any frontend-to-backend API call that crosses a service boundary (e.g., a Next.js frontend calling a separate Express API) requires a contract test.

**Recommended tools:**
- **Pact** (https://pact.io) — consumer-driven contract testing
- **openapi-fetch + zod** — validate responses match the OpenAPI schema at runtime in tests

**Location:** `tests/contract/`

---

## 4. Test Naming Conventions

All tests must follow this naming standard so CI output is human-readable:

```
describe('ModuleName or ComponentName', () => {
  describe('methodName or scenario', () => {
    it('should [expected behavior] when [condition]', () => { ... });
    it('should throw [error] when [invalid input]', () => { ... });
  });
});
```

**Examples (correct):**
```ts
describe('calculateTotal', () => {
  it('should return the sum of all item prices', () => { ... });
  it('should return 0 when the cart is empty', () => { ... });
  it('should throw ValidationError when price is negative', () => { ... });
});
```

**Examples (incorrect — do not use):**
```ts
it('test 1', () => { ... });
it('works', () => { ... });
it('calculateTotal', () => { ... });
```

---

## 5. Mocking Strategy

### 5.1. What to Mock

| Thing to Mock | Tool | Notes |
|---|---|---|
| External HTTP APIs | `vi.mock` + `msw` (Mock Service Worker) | Mock at the network layer, not the code layer |
| Database | In-memory SQLite for integration tests, `vi.mock` for unit tests | Never connect to the real production DB in tests |
| Time / Date | `vi.useFakeTimers()` | Always reset after the test with `vi.useRealTimers()` |
| File system | `memfs` or `vi.mock('fs')` | Do not read/write real files in unit tests |
| Auth (Clerk) | Mock the Clerk auth helper, not the entire SDK | |
| Environment variables | Set in `vitest.config.ts` `env` block | Never read `.env` files in tests |

### 5.2. What NOT to Mock

- **Business logic** — never mock the thing you are testing.
- **Zod schemas** — validate against real schemas; mocking them defeats the purpose.
- **Core Node.js APIs** — unless absolutely necessary.

### 5.3. MSW Setup (Mandatory for Integration/E2E)

Mock Service Worker (MSW) is the mandatory tool for intercepting HTTP requests in tests:

```ts
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json([{ id: 1, name: 'Test Product', price: 100 }]);
  }),
];

// tests/mocks/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 6. Performance Budget (Hard CI Gate via Lighthouse CI)

Every Revvel web application must meet the following Lighthouse scores on every deployment. Lighthouse CI is configured as a required GitHub Actions check.

| Category | Minimum Score | Notes |
|---|---|---|
| **Performance** | 90 | Measured on a simulated 4G connection |
| **Accessibility** | 95 | See `ACCESSIBILITY_STANDARD.md` for detail |
| **Best Practices** | 90 | |
| **SEO** | 95 | Required for organic growth strategy |

**Configuration:** Add `.lighthouserc.json` to repo root:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000", "http://localhost:3000/login"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.95 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## 7. Running Tests in CI

All test commands run automatically in the GitHub Actions pipeline before deployment. See `templates/cicd/deploy.yml` and `templates/cicd/compliance-check.yml`.

### Local Commands

```bash
# Run all unit + integration tests
npx vitest run

# Run with coverage report
npx vitest run --coverage

# Run E2E tests (requires app running on port 3000)
npx playwright test

# Run E2E tests with UI (debugging)
npx playwright test --ui

# Run specific test file
npx vitest run tests/unit/calculateTotal.test.ts

# Watch mode (development)
npx vitest
```

### CI Commands (in GitHub Actions)

```yaml
- name: Run unit and integration tests
  run: npx vitest run --coverage

- name: Check coverage thresholds
  run: npx vitest run --coverage --reporter=json
  # CI fails automatically if thresholds in vitest.config.ts are not met

- name: Run E2E tests
  run: npx playwright test
```

---

## 8. Test File Structure

Every Revvel repo must have this test directory structure:

```
tests/
├── unit/              # Pure function and utility tests
├── integration/       # API route and DB interaction tests
├── e2e/               # Playwright end-to-end tests
│   ├── auth.spec.ts
│   ├── checkout.spec.ts
│   └── admin.spec.ts
├── components/        # React component tests (or co-located)
├── contract/          # API contract tests (if multi-service)
└── mocks/
    ├── handlers.ts    # MSW request handlers
    └── setup.ts       # Global test setup
```

---

## 9. Compliance

A missing `tests/` directory or a test run that fails CI coverage thresholds blocks all deployments. There are no exceptions. If a test is genuinely impossible to write for a given piece of code, the reason must be documented in a comment adjacent to the code and approved by the repository owner.

---

## 10. GrowlingEyes Proven Patterns

The following test patterns have been proven in the GrowlingEyes project and are now the standard approach for all Revvel applications.

### 10.1. Field Validation Tests

Every database table must have a corresponding field validation test that checks:
- Required field presence (null/empty rejection)
- Range validation (lat/lon, scores, numeric bounds)
- Timestamp validity
- Enum value constraints
- String non-empty and max-length checks

**Template:** `templates/testing/field-validation.test.ts`

**Example pattern (from GrowlingEyes):**
```ts
describe('reports field validation', () => {
  it('should reject insert when title is null', async () => {
    await expect(
      db.insert(reports).values({ title: null, ...otherFields })
    ).rejects.toThrow();
  });

  it('should reject severity outside valid enum values', () => {
    const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
    expect(VALID_SEVERITIES.includes('invalid')).toBe(false);
  });
});
```

### 10.2. UI-to-DB Shape Validation Tests

Every API endpoint or tRPC procedure must have a shape validation test that:
- Mocks the database layer
- Asserts the response shape matches exactly what the UI components expect
- Verifies authentication guards (unauthenticated → 401)
- Ensures sensitive fields are not exposed

**Template:** `templates/testing/ui-db-map.test.ts`

**Key rule:** The test defines the "contract" between the API and the UI. If the API changes its response shape, this test fails — alerting you to update the UI components before they break.

### 10.3. E2E Data-Void Tests (Playwright)

Every page must have an E2E test that verifies:
- The page returns HTTP 200
- No JavaScript console errors on load
- The main content panel is visible and NOT showing "Loading..."
- The content panel contains actual data (not just empty state)
- No generic error messages ("Something went wrong", "Error", "404")

**Template:** `templates/testing/panel-data-void.spec.ts`

**Why this matters:** A "data void" is when a page loads without error but shows no data — either because the DB query returned empty, the loading state never resolved, or a silent error occurred. Data-void tests catch these failures that TypeScript and unit tests cannot catch.

### 10.4. Template Locations

All three test templates are in `templates/testing/`. Copy and adapt them for every new project — see `templates/testing/README.md` for substitution instructions.

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
- **Pact** (<https://pact.io>) — consumer-driven contract testing
- **openapi-fetch + zod** — validate responses match the OpenAPI schema at runtime in tests

**Location:** `tests/contract/`

---

## 4. Test Naming Conventions

All tests must follow this naming standard so CI output is human-readable:

```text
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

```text
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

### 10.5. UI-to-Database Field Tests (DBA Process Module)

Every Revvel application must validate that every UI form field correctly maps to the right database column through CRUD operations. This is the **DBA testing process** — a mandatory quality gate before any data-entry screen is considered production-ready.

**See:** `UI_FIELD_TESTING_DBA_STANDARD.md` for the complete module, which covers:

- **Field-to-column mapping verification** — every UI field confirmed against the field map document
- **Data type consistency checks** — UI input type vs. database column type
- **CRUD validation workflow** — CREATE (INSERT), READ (SELECT), UPDATE, DELETE all verified by querying the database directly after each UI action
- **Constraint testing** — NOT NULL, UNIQUE, CHECK, and FK constraints intentionally tested with invalid data
- **ACID property verification** — atomicity, consistency, isolation, and durability
- **Trigger and stored procedure testing** — database-side business logic confirmed to fire on the correct UI actions
- **Automated test pattern** — Playwright + `pg` client: drive the browser, then run SQL assertions in the same test step

**Compliance checks added by this module:** DBA-001 through DBA-006 (see `COMPLIANCE_RUBRIC.md`).

**BOM:** `docs/Universal-BOM_List/UI_FIELD_TESTING_BOM.md`

---

## 11. Human Testing API

The **Human Testing API** is an AI-powered behavioral testing layer that simulates how a real human would experience your application. It complements Vitest unit/integration tests and Playwright E2E tests by evaluating subjective quality dimensions that automated scripts cannot measure: cognitive load, neuro-inclusive design, fault tolerance, and intent alignment.

### 11.1. What It Tests

The Human Testing API dispatches 5 parallel S.H.I.F.T.-aligned AI agents, each evaluating a distinct dimension:

| Agent | Dimension | Evaluates |
|---|---|---|
| **Functional** | Feature correctness | Page loads, auth flow, happy-path journeys, API response times |
| **Accessibility** | Neuro-inclusive design | WCAG 2.2 AA, predictability, sensory control, calm microcopy |
| **Resilience** | Fault tolerance | API outage handling, empty states, slow network, session expiry |
| **Behavioral** | S.H.I.F.T. compliance | Memory, Reflection, Planning, Action, System Reliability |
| **Performance** | Lighthouse budget | Core Web Vitals, LCP/CLS/INP, Lighthouse score thresholds |

A synthesizer agent aggregates all findings into a single structured report with a PASS / FAIL / NEEDS_WORK verdict, prioritized fix list, and re-test checklist.

### 11.2. When to Run

Run the Human Testing API:
- Before any production deployment of a new major feature
- After significant UI or API changes
- When the S.H.I.F.T. Monitor detects recurring failures
- As a release gate before shipping to end users

### 11.3. Setup

**Requirements:**
- `OPENROUTER_API_KEY` GitHub Secret (get key at <https://openrouter.ai>)
- The `scripts/run-human-testing-api.js` script in your repo

**One-time setup for any Revvel app:**
```bash
# Copy the workflow template
cp node_modules/@revvel/standards/templates/cicd/run-human-testing-api.yml .github/workflows/
# Or download directly:
curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/templates/cicd/run-human-testing-api.yml \
  > .github/workflows/run-human-testing-api.yml

# Copy the script
mkdir -p scripts
curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/scripts/run-human-testing-api.js \
  > scripts/run-human-testing-api.js
```

Then add your `OPENROUTER_API_KEY` to GitHub Secrets:
`Settings → Secrets and variables → Actions → New repository secret`

### 11.4. Running the Human Testing API

**Via GitHub Actions (recommended):**
1. Go to `Actions → Human Testing API → Run workflow`
2. Enter your target URL (e.g., `https://yourapp.com`)
3. Enter the app name and output file path
4. Click **Run workflow**

The workflow will:
1. Run 5 AI test agents in parallel (~60–120 seconds)
2. Synthesize findings into a structured Markdown report
3. Commit the report to your repository
4. Optionally open a GitHub Issue with a summary

**Via command line:**
```bash
OPENROUTER_API_KEY=sk-or-... \
TARGET_URL="https://yourapp.com" \
APP_NAME="My App" \
OUTPUT_FILE="docs/human-test-report.md" \
node scripts/run-human-testing-api.js
```

### 11.5. Report Output

The Human Testing API produces a report at the specified `OUTPUT_FILE` with these sections:

1. **Executive Summary** — Overall verdict (PASS / FAIL / NEEDS_WORK)
2. **Overall Score Card** — Ratings per dimension
3. **Critical Blockers** — P0 issues blocking production
4. **S.H.I.F.T. Compliance** — Behavioral validation findings
5. **Accessibility & Neuro-Inclusive Design** — WCAG and cognitive load findings
6. **Resilience & Error Handling** — Fault tolerance evaluation
7. **Performance Budget Compliance** — Lighthouse score analysis
8. **Recommended Fixes** — Prioritized action list (P0 / P1 / P2)
9. **Re-test Checklist** — Items to verify after fixes

### 11.6. Workflow and Script Locations

| File | Purpose |
|---|---|
| `scripts/run-human-testing-api.js` | Core script — calls OpenRouter AI agents |
| `.github/workflows/run-human-testing-api.yml` | Workflow for this standards repo |
| `templates/cicd/run-human-testing-api.yml` | Template to copy into any app repo |

---

## 12. mabl AI-Powered Testing

**mabl** is an AI-powered test automation platform used for cloud-based E2E, API, and visual regression testing. It integrates with GitHub Actions to trigger automated test runs on every deployment.

### 12.1. Why mabl

| Capability | Detail |
|---|---|
| AI-generated tests | mabl auto-generates and self-heals tests as the UI changes |
| E2E browser testing | Chrome, Firefox, WebKit, Edge — cloud-parallel execution |
| API testing | REST/GraphQL test plans triggered by CI/CD events |
| Visual regression | Screenshot diffing with AI-powered dynamic-area detection |
| GitHub integration | PR status checks, deployment events, test result comments |

### 12.2. Required Secrets and Variables

The workflow uses the **shared Revvel GitHub App** for GitHub authentication, consistent with all other Revvel automation workflows. Add the following to **GitHub → Settings → Secrets and variables → Actions**:

**Repository Secrets:**

| Secret Name | Where to Get It |
|---|---|
| `APP_ID` | Shared Revvel GitHub App — already used by other workflows |
| `APP_PRIVATE_KEY` | Shared Revvel GitHub App — already used by other workflows |
| `MABL_API_KEY` | [mabl API Settings](https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/settings/apis) → Create a **"CI/CD Integration"** key |

**Repository Variables:**

| Variable Name | Where to Get It |
|---|---|
| `MABL_APPLICATION_ID` | mabl Dashboard → Applications → select app → copy ID |
| `MABL_ENVIRONMENT_ID` | mabl Dashboard → Environments → select environment → copy ID |

> **Note:** `APP_ID` and `APP_PRIVATE_KEY` are already in place if other Revvel workflows (Research Module, Human Testing API) are active. Either `MABL_APPLICATION_ID` or `MABL_ENVIRONMENT_ID` must be set. The workflow gracefully skips (exit 0) if `MABL_API_KEY` is absent.

### 12.3. GitHub Actions Workflow

The workflow at `.github/workflows/mabl.yml` runs on:

- Push to `main` or `release/**` branches
- Every pull request (opened, synchronize, reopened)
- Manual dispatch via `Actions → mabl Automated Tests → Run workflow`

The workflow installs the mabl CLI (`npm install -g @mablhq/mabl-cli`), authenticates via the shared GitHub App token, and runs `mabl deployments create` with the configured application/environment IDs.

### 12.4. Getting Application and Environment IDs

1. Log in to [mabl](https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/settings/apis)
2. Open the **curl builder** in the API settings page
3. Select "Create deployment event" — the builder will display your available `application-id` and `environment-id` values
4. Copy these values and add them as repository variables (`MABL_APPLICATION_ID`, `MABL_ENVIRONMENT_ID`)

### 12.5. Workflow and Dashboard Links

| Resource | URL |
|---|---|
| mabl Workspace | <https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w> |
| mabl Agent Tasks | <https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/agents/tasks> |
| mabl API Settings | <https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/settings/apis> |
| mabl CLI (npm) | <https://www.npmjs.com/package/@mablhq/mabl-cli> |
| Workflow file | `.github/workflows/mabl.yml` |

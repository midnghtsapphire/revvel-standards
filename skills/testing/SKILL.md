# Testing Skill

Apply Revvel testing standards with Vitest unit/integration tests, Playwright E2E tests, and mandatory coverage thresholds.

## Coverage Thresholds (Hard CI Gate)

| Metric | Minimum |
|---|---|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

Strive for 90%+ on all core business logic. Configure in `vitest.config.ts` (copy from `templates/cicd/vitest.config.ts`).

## Test Categories

### Unit Tests (Vitest)
- **What**: Pure functions, utilities, services, data transformations, Zod schemas
- **Rule**: Every exported function in `lib/`, `utils/`, `services/`, `helpers/` needs at least one unit test
- **Cover**: Happy path, edge cases, error paths, every conditional branch

### Integration Tests (Vitest + Supertest)
- **What**: API routes, DB interactions, external service integrations (mocked)
- **Rule**: Every API route handler needs success and failure response tests
- **Cover**: Each HTTP method, auth checks, input validation rejection, DB reads/writes

### E2E Tests (Playwright) — Mandatory Journeys

| Journey | Required |
|---|---|
| Auth: Sign Up, Sign In, Sign Out | ✅ |
| Checkout: Add to Cart, Complete Purchase | ✅ |
| Admin: Access Panel, Toggle Feature Flag | ✅ |
| Accessibility: Keyboard Navigation | ✅ |

### Component Tests (Vitest + React Testing Library)
- Every UI component with business logic or conditional rendering
- Cover: smoke test, loading/error/success states, user interactions, ARIA attributes
- **Snapshots**: PROHIBITED for frequently-changing components; only for stable leaf components

## Mocking Strategy

| What | Tool |
|---|---|
| External HTTP APIs | `msw` (Mock Service Worker) — mock at network layer |
| Database | In-memory SQLite or `vi.mock` |
| Time/Date | `vi.useFakeTimers()` (always reset after) |
| Auth (Clerk) | Mock auth helper, not entire SDK |
| Environment vars | Set in `vitest.config.ts` `env` block |

**Never mock** the code under test or Zod schemas.

## Test Naming Convention

```ts
describe('ModuleName', () => {
  describe('methodName', () => {
    it('should [behavior] when [condition]', () => { ... });
    it('should throw [error] when [invalid input]', () => { ... });
  });
});
```

## Lighthouse CI Score Gates

| Category | Minimum |
|---|---|
| Performance | 90 |
| Accessibility | 95 |
| Best Practices | 90 |
| SEO | 95 |

## Proven Patterns (GrowlingEyes Standard)

### Field Validation Tests
Every DB table needs tests for: required fields (null rejection), range validation, enum constraints, string max-length.

### UI-to-DB Shape Validation Tests
Every API/tRPC endpoint needs: shape validation against UI expectations, auth guard check (401 on unauthenticated), no sensitive field exposure.

### E2E Data-Void Tests (Playwright)
Every page must verify: HTTP 200, no JS console errors, main content visible (not loading spinner), actual data present (not empty state or error).

## Commands

```bash
npx vitest run              # All unit + integration tests
npx vitest run --coverage   # With coverage report
npx playwright test          # E2E tests (app must run on :3000)
npx playwright test --ui     # Debug mode
```

## Directory Structure

```text
tests/
├── unit/
├── integration/
├── e2e/
├── components/
├── contract/
├── skills/                  # NEW: Skill/LLM tests
│   └── promptfoo.yml
└── mocks/
    ├── handlers.ts (MSW)
    └── setup.ts
```

## Skill/LLM Tests (PromptFoo)

Every Revvel skill should have PromptFoo tests in `tests/skills/promptfoo.yml`.

### Why PromptFoo
- Tests the actual skill output, not just implementation
- Validates LLM behavior across different inputs
- Catches regressions in skill responses

### Test Template

```yaml
# tests/skills/promptfoo.yml
description: "Skill tests for [SKILL_NAME]"
providers:
  - id: anthropic/claude-sonnet-4  # Primary - Claude Sonnet 4
    config:
      api_key: ${OPENROUTER_API_KEY}
      base_url: https://openrouter.ai/api/v1
      temperature: 0
      max_tokens: 2048

# Fallback: Claude Sonnet 4.5
  - id: anthropic/claude-sonnet-4.5
    config:
      api_key: ${OPENROUTER_API_KEY}
      base_url: https://openrouter.ai/api/v1
      temperature: 0
      max_tokens: 2048

prompts:
  - label: "Standard invocation"
    raw: |
      You are the [SKILL_NAME] skill.
      [SKILL_DESCRIPTION]
      
      Input: {{input}}
      
      Respond with [EXPECTED_OUTPUT_FORMAT].

tests:
  - description: "Happy path"
    vars:
      input: "[VALID_INPUT]"
    assert:
      - type: not-contains
        value: "Error"
      - type: contains
        value: "[EXPECTED_PHRASE]"

  - description: "Edge case - empty input"
    vars:
      input: ""
    assert:
      - type: not-contains
        value: "Error"
```

### Running Skill Tests

```bash
# Install PromptFoo
npm install -g promptfoo

# Run skill tests
promptfoo eval --config tests/skills/promptfoo.yml

# Or use testing-agent skill to generate tests
```

### Skills Currently Missing Tests

| Skill | Priority | Status |
|-------|----------|--------|
| vault-agent | P0 | ❌ No tests |
| security | P0 | ❌ No tests |
| deployment | P1 | ❌ No tests |
| code-review | P1 | ❌ No tests |

Use the `testing-agent` skill to generate tests for skills without coverage.

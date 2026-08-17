# Testing Templates

These three test templates provide a starting pattern for the field validation, UI-to-DB shape validation, and E2E data-void tests used in every Revvel application. They are adapted from patterns proven in GrowlingEyes.

---

## Files in This Directory

| File | Test Type | Tool | Purpose |
|---|---|---|---|
| `field-validation.test.ts` | Unit / Integration | Vitest | Validates database field constraints |
| `ui-db-map.test.ts` | Integration | Vitest | Validates API response shapes match DB schema |
| `panel-data-void.spec.ts` | E2E | Playwright | Validates pages load with real data (no empty states) |

---

## How to Adapt Each Template

### `field-validation.test.ts`

1. Copy to `tests/unit/[table-name]-field-validation.test.ts`
2. Replace `[TABLE_NAME]` with your Drizzle table name (e.g., `users`, `products`)
3. Replace `[FIELD_NAME]` with your actual field names
4. Import your actual Drizzle schema and test DB setup
5. Run: `pnpm vitest run tests/unit/[table-name]-field-validation.test.ts`

### `ui-db-map.test.ts`

1. Copy to `tests/integration/[router-name]-ui-db-map.test.ts`
2. Replace `[ROUTER_NAME]` with your tRPC router or Express router name
3. Replace `[ENDPOINT_NAME]` with your endpoint/procedure name
4. Import your actual router and test client
5. Run: `pnpm vitest run tests/integration/[router-name]-ui-db-map.test.ts`

### `panel-data-void.spec.ts`

1. Copy to `tests/e2e/panel-data-void.spec.ts`
2. Replace `[PAGE_PATH]` with your page routes (e.g., `/dashboard`, `/admin`)
3. Replace `[PANEL_SELECTOR]` with the CSS selector for your content panels
4. Set `BASE_URL` in your `.env.test` or pass via environment
5. Run: `pnpm playwright test tests/e2e/panel-data-void.spec.ts`

---

## What to Substitute

| Marker | Replace With | Example |
|---|---|---|
| `[TABLE_NAME]` | Drizzle table name | `users` |
| `[FIELD_NAME]` | Column name | `email` |
| `[ROUTER_NAME]` | tRPC router or Express router name | `user` |
| `[ENDPOINT_NAME]` | Procedure or route name | `getProfile` |
| `[PAGE_PATH]` | Page route | `/dashboard` |
| `[PANEL_SELECTOR]` | CSS selector for content area | `.dashboard-panel` |

---

## Where Files Go

```text
tests/
├── unit/
│   └── [table-name]-field-validation.test.ts
├── integration/
│   └── [router-name]-ui-db-map.test.ts
└── e2e/
    └── panel-data-void.spec.ts
```

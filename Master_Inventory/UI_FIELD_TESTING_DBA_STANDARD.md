# UI Field Testing & Mapping — DBA Process Module

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Audience:** Developers, QA Engineers, DBAs, AI Agents, Project Managers

---

## 1. Purpose

This module defines the standard process for testing field-by-field UI-to-database mapping in every Revvel application. It ensures that every piece of data entered in a front-end form is accurately, completely, and correctly reflected in the corresponding back-end database table.

This document is required reading for any person or agent performing database quality assurance (QA), integration testing, or DBA review. It is a mandatory companion to:

- `FIELD_MAPPING_STANDARD.md` — defines how field maps are created and maintained
- `DATABASE_ARCHITECTURE_STANDARD.md` — defines the PostgreSQL database standard
- `TESTING_STANDARD.md` — defines the overall testing framework
- `docs/field-maps/DATABASE_TO_UI_MASTER_MAP.md` — the master field map index

---

## 2. What UI-to-Database Field Testing Is

UI-to-database field testing validates that the full data pipeline — from the moment a user fills in a form field, through the API, to the moment the value is committed in a database column — is working correctly.

**What it verifies:**

| Question | What We Check |
|---|---|
| Does the value save at all? | `SELECT` the column after `INSERT` or `UPDATE` — is the row there? |
| Is it in the right column? | Is `first_name` in `users.first_name`, not `users.last_name`? |
| Is it the right data type? | Is a number stored as `INTEGER`, not `TEXT`? |
| Is it the right format? | Is `email` lowercased? Is `price` stored as cents (integer), not a float? |
| Are constraints enforced? | Does the DB reject a NULL in a required field? Reject a duplicate unique key? |
| Does it update correctly? | After an `UPDATE`, does only the changed column change? |
| Does delete work completely? | After a `DELETE`, is the row gone (or soft-deleted if applicable)? |
| Are triggers/procedures firing? | Does an `INSERT` into `orders` correctly update `inventory_count`? |

---

## 3. Core Testing Components

### 3.1. Field-to-Column Mapping Verification

Every UI field must be verified against the Software Requirement Specification (SRS) or field map document. Use `docs/field-maps/` as the source of truth.

**Verification checklist per field:**

- [ ] The UI field label matches the `Field Label (What User Sees)` column in the field map
- [ ] The frontend variable name matches the `Frontend Variable Name` column
- [ ] The API request field name matches the `API Request Field` column
- [ ] The database table and column match the `Database Table` and `Database Column` columns
- [ ] The database column exists (run `\d table_name` in `psql` to confirm)
- [ ] The column name spelling is exact (no `user_firstname` when the schema says `first_name`)

### 3.2. Data Type Consistency

Confirm that the data type accepted by the UI field is compatible with the database column type.

| UI Field Type | Accepted Input | Expected DB Column Type | Notes |
|---|---|---|---|
| `Text Input` | Any string | `VARCHAR(n)` or `TEXT` | Check max length constraint matches UI validation |
| `Number Input` | Numeric only | `INTEGER`, `BIGINT`, `DECIMAL` | Money fields: stored as `INTEGER` cents |
| `Email Input` | Email format | `VARCHAR(255)` | Lowercased before save |
| `Date Picker` | ISO date | `DATE` or `TIMESTAMP WITH TIME ZONE` | Timezone handling must match app locale |
| `Checkbox / Toggle` | True/False | `BOOLEAN` | NULL should be disallowed on required toggles |
| `Dropdown (Select)` | One of N values | `VARCHAR` + DB check constraint or `ENUM` | UI options must exactly match DB-allowed values |
| `Multi-Select` | Array of values | `TEXT[]` or `JSONB` | PostgreSQL array type preferred for simple lists |
| `File Upload` | File → URL string | `TEXT` | Store the URL, not the binary |
| `Rich Text Editor` | HTML / Markdown | `TEXT` | Sanitize HTML before save |
| `Rating` | Integer 1–5 | `INTEGER` with CHECK constraint | Add `CHECK (rating BETWEEN 1 AND 5)` |
| `Hidden Field` | System-assigned | `UUID`, `VARCHAR`, `INTEGER` | Never trust a hidden field from the client — re-validate server-side |

### 3.3. Schema Validation

Before any test run, validate the database schema matches the design document:

```sql
-- Confirm table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'users';

-- Confirm column exists and matches expected type
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Confirm constraints (NOT NULL, UNIQUE, CHECK, FK)
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass;

-- Confirm indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users';
```

Run these queries and compare output to `docs/field-maps/DATABASE_TO_UI_MASTER_MAP.md`. Any discrepancy between the schema and the field map is a bug — file an issue before testing.

---

## 4. CRUD Validation Workflow

Perform each of the four operations below for every screen under test. Record results in the **Test Evidence Log** (see Section 9).

### 4.1. CREATE — Insert Validation

**Procedure:**

1. Navigate to the form in the UI
2. Fill in every field with valid, representative data
3. Submit the form
4. Immediately run the corresponding `SELECT` query in the database

**Expected result:** A new row exists in the correct table with every field value matching what was entered in the UI — no truncation, no type coercion errors, no missing columns.

**SQL template:**
```sql
-- Run immediately after UI save
SELECT *
FROM users
WHERE email = 'testuser@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Verification checklist:**
- [ ] Row exists (`COUNT` = 1, not 0)
- [ ] Every mapped column contains the value entered in the UI
- [ ] `created_at` is set and recent (within the last 60 seconds)
- [ ] `updated_at` equals `created_at` on a fresh insert
- [ ] Auto-generated fields (`id`, `uuid`) are populated
- [ ] Server-side transformations applied (email lowercased, slug slugified, price converted to cents)

---

### 4.2. READ — Retrieve Validation

**Procedure:**

1. Open the record's detail/view page in the UI
2. Note every displayed field value
3. Run the corresponding `SELECT` query in the database
4. Compare UI display to DB values field by field

**Expected result:** Every value shown on screen exactly matches the corresponding database column value, with correct formatting applied (e.g., `price_cents / 100` = displayed dollar amount).

**SQL template:**
```sql
SELECT
  id,
  first_name,
  last_name,
  email,
  role,
  created_at
FROM users
WHERE id = '<uuid-from-url>';
```

**Verification checklist:**
- [ ] All fields displayed on screen have corresponding DB values
- [ ] No field shows stale data from a previous save
- [ ] NULL fields display correctly (empty, placeholder, or "N/A" — not "null" or "undefined")
- [ ] Formatted values (dates, currency, phone numbers) match the raw DB value after transformation
- [ ] Sensitive fields (passwords, tokens) are NOT displayed to the user

---

### 4.3. UPDATE — Modification Validation

**Procedure:**

1. Open the edit form for an existing record
2. Modify exactly ONE field at a time
3. Save the form
4. Run `SELECT` query and compare the full row before and after

**Expected result:** Only the modified column changes. All other columns remain identical to the pre-update state.

**SQL template:**
```sql
-- Before edit: capture the current state
SELECT * FROM users WHERE id = '<uuid>';

-- After edit: confirm only the intended column changed
SELECT
  id,
  first_name,  -- ← changed this
  last_name,   -- ← should be unchanged
  email,       -- ← should be unchanged
  updated_at   -- ← should be a new timestamp
FROM users
WHERE id = '<uuid>';
```

**Verification checklist:**
- [ ] Only the edited field's column changed
- [ ] All other columns have identical values to the pre-update state
- [ ] `updated_at` is a new timestamp, more recent than `created_at`
- [ ] `created_at` did not change
- [ ] The update is atomic — no partial saves (if the request fails, no column is partially updated)

---

### 4.4. DELETE — Removal Validation

**Procedure:**

1. Identify the record to delete (note its `id`)
2. Trigger delete from the UI (click Delete button, confirm dialog)
3. Run `SELECT` query for that `id`

**Expected result:** For hard deletes — the row is gone (`COUNT` = 0). For soft deletes — the row still exists but `deleted_at` is set to a non-NULL timestamp.

**SQL template — Hard Delete:**
```sql
-- Should return 0 rows
SELECT COUNT(*) FROM users WHERE id = '<uuid>';
```

**SQL template — Soft Delete:**
```sql
-- Should return 1 row with deleted_at set
SELECT id, email, deleted_at
FROM users
WHERE id = '<uuid>';
-- Expect: deleted_at IS NOT NULL
```

**Verification checklist:**
- [ ] Hard delete: row count = 0
- [ ] Soft delete: `deleted_at` is not null and is a recent timestamp
- [ ] Related records are handled correctly (cascading deletes or FK constraint rejection)
- [ ] The deleted record no longer appears in any UI listing page
- [ ] Attempting to view the deleted record redirects or shows a 404/not-found state

---

## 5. Key Data Integrity Checks

### 5.1. ACID Properties

Every transactional operation in a Revvel application must be ACID-compliant. Use the following tests to verify each property.

| Property | What to Test | How to Test |
|---|---|---|
| **Atomicity** | A multi-step operation either fully completes or fully rolls back | Simulate a mid-transaction failure (e.g., network drop, bad FK reference). Verify no partial data is written. |
| **Consistency** | The DB always moves from one valid state to another | Insert a record that violates a CHECK constraint. Verify the entire INSERT is rejected. |
| **Isolation** | Concurrent transactions do not interfere with each other | Run two simultaneous UPDATE operations on the same row. Verify the final state reflects one valid outcome, not a merge of both. |
| **Durability** | Committed data survives crashes | After a successful INSERT, force-restart the database. Verify the record is still present. |

**PostgreSQL transaction test pattern:**
```sql
BEGIN;

INSERT INTO orders (user_id, total_cents, status)
VALUES ('<uuid>', 9999, 'pending');

-- Simulate a constraint violation to test rollback:
INSERT INTO order_items (order_id, product_id, quantity)
VALUES ('<new-order-id>', '<nonexistent-product-id>', 1);
-- ^ This should fail (FK violation) and roll back the entire transaction

ROLLBACK; -- or COMMIT if both succeed

-- Verify no partial order was written:
SELECT * FROM orders WHERE user_id = '<uuid>' AND status = 'pending';
```

---

### 5.2. Constraint Testing

Intentionally enter invalid data in the UI and verify the database (and API) correctly reject it.

| Constraint Type | Test Input | Expected DB Behavior | Expected UI Behavior |
|---|---|---|---|
| `NOT NULL` | Leave a required field blank | `INSERT` rejected with `null value in column "x" violates not-null constraint` | Form validation error shown before submit, OR API returns 400 |
| `UNIQUE` | Enter a duplicate email address | `INSERT` rejected with `duplicate key value violates unique constraint` | UI shows "Email already exists" message |
| `CHECK` constraint | Enter `rating = 6` when `CHECK (rating BETWEEN 1 AND 5)` | `INSERT` rejected with `new row for relation violates check constraint` | API returns 422 or 400 with validation message |
| `FOREIGN KEY` | Reference a non-existent parent record | `INSERT` rejected with `insert or update on table violates foreign key constraint` | UI should prevent orphan records via dropdown/search selection |
| `VARCHAR(n)` max length | Paste 300 characters into a `VARCHAR(255)` field | `INSERT` rejected with `value too long for type character varying(255)` | UI character counter or maxlength attribute prevents this |
| `ENUM` / `CHECK` on status | Set `status = 'invalid_value'` | `INSERT` rejected | UI dropdown limits options — but API must also validate |

**Constraint test SQL pattern:**
```sql
-- Test NOT NULL constraint
INSERT INTO users (email, first_name, last_name)
VALUES ('test@example.com', NULL, 'Smith');
-- Expected: ERROR: null value in column "first_name"

-- Test UNIQUE constraint
INSERT INTO users (email, first_name, last_name)
VALUES ('existing@example.com', 'Jane', 'Doe');
-- Expected: ERROR: duplicate key value violates unique constraint "users_email_key"
```

---

### 5.3. Business Rules — Stored Procedures and Triggers

If the application uses database triggers or stored procedures, verify they fire correctly in response to UI actions.

**Common trigger scenarios to test:**

| Trigger | UI Action That Fires It | Expected DB Result |
|---|---|---|
| `update_inventory_on_order` | Customer completes checkout | `products.inventory_count` decremented by the ordered quantity |
| `set_updated_at` | Any field edit and save | `updated_at` on the affected row updates to `NOW()` |
| `log_admin_action` | Admin changes a user's role | A row is inserted into `audit_logs` |
| `send_notification_on_order` | New order placed | A row is inserted into `notifications` table (or a webhook fires) |
| `soft_delete_cascade` | Admin soft-deletes a user | Related records (orders, sessions) are also soft-deleted |

**Trigger verification SQL:**
```sql
-- After placing an order for 2 units of product <id>:
SELECT inventory_count
FROM products
WHERE id = '<product-uuid>';
-- Expected: original_count - 2

-- After any update to any table row, confirm trigger fires:
SELECT updated_at
FROM users
WHERE id = '<uuid>';
-- Expected: updated_at = NOW() (within last few seconds)
```

---

## 6. Recommended Tools

### 6.1. Automation Tools

| Tool | Type | Purpose | Cost | Link |
|---|---|---|---|---|
| **mabl** | SaaS — No-code E2E | Embed SQL query assertions directly inside UI test steps; validates DB state after UI actions | Paid ($0 trial) | [mabl DB testing](https://help.mabl.com/hc/en-us/articles/27563301153428-How-to-test-with-database-queries) |
| **Playwright** | FOSS | E2E browser automation; combine with `pg` client to run SQL assertions inside test steps | Free | [playwright.dev](https://playwright.dev) |
| **Vitest + Drizzle** | FOSS | Unit/integration test the API layer including DB writes; use test DB | Free | [vitest.dev](https://vitest.dev) |
| **pgTAP** | FOSS | SQL-native test framework; write tests entirely in SQL for stored procedures and triggers | Free | [pgtap.org](https://pgtap.org) |
| **Supabase Table Editor** | SaaS / FOSS | Visual DB row browser; verify data after UI actions without writing SQL | Free tier | [supabase.com](https://supabase.com) |
| **Beekeeper Studio** | FOSS | GUI PostgreSQL client; run verification queries, browse tables | Free (Community) | [beekeeperstudio.io](https://www.beekeeperstudio.io) |
| **TablePlus** | Proprietary | GUI PostgreSQL client; inspection, filtering, and query execution | Free (limited) | [tableplus.com](https://tableplus.com) |
| **DBeaver** | FOSS | Full-featured GUI DB client; ER diagrams, schema comparison | Free | [dbeaver.io](https://dbeaver.io) |

### 6.2. No-Code / Low-Code DB Builders (for Mapping Error Reduction)

These platforms can auto-generate CRUD screens directly from a database schema, eliminating manual field mapping errors:

| Tool | Type | Purpose | Cost | Link |
|---|---|---|---|---|
| **Budibase** | FOSS / SaaS | Auto-generate full CRUD UI from Postgres tables; self-hostable | Free (self-hosted) | [budibase.com](https://budibase.com) |
| **Power Apps** | SaaS | Microsoft low-code platform; connect to Postgres via connector | Free (limited) | [Power Apps DB testing](https://www.youtube.com/watch?v=nRE7ePvwSGQ) |
| **Retool** | SaaS | Build internal CRUD tools on top of Postgres; quick admin panels | Free (2 users) | [retool.com](https://retool.com) |
| **Appsmith** | FOSS | FOSS Retool alternative; self-hostable internal tools | Free | [appsmith.com](https://www.appsmith.com) |
| **Baserow** | FOSS | Airtable-alternative; visual Postgres table browser and editor | Free (self-hosted) | [baserow.io](https://baserow.io) |

### 6.3. Schema Validation Tools

| Tool | Type | Purpose | Cost |
|---|---|---|---|
| **drizzle-kit** | FOSS | Generate and apply migrations; `drizzle-kit check` validates schema | Free |
| **pg_prove** (pgTAP CLI) | FOSS | Run pgTAP SQL test suites from the command line | Free |
| **schemalint** | FOSS | Lint Postgres schemas for naming conventions and common mistakes | Free |
| **pgMustard** | SaaS | Query explain plan analyzer — catches slow queries before they reach prod | Free (limited) |

---

## 7. Test Evidence Log

Every UI-to-database field test must produce a written evidence log. This log is the QA artifact that proves the test was performed and what the result was.

### 7.1. Evidence Log Format

Store test evidence logs in:
```text
docs/field-tests/[PROJECT_NAME]/[SCREEN_NAME]_FIELD_TEST_LOG.md
```

### 7.2. Evidence Log Template

```markdown
# Field Test Log — [Screen Name]

**Project:** [Project Name]  
**Date:** YYYY-MM-DD  
**Tester:** [Name or Agent ID]  
**Environment:** [dev / staging / production]  
**Database:** [Postgres version and host]  
**Field Map Reference:** docs/field-maps/[SCREEN_NAME]_FIELD_MAP.md

---

## CREATE Test

**Test Input:**
| Field | Value Entered |
|---|---|
| First Name | Jane |
| Email | jane@example.com |
| Role | user |

**SQL Run:**
```sql
SELECT id, first_name, email, role, created_at
FROM users
WHERE email = 'jane@example.com';
```

**Result:**
| id | first_name | email | role | created_at |
|---|---|---|---|---|
| 550e8400-... | Jane | <jane@example.com> | user | 2026-04-15 13:00:00+00 |

**Status:** ✅ PASS

---

## UPDATE Test

**Field Modified:** first_name → "Janet"

**SQL Run:**
```sql
SELECT first_name, last_name, updated_at FROM users WHERE id = '550e8400-...';
```

**Result:**
| first_name | last_name | updated_at |
|---|---|---|
| Janet | (unchanged) | 2026-04-15 13:01:00+00 |

**Status:** ✅ PASS

---

## DELETE Test

**Method:** Soft Delete

**SQL Run:**
```sql
SELECT id, email, deleted_at FROM users WHERE id = '550e8400-...';
```

**Result:**
| id | email | deleted_at |
|---|---|---|
| 550e8400-... | <jane@example.com> | 2026-04-15 13:02:00+00 |

**Status:** ✅ PASS

---

## Constraint Tests

| Constraint | Input | Expected Rejection | DB Error | API Status | Status |
|---|---|---|---|---|---|
| NOT NULL (first_name) | NULL | Yes | null value in column "first_name" | 400 | ✅ PASS |
| UNIQUE (email) | <jane@example.com> (duplicate) | Yes | duplicate key value | 409 | ✅ PASS |
```text

---

## 8. Automated Testing Pattern (Playwright + PostgreSQL)

For automated UI-to-database field testing, use Playwright to drive the browser and the `pg` Node.js client to assert DB state. This is the mandatory automation pattern for all Revvel E2E tests that involve data persistence.

```ts
// tests/e2e/ui-db-mapping/user-registration.spec.ts
import { test, expect } from '@playwright/test';
import { Client } from 'pg';

let dbClient: Client;

test.beforeAll(async () => {
  dbClient = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await dbClient.connect();
});

test.afterAll(async () => {
  await dbClient.end();
});

test.afterEach(async () => {
  // Clean up test data after each test
  await dbClient.query("DELETE FROM users WHERE email LIKE '%@playwright-test.com'");
});

test('should save all registration form fields to the users table correctly', async ({ page }) => {
  const testEmail = `user-${Date.now()}@playwright-test.com`;
  const testFirstName = 'Playwright';
  const testLastName = 'Test';

  // Step 1: Fill and submit the registration form in the UI
  await page.goto('/sign-up');
  await page.fill('[name="firstName"]', testFirstName);
  await page.fill('[name="lastName"]', testLastName);
  await page.fill('[name="email"]', testEmail);
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('[type="submit"]');

  // Wait for redirect to dashboard (confirms save succeeded)
  await expect(page).toHaveURL(/\/dashboard/);

  // Step 2: Verify the database record directly
  const result = await dbClient.query(
    `SELECT first_name, last_name, email, role, email_verified, is_active
     FROM users
     WHERE email = $1`,
    [testEmail.toLowerCase()] // email is lowercased before save
  );

  expect(result.rows).toHaveLength(1);
  const savedUser = result.rows[0];

  // Field-by-field assertions
  expect(savedUser.first_name).toBe(testFirstName);
  expect(savedUser.last_name).toBe(testLastName);
  expect(savedUser.email).toBe(testEmail.toLowerCase()); // FM-AUTH-001: lowercased
  expect(savedUser.role).toBe('user');                   // FM-AUTH-005: default role
  expect(savedUser.is_active).toBe(true);                // FM-AUTH-006: active on create
  expect(savedUser.email_verified).toBe(false);          // FM-AUTH-007: unverified until confirmed
});

test('should update only the edited field when profile is saved', async ({ page }) => {
  // Setup: Insert a known test user directly via DB
  const testEmail = `update-test-${Date.now()}@playwright-test.com`;
  await dbClient.query(
    `INSERT INTO users (first_name, last_name, email, role) VALUES ($1, $2, $3, $4)`,
    ['OriginalFirst', 'OriginalLast', testEmail, 'user']
  );

  // Step 1: Navigate to profile and change only first_name
  await page.goto('/profile');
  await page.fill('[name="firstName"]', 'UpdatedFirst');
  await page.click('[type="submit"]');
  await expect(page.locator('.success-toast')).toBeVisible();

  // Step 2: Assert only first_name changed — last_name untouched
  const result = await dbClient.query(
    `SELECT first_name, last_name, updated_at FROM users WHERE email = $1`,
    [testEmail]
  );

  const row = result.rows[0];
  expect(row.first_name).toBe('UpdatedFirst');   // ← changed
  expect(row.last_name).toBe('OriginalLast');    // ← unchanged (CRITICAL)
  expect(new Date(row.updated_at).getTime()).toBeGreaterThan(
    Date.now() - 10_000 // updated within last 10 seconds
  );
});

test('should reject duplicate email at the database level', async ({ page }) => {
  const existingEmail = `dup-test-${Date.now()}@playwright-test.com`;
  // Pre-insert the user
  await dbClient.query(
    `INSERT INTO users (first_name, last_name, email, role) VALUES ($1, $2, $3, $4)`,
    ['Existing', 'User', existingEmail, 'user']
  );

  // Try to register again with the same email
  await page.goto('/sign-up');
  await page.fill('[name="email"]', existingEmail);
  await page.fill('[name="firstName"]', 'Duplicate');
  await page.fill('[name="lastName"]', 'Attempt');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('[type="submit"]');

  // UI must show an error — not redirect to dashboard
  await expect(page.locator('[data-testid="error-message"]')).toContainText(
    /already exists|already registered|email taken/i
  );
  await expect(page).not.toHaveURL(/\/dashboard/);

  // DB must still have only 1 row for this email
  const result = await dbClient.query(
    `SELECT COUNT(*) as count FROM users WHERE email = $1`,
    [existingEmail]
  );
  expect(parseInt(result.rows[0].count)).toBe(1);
});
```

---

## 9. Integration with CI/CD

UI-to-database field tests run in the GitHub Actions CI pipeline as part of the E2E test suite.

### 9.1. Required CI Environment Variables

```yaml
# .github/workflows/e2e-tests.yml
env:
  TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}  # Separate test DB — NEVER point at production
  PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000
```

### 9.2. CI Test Execution Order

```text
1. Unit tests (Vitest)
2. Integration tests (Vitest + Supertest)
3. Schema validation (drizzle-kit check)     ← NEW: validates schema matches migrations
4. E2E field tests (Playwright + pg client)  ← NEW: validates UI → DB data pipeline
5. Coverage check (coverage thresholds gate)
6. Lighthouse performance budget check
```

### 9.3. Test Database Isolation

The test database is separate from development and production:

```text
Test DB:   TEST_DATABASE_URL   ← used in CI, isolated, reset after each run
Dev DB:    DATABASE_URL        ← used locally by developers
Prod DB:   DATABASE_URL (prod) ← NEVER used in tests
```

After every CI run, the test database is cleaned:
```sql
-- Run in CI teardown step
TRUNCATE users, orders, order_items, products RESTART IDENTITY CASCADE;
```

---

## 10. Compliance

This module is a required component of the DBA process for every Revvel application. The following checks are added to the compliance rubric (`COMPLIANCE_RUBRIC.md`):

| Check ID | Check | Priority | Evidence Required |
|---|---|---|---|
| DBA-001 | Field test log exists for every screen in production | P0 | `docs/field-tests/[project]/` directory |
| DBA-002 | E2E field tests cover all mandatory CRUD operations | P0 | `tests/e2e/ui-db-mapping/` directory |
| DBA-003 | Constraint tests cover NOT NULL, UNIQUE, and CHECK constraints | P1 | Test file or manual evidence log |
| DBA-004 | Schema validation runs in CI before E2E tests | P1 | `drizzle-kit check` step in `e2e-tests.yml` |
| DBA-005 | Test database is isolated from production | P0 | Separate `TEST_DATABASE_URL` secret in GitHub Actions |
| DBA-006 | Trigger tests exist for every database trigger | P2 | pgTAP test file or Playwright trigger assertion |

---

## 11. Quick Reference — SQL Verification Queries

Use these during manual QA or debugging sessions.

```sql
-- 1. Verify a row was inserted
SELECT * FROM [table] WHERE [unique_column] = '[value]' ORDER BY created_at DESC LIMIT 1;

-- 2. Check only one row was updated (no mass-update bug)
SELECT COUNT(*) FROM [table] WHERE updated_at >= NOW() - INTERVAL '10 seconds';

-- 3. Verify soft delete
SELECT id, deleted_at FROM [table] WHERE id = '[uuid]';
-- Expect: deleted_at IS NOT NULL

-- 4. Verify hard delete
SELECT COUNT(*) FROM [table] WHERE id = '[uuid]';
-- Expect: 0

-- 5. Verify a UNIQUE constraint exists
SELECT conname FROM pg_constraint
WHERE conrelid = '[table]'::regclass AND contype = 'u';

-- 6. Verify a NOT NULL constraint
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = '[table]' AND column_name = '[column]';
-- Expect: is_nullable = 'NO'

-- 7. Verify a CHECK constraint
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = '[table]'::regclass AND contype = 'c';

-- 8. Verify a trigger exists and is enabled
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = '[table]'::regclass;

-- 9. Verify foreign key constraint
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = '[table]'::regclass AND contype = 'f';

-- 10. Count rows by status (useful after bulk test inserts)
SELECT status, COUNT(*) FROM [table] GROUP BY status;
```

---

## 12. Related Documents

| Document | Purpose |
|---|---|
| `FIELD_MAPPING_STANDARD.md` | How to create and maintain field maps |
| `DATABASE_ARCHITECTURE_STANDARD.md` | PostgreSQL database architecture and hosting |
| `TESTING_STANDARD.md` | Full testing framework — unit, integration, E2E |
| `DATA_MODEL_STANDARD.md` | Data model design rules and naming conventions |
| `docs/field-maps/DATABASE_TO_UI_MASTER_MAP.md` | Master index: every table column → every UI screen |
| `docs/Universal-BOM_List/UI_FIELD_TESTING_BOM.md` | Bill of materials for UI field testing tools |
| `COMPLIANCE_RUBRIC.md` | Compliance checks including DBA-001 through DBA-006 |

# UI Field Testing — DBA Standard

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Related Standards:** `FIELD_MAPPING_STANDARD.md` · `TESTING_STANDARD.md` · `DATABASE_ARCHITECTURE_STANDARD.md`

---

## 1. Purpose

This standard defines the **database-level testing requirements** for every UI input field in a Revvel application. Unit tests and E2E tests catch application-layer bugs. This standard fills the gap between the UI and the database — ensuring every field that a user types into actually stores, retrieves, validates, and rejects data correctly at the database layer.

Every field in your field map (`docs/field-maps/`) must have a corresponding test in this standard before a PR is merged.

---

## 2. Why DBA-Level Field Testing Matters

| Gap | What Happens Without This Standard |
|---|---|
| SQL injection | Attacker sends `' OR 1=1 --` in a search box; unsanitized query returns all rows |
| Truncation | User types 300 chars into a `VARCHAR(255)` column; data is silently cut |
| Type mismatch | UI sends string `"true"` to a `BOOLEAN` column; ORM coerces silently or crashes |
| Constraint bypass | Required field passes client validation but arrives as `null` at the DB layer |
| Encoding | Emoji or RTL text stored as `?????` due to missing UTF-8 configuration |
| Uniqueness | Two users register with the same email; duplicate key error surfaces as a 500 instead of a validation message |
| Enum drift | A new enum value is added to the UI dropdown but not to the DB CHECK constraint |
| Boundary off-by-one | Price field accepts `-0.01`; inventory count accepts `2147483648` (INT overflow) |
| Injection via JSON | JSONB column receives `{"__proto__": {"isAdmin": true}}` prototype pollution payload |

---

## 3. Test Layers Covered by This Standard

```
Browser Input
     ↓
Client-Side Validation  ← NOT this standard (covered by component tests)
     ↓
API / tRPC Handler       ← Partially (API contract tests in TESTING_STANDARD.md §3.5)
     ↓
ORM Layer (Drizzle)      ← THIS STANDARD BEGINS HERE
     ↓
PostgreSQL Constraints   ← THIS STANDARD (DB-level enforcement)
     ↓
Storage                  ← Verify persisted value on SELECT
```

---

## 4. Required Test Categories

### 4.1. Required-Field (NOT NULL) Tests

Every column with a `NOT NULL` constraint must have a test that confirms the database rejects an insert when the field is missing or `null`.

```ts
// tests/dba/users.dba.test.ts
describe('users — required fields', () => {
  it('should reject insert when email is null', async () => {
    await expect(
      db.insert(users).values({ email: null, firstName: 'Test' })
    ).rejects.toThrow();
  });

  it('should reject insert when firstName is null', async () => {
    await expect(
      db.insert(users).values({ email: 'a@test.com', firstName: null })
    ).rejects.toThrow();
  });
});
```

---

### 4.2. Length / Size Constraint Tests

Every `VARCHAR(n)` or `TEXT` column that has a known UI character limit must have tests for the maximum allowed length and one character beyond.

```ts
describe('users — length constraints', () => {
  it('should accept email at exactly 255 characters', async () => {
    const longEmail = 'a'.repeat(243) + '@example.com'; // 255 chars
    await expect(
      db.insert(users).values({ email: longEmail, firstName: 'Test' })
    ).resolves.toBeDefined();
  });

  it('should reject email exceeding 255 characters', async () => {
    const tooLong = 'a'.repeat(244) + '@example.com'; // 256 chars
    await expect(
      db.insert(users).values({ email: tooLong, firstName: 'Test' })
    ).rejects.toThrow();
  });
});
```

---

### 4.3. Enum / CHECK Constraint Tests

Every column with an enum or `CHECK` constraint must have tests for each valid value and at least one invalid value.

```ts
describe('users — role enum', () => {
  const VALID_ROLES = ['user', 'admin', 'affiliate'] as const;

  it.each(VALID_ROLES)('should accept role "%s"', async (role) => {
    await expect(
      db.insert(users).values({ email: `${role}@test.com`, role })
    ).resolves.toBeDefined();
  });

  it('should reject an unrecognized role value', async () => {
    await expect(
      db.insert(users).values({ email: 'x@test.com', role: 'superuser' as any })
    ).rejects.toThrow();
  });
});
```

---

### 4.4. Unique Constraint Tests

Every column with a `UNIQUE` index must have a test that confirms the database rejects a duplicate insert.

```ts
describe('users — unique constraints', () => {
  it('should reject duplicate email inserts', async () => {
    const email = 'dupe@test.com';
    await db.insert(users).values({ email, firstName: 'First' });

    await expect(
      db.insert(users).values({ email, firstName: 'Second' })
    ).rejects.toThrow(/unique constraint/i);
  });
});
```

---

### 4.5. Numeric Range / Boundary Tests

Every numeric column used for financial amounts, counts, or measurements must have boundary tests.

```ts
describe('products — price boundary', () => {
  it('should reject a negative price in cents', async () => {
    await expect(
      db.insert(products).values({ name: 'Bad', priceCents: -1 })
    ).rejects.toThrow();
  });

  it('should accept a zero price (free product)', async () => {
    await expect(
      db.insert(products).values({ name: 'Free', priceCents: 0 })
    ).resolves.toBeDefined();
  });

  it('should reject an INTEGER overflow value', async () => {
    await expect(
      db.insert(products).values({ name: 'Overflow', priceCents: 2_147_483_648 })
    ).rejects.toThrow();
  });
});
```

---

### 4.6. SQL Injection Tests

Every user-controlled string field that is passed into a query — search boxes, filters, IDs in URL params — must have SQL injection tests. The ORM (Drizzle) parameterizes queries by default, so these tests verify that parameterization is actually used and not bypassed by raw query construction.

**Classic SQL injection payloads to test:**

| Payload | Attack Type |
|---|---|
| `' OR 1=1 --` | Boolean-based blind injection |
| `'; DROP TABLE users; --` | Destructive injection (SQLi) |
| `' UNION SELECT * FROM users --` | Union-based data exfiltration |
| `WHERE id = '` | Broken query / truncation probe |
| `\x00` | Null byte injection |
| `<script>alert(1)</script>` | Stored XSS via DB field |
| `{"__proto__": {"isAdmin": true}}` | JSON prototype pollution |
| `../../../../etc/passwd` | Path traversal via text field |

```ts
// tests/dba/injection.dba.test.ts
describe('SQL injection — search query', () => {
  const injectionPayloads = [
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "WHERE id = '",
    '\x00',
  ];

  it.each(injectionPayloads)(
    'should return empty results (not throw or leak data) for payload: %s',
    async (payload) => {
      // Drizzle parameterizes this automatically — the payload is treated as a literal string.
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, payload));

      // Result should be an empty array — no rows match the literal injection string.
      expect(result).toEqual([]);
    }
  );
});

describe('SQL injection — ID parameter', () => {
  it('should not return rows when id param is a SQL fragment', async () => {
    const maliciousId = "' OR 1=1 --";

    // This simulates what happens when a URL param like /users/[id] is injected.
    // Drizzle's eq() always parameterizes — the string is never interpolated into SQL.
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, maliciousId as any));

    expect(result).toEqual([]);
  });
});
```

> **Rule:** If your API handler constructs a raw SQL string using template literals or string concatenation — **even once** — it must have an injection test for every interpolated variable. Raw SQL in Drizzle is done via `sql\`...\`` — every variable inside must be wrapped in `sql.placeholder()` or passed via the parameterized API.

---

### 4.7. JSONB Field Injection / Validation Tests

Every `JSONB` column must have tests that verify:
- The stored value retrieves with the same shape it was saved with
- Prototype pollution payloads are stored inertly (not executed)
- Required keys within the JSON object are present

```ts
describe('users — notification_prefs JSONB', () => {
  it('should store and retrieve notification prefs with correct shape', async () => {
    const prefs = { email: true, sms: false, push: true, marketing: false };
    const [inserted] = await db
      .insert(users)
      .values({ email: 'prefs@test.com', notificationPrefs: prefs })
      .returning();

    expect(inserted.notificationPrefs).toEqual(prefs);
  });

  it('should store prototype pollution payload as inert data', async () => {
    const malicious = { __proto__: { isAdmin: true }, email: true };
    const [inserted] = await db
      .insert(users)
      .values({ email: 'proto@test.com', notificationPrefs: malicious })
      .returning();

    // The value is stored as raw JSON — prototype is not elevated in the process.
    expect((inserted.notificationPrefs as any).__proto__?.isAdmin).toBeUndefined();
    expect((inserted.notificationPrefs as any).email).toBe(true);
  });
});
```

---

### 4.8. Round-Trip Fidelity Tests

Every field that stores and displays a value to the user must pass a round-trip test: insert value → read it back → assert it matches exactly (no coercion, truncation, or encoding loss).

```ts
describe('users — round-trip fidelity', () => {
  it('should preserve unicode (emoji, RTL text) in firstName', async () => {
    const unicodeNames = ['José 🎉', 'مرحبا', '你好世界', 'Ångström'];

    for (const name of unicodeNames) {
      const [row] = await db
        .insert(users)
        .values({ email: `unicode-${Date.now()}@test.com`, firstName: name })
        .returning();

      expect(row.firstName).toBe(name);
    }
  });

  it('should preserve exact decimal precision for priceCents stored as INTEGER', async () => {
    const [row] = await db
      .insert(products)
      .values({ name: 'Precision Test', priceCents: 1999 })
      .returning();

    expect(row.priceCents).toBe(1999); // $19.99 — no float drift
  });
});
```

---

### 4.9. Soft-Delete Field Tests

Every table with a `deleted_at` column must verify that:
- A "deleted" record still exists in the table (soft delete, not hard delete)
- Standard queries exclude soft-deleted records by default

```ts
describe('users — soft delete', () => {
  it('should mark deleted_at without removing the row', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'delete@test.com' })
      .returning();

    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, user.id));

    // Row still exists in the table
    const [stillExists] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    expect(stillExists).toBeDefined();
    expect(stillExists.deletedAt).not.toBeNull();
  });

  it('should exclude soft-deleted users from default list queries', async () => {
    const rows = await db
      .select()
      .from(users)
      .where(isNull(users.deletedAt)); // Standard query

    const hasDeleted = rows.some((r) => r.deletedAt !== null);
    expect(hasDeleted).toBe(false);
  });
});
```

---

## 5. Test File Convention

DBA tests live in `tests/dba/` — one file per database table.

```
tests/
└── dba/
    ├── users.dba.test.ts          ← all field tests for the users table
    ├── products.dba.test.ts       ← all field tests for the products table
    ├── orders.dba.test.ts
    ├── order_items.dba.test.ts
    ├── subscriptions.dba.test.ts
    ├── injection.dba.test.ts      ← cross-table SQL injection tests
    └── README.md                  ← explains the test database setup
```

**Naming convention:**

```ts
describe('[table name] — [constraint category]', () => {
  it('should [pass/fail] when [condition]', async () => { ... });
});
```

---

## 6. Test Database Setup

DBA tests run against an **in-memory or sandboxed test database** — never against production.

### Recommended Setup (Vitest + in-memory PostgreSQL)

Use `pg-mem` (https://github.com/oguimbal/pg-mem) or `testcontainers` (Docker-based PostgreSQL) for a real PostgreSQL instance in tests.

```ts
// tests/dba/setup.ts
import { newDb } from 'pg-mem';
import { drizzle } from 'drizzle-orm/pg-core';

const mem = newDb();
export const db = drizzle(mem.adapters.createPg());

// Apply schema migrations before tests run.
beforeAll(async () => {
  await db.execute(sql`CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    role       VARCHAR(50) CHECK (role IN ('user', 'admin', 'affiliate')) DEFAULT 'user',
    deleted_at TIMESTAMP WITH TIME ZONE
  )`);
});

afterEach(async () => {
  // Truncate tables between tests for isolation.
  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
});
```

---

## 7. Mapping Field Map IDs to DBA Tests

Every DBA test must be traceable back to a Field Map entry (see `FIELD_MAPPING_STANDARD.md`). Add a comment at the top of each test group referencing the Field ID.

```ts
// FM-AUTH-001: Email Address — users.email VARCHAR(255) NOT NULL UNIQUE
describe('users.email — FM-AUTH-001', () => {
  // ... required, length, unique, injection tests
});

// FM-AUTH-002: Password — stored as hashed string in users.password_hash
describe('users.password_hash — FM-AUTH-002', () => {
  // ... hash format, length, no plaintext storage test
});
```

This bidirectional traceability means:
- A bug report citing `FM-AUTH-001` instantly maps to a specific DBA test.
- A DBA test failure in CI names the Field Map ID so developers know exactly which screen field is broken.

---

## 8. Coverage Requirement

| Constraint Type | Required Tests per Column |
|---|---|
| NOT NULL | 1 — attempt null insert → expect reject |
| UNIQUE | 1 — attempt duplicate → expect reject |
| VARCHAR(n) | 2 — at max length → accept; 1 over → reject |
| CHECK / enum | 1 per valid value + 1 invalid value |
| Numeric range | 1 at lower bound, 1 at upper bound, 1 over/under each |
| JSONB shape | 1 round-trip shape test + 1 prototype pollution test |
| Soft-delete | 2 — row exists after delete; row excluded from default query |
| User-input text (any) | Full injection suite (§4.6 payloads) |

---

## 9. CI Gate

DBA tests run as part of the standard Vitest CI pipeline. Add the `tests/dba/` path to the Vitest config to ensure coverage is measured:

```ts
// vitest.config.ts — add DBA tests to coverage
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.dba.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      // ... standard thresholds from TESTING_STANDARD.md §2
    },
  },
});
```

A PR that adds a new database table or modifies column constraints **without** a corresponding DBA test file update will be blocked by CI.

---

## 10. Mabl Integration

For UI fields that require end-to-end validation from the browser to the database, DBA tests are **complementary to**, not a replacement for, Mabl tests. Use both:

| Layer | Tool | What It Validates |
|---|---|---|
| Database constraints | Vitest DBA tests (this standard) | Column types, nullability, uniqueness, enum, injection |
| API / ORM layer | Vitest integration tests | Request shape, auth guards, response shape |
| Browser-to-DB round trip | Mabl (`skills/mabl/`) | User fills form → data appears in DB / UI on reload |

For Mabl setup, see `skills/mabl/SKILL.md` and `templates/cicd/mabl.yml`.

---

## 11. Quick Reference — Test Payloads

### SQL Injection Strings (Always Test These on Text Inputs)

```
' OR 1=1 --
'; DROP TABLE users; --
' UNION SELECT * FROM users --
WHERE id = '
\x00
1; SELECT * FROM information_schema.tables
admin'--
' OR 'x'='x
```

### XSS / Stored Script Payloads (Always Test Rich Text / VARCHAR Fields)

```
<script>alert(1)</script>
"><img src=x onerror=alert(1)>
javascript:alert(1)
```

### Boundary Numbers

```
0          ← zero (free product, empty cart)
-1         ← negative (reject for prices, quantities)
2147483647 ← INT max (PostgreSQL INTEGER)
2147483648 ← INT overflow (must reject)
9007199254740991 ← JS Number.MAX_SAFE_INTEGER (test BIGINT columns)
```

### Unicode / Encoding Edge Cases

```
José 🎉       ← emoji + accented characters
مرحبا         ← Arabic RTL
你好世界       ← CJK characters
\u0000        ← null character
\uffff        ← BMP boundary
```

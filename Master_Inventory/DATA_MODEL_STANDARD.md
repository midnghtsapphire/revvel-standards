# Revvel Data Model Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Consistent data modeling prevents the silent bugs, migration nightmares, and broken queries that come from every developer making different schema decisions. This standard defines the exact conventions every Revvel application must follow when designing database schemas using Drizzle ORM.

**ORM:** Drizzle ORM (<https://orm.drizzle.team>) — mandatory for all PostgreSQL and SQLite projects  
**Primary DB:** PostgreSQL (via Drizzle + pg or postgres.js)  
**Lightweight DB:** SQLite (via Drizzle + better-sqlite3) — permitted for single-tenant tools only

---

## 2. Column Naming Conventions

All column names use `snake_case`. This matches PostgreSQL conventions and prevents case-sensitivity bugs.

| Convention | Correct | Incorrect |
|---|---|---|
| Column names | `user_id`, `created_at` | `userId`, `createdAt` |
| Table names | `user_profiles`, `order_items` | `UserProfiles`, `orderItems` |
| Boolean columns | `is_active`, `has_verified` | `active`, `verified`, `isActive` |
| Foreign keys | `user_id` (references `users.id`) | `userId`, `user` |
| Timestamp fields | `created_at`, `updated_at`, `deleted_at` | `createdAt`, `timestamp` |

Drizzle provides type-safe column accessors in camelCase even when the DB uses snake_case — this is the correct behavior. Do not rename columns to camelCase in the schema to match TypeScript; use Drizzle's built-in transformation.

---

## 3. Required Audit Fields

Every table that stores user-generated or application-generated data must include these audit fields:

```ts
import { timestamp, pgTable, uuid } from 'drizzle-orm/pg-core';

// Add these to EVERY table (except pure join/pivot tables)
const auditFields = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // null = not deleted
};
```

**Why this is required:**
- `created_at` — required for CHANGELOG compliance and debugging
- `updated_at` — required for cache invalidation and conflict detection
- `deleted_at` — required for soft deletes (see Section 5)

**Enforcing `updated_at` auto-update:**

In PostgreSQL, add a trigger per table:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Or use Drizzle's `.$onUpdateFn()`:

```ts
updatedAt: timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdateFn(() => new Date()),
```

---

## 4. Primary Key Convention

Use `uuid` for all primary keys. Never use auto-increment integers as public-facing IDs.

```ts
import { uuid, pgTable } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...
});
```

**Why uuid over integer:**
- UUIDs are safe to expose in URLs (no sequential guessing)
- UUIDs work across distributed systems and offline-first apps
- UUIDs allow client-side ID generation before insert

---

## 5. Soft Delete Policy

Records must never be permanently deleted from the database unless explicitly required by law (e.g., GDPR right-to-be-forgotten requests).

**Standard soft delete pattern:**

```ts
// In schema
deletedAt: timestamp('deleted_at', { withTimezone: true }), // null = active

// In queries — always filter out deleted records
const activeUsers = await db.query.users.findMany({
  where: isNull(users.deletedAt),
});

// To soft-delete
await db.update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));

// To hard-delete (only for legal compliance)
await db.delete(users).where(eq(users.id, userId));
```

**Rules:**
- All `SELECT` queries must include `WHERE deleted_at IS NULL` unless explicitly querying deleted records.
- Create a reusable `isActive` helper to avoid forgetting this filter.
- Admin panels may show soft-deleted records with a "Deleted" badge.

---

## 6. Full Schema Example

This is the canonical pattern for a Revvel application schema:

```ts
// db/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Users ────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  clerkId: varchar('clerk_id', { length: 255 }).unique(), // nullable if not using Clerk
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'user' | 'admin'
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'), // flexible extra data, use sparingly
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  clerkIdIdx: index('users_clerk_id_idx').on(table.clerkId),
}));

// ── Products ─────────────────────────────────────────────
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(), // store money as integers (cents), never floats
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ── Orders ───────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  // 'pending' | 'paid' | 'refunded' | 'failed'
  totalCents: integer('total_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('orders_user_id_idx').on(table.userId),
}));

// ── Relations ────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));
```

---

## 7. Money Handling

**Rule: Never store money as a float. Always use integers (cents).**

```ts
// ✅ CORRECT
priceCents: integer('price_cents').notNull(), // 1999 = $19.99

// ❌ WRONG
price: decimal('price', { precision: 10, scale: 2 }), // floating point errors
price: real('price'), // DO NOT USE for money
```

**Conversion helpers:**

```ts
const centsToDollars = (cents: number): string => (cents / 100).toFixed(2);
const dollarsToCents = (dollars: number): number => Math.round(dollars * 100);
```

---

## 8. Migrations

All schema changes must go through Drizzle's migration system. Direct `ALTER TABLE` statements in production are prohibited.

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# View current state
npx drizzle-kit studio
```

**Migration rules:**
- Never edit an existing migration file — always generate a new one.
- Migration files are committed to the repo in `drizzle/` directory.
- All migrations must run in CI before deployment.
- Destructive migrations (DROP TABLE, DROP COLUMN) require a soft-delete transition period of at least one deploy cycle before the column is actually removed.

---

## 9. Database File Structure

```text
db/
├── schema.ts          # All table definitions (single file for small apps)
├── schema/            # Split by domain for larger apps
│   ├── users.ts
│   ├── products.ts
│   └── orders.ts
├── index.ts           # Database connection and client export
└── seed.ts            # Development seed data
drizzle/               # Generated migration files (committed)
drizzle.config.ts      # Drizzle kit configuration
```

---

## 10. Drizzle Config Template

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

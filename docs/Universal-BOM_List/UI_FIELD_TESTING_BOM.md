# UI Field Testing BOM — Universal Revvel Standards

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Living Document  
**Scope:** All Revvel Projects  
**Related Standard:** `UI_FIELD_TESTING_DBA_STANDARD.md`

> This document catalogues every tool, platform, library, and service relevant to UI-to-database field testing and mapping validation. It is the shopping list and decision log for the DBA testing process defined in `UI_FIELD_TESTING_DBA_STANDARD.md`.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ FOSS | Fully open-source / free to self-host |
| 🆓 Free Tier | Has a free plan (usage-limited) |
| 💰 Paid | Paid only or free tier is insufficient |
| 🟢 In Use | Currently active in Revvel stack |
| 🔵 Recommended | Recommended — not yet adopted |
| 🟡 Evaluate | Worth evaluating for a specific need |
| 🔴 Research | Needs research before decision |
| 🗑️ Skip | Not a fit for Revvel's current stack |

---

## 1. UI-to-Database Automated Testing

**Current Standard:** Playwright + `pg` client (see `UI_FIELD_TESTING_DBA_STANDARD.md`, Section 8)

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Playwright** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Drive the browser; run SQL assertions in the same test step via `pg` client. Standard pattern for all Revvel E2E field tests. |
| **pg (node-postgres)** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Node.js PostgreSQL client. Used inside Playwright tests to run verification queries after UI actions. |
| **Vitest + Drizzle ORM** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Integration tests that hit the API layer and verify DB state. Part of the standard Revvel testing stack. |
| **Supertest** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | HTTP-level integration testing for API routes. Pairs with Vitest for full CRUD validation at the API layer. |
| **mabl** | Proprietary | 🆓 Free Tier | $0 trial / $500+/mo | P2 | 🔴 Research | SaaS no-code test platform with native SQL query assertion steps. Can validate DB state directly from UI test flows. [mabl DB testing docs](https://help.mabl.com/hc/en-us/articles/27563301153428-How-to-test-with-database-queries) |
| **Cypress + cypress-postgresql** | MIT (runner) ✅ FOSS | 🆓 Free Tier | $0 / $67+/mo cloud | P3 | 🟡 Evaluate | Cypress with the `cypress-postgresql` plugin can run SQL queries in test hooks. Playwright preferred for Revvel. |

---

## 2. SQL-Native Testing (Stored Procedures & Triggers)

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **pgTAP** | BSD ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | SQL-native test framework for PostgreSQL. Write `SELECT * FROM runtests()` to validate stored procedures, triggers, constraints, and schema. Runs entirely inside the DB — no application code required. |
| **pg_prove** | Perl / FOSS ✅ | ✅ Free | $0 | P1 | 🔵 Recommended | CLI runner for pgTAP test suites. Integrates with CI: `pg_prove -U postgres tests/sql/*.sql` |
| **pgunit** | BSD ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | Alternative to pgTAP; lighter-weight SQL unit testing in PostgreSQL. Less widely adopted. |
| **DbUnit (Java)** | LGPL ✅ FOSS | ✅ Free | $0 | P4 | 🗑️ Skip | Java ecosystem. Not applicable to Revvel's Node.js/TypeScript stack. |

---

## 3. GUI Database Clients (Manual Verification)

Use these tools to run verification SQL queries, browse tables, and inspect data during manual QA sessions.

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Supabase Table Editor** | Apache 2.0 ✅ FOSS (self-hosted) | 🆓 Free Tier | $0 / $25+/mo | P0 | 🟢 In Use | Visual row browser for PostgreSQL. After any UI action, open Table Editor and verify the row directly. Already in Revvel stack. |
| **Beekeeper Studio** | MIT ✅ FOSS (Community) | ✅ Free | $0 (Community) / $99/yr (Ultimate) | P1 | 🔵 Recommended | Clean, modern GUI PostgreSQL client. Good for running verification queries during manual field testing. |
| **DBeaver Community** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Full-featured GUI DB client. Schema diagram export, column comparison, query console. Good for DBA verification during QA. |
| **TablePlus** | Proprietary | 🆓 Free (limited) | $0 (2 tabs) / $89 (lifetime) | P2 | 🟡 Evaluate | Polished macOS/Windows PostgreSQL client. Fast query execution. Free tier limited to 2 open tabs. |
| **pgAdmin 4** | PostgreSQL License ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Official PostgreSQL GUI. Powerful but heavy. Good for DBA-level schema inspection. |
| **DataGrip** | Proprietary | 💰 Paid | $229/yr (individual) | P3 | 🟡 Evaluate | JetBrains IDE-grade DB client. Best for complex schema analysis. Heavy for casual use. |
| **Postico 2** | Proprietary | 🆓 Free (limited) | $0 trial / $39 one-time | P3 | 🟡 Evaluate | macOS-only lightweight PostgreSQL client. Quick to use for spot checks. |

---

## 4. No-Code / Low-Code CRUD Screen Generators

These platforms auto-generate CRUD interfaces directly from a database schema, reducing manual field mapping errors. Referenced in the issue requirements.

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Budibase** | GPL / Budibase License | 🆓 Free Tier | $0 (self-hosted) / $50+/mo (cloud) | P1 | 🔵 Recommended | FOSS low-code platform. Connect to Postgres → auto-generate full CRUD screen. Self-hostable on a DigitalOcean Droplet. Excellent for rapid QA admin tools. |
| **Appsmith** | Apache 2.0 ✅ FOSS | 🆓 Free Tier | $0 (self-hosted) / $40+/mo | P1 | 🔵 Recommended | FOSS Retool alternative. Build internal CRUD tools on top of Postgres. Drag-and-drop UI builder. Self-hostable. |
| **Retool** | Proprietary | 🆓 Free Tier | Free (2 users) / $10+/user/mo | P2 | 🟡 Evaluate | Industry-standard internal tool builder. Connect Postgres → drag-and-drop CRUD UI. Free tier for small teams. |
| **Baserow** | MIT ✅ FOSS | 🆓 Free Tier | $0 (self-hosted) / $5+/mo | P2 | 🟡 Evaluate | Airtable-alternative with Postgres back-end. Visual table browser and editor. Good for non-technical QA. |
| **NocoDB** | AGPL ✅ FOSS | ✅ Free | $0 (self-hosted) / $19+/mo | P2 | 🟡 Evaluate | FOSS Airtable alternative. Connect to existing Postgres DB → auto-generates spreadsheet view of every table. Excellent for verifying field data during QA without SQL. |
| **Directus** | BSL ✅ FOSS (self-hosted) | 🆓 Free Tier | $0 (self-hosted) / $99+/mo | P2 | 🟡 Evaluate | Headless CMS / data platform. Wraps an existing Postgres DB with a full admin UI and REST/GraphQL API. Great for visual field testing. |
| **Power Apps** | Proprietary (Microsoft) | 🆓 Free Tier | Free (with M365) / $20+/user/mo | P3 | 🟡 Evaluate | Microsoft low-code builder. Can connect to Postgres via gateway. [Video: CRUD from DB schema](https://www.youtube.com/watch?v=nRE7ePvwSGQ) |

---

## 5. Schema Validation & Migration Tools

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **drizzle-kit** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | `drizzle-kit check` validates that the live database schema matches the Drizzle schema definition. Run in CI before E2E tests. |
| **drizzle-kit generate + migrate** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Generate and apply schema migrations. Rollback with `drizzle-kit drop`. |
| **schemalint** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | Lints PostgreSQL schemas for naming convention violations, missing NOT NULL, missing indexes, etc. |
| **squitch** | MIT ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | Database-agnostic migration management. Tracks changes with VCS-style deploy/revert/verify. Alternative to Drizzle migrations. |
| **Flyway** | Apache 2.0 ✅ FOSS (Community) | 🆓 Free Tier | $0 (Community) / $985+/yr (Teams) | P3 | 🟡 Evaluate | SQL-file-based migration tool; widely used in Java ecosystem. FOSS community edition. |
| **Liquibase** | Apache 2.0 ✅ FOSS (Community) | 🆓 Free Tier | $0 (Community) / $5,000+/yr (Pro) | P3 | 🔴 Research | XML/YAML-based migrations with rollback support. Community edition is FOSS but XML-heavy. |

---

## 6. Data Integrity & Constraint Monitoring

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **pg_activity** | BSD ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | Real-time PostgreSQL activity monitor. View live queries during UI testing to confirm what SQL is executing. |
| **pgBadger** | BSD ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | PostgreSQL log analyzer. Parse slow query logs to find field mapping issues causing slow reads. |
| **pgMustard** | Proprietary | 🆓 Free (limited) | Free (5 explains/day) / $14+/mo | P2 | 🟡 Evaluate | EXPLAIN plan analyzer. Identifies missing indexes — critical for fields that are frequently queried from UI search forms. |
| **Posthog** | MIT ✅ FOSS | 🆓 Free Tier | Free (1M events) / $0.000225/event | P2 | 🟡 Evaluate | Product analytics + session replay. Watch recordings of users filling forms to identify data entry issues before they reach the DB. |

---

## 7. Test Data Management

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Faker.js** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Generate realistic test data (names, emails, addresses) for populating UI forms in automated tests. Use in Playwright test fixtures. |
| **@snaplet/seed** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Type-safe test data seeding for PostgreSQL. Generates data that respects FK constraints. Integrates with Drizzle ORM. |
| **factory-boy (Python)** | MIT ✅ FOSS | ✅ Free | $0 | P4 | 🗑️ Skip | Python ecosystem only. Not applicable to Revvel's Node.js stack. |
| **pg-anonymizer** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | Anonymize production database dumps for safe use in staging/testing. Run field tests against realistic (but anonymized) data. |

---

## 8. ACID / Transaction Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **pgBench** | PostgreSQL License ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Built-in PostgreSQL benchmarking tool. Simulate concurrent transactions to test isolation and contention behavior. |
| **HammerDB** | GPL ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | Load testing tool for databases. Simulate high-concurrency UI form submissions hitting the DB simultaneously. |
| **Locust** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Python-based load testing. Write scenarios that simulate concurrent UI form submissions. Verify DB integrity under load. |
| **k6** | AGPL ✅ FOSS | 🆓 Free Tier | $0 (self-run) / $49+/mo (cloud) | P2 | 🟡 Evaluate | JavaScript-based load testing. Simulate concurrent form submissions and verify no data corruption occurs. |

---

## 9. Compliance Check Reference

All tools in this BOM map to compliance checks in `UI_FIELD_TESTING_DBA_STANDARD.md` Section 10:

| BOM Category | Compliance Check |
|---|---|
| Section 1 — Automated Testing | DBA-002 (E2E CRUD tests), DBA-004 (schema validation in CI) |
| Section 2 — SQL-Native Testing | DBA-006 (trigger tests) |
| Section 3 — GUI Clients | DBA-001 (field test log evidence) |
| Section 5 — Schema Validation | DBA-004 (drizzle-kit check in CI) |
| Section 7 — Test Data Management | DBA-005 (test DB isolation) |
| Section 8 — ACID Testing | DBA-003 (constraint tests) |

---

## 10. Recommended Minimum Stack for UI Field Testing

For a new Revvel project starting from zero, this is the minimum viable set of tools to achieve DBA-001 through DBA-005 compliance:

| Tool | Role | Cost |
|---|---|---|
| **Playwright + pg** | Automated E2E field tests with DB assertions | $0 |
| **Vitest + Supertest** | API-level CRUD integration tests | $0 |
| **drizzle-kit check** | CI schema validation | $0 |
| **Faker.js** | Test data generation | $0 |
| **Supabase Table Editor** | Manual verification during QA sessions | $0 |
| **pgTAP** | Trigger and stored procedure testing | $0 |

**Total minimum cost: $0** — The entire recommended minimum stack is FOSS.

---

*This document is maintained by the Revvel coding agent. Last audited: April 15, 2026.*
